import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAuditAssembler } from '../design/audit.mjs';
const page = (offset = 0) => ({ status: 'PASS', writes: 0, counts: { nodes: 2 }, fileIdentity: { fileKey: 'test' },
  nodes: [{ id: `1:${offset}`, key: `node-${offset}` }], reactions: [], flows: [],
  page: { offset, limit: 1, totalNodes: 2, nextOffset: offset === 0 ? 1 : null, snapshotSignature: '1'.repeat(64) } });
test('audit pagination assembles only one complete contiguous snapshot', () => {
  const a = createAuditAssembler(); assert.equal(a.add(page()), 1);
  assert.throws(() => a.finish(), /AUDIT_INCOMPLETE/);
  assert.equal(a.add(page(1)), null); assert.equal(a.finish().nodes.length, 2);
  assert.equal(a.finish().pagination.complete, true);
  assert.throws(() => a.add(page(1)), /AFTER_COMPLETE/);
});
test('audit pagination refuses drift, skipped pages and duplicate stable keys', () => {
  for (const mutate of [r => { r.page.snapshotSignature = '2'.repeat(64); }, r => { r.flows.push({ nodeKey: 'node-0' }); },
    r => { r.page.offset = 3; }, r => { r.nodes[0].key = 'node-0'; }]) {
    const a = createAuditAssembler(); a.add(page()); const second = page(1); mutate(second); assert.throws(() => a.add(second));
  }
});
