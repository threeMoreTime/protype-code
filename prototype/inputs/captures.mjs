import { z } from 'zod';
import { adaptDOMCaptures } from '../../.research/local-figma-bridge-poc/capture/generic.mjs';
import { validateDesignSpec } from '../../.research/local-figma-bridge-poc/design/spec.mjs';
import { digest } from '../core/model.mjs';
import { frameKey } from '../renderers/figma.mjs';

const Snapshots = z.object({ snapshots: z.array(z.object({
  pageId: z.string(), stateId: z.string().default('default'),
  capture: z.record(z.unknown()), elementMap: z.record(z.string()).default({}),
}).strict()).min(1).max(100) }).strict();

export function applyRuntimeCaptures(model, original, input) {
  if (Buffer.byteLength(JSON.stringify(input)) > 6 * 1024 * 1024) throw new Error('Capture attachment exceeds 6 MiB');
  const attachments = Snapshots.parse(input), spec = structuredClone(original), warnings = [], seen = new Set();
  for (const snapshot of attachments.snapshots) {
    const root = frameKey(snapshot.pageId, snapshot.stateId), page = model.pages.find(p => p.id === snapshot.pageId);
    if (!page?.states.some(s => s.id === snapshot.stateId) || seen.has(root)) throw new Error(`Unknown or duplicate snapshot ${root}`);
    seen.add(root);
    const { spec: captured, manifest } = adaptDOMCaptures([snapshot.capture], { id: 'runtime', nativeControls: 'captured' });
    const oldRoot = spec.nodes.find(n => n.key === root), captureRoot = captured.nodes.find(n => n.parentKey === null);
    const mapping = new Map(captured.nodes.map(n => [n.key, n === captureRoot ? root : `${root}/capture-${digest(n.key).slice(0, 16)}`]));
    const assets = new Map(captured.assets.map(a => [a.key, `asset-${digest(a.dataBase64).slice(0, 24)}`]));
    const sourceMap = new Map(manifest.mappings.map(m => [m.sourceId, mapping.get(m.nodeKey)]));
    for (const [element, sourceId] of Object.entries(snapshot.elementMap)) {
      if (!page.elements.some(e => e.id === element) || !sourceMap.has(sourceId)) throw new Error(`Invalid elementMap ${root}/${element}`);
    }
    for (const reaction of spec.reactions) if (reaction.sourceKey.startsWith(`${root}/`)) {
      const elementId = reaction.sourceKey.slice(root.length + 1).replace(/^element-/, ''), sourceId = snapshot.elementMap[elementId];
      if (!sourceId || !sourceMap.has(sourceId)) throw new Error(`Capture needs elementMap for interactive control ${root}/${elementId}`);
      reaction.sourceKey = sourceMap.get(sourceId);
    }
    spec.nodes = spec.nodes.filter(n => n.key !== root && !n.key.startsWith(`${root}/`));
    for (const node of captured.nodes) {
      const next = { ...node, key: mapping.get(node.key), parentKey: node.parentKey === null ? null : mapping.get(node.parentKey), props: structuredClone(node.props) };
      if (node === captureRoot) { next.x = oldRoot.x; next.y = oldRoot.y; next.name = oldRoot.name; }
      for (const property of ['fills', 'strokes']) for (const paint of next.props[property] ?? []) if (paint.assetKey) paint.assetKey = assets.get(paint.assetKey);
      spec.nodes.push(next);
    }
    for (const asset of captured.assets) if (!spec.assets.some(a => a.key === assets.get(asset.key))) spec.assets.push({ ...asset, key: assets.get(asset.key) });
    warnings.push(...manifest.warnings.map(w => ({ pageId: page.id, stateId: snapshot.stateId, ...w })));
  }
  const revision = digest({ model, attachments }); spec.source.revision = revision; spec.id = `${model.id}-${revision.slice(0, 12)}`;
  validateDesignSpec(spec);
  if (Buffer.byteLength(JSON.stringify(spec)) > 6.5 * 1024 * 1024) throw new Error('Captured Figma spec exceeds bridge payload budget');
  return { spec, attachments, warnings, applied: [...seen] };
}
