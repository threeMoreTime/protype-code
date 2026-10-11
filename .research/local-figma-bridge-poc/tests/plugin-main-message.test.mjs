import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { test } from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(path.join(root, "plugin", "code.js"), "utf8");

function imageReadbackFixture() {
  const namespace = "a".repeat(24);
  const imageKey = (suffix) => `bridge-design-v1-${namespace}-image-${suffix.toString(16).padStart(24, "0")}`;
  const records = new Map();
  const recordReads = [], lookups = [];
  let writes = 0;
  const denyWrite = () => { writes += 1; throw new Error("unexpected image diagnostic write"); };
  const actualPage = { id: "1:1", type: "PAGE", name: "Target page", selection: [],
    getPluginDataKeys: () => [...records.keys()],
    getPluginData: (key) => { recordReads.push(key); return records.get(key) ?? ""; }, setPluginData: denyWrite };
  const unrelatedPage = { id: "9:1", type: "PAGE", name: "Other page", selection: [],
    getPluginDataKeys() { throw new Error("must not enumerate another page"); } };
  const fills = [{ type: "IMAGE", imageHash: "image-hash-1", scaleMode: "FILL" }];
  const node = { id: "1:3", type: "RECTANGLE", name: "Image", parent: { id: "1:2", parent: actualPage },
    get fills() { return fills; }, set fills(value) { denyWrite(); }, strokes: [], reactions: [],
    getPluginData: (key) => key === "bridge-design-v1-spec" ? namespace : "", setPluginData: denyWrite };
  const handles = new Map();
  const figma = { root: { children: [unrelatedPage, actualPage] }, currentPage: unrelatedPage,
    getNodeByIdAsync: async () => node, getImageByHash(hash) { lookups.push(hash); return handles.get(hash) ?? null; },
    createImage: denyWrite, ui: { postMessage() {} }, showUI() {}, on() {} };
  const context = { figma, __html__: "", Date, Math, Set, String };
  vm.runInNewContext(`${source}\nglobalThis.executeReadForTest = execute;`, context);
  return { namespace, imageKey, records, recordReads, lookups, actualPage, node, fills, handles, figma,
    writes: () => writes, read: () => context.executeReadForTest("scope_read_node", { payload: { targetNodeId: node.id } }) };
}

test("read-node synchronously diagnoses only target namespace image handles with zero writes or downloads", async () => {
  const fixture = imageReadbackFixture();
  for (let index = 1; index <= 3; index += 1) {
    fixture.records.set(fixture.imageKey(index), JSON.stringify({ hash: `image-hash-${index}`, signature: "b".repeat(64),
      ignoredPrivateField: "must not be returned" }));
  }
  fixture.records.set(`bridge-design-v1-${"c".repeat(24)}-image-${"d".repeat(24)}`, "foreign-private-data");
  for (let index = 0; index < 8500; index += 1) fixture.records.set(`unrelated-node-ledger-${index}`, "unrelated-private-data");
  const handle = { getBytesAsync() { throw new Error("must not download image"); },
    getSizeAsync() { throw new Error("must not download image"); } };
  fixture.handles.set("image-hash-1", handle); fixture.handles.set("image-hash-3", handle);
  const before = JSON.stringify(fixture.fills);
  const result = await fixture.read();
  const diagnostic = JSON.parse(JSON.stringify(result.imageResources));
  assert.equal(diagnostic.status, "PASS");
  assert.equal(diagnostic.imageValidity, "NOT_VERIFIED");
  assert.equal(diagnostic.verification, "METADATA_AND_SYNC_HANDLE_LOOKUP_ONLY");
  assert.equal(diagnostic.namespace, fixture.namespace);
  assert.equal(diagnostic.pageId, fixture.actualPage.id);
  assert.deepEqual(diagnostic.resources.map((record) => [record.hash, record.handleExists, record.referencedByTargetFill]),
    [["image-hash-1", true, true], ["image-hash-2", false, false], ["image-hash-3", true, false]]);
  assert.deepEqual(fixture.recordReads, [fixture.imageKey(1), fixture.imageKey(2), fixture.imageKey(3)]);
  assert.deepEqual(fixture.lookups, ["image-hash-1", "image-hash-2", "image-hash-3"]);
  assert.equal(JSON.stringify(result).includes("must not be returned"), false);
  result.imageResources.resources[0].hash = "changed-in-response";
  result.fills[0].imageHash = "changed-fill-in-response";
  assert.equal(JSON.stringify(fixture.fills), before);
  assert.equal(JSON.parse(fixture.records.get(fixture.imageKey(1))).hash, "image-hash-1");
  assert.equal(fixture.writes(), 0);
});

test("read-node image diagnostics report missing APIs and invalid namespace without broad metadata reads", async () => {
  for (const missingApi of ["getPluginDataKeys", "getImageByHash"]) {
    const fixture = imageReadbackFixture();
    if (missingApi === "getPluginDataKeys") delete fixture.actualPage.getPluginDataKeys;
    else delete fixture.figma.getImageByHash;
    const result = await fixture.read();
    assert.equal(result.imageResources.status, "NOT_VERIFIED_API_UNAVAILABLE");
    assert.equal(Object.hasOwn(result.imageResources, "resources"), false);
    assert.deepEqual(fixture.recordReads, []); assert.deepEqual(fixture.lookups, []);
    assert.equal(fixture.writes(), 0);
  }
  for (const [namespace, status] of [["", "NOT_VERIFIED_NO_DESIGN_NAMESPACE"], ["../../foreign", "NOT_VERIFIED_INVALID_NAMESPACE"]]) {
    const fixture = imageReadbackFixture();
    fixture.node.getPluginData = () => namespace;
    assert.equal((await fixture.read()).imageResources.status, status);
    assert.deepEqual(fixture.recordReads, []); assert.deepEqual(fixture.lookups, []);
    assert.equal(fixture.writes(), 0);
  }
});

