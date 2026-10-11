// Explicit conversion only. Keep every source key; a uniform measured run uses
// the first text node, while later fragments remain editable but hidden.
function isUnscaledAncestorTransform(transform) {
  if (transform === 'none') return true;
  const matrix = typeof transform === 'string' && /^matrix\(([^)]+)\)$/.exec(transform);
  if (!matrix) return false;
  const parts = matrix[1].split(',').map(part => part.trim());
  if (parts.length !== 6 || parts.some(part => !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(part))) return false;
  const values = parts.map(Number);
  return values.every(Number.isFinite) && values[0] === 1 && values[1] === 0 && values[2] === 0 && values[3] === 1;
}
export function coalesceUniformInlineText(captures, spec, mappings, unchangedPresetMappings = []) {
  const nodes = new Map(spec.nodes.map(n => [n.key, n]));
  const keys = new Map(mappings.map(m => [`${m.sceneId}/${m.sourceId}`, m.nodeKey]));
  const protectedKeys = new Set([...(spec.reactions ?? []), ...unchangedPresetMappings].map(r => r.sourceKey));
  const report = { mode: 'uniform-run', changedCount: 0, hiddenFragmentCount: 0, runs: [], preservedCounts: {}, nativeFit: 'NOT_RUN' };
  const fields = ['fontFamily','fontSize','fontWeight','fontStyle','lineHeight','letterSpacing','color','textAlign','whiteSpace','direction','writingMode','opacity'];
  const pixels = v => typeof v === 'string' && /^(?:\d+(?:\.\d+)?|\.\d+)px$/.test(v) ? Number.parseFloat(v) : NaN;
  const rect = r => r && ['x','y','width','height'].every(k => Number.isFinite(r[k])) && r.width > 0 && r.height > 0;
  function attempt(raw, ancestors, sceneId) {
    const children = raw.children ?? [], s = raw.style ?? {};
    if (children.length < 2 || !children.some(c => c.kind === 'text')) return;
    function preserve(reason) { report.preservedCounts[reason] = (report.preservedCounts[reason] ?? 0) + 1; }
    if (children.length > 16 || children.some(c => c.kind !== 'text' || c.children?.length || !rect(c.rect) || typeof c.text !== 'string' || /[\r\n\t]/.test(c.text))) return preserve('NOT_SINGLE_LINE_DIRECT_TEXT');
    if (!rect(raw.rect) || s.display !== 'block' || !['left','start','center'].includes(s.textAlign) || !['normal','nowrap'].includes(s.whiteSpace) || s.direction && s.direction !== 'ltr' || s.writingMode && s.writingMode !== 'horizontal-tb') return preserve('PARENT_LAYOUT_UNSUPPORTED');
    // Ancestor translations are already included in viewport-measured rectangles.
    // Never apply them again; the parent and fragments still require no transform.
    if ([raw,...children].some(n => n.style?.transform !== 'none') || ancestors.some(n => !isUnscaledAncestorTransform(n.style?.transform)) || ![s.overflowX,s.overflowY].every(v => ['visible','hidden','clip'].includes(v))) return preserve('COMPOSITION_UNSUPPORTED');
    const first = children[0];
    if (fields.slice(0,9).some(f => typeof first.style?.[f] !== 'string') || children.some(c => fields.some(f => c.style?.[f] !== first.style?.[f]))) return preserve('TEXT_STYLE_NOT_UNIFORM');
    // CSS normal/nowrap can collapse ordinary spaces across text-node boundaries.
    // Keep those fragments instead of inventing a whitespace-normalization rule.
    if (children.slice(1).some((c,i) => children[i].text.endsWith(' ') && c.text.startsWith(' '))) return preserve('WHITESPACE_COLLAPSE_UNSUPPORTED');
    if (children.some(c => Math.abs(c.rect.y-first.rect.y)>0.02 || Math.abs(c.rect.height-first.rect.height)>0.02) || children.slice(1).some((c,i) => Math.abs(c.rect.x-children[i].rect.x-children[i].rect.width)>0.02)) return preserve('MEASURED_RUN_NOT_CONTIGUOUS');
    const edge = ['paddingLeft','paddingRight','borderLeftWidth','borderRightWidth'].map(f => pixels(s[f]));
    if (edge.some(n => !Number.isFinite(n))) return preserve('CONTENT_BOUNDARY_UNKNOWN');
    const left = raw.rect.x+edge[0]+edge[2], right = raw.rect.x+raw.rect.width-edge[1]-edge[3];
    if (right<=left || first.rect.x<left-0.02 || children.at(-1).rect.x+children.at(-1).rect.width>right+0.02 || first.rect.y<raw.rect.y-0.02 || first.rect.y+first.rect.height>raw.rect.y+raw.rect.height+0.02) return preserve('TEXT_OUTSIDE_CONTENT');
    const pending = (ancestors.at(-1)?.children??[]).filter(n=>n!==raw); const visited = new Set();
    while(pending.length) {
      const other=pending.pop();
      if(!other || visited.has(other) || visited.size>=25000 || !other.rect || !['x','y','width','height'].every(k=>Number.isFinite(other.rect[k]))) return preserve('SIBLING_BOUNDARY_UNKNOWN');
      visited.add(other); const r=other.rect;
      if(r.width>0 && r.height>0 && r.x<right && r.x+r.width>left && r.y<first.rect.y+first.rect.height && r.y+r.height>first.rect.y) return preserve('OVERLAPPING_SIBLING');
      for(const child of other.children??[])pending.push(child);
    }
    const targets = children.map(c => nodes.get(keys.get(`${sceneId}/${c.id}`)));
    const parentKey = keys.get(`${sceneId}/${raw.id}`);
    if (targets.some(n => !n || n.type !== 'TEXT' || n.parentKey !== parentKey || protectedKeys.has(n.key))) return preserve('MAPPING_OR_INTERACTION_UNSUPPORTED');
    if (targets.some(n => n.props.visible !== targets[0].props.visible || n.props.opacity !== targets[0].props.opacity)) return preserve('VISIBILITY_NOT_UNIFORM');
    const text = children.map(c => c.text).join('');
    if (text.length > 100000) return preserve('TEXT_BUDGET_EXCEEDED');
    const target = targets[0], previous = { x: target.x, width: target.width, characters: target.props.characters };
    // Left alignment retains the original left edge. Centering uses the whole
    // measured content area instead of centering each fragment separately.
    target.x = s.textAlign === 'center' ? left-raw.rect.x : target.x;
    target.width = right-raw.rect.x-target.x; target.props.characters = text;
    for (const n of targets.slice(1)) n.props.visible = false;
    report.changedCount++; report.hiddenFragmentCount += targets.length-1;
    report.runs.push({ sceneId,parentSourceId:raw.id,parentKey,nodeKey:target.key,sourceIds:children.map(c=>c.id),hiddenKeys:targets.slice(1).map(n=>n.key),previous,characters:text,x:target.x,width:target.width });
  }
  for (const capture of captures) {
    const sceneId = mappings.find(m=>m.sceneId===capture.id)?.sceneId;
    if (!sceneId) continue;
    const seen = new Set();
    function walk(raw, ancestors=[]) {
      if (!raw || typeof raw !== 'object' || seen.has(raw) || ancestors.length>250) return;
      seen.add(raw); attempt(raw,ancestors,sceneId);
      for (const child of raw.children??[]) walk(child,[...ancestors,raw]);
    }
    walk(capture.root);
  }
  return report;
}
