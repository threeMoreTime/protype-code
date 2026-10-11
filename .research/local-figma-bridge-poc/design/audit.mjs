const ensure = (condition, reason) => { if (!condition) throw new Error(reason); };
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const encode = value => JSON.stringify(stable(value));
const invariantFields = ['schemaVersion', 'specId', 'specSignature', 'runId', 'status', 'writes', 'errors',
  'fileIdentity', 'scope', 'counts', 'reactions', 'flows', 'textStyles', 'variables', 'fontSubstitutions', 'timerUnit', 'checkpoint', 'playback'];

// Accept only contiguous pages of one unchanged document snapshot. There is no
// best-effort merge: edits between requests invalidate the entire observation.
export function createAuditAssembler() {
  let first = null, offset = 0, done = false, invariant;
  const nodes = [], keys = new Set(), ids = new Set();
  return {
    add(report) {
      ensure(!done, 'AUDIT_PAGE_AFTER_COMPLETE');
      const page = report?.page;
      ensure(page && Number.isInteger(page.totalNodes) && page.totalNodes > 0 && page.totalNodes <= 25000 &&
        Number.isInteger(page.offset) && page.offset === offset && Number.isInteger(page.limit) && page.limit >= 1 && page.limit <= 2000 &&
        /^[a-f0-9]{64}$/.test(page.snapshotSignature || '') && Array.isArray(report.nodes), 'AUDIT_PAGE_INVALID');
      ensure(report.counts?.nodes === page.totalNodes, 'AUDIT_PAGE_COUNT_MISMATCH');
      const current = encode(Object.fromEntries(invariantFields.map(key => [key, report[key]])));
      if (!first) { first = report; invariant = current; }
      else ensure(page.snapshotSignature === first.page.snapshotSignature && current === invariant, 'AUDIT_SNAPSHOT_CHANGED');
      ensure(report.nodes.length === Math.min(page.limit, page.totalNodes - offset), 'AUDIT_PAGE_LENGTH_MISMATCH');
      for (const node of report.nodes) {
        ensure(typeof node.key === 'string' && typeof node.id === 'string' && !keys.has(node.key) && !ids.has(node.id), 'AUDIT_DUPLICATE_NODE');
        keys.add(node.key); ids.add(node.id); nodes.push(node);
      }
      offset += report.nodes.length;
      const next = offset === page.totalNodes ? null : offset;
      ensure(page.nextOffset === next, 'AUDIT_PAGE_SEQUENCE_INVALID');
      done = next === null;
      return next;
    },
    finish() {
      ensure(done && first, 'AUDIT_INCOMPLETE');
      const { page, ...result } = first;
      return { ...result, nodes, pagination: { complete: true, totalNodes: nodes.length, snapshotSignature: page.snapshotSignature } };
    },
  };
}