test("read-node image diagnostics fail closed on malformed records without exposing partial data", async () => {
  for (const text of ["{bad json", "null", "[]", JSON.stringify({ hash: "", signature: "b".repeat(64) }),
    JSON.stringify({ hash: "image-hash-1", signature: "invalid" })]) {
    const fixture = imageReadbackFixture();
    fixture.records.set(fixture.imageKey(1), text);
    const diagnostic = (await fixture.read()).imageResources;
    assert.equal(diagnostic.status, "NOT_VERIFIED_MALFORMED_RECORD");
    assert.equal(diagnostic.recordKey, fixture.imageKey(1));
    assert.equal(Object.hasOwn(diagnostic, "resources"), false);
    assert.deepEqual(fixture.lookups, []); assert.equal(fixture.writes(), 0);
  }
  const fixture = imageReadbackFixture();
  fixture.records.set(fixture.imageKey(1), JSON.stringify({ hash: "image-hash-1", signature: "b".repeat(64) }));
  fixture.records.set(fixture.imageKey(2), "bad-private-value");
  const diagnostic = (await fixture.read()).imageResources;
  assert.equal(diagnostic.status, "NOT_VERIFIED_MALFORMED_RECORD");
  assert.equal(Object.hasOwn(diagnostic, "resources"), false, "a good prefix must not masquerade as complete evidence");
  assert.equal(JSON.stringify(diagnostic).includes("bad-private-value"), false);
  assert.equal(fixture.writes(), 0);
});

test("read-node image diagnostics reject record count and payload budgets without truncating resources", async () => {
  const fixture = imageReadbackFixture();
  for (let index = 0; index <= 2000; index += 1) fixture.records.set(fixture.imageKey(index), "{}");
  let diagnostic = (await fixture.read()).imageResources;
  assert.equal(diagnostic.status, "NOT_VERIFIED_BUDGET_EXCEEDED");
  assert.equal(diagnostic.budgetRecords, 2000);
  assert.equal(Object.hasOwn(diagnostic, "resources"), false);
  assert.deepEqual(fixture.recordReads, []); assert.deepEqual(fixture.lookups, []);
  fixture.records.clear(); fixture.records.set(fixture.imageKey(1), "x".repeat(4097));
  diagnostic = (await fixture.read()).imageResources;
  assert.equal(diagnostic.status, "NOT_VERIFIED_BUDGET_EXCEEDED");
  assert.equal(diagnostic.budgetRecordCharacters, 4096);
  assert.equal(Object.hasOwn(diagnostic, "resources"), false);
  assert.deepEqual(fixture.lookups, []); assert.equal(fixture.writes(), 0);
  fixture.records.clear(); fixture.recordReads.length = 0;
  for (let index = 0; index < 2000; index += 1) fixture.records.set(fixture.imageKey(index),
    JSON.stringify({ hash: "h".repeat(128), signature: "b".repeat(64) }));
  diagnostic = (await fixture.read()).imageResources;
  assert.equal(diagnostic.status, "NOT_VERIFIED_BUDGET_EXCEEDED");
  assert.equal(diagnostic.budgetCharacters, 512 * 1024);
  assert.equal(Object.hasOwn(diagnostic, "resources"), false, "response overflow must not return a truncated resource list");
  assert.equal(fixture.recordReads.length, 2000);
  assert.equal(fixture.writes(), 0);
});

test("read-node image diagnostics distinguish an unavailable host lookup from a missing image handle", async () => {
  const fixture = imageReadbackFixture();
  fixture.records.set(fixture.imageKey(1), JSON.stringify({ hash: "image-hash-1", signature: "b".repeat(64) }));
  fixture.figma.getImageByHash = () => { throw new Error("private native error details"); };
  const diagnostic = (await fixture.read()).imageResources;
  assert.equal(diagnostic.status, "NOT_VERIFIED_HOST_ERROR");
  assert.equal(Object.hasOwn(diagnostic, "resources"), false);
  assert.equal(JSON.stringify(diagnostic).includes("private native error details"), false);
  assert.equal(fixture.writes(), 0);
});

function prototypeReadbackFixture() {
  const namespace = "e".repeat(24), sourceKey = "menu/item", records = new Map(), reads = [];
  let writes = 0;
  const denyWrite = () => { writes += 1; throw new Error("unexpected prototype diagnostic write"); };
  const page = { id: "2:1", type: "PAGE", name: "Target", selection: [], children: [],
    flowStartingPoints: [{ name: "Flow 1", nodeId: "2:2" }, { name: "Flow 2", nodeId: "2:3" }],
    getPluginData: key => { reads.push(key); return records.get(key) ?? ""; }, setPluginData: denyWrite,
    getPluginDataKeys() { throw new Error("must not enumerate any PAGE metadata"); } };
  const node = { id: "2:4", type: "FRAME", name: "Source", parent: { id: "2:3", type: "FRAME", parent: page },
    fills: [], strokes: [], reactions: [], getPluginData: key => key === "bridge-design-v1-spec" ? namespace :
      key === "local-codex-figma-bridge-poc-spec-node-key" ? sourceKey : "", setPluginData: denyWrite };
  const otherPage = { id: "9:1", type: "PAGE", name: "Other", selection: [], getPluginData: denyWrite };
  const figma = { root: { children: [page, otherPage] }, currentPage: page, getNodeByIdAsync: async () => node,
    createImage: denyWrite, createFrame: denyWrite, ui: { postMessage() {} }, showUI() {}, on() {} };
  const context = { figma, __html__: "", Date, Math, Set, String };
  vm.runInNewContext(`${source}\nglobalThis.executeReadForTest = execute; globalThis.signatureForTest = BridgeDesignRuntime.designSignature;`, context);
  const ledgerKey = `bridge-design-v1-${namespace}-ledger`;
  const reactionKey = `bridge-design-v1-${namespace}-reactions-${context.signatureForTest(sourceKey).slice(0, 24)}`;
  const ledger = { cursor: 13193, finalizeCursor: 584, pending: { kind: "reactions", key: sourceKey,
    startedAt: "2026-10-09T10:45:17.506Z", operationId: "op-current", flowBefore: [{ name: "Flow 1", nodeKey: "old/scene", nodeId: "2:2" }],
    privatePendingField: "private-value" }, nativeFlowObservation: { version: 1, sourceKey: "old/button", topLevelKey: "old/scene",
      before: [], after: [{ name: "Flow 1", nodeKey: "old/scene" }], reactionDigest: "a".repeat(64), operationId: "op-first",
      observedAt: "2026-10-09T10:44:00.000Z", privateObservationField: "private-value" }, secret: "private-value" };
  records.set(ledgerKey, JSON.stringify(ledger));
  return { namespace, sourceKey, records, reads, page, otherPage, node, figma, ledgerKey, reactionKey, ledger,
    writes: () => writes, read: async (targetNodeId = node.id) => JSON.parse(JSON.stringify(await context.executeReadForTest("scope_read_node", { payload: { targetNodeId } }))) };
}

