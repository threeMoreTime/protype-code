import { adaptCaptures } from './adapter.mjs';

// The new product boundary is explicit: legacy inputs must go through their
// compatibility entry point. No selector or domain-name detection occurs here.
export function adaptDOMCaptures(captures, options = {}) {
  for (const capture of captures) {
    if (capture.captureVersion !== '1.0') throw new Error('Generic capture requires captureVersion 1.0');
    const pending = [capture.root], seen = new Set();
    while (pending.length) {
      const node = pending.pop();
      if (!node || typeof node !== 'object' || seen.has(node) || seen.size >= 25000) throw new Error('Invalid capture node or node budget exceeded');
      seen.add(node);
      if (node.styleEvidence || node.attrsEvidence || node.archivedControl) throw new Error('Archived evidence requires its explicit adapter');
      pending.push(...node.children ?? []);
      if (pending.length > 25000) throw new Error('Capture node budget exceeded');
    }
  }
  return adaptCaptures(captures, options);
}