test("prototype diagnostics read exact namespace checkpoints and missing reaction records without writes or private fields", async () => {
  const f = prototypeReadbackFixture(), before = JSON.stringify(f.ledger), flowsBefore = JSON.stringify(f.page.flowStartingPoints);
  f.records.set(`bridge-design-v1-${"f".repeat(24)}-ledger`, "foreign-private-value");
  const result = await f.read(), state = result.prototypeState;
  assert.equal(state.status, "PASS"); assert.equal(state.designState.status, "PASS");
  assert.deepEqual(state.flowStartingPoints, f.page.flowStartingPoints);
  assert.equal(state.designState.cursor, 13193); assert.equal(state.designState.finalizeCursor, 584);
  assert.equal(state.designState.pending.key, f.sourceKey); assert.equal(state.designState.pending.operationId, "op-current");
  assert.equal(state.designState.pending.flowAfterState, "NOT_RECORDED"); assert.equal(state.designState.pending.flowAfter, null);
  assert.equal(state.designState.pending.reactionReadbackState, "NOT_RECORDED"); assert.equal(state.designState.pending.reactionReadback, null);
  assert.deepEqual(state.designState.sourceReactionRecord, { status: "MISSING" });
  assert.equal(state.designState.nativeFlowObservation.operationId, "op-first");
  assert.deepEqual(f.reads, [f.ledgerKey, f.reactionKey]);
  assert.equal(JSON.stringify(result).includes("private-value"), false);
  state.flowStartingPoints[0].name = "changed-response"; state.designState.pending.key = "changed-response";
  assert.equal(JSON.stringify(f.page.flowStartingPoints), flowsBefore); assert.equal(f.records.get(f.ledgerKey), before);
  f.records.set(f.reactionKey, JSON.stringify({ version: 2, digest: "b".repeat(64), secret: "private-value" }));
  assert.deepEqual((await f.read()).prototypeState.designState.sourceReactionRecord, { status: "PRESENT", version: 2, digest: "b".repeat(64) });
  assert.equal(f.writes(), 0);
});

test("prototype diagnostics report pending reaction receipts without promoting rejected flow changes or accepting malformed receipts", async () => {
  const f = prototypeReadbackFixture();
  f.ledger.pending.flowAfter = [{ name: "Flow 1", nodeKey: "old/scene", nodeId: "2:2" }, { name: "Flow 2", nodeKey: "menu/scene", nodeId: "2:3" }];
  f.ledger.pending.reactionReadback = { version: 1, sourceKey: f.sourceKey, sourceId: f.node.id, topLevelKey: "menu/scene",
    digest: "c".repeat(64), operationId: "op-current", observedAt: "2026-10-09T10:45:17.600Z", privateReceipt: "private-value" };
  f.records.set(f.ledgerKey, JSON.stringify(f.ledger));
  const state = (await f.read()).prototypeState.designState;
  assert.equal(state.status, "PASS"); assert.equal(state.pending.flowAfterState, "RECORDED");
  assert.equal(state.pending.reactionReadbackState, "RECORDED");
  assert.deepEqual(state.pending.flowAfter, f.ledger.pending.flowAfter); assert.equal(state.pending.reactionReadback.digest, "c".repeat(64));
  assert.deepEqual(state.sourceReactionRecord, { status: "MISSING" }, "a diagnostic receipt must not become a successful mutation record");
  assert.equal(state.nativeFlowObservation.after.length, 1, "the rejected new Flow 2 is not added to accepted observations");
  assert.equal(JSON.stringify(state).includes("private-value"), false);
  f.ledger.pending.reactionReadback.sourceKey = "different/source";
  f.records.set(f.ledgerKey, JSON.stringify(f.ledger));
  const invalid = (await f.read()).prototypeState.designState;
  assert.equal(invalid.status, "NOT_VERIFIED_MALFORMED_REACTION_READBACK"); assert.equal(Object.hasOwn(invalid, "pending"), false);
  assert.equal(f.writes(), 0);
});

test("prototype diagnostics return only bounded flows on the active PAGE and never read foreign PAGE ledgers", async () => {
  const f = prototypeReadbackFixture();
  f.page.getPluginData = () => "";
  const pageState = (await f.read(f.page.id)).prototypeState;
  assert.equal(pageState.status, "PASS"); assert.deepEqual(pageState.flowStartingPoints, f.page.flowStartingPoints);
  assert.equal(Object.hasOwn(pageState, "designState"), false); assert.deepEqual(f.reads, []);
  f.figma.currentPage = f.otherPage;
  const inactive = (await f.read()).prototypeState;
  assert.equal(inactive.status, "NOT_VERIFIED_INACTIVE_PAGE");
  assert.equal(Object.hasOwn(inactive, "flowStartingPoints"), false); assert.equal(Object.hasOwn(inactive, "designState"), false);
  assert.deepEqual(f.reads, []); assert.equal(f.writes(), 0);
});

test("prototype diagnostics expose bounded v2 receipt chains with legacy entries and no private fields", async () => {
  const f = prototypeReadbackFixture(), first = structuredClone(f.ledger.nativeFlowObservation);
  const next = { ...structuredClone(first), version: 2, provenance: "NATIVE_SETTER_READBACK", sourceKey: f.sourceKey,
    topLevelKey: "menu/scene", before: first.after, after: [{ ...first.after[0] }, { name: "Flow 2", nodeKey: "menu/scene" }],
    operationId: "op-next", secret: "private-value" };
  next.reactionReadback = { version: 1, sourceKey: next.sourceKey, sourceId: f.node.id,
    topLevelKey: next.topLevelKey, digest: next.reactionDigest, operationId: next.operationId,
    observedAt: next.observedAt, secret: "private-value" };
  f.ledger.nativeFlowObservation = { version: 2, entries: [first, next], secret: "private-value" };
  f.records.set(f.ledgerKey, JSON.stringify(f.ledger));
  const result = await f.read(), observation = result.prototypeState.designState.nativeFlowObservation;
  assert.equal(result.prototypeState.designState.status, "PASS");
  assert.equal(observation.version, 2); assert.equal(observation.entries.length, 2);
  assert.equal(observation.entries[1].reactionReadback.sourceId, f.node.id);
  assert.equal(observation.chainVerification, "NOT_VERIFIED_METADATA_ONLY");
  assert.equal(JSON.stringify(result).includes("private-value"), false);
  assert.deepEqual(f.reads, [f.ledgerKey, f.reactionKey]); assert.equal(f.writes(), 0);
  next.reactionReadback.operationId = "op-foreign";
  f.records.set(f.ledgerKey, JSON.stringify(f.ledger));
  const invalid = (await f.read()).prototypeState.designState;
  assert.equal(invalid.status, "NOT_VERIFIED_MALFORMED_REACTION_READBACK");
  assert.equal(Object.hasOwn(invalid, "nativeFlowObservation"), false); assert.equal(f.writes(), 0);
});

test("prototype v2 adoption diagnostics label current-state adoption separately from native setter evidence", async () => {
  const f = prototypeReadbackFixture(), first = structuredClone(f.ledger.nativeFlowObservation);
  const payload = { pendingOperationId: f.ledger.pending.operationId,
    flowSnapshotSignature: "c".repeat(64), reactionSnapshotSignature: "d".repeat(64) };
  const entry = { ...first, version: 2, provenance: "EXPLICIT_READBACK_ADOPTION", sourceKey: f.sourceKey,
    topLevelKey: "menu/scene", before: first.after, after: [{ ...first.after[0] }, { name: "Flow 2", nodeKey: "menu/scene" }],
    operationId: "op-recover", reactionReadback: null, recovery: { legacyPending: structuredClone(f.ledger.pending),
      operationId: "op-recover", observedAt: first.observedAt, explicitPayload: payload,
      expectedFlowSnapshotSignature: payload.flowSnapshotSignature,
      expectedReactionSnapshotSignature: payload.reactionSnapshotSignature,
      verification: "CURRENT_STATE_ADOPTED_NOT_ORIGIN_PROVED", secret: "private-value" } };
  f.ledger.nativeFlowObservation = { version: 2, entries: [first, entry] };
  f.records.set(f.ledgerKey, JSON.stringify(f.ledger));
  const result = await f.read();
  assert.equal(result.prototypeState.designState.status, "PASS");
  const actual = result.prototypeState.designState.nativeFlowObservation.entries[1];
  assert.equal(actual.reactionReadback, null);
  assert.equal(actual.recovery.verification, "CURRENT_STATE_ADOPTED_NOT_ORIGIN_PROVED");
  assert.equal(actual.recovery.legacyPending.operationId, f.ledger.pending.operationId);
  assert.equal(Object.hasOwn(actual.recovery.legacyPending, "flowAfter"), false);
  assert.equal(JSON.stringify(result).includes("private-value"), false); assert.equal(f.writes(), 0);
  payload.pendingOperationId = "op-wrong";
  f.records.set(f.ledgerKey, JSON.stringify(f.ledger));
  assert.equal((await f.read()).prototypeState.designState.status, "NOT_VERIFIED_MALFORMED_FLOW_ADOPTION");
});

test("prototype diagnostics fail closed on malformed or oversized ledgers without exposing partial checkpoints", async () => {
  const samples = ["{bad-private-json", "[]", "null", "x".repeat(256 * 1024 + 1),
    JSON.stringify({ ...prototypeReadbackFixture().ledger, secret: "中".repeat(100000) }),
    JSON.stringify({ cursor: -1, pending: null }),
    JSON.stringify({ cursor: 1, pending: { kind: "unknown-private-kind", key: "menu/item" } })];
  for (const text of samples) {
    const f = prototypeReadbackFixture(); f.records.set(f.ledgerKey, text);
    const state = (await f.read()).prototypeState;
    assert.equal(state.status, "PASS", "complete native flows are separate from unverified ledger data");
    assert.match(state.designState.status, /^NOT_VERIFIED_/);
    assert.equal(Object.hasOwn(state.designState, "pending"), false); assert.equal(Object.hasOwn(state.designState, "cursor"), false);
    assert.equal(JSON.stringify(state).includes("private-kind"), false);
    assert.deepEqual(f.reads, [f.ledgerKey]); assert.equal(f.writes(), 0);
  }
  const f = prototypeReadbackFixture(); f.records.set(f.reactionKey, JSON.stringify({ digest: "invalid-private-value" }));
  const state = (await f.read()).prototypeState.designState;
  assert.equal(state.status, "NOT_VERIFIED_MALFORMED_REACTION_RECORD"); assert.equal(Object.hasOwn(state, "pending"), false);
  assert.equal(f.writes(), 0);
});

test("prototype diagnostics reject flow count, field lengths and observation schemas without truncating or clearing data", async () => {
  for (const flows of [Array.from({ length: 1001 }, () => ({ name: "Flow", nodeId: "2:2" })),
    [{ name: "x".repeat(257), nodeId: "2:2" }], [{ name: "Flow", nodeId: "private-invalid-id" }]]) {
    const f = prototypeReadbackFixture(); f.page.flowStartingPoints = flows;
    const state = (await f.read()).prototypeState;
    assert.match(state.status, /^NOT_VERIFIED_/); assert.equal(Object.hasOwn(state, "flowStartingPoints"), false);
    assert.deepEqual(f.reads, []); assert.deepEqual(f.page.flowStartingPoints, flows); assert.equal(f.writes(), 0);
  }
  const f = prototypeReadbackFixture(); f.ledger.nativeFlowObservation.after[0].nodeKey = "x".repeat(161);
  f.records.set(f.ledgerKey, JSON.stringify(f.ledger));
  assert.equal((await f.read()).prototypeState.designState.status, "NOT_VERIFIED_MALFORMED_FLOW");
  assert.deepEqual(f.reads, [f.ledgerKey]); assert.equal(f.writes(), 0);
});

test("read-node exposes pending native vector geometry without writes and refuses oversized paths", async () => {
  const page = { id: "1:1", name: "Test page", selection: [] };
  const vector = { id: "1:2", type: "VECTOR", name: "Pending vector", parent: page, x: 3, y: 4, width: 10, height: 12,
    vectorPaths: [{ windingRule: "NONZERO", data: "M 0 0 L 10 12 Z" }], getPluginData: () => "", reactions: [] };
  const figma = { root: { children: [page] }, currentPage: page, getNodeByIdAsync: async () => vector,
    ui: { postMessage() {} }, showUI() {}, on() {} };
  const context = { figma, __html__: "", Date, Math, Set, String };
  vm.runInNewContext(`${source}\nglobalThis.executeReadForTest = execute;`, context);
  const result = await context.executeReadForTest("scope_read_node", { payload: { targetNodeId: vector.id } });
  assert.deepEqual(JSON.parse(JSON.stringify(result.vectorPaths)), vector.vectorPaths);
  assert.equal(result.vectorPathsReadback, "PASS");
  assert.equal(result.x, 3); assert.equal(result.y, 4);
  assert.equal(result.createdOperationId, "");
  vector.vectorPaths = [{ windingRule: "NONZERO", data: "M 0 0 " + "L 1 1 ".repeat(100000) }];
  const oversized = await context.executeReadForTest("scope_read_node", { payload: { targetNodeId: vector.id } });
  assert.equal(oversized.vectorPathsReadback, "NOT_VERIFIED_BUDGET_EXCEEDED");
  assert.equal(oversized.vectorPaths, undefined);
});

test("read-node returns complete native paints, variable aliases and host opacity without writes", async () => {
  const page = { id: "1:1", name: "Test page", selection: [] };
  const fills = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: Math.fround(0.4),
    visible: true, blendMode: "NORMAL", boundVariables: { color: { type: "VARIABLE_ALIAS", id: "VariableID:2:3" } } }];
  const strokes = [{ type: "SOLID", color: { r: 1, g: 0.25, b: 0.5 }, opacity: 0.75, visible: false }];
  const before = JSON.stringify({ fills, strokes });
  let writes = 0;
  const node = { id: "1:2", type: "FRAME", name: "Pending paint", parent: page, reactions: [],
    get fills() { return fills; }, set fills(value) { writes += 1; throw new Error("unexpected fill write"); },
    get strokes() { return strokes; }, set strokes(value) { writes += 1; throw new Error("unexpected stroke write"); },
    getPluginData: () => "", setPluginData() { writes += 1; throw new Error("unexpected metadata write"); } };
  const figma = { root: { children: [page] }, currentPage: page, getNodeByIdAsync: async () => node,
    ui: { postMessage() {} }, showUI() {}, on() {} };
  const context = { figma, __html__: "", Date, Math, Set, String };
  vm.runInNewContext(`${source}\nglobalThis.executeReadForTest = execute;`, context);
  const result = await context.executeReadForTest("scope_read_node", { payload: { targetNodeId: node.id } });
  assert.equal(result.paintsReadback, "PASS");
  assert.deepEqual(JSON.parse(JSON.stringify(result.fills)), fills);
  assert.deepEqual(JSON.parse(JSON.stringify(result.strokes)), strokes);
  assert.equal(result.fills[0].opacity, Math.fround(0.4));
  result.fills[0].color.r = 1;
  result.fills[0].boundVariables.color.id = "changed-in-response";
  assert.equal(JSON.stringify({ fills, strokes }), before, "diagnostics must neither mutate nor alias native paints");
  assert.equal(writes, 0);
});

test("read-node rejects the combined paint budget without returning truncated fills or strokes", async () => {
  const page = { id: "1:1", name: "Test page", selection: [] };
  const paint = { type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 0.4,
    boundVariables: { color: { type: "VARIABLE_ALIAS", id: "VariableID:2:3" } } };
  const fills = Array.from({ length: 2000 }, () => paint);
  const strokes = Array.from({ length: 2000 }, () => paint);
  assert.ok(JSON.stringify(fills).length <= 512 * 1024);
  assert.ok(JSON.stringify(strokes).length <= 512 * 1024);
  assert.ok(JSON.stringify({ fills, strokes }).length > 512 * 1024);
  const node = { id: "1:2", type: "FRAME", name: "Large paints", parent: page, fills, strokes,
    reactions: [], getPluginData: () => "", setPluginData() { throw new Error("unexpected metadata write"); } };
  const figma = { root: { children: [page] }, currentPage: page, getNodeByIdAsync: async () => node,
    ui: { postMessage() {} }, showUI() {}, on() {} };
  const context = { figma, __html__: "", Date, Math, Set, String };
  vm.runInNewContext(`${source}\nglobalThis.executeReadForTest = execute;`, context);
  const result = await context.executeReadForTest("scope_read_node", { payload: { targetNodeId: node.id } });
  assert.equal(result.paintsReadback, "NOT_VERIFIED_BUDGET_EXCEEDED");
  assert.equal(Object.hasOwn(result, "fills"), false);
  assert.equal(Object.hasOwn(result, "strokes"), false);
  assert.equal(node.fills.length, 2000);
  assert.equal(node.strokes.length, 2000);
  node.fills = [paint]; node.strokes = [];
  const small = await context.executeReadForTest("scope_read_node", { payload: { targetNodeId: node.id } });
  assert.equal(small.paintsReadback, "PASS");
  assert.deepEqual(JSON.parse(JSON.stringify(small.fills)), [paint]);
  assert.deepEqual(JSON.parse(JSON.stringify(small.strokes)), []);
});

test("plugin main sends a direct message that Figma exposes as event.data.pluginMessage", async () => {
  const sent = [];
  const page = { id: "1:1", name: "Test page", selection: [] };
  const storage = new Map();
  const figma = {
    root: { id: "0:0", name: "Isolated test file", children: [page] },
    currentPage: page,
    clientStorage: { async getAsync(key) { return storage.get(key); }, async setAsync(key, value) { storage.set(key, value); } },
    ui: { postMessage: (message) => sent.push(message), onmessage: null },
    showUI: () => {},
    on: () => {},
  };
  vm.runInNewContext(source, { figma, __html__: "", Date, Math, Set, String });
  await figma.ui.onmessage({ type: "bridge-initialize" });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].type, "bridge-hello");
  assert.equal(sent[0].documentName, "Isolated test file");
  assert.equal(sent[0].mutationAuditVersion, "8.0-F");
});

test("plugin main returns the logical operationId with the transport requestId", () => {
  const sent = [];
  const page = { id: "1:1", name: "Test page", selection: [] };
  const figma = {
    root: { id: "0:0", name: "Dedicated test file", children: [page] }, currentPage: page,
    fileKey: "test-key", ui: { postMessage: (message) => sent.push(message), onmessage: null },
    showUI() {}, on() {},
  };
  const context = { figma, __html__: "", Date, Math, Set, String };
  vm.runInNewContext(`${source}\nglobalThis.respondForTest = respond;`, context);
  context.respondForTest({ requestId: "req-1", operationId: "op-test-12345678" }, true, { id: "1:2" });
  assert.equal(sent[0].requestId, "req-1");
  assert.equal(sent[0].operationId, "op-test-12345678");
});

test("plugin client identity persists through Figma clientStorage across main-thread restarts", async () => {
  const storage = new Map();
  const runPluginMain = async () => {
    const sent = [];
    const page = { id: "1:1", name: "Test page", selection: [] };
    const figma = {
      root: { id: "0:0", name: "Isolated test file", children: [page] },
      currentPage: page,
      fileKey: "pairing-test-key",
      clientStorage: {
        async getAsync(key) { return storage.get(key); },
        async setAsync(key, value) { storage.set(key, value); },
      },
      ui: { postMessage: (message) => sent.push(message), onmessage: null },
      showUI() {}, on() {},
    };
    vm.runInNewContext(source, { figma, __html__: "", Date, Math, Set, String });
    await figma.ui.onmessage({ type: "bridge-initialize" });
    return sent[0];
  };

  const first = await runPluginMain();
  const second = await runPluginMain();
  assert.match(first.clientId, /^client-[a-z0-9-]+$/);
  assert.equal(second.clientId, first.clientId);
  assert.equal(storage.get("local-codex-figma-bridge-poc-client-id"), first.clientId);
});

test("plugin main persists a pairing record through clientStorage without exposing it in status", async () => {
  const storage = new Map();
  const runPluginMain = async () => {
    const sent = [];
    const page = { id: "1:1", name: "Test page", selection: [] };
    const figma = {
      root: { id: "0:0", name: "Isolated test file", children: [page] },
      currentPage: page,
      fileKey: "pairing-test-key",
      clientStorage: { async getAsync(key) { return storage.get(key); }, async setAsync(key, value) { storage.set(key, value); } },
      ui: { postMessage: (message) => sent.push(message), onmessage: null },
      showUI() {}, on() {},
    };
    vm.runInNewContext(source, { figma, __html__: "", Date, Math, Set, String });
    await figma.ui.onmessage({ type: "bridge-initialize" });
    return { figma, sent };
  };

  const first = await runPluginMain();
  const clientId = first.sent[0].clientId;
  const pairingRecord = { serverId: "server-test-1", clientId, pairingId: "pair-test-1", secret: "A".repeat(43) };
  await first.figma.ui.onmessage({ type: "pairing-persist", clientId, pairingRecord });
  assert.equal(first.sent.at(-1).type, "pairing-stored");
  assert.deepEqual(storage.get("local-codex-figma-bridge-poc-pairing"), pairingRecord);

  const second = await runPluginMain();
  assert.equal(second.sent[0].clientId, clientId);
  assert.deepEqual(second.sent[0].pairingRecord, pairingRecord);
  assert.equal(second.sent[0].pairingState, "paired");
  assert.equal(JSON.stringify(second.sent[0]).includes(pairingRecord.secret), true,
    "the bridge hello carries the secret privately to the plugin UI for HMAC; status omits it");
});

test("a read-back summary includes parent, font, and ownership evidence", () => {
  const page = { id: "1:1", name: "Test page", selection: [] };
  const figma = {
    root: { id: "0:0", name: "Isolated test file", children: [page] },
    currentPage: page,
    ui: { postMessage() {}, onmessage: null },
    showUI() {}, on() {},
  };
  const context = { figma, __html__: "", Date, Math, Set, String };
  vm.runInNewContext(`${source}\nglobalThis.summarizeForTest = summarizeNode;`, context);
  const text = {
    id: "1:3", type: "TEXT", name: "POC title", characters: "Local Codex → Local Figma",
    parent: { id: "1:2" }, fontName: { family: "Inter", style: "Regular" },
    getPluginData(key) {
      return key.endsWith("-owner") ? "local-codex-figma-bridge-poc" : "poc-text";
    },
  };
  const summary = context.summarizeForTest(text);
  assert.equal(summary.parentId, "1:2");
  assert.equal(summary.fontName.family, "Inter");
  assert.equal(summary.owner, "local-codex-figma-bridge-poc");
});

function textTypographyReadbackFixture(overrides = {}) {
  let writes = 0;
  const denyWrite = () => { writes += 1; throw new Error("unexpected typography write"); };
  const page = { id: "1:1", type: "PAGE", name: "Measurement page", selection: [] };
  const values = { fontName: { family: "Arial", style: "Regular" }, fontSize: 13.3333,
    lineHeight: { unit: "PIXELS", value: 20 }, letterSpacing: { unit: "PIXELS", value: -0.25 },
    textAutoResize: "WIDTH_AND_HEIGHT", hasMissingFont: false, textAlignHorizontal: "LEFT", ...overrides };
  const node = { id: "1:3", type: "TEXT", name: "Natural width", characters: "备注",
    width: 26.6875, height: 20, x: 8, y: 12, parent: page, fills: [], strokes: [], reactions: [],
    getPluginData: () => "", setPluginData: denyWrite };
  for (const field of Object.keys(values)) Object.defineProperty(node, field, {
    get: () => values[field], set: denyWrite, configurable: true,
  });
  const figma = { mixed: Symbol("figma.mixed"), root: { children: [page] }, currentPage: page,
    getNodeByIdAsync: async (id) => { assert.equal(id, node.id); return node; },
    clientStorage: { getAsync() { throw new Error("must not read authentication storage"); } },
    ui: { postMessage() {} }, showUI() {}, on() {} };
  const context = { figma, __html__: "", Date, Math, Set, String };
  vm.runInNewContext(`${source}\nglobalThis.executeReadForTest = execute;`, context);
  return { node, values, figma, writes: () => writes,
    read: async () => JSON.parse(JSON.stringify(await context.executeReadForTest("scope_read_node", {
      payload: { targetNodeId: node.id },
    }))) };
}

test("read-node returns actual serializable typography without writes or assumed font metrics", async () => {
  const fixture = textTypographyReadbackFixture();
  const result = await fixture.read();
  assert.equal(result.typographyReadback, "PASS");
  for (const field of Object.keys(fixture.values)) {
    assert.deepEqual(result[field], fixture.values[field]);
    assert.equal(result.typographyFieldReadback[field], "PASS");
  }
  assert.equal(result.width, 26.6875);
  assert.equal(result.height, 20);
  result.fontName.family = "changed response";
  result.lineHeight.value = 100;
  result.letterSpacing.value = 10;
  assert.deepEqual((await fixture.read()).fontName, { family: "Arial", style: "Regular" });
  assert.deepEqual((await fixture.read()).lineHeight, { unit: "PIXELS", value: 20 });
  assert.deepEqual((await fixture.read()).letterSpacing, { unit: "PIXELS", value: -0.25 });
  assert.equal(fixture.writes(), 0);
});

test("read-node explicitly preserves mixed typography through JSON serialization", async () => {
  const fixture = textTypographyReadbackFixture();
  for (const field of ["fontName", "fontSize", "lineHeight", "letterSpacing"]) {
    fixture.values[field] = fixture.figma.mixed;
  }
  const result = await fixture.read();
  assert.equal(result.typographyReadback, "NOT_VERIFIED");
  for (const field of ["fontName", "fontSize", "lineHeight", "letterSpacing"]) {
    assert.equal(result[field], "MIXED");
    assert.equal(result.typographyFieldReadback[field], "MIXED");
  }
  assert.equal(result.textAutoResize, "WIDTH_AND_HEIGHT");
  assert.equal(result.hasMissingFont, false);
  assert.equal(fixture.writes(), 0);
});

test("read-node distinguishes unavailable, unreadable and invalid typography without leaking getter errors", async () => {
  const fixture = textTypographyReadbackFixture({ letterSpacing: { unit: "PIXELS", value: NaN },
    textAutoResize: undefined, hasMissingFont: true });
  delete fixture.node.fontSize;
  Object.defineProperty(fixture.node, "lineHeight", { get() { throw new Error("private getter message"); } });
  const result = await fixture.read();
  assert.equal(result.typographyReadback, "NOT_VERIFIED");
  for (const [field, status] of [["fontSize", "NOT_VERIFIED_UNSUPPORTED"],
    ["lineHeight", "NOT_VERIFIED_READ_ERROR"], ["letterSpacing", "NOT_VERIFIED_INVALID"],
    ["textAutoResize", "NOT_VERIFIED_UNSUPPORTED"]]) {
    assert.equal(result[field], status);
    assert.equal(result.typographyFieldReadback[field], status);
  }
  assert.equal(result.hasMissingFont, true);
  assert.equal(result.typographyFieldReadback.hasMissingFont, "PASS");
  assert.equal(JSON.stringify(result).includes("private getter message"), false);
  assert.deepEqual(result.fontName, { family: "Arial", style: "Regular" });
  assert.equal(fixture.writes(), 0);
});

test("ownership marker uses the required owner value and rejects foreign nodes", () => {
  const page = { id: "1:1", name: "Test page", selection: [] };
  const figma = {
    root: { id: "0:0", name: "Isolated test file", children: [page] },
    currentPage: page,
    ui: { postMessage() {}, onmessage: null },
    showUI() {}, on() {},
  };
  const context = { figma, __html__: "", Date, Math, Set, String };
  vm.runInNewContext(`${source}\nglobalThis.markOwnedForTest = markOwned; globalThis.isOwnedForTest = isOwned;`, context);
  const data = new Map();
  const node = { setPluginData: (key, value) => data.set(key, value), getPluginData: (key) => data.get(key) || "" };
  context.markOwnedForTest(node, "poc-frame");
  assert.equal(data.get("local-codex-figma-bridge-poc-owner"), "local-codex-figma-bridge-poc");
  assert.equal(context.isOwnedForTest(node), true);
  data.set("local-codex-figma-bridge-poc-owner", "foreign-owner");
  assert.equal(context.isOwnedForTest(node), false);
});

test("renaming a session-only file cannot create stable write authorization", async () => {
  const sent = [];
  let createPageCalls = 0;
  const page = { id: "0:1", name: "Page 1", selection: [] };
  const storage = new Map();
  const figma = {
    root: { id: "0:0", name: "Synthetic protected design", children: [page] },
    currentPage: page,
    clientStorage: { async getAsync(key) { return storage.get(key); }, async setAsync(key, value) { storage.set(key, value); } },
    ui: { postMessage: (message) => sent.push(message), onmessage: null },
    showUI() {}, on() {},
    createPage() { createPageCalls += 1; throw new Error("createPage must not run"); },
  };
  vm.runInNewContext(source, { figma, __html__: "", Date, Math, Set, String });
  await figma.ui.onmessage({ type: "bridge-initialize" });
  const initialHello = sent.at(-1);
  assert.equal(initialHello.fileIdentityQuality, "session-only");
  figma.root.name = "Renamed synthetic design";
  await figma.ui.onmessage({ type: "bridge-initialize" });
  const hello = sent.at(-1);
  assert.notEqual(hello.fileIdentity, initialHello.fileIdentity);
  assert.equal(hello.fileIdentityQuality, "session-only");
  await figma.ui.onmessage({ type: "connection-ready", workspaceId: hello.workspaceId,
    taskId: hello.taskId, sessionId: hello.sessionId, clientId: hello.clientId,
    fileIdentity: hello.fileIdentity, connectionId: "test-connection" });
  await figma.ui.onmessage({ type: "plugin-command", workspaceId: hello.workspaceId,
    taskId: hello.taskId, sessionId: hello.sessionId, fileIdentity: hello.fileIdentity,
    connectionId: "test-connection", requestId: "unstable-identity-write",
    command: "create_poc", expectedFileIdentity: hello.fileIdentity });
  assert.equal(createPageCalls, 0);
  assert.equal(sent.at(-1).ok, false);
  assert.match(sent.at(-1).error, /STABLE_FILE_IDENTITY_REQUIRED/);
});

test("plugin main refuses a write until authenticated by a paired bridge session", async () => {
  const sent = [];
  let createPageCalls = 0;
  const page = { id: "0:1", name: "Page 1", selection: [] };
  const storage = new Map();
  const figma = {
    root: { id: "0:0", name: "Dedicated test file", children: [page] },
    currentPage: page,
    fileKey: "dedicated-test-key",
    clientStorage: { async getAsync(key) { return storage.get(key); }, async setAsync(key, value) { storage.set(key, value); } },
    ui: { postMessage: (message) => sent.push(message), onmessage: null },
    showUI() {}, on() {},
    createPage() { createPageCalls += 1; throw new Error("createPage must not run"); },
  };
  vm.runInNewContext(source, { figma, __html__: "", Date, Math, Set, String });
  await figma.ui.onmessage({ type: "bridge-initialize" });
  const hello = sent.at(-1);
  await figma.ui.onmessage({ type: "connection-ready", workspaceId: hello.workspaceId,
    taskId: hello.taskId, sessionId: hello.sessionId, clientId: hello.clientId,
    fileIdentity: hello.fileIdentity, connectionId: "unpaired-test-connection" });
  await figma.ui.onmessage({ type: "plugin-command", workspaceId: hello.workspaceId,
    taskId: hello.taskId, sessionId: hello.sessionId, fileIdentity: hello.fileIdentity,
    connectionId: "unpaired-test-connection", requestId: "unpaired-write",
    command: "create_poc", expectedFileIdentity: hello.fileIdentity });
  assert.equal(createPageCalls, 0);
  assert.equal(sent.at(-1).ok, false);
  assert.match(sent.at(-1).error, /PAIRING_REQUIRED/);
});

test("preparing an owned POC page does not depend on switching the active Figma page", async () => {
  const pageData = new Map();
  const originalPage = { id: "0:1", name: "Page 1", selection: [] };
  const pocPage = {
    id: "1:1", name: "", children: [],
    setPluginData: (key, value) => pageData.set(key, value),
    getPluginData: (key) => pageData.get(key) || "",
    async loadAsync() {},
  };
  const figma = {
    root: { id: "0:0", name: "Dedicated test file", children: [originalPage] },
    currentPage: originalPage,
    ui: { postMessage() {}, onmessage: null },
    showUI() {}, on() {},
    createPage() { this.root.children.push(pocPage); return pocPage; },
    async setCurrentPageAsync() { throw new Error("page switch must not be required"); },
  };
  const context = { figma, __html__: "", Date, Math, Set, String };
  vm.runInNewContext(`${source}\nglobalThis.preparePocPageForTest = ensurePocPage;`, context);
  assert.equal(await context.preparePocPageForTest(), pocPage);
  assert.equal(figma.currentPage, originalPage);
  assert.equal(pageData.get("local-codex-figma-bridge-poc-owner"), "local-codex-figma-bridge-poc");
});

test("deleting owned POC nodes does not depend on switching the active Figma page", async () => {
  const originalPage = { id: "0:1", name: "Page 1", selection: [] };
  const frame = {
    id: "1:2", type: "FRAME", name: "C2C Bridge POC", children: [],
    getPluginData: (key) => key.endsWith("-owner") ? "local-codex-figma-bridge-poc" : "poc-frame",
    remove() { pocPage.children = []; },
  };
  const pocPage = {
    id: "1:1", name: "Codex Bridge POC", children: [frame],
    getPluginData: (key) => key.endsWith("-owner") ? "local-codex-figma-bridge-poc" : "",
    async loadAsync() {},
  };
  const figma = {
    root: { id: "0:0", name: "Dedicated test file", children: [originalPage, pocPage] },
    currentPage: pocPage,
    ui: { postMessage() {}, onmessage: null },
    showUI() {}, on() {},
    async setCurrentPageAsync() { throw new Error("page switch must not be required"); },
    async getNodeByIdAsync() { return pocPage.children[0] || null; },
  };
  const context = { figma, __html__: "", Date, Math, Set, String };
  vm.runInNewContext(`${source}\nglobalThis.deletePocOwnedForTest = deletePocOwned;`, context);
  const result = await context.deletePocOwnedForTest();
  assert.equal(result.deletedNodes, 1);
  assert.equal(result.readBackAbsent, true);
  assert.equal(result.pageDeleted, false);
  assert.equal(figma.currentPage, pocPage);
  assert.equal(pocPage.children.length, 0);
});
