import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { isBase64 } from './base64.mjs';

export const ASSET_TRANSFER_LIMITS = Object.freeze({ chunkBytes: 1024 * 1024, requestBytes: 7 * 1024 * 1024,
  assetBytes: 20 * 1024 * 1024, totalAssetBytes: 80 * 1024 * 1024, assets: 2000, chunksPerAsset: 4096, chunks: 10000 });
export const ASSET_TRANSFER_COMMANDS = new Set(['scope_design_assets_plan', 'scope_design_asset_stage', 'scope_design_asset_commit']);
const ensure = (value, message) => { if (!value) throw new Error(message); };
const hashPattern = /^[a-f0-9]{64}$/;
const keyPattern = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$/;
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(',')}]` : value && typeof value === 'object'
  ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}` : JSON.stringify(value);
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value)) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const byteHash = value => bytesToHex(sha256(value));
// Figma's main-thread sandbox has no TextEncoder. Encode binding data locally,
// with the same replacement of lone UTF-16 surrogates as standard UTF-8.
function utf8ToBytes(text) {
  const bytes = new Uint8Array(text.length * 3); let offset = 0;
  for (const character of text) {
    let point = character.codePointAt(0);
    if (point >= 0xd800 && point <= 0xdfff) point = 0xfffd;
    if (point < 0x80) bytes[offset++] = point;
    else if (point < 0x800) { bytes[offset++] = 0xc0 | point >> 6; bytes[offset++] = 0x80 | point & 63; }
    else if (point < 0x10000) { bytes[offset++] = 0xe0 | point >> 12; bytes[offset++] = 0x80 | point >> 6 & 63; bytes[offset++] = 0x80 | point & 63; }
    else { bytes[offset++] = 0xf0 | point >> 18; bytes[offset++] = 0x80 | point >> 12 & 63; bytes[offset++] = 0x80 | point >> 6 & 63; bytes[offset++] = 0x80 | point & 63; }
  }
  return bytes.subarray(0, offset);
}
function decodedLength(value) { return value.length * 3 / 4 - (value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0); }
export function decodeAssetChunk(value) {
  ensure(typeof value === 'string' && value.length <= Math.ceil(ASSET_TRANSFER_LIMITS.chunkBytes / 3) * 4 && isBase64(value), 'DESIGN_ASSET_CHUNK_INVALID');
  const length = decodedLength(value);
  ensure(length > 0 && length <= ASSET_TRANSFER_LIMITS.chunkBytes, 'DESIGN_ASSET_CHUNK_BUDGET');
  const bytes = new Uint8Array(length), alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let index = 0;
  for (let at = 0; at < value.length; at += 4) {
    const bits = alphabet.indexOf(value[at]) << 18 | alphabet.indexOf(value[at + 1]) << 12 |
      Math.max(0, alphabet.indexOf(value[at + 2])) << 6 | Math.max(0, alphabet.indexOf(value[at + 3]));
    bytes[index++] = bits >> 16 & 255;
    if (index < length) bytes[index++] = bits >> 8 & 255;
    if (index < length) bytes[index++] = bits & 255;
  }
  return bytes;
}
function manifest(assets) {
  ensure(Array.isArray(assets) && assets.length <= ASSET_TRANSFER_LIMITS.assets, 'DESIGN_ASSET_MANIFEST_INVALID');
  const result = new Map(); let total = 0;
  for (const asset of assets) {
    if (typeof asset?.dataBase64 === 'string') { total += decodedLength(asset.dataBase64); continue; }
    ensure(exact(asset, ['key', 'mimeType', 'sha256', 'decodedBytes']) && keyPattern.test(asset.key) && !['constructor', 'prototype', '__proto__'].includes(asset.key) &&
      ['image/png', 'image/jpeg', 'image/webp'].includes(asset.mimeType) && hashPattern.test(asset.sha256) && Number.isSafeInteger(asset.decodedBytes) &&
      asset.decodedBytes > 0 && asset.decodedBytes <= ASSET_TRANSFER_LIMITS.assetBytes && !result.has(asset.key), 'DESIGN_ASSET_MANIFEST_INVALID');
    result.set(asset.key, asset); total += asset.decodedBytes;
  }
  ensure(total <= ASSET_TRANSFER_LIMITS.totalAssetBytes, 'DESIGN_ASSET_TOTAL_BUDGET');
  return result;
}
export function validateAssetTransferInput(command, input) {
  ensure(ASSET_TRANSFER_COMMANDS.has(command), 'DESIGN_ASSET_COMMAND_INVALID');
  ensure(input?.spec?.schemaVersion === '1.1', 'DESIGN_ASSET_VERSION_REQUIRED');
  const assets = manifest(input.spec.assets ?? []);
  if (command === 'scope_design_assets_plan') return {};
  const asset = assets.get(input.assetKey);
  ensure(asset, 'DESIGN_ASSET_REFERENCE_INVALID');
  if (command === 'scope_design_asset_commit') return { assetKey: input.assetKey };
  const bytes = decodeAssetChunk(input.dataBase64);
  ensure(Number.isSafeInteger(input.offset) && input.offset >= 0 && input.offset + bytes.length <= asset.decodedBytes, 'DESIGN_ASSET_OFFSET_INVALID');
  ensure(typeof input.chunkSha256 === 'string' && hashPattern.test(input.chunkSha256) && byteHash(bytes) === input.chunkSha256, 'DESIGN_ASSET_CHUNK_HASH_MISMATCH');
  return { assetKey: input.assetKey, offset: input.offset, dataBase64: input.dataBase64, chunkSha256: input.chunkSha256 };
}
function validateBinding(binding) {
  const nonempty = value => typeof value === 'string' && value.length > 0 && value.length <= 512;
  ensure(exact(binding, ['specSignature', 'runId', 'scope', 'ownership']) && hashPattern.test(binding.specSignature) &&
    typeof binding.runId === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(binding.runId) &&
    exact(binding.scope, ['fileIdentity', 'pageId', 'rootNodeId']) && /^figma-file:[A-Za-z0-9_-]+$/.test(binding.scope.fileIdentity) &&
    /^\d+:\d+$/.test(binding.scope.pageId) && /^\d+:\d+$/.test(binding.scope.rootNodeId) &&
    exact(binding.ownership, ['workspaceId', 'taskId', 'revision']) && Object.values(binding.ownership).every(nonempty), 'DESIGN_ASSET_BINDING_INVALID');
}
function mimeMatches(bytes, mimeType) {
  if (mimeType === 'image/png') return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  if (mimeType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  return bytes.length >= 12 && String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP';
}

// Ephemeral bytes never enter pluginData. Only a bounded hash/image receipt is
// delegated to the existing owned-root ledger by the injected host hooks.
export function createAssetTransferController(hooks) {
  for (const name of ['sha256Bytes', 'createImage', 'readImageBytes', 'readLedger', 'writeLedger', 'verifyContext']) ensure(typeof hooks?.[name] === 'function', 'DESIGN_ASSET_HOOK_REQUIRED');
  const buckets = new Map(), candidates = new Map(); let reserved = 0, chunkCount = 0, busy = false;
  const digest = bytes => { const value = hooks.sha256Bytes(bytes); ensure(typeof value === 'string' && hashPattern.test(value), 'DESIGN_ASSET_HASH_HOOK_INVALID'); return value; };
  async function context(request, mutation) {
    validateBinding(request?.binding);
    const assets = manifest(request.assets), bindingHash = digest(utf8ToBytes(canonical(request.binding)));
    await hooks.verifyContext(request.binding, { mutation });
    return { request, binding: request.binding, assets, bindingHash, mutation };
  }
  const verify = ctx => hooks.verifyContext(ctx.binding, { mutation: ctx.mutation });
  const memoryKey = (ctx, asset) => `${ctx.bindingHash}:${asset.sha256}`;
  function release(key) { const bucket = buckets.get(key); if (bucket) { buckets.delete(key); reserved -= bucket.decodedBytes; chunkCount -= bucket.parts.size; } }
  async function ledger(ctx, asset) {
    await verify(ctx); const record = await hooks.readLedger(ctx.binding, asset); await verify(ctx);
    if (!record) return null;
    ensure(['PENDING', 'COMMITTED'].includes(record.status) && record.bindingHash === ctx.bindingHash && record.sha256 === asset.sha256 &&
      record.decodedBytes === asset.decodedBytes && record.mimeType === asset.mimeType, 'DESIGN_ASSET_LEDGER_CONFLICT');
    return record;
  }
  async function imageMatches(ctx, asset, imageHash) {
    if (typeof imageHash !== 'string' || !imageHash.length || imageHash.length > 256) return false;
    await verify(ctx); const bytes = await hooks.readImageBytes(imageHash); await verify(ctx);
    return bytes instanceof Uint8Array && bytes.byteLength === asset.decodedBytes && mimeMatches(bytes, asset.mimeType) && digest(bytes) === asset.sha256;
  }
  function progress(ctx, asset) {
    const bucket = buckets.get(memoryKey(ctx, asset));
    if (!bucket) return { receivedBytes: 0, missingRanges: [{ offset: 0, bytes: asset.decodedBytes }], missingRangeCount: 1 };
    const parts = [...bucket.parts].sort((a, b) => a[0] - b[0]); let cursor = 0, count = 0; const missingRanges = [];
    for (const [offset, part] of parts) { if (cursor < offset) { count++; if (missingRanges.length < 16) missingRanges.push({ offset: cursor, bytes: offset - cursor }); } cursor = offset + part.bytes.length; }
    if (cursor < asset.decodedBytes) { count++; if (missingRanges.length < 16) missingRanges.push({ offset: cursor, bytes: asset.decodedBytes - cursor }); }
    return { receivedBytes: bucket.received, missingRanges, missingRangeCount: count };
  }
  async function inspect(ctx, asset) {
    const record = await ledger(ctx, asset);
    if (record?.status === 'COMMITTED') return { key: asset.key, status: await imageMatches(ctx, asset, record.imageHash) ? 'COMMITTED' : 'OUTCOME_UNKNOWN',
      receivedBytes: asset.decodedBytes, imageHash: record.imageHash };
    if (record?.status === 'PENDING') return { key: asset.key, status: 'OUTCOME_UNKNOWN', receivedBytes: progress(ctx, asset).receivedBytes };
    const checkpoint = progress(ctx, asset);
    return { key: asset.key, status: checkpoint.receivedBytes === asset.decodedBytes ? 'STAGED' : checkpoint.receivedBytes ? 'INCOMPLETE' : 'NOT_STAGED', ...checkpoint };
  }
  async function plan(request) {
    const ctx = await context(request, false), assets = [];
    for (const asset of ctx.assets.values()) assets.push(await inspect(ctx, asset));
    return { status: assets.every(asset => asset.status === 'COMMITTED') ? 'READY' : 'INCOMPLETE', writes: 0,
      bindingHash: ctx.bindingHash, assets };
  }
  async function stage(request) {
    const ctx = await context(request, true), asset = ctx.assets.get(request.assetKey);
    ensure(asset, 'DESIGN_ASSET_REFERENCE_INVALID');
    const bytes = decodeAssetChunk(request.dataBase64);
    ensure(Number.isSafeInteger(request.offset) && request.offset >= 0 && request.offset + bytes.length <= asset.decodedBytes, 'DESIGN_ASSET_OFFSET_INVALID');
    ensure(hashPattern.test(request.chunkSha256) && digest(bytes) === request.chunkSha256, 'DESIGN_ASSET_CHUNK_HASH_MISMATCH');
    const record = await ledger(ctx, asset);
    if (record) {
      ensure(record.status === 'COMMITTED' && await imageMatches(ctx, asset, record.imageHash), 'DESIGN_ASSET_OUTCOME_UNKNOWN');
      return { status: 'COMMITTED', writes: 0, receivedBytes: asset.decodedBytes, idempotent: true };
    }
    const key = memoryKey(ctx, asset); let bucket = buckets.get(key);
    if (!bucket) {
      ensure(buckets.size < ASSET_TRANSFER_LIMITS.assets && reserved + asset.decodedBytes <= ASSET_TRANSFER_LIMITS.totalAssetBytes, 'DESIGN_ASSET_MEMORY_BUDGET');
      bucket = { parts: new Map(), received: 0, decodedBytes: asset.decodedBytes, mimeType: asset.mimeType };
      buckets.set(key, bucket); reserved += asset.decodedBytes;
    }
    ensure(bucket.decodedBytes === asset.decodedBytes && bucket.mimeType === asset.mimeType, 'DESIGN_ASSET_CONTENT_CONFLICT');
    const existing = bucket.parts.get(request.offset);
    if (existing) {
      ensure(existing.hash === request.chunkSha256 && existing.bytes.length === bytes.length, 'DESIGN_ASSET_CHUNK_CONFLICT');
      return { status: bucket.received === asset.decodedBytes ? 'STAGED' : 'INCOMPLETE', writes: 0, receivedBytes: bucket.received, idempotent: true };
    }
    for (const [offset, part] of bucket.parts) ensure(request.offset + bytes.length <= offset || request.offset >= offset + part.bytes.length, 'DESIGN_ASSET_CHUNK_OVERLAP');
    ensure(bucket.parts.size < ASSET_TRANSFER_LIMITS.chunksPerAsset && chunkCount < ASSET_TRANSFER_LIMITS.chunks, 'DESIGN_ASSET_CHUNK_COUNT_BUDGET');
    await verify(ctx); bucket.parts.set(request.offset, { bytes, hash: request.chunkSha256 }); bucket.received += bytes.length; chunkCount++;
    return { status: bucket.received === asset.decodedBytes ? 'STAGED' : 'INCOMPLETE', writes: 0, receivedBytes: bucket.received, idempotent: false };
  }
  async function commit(request) {
    const ctx = await context(request, true), asset = ctx.assets.get(request.assetKey);
    ensure(asset, 'DESIGN_ASSET_REFERENCE_INVALID');
    const key = memoryKey(ctx, asset), record = await ledger(ctx, asset);
    if (record?.status === 'COMMITTED') {
      ensure(await imageMatches(ctx, asset, record.imageHash), 'DESIGN_ASSET_OUTCOME_UNKNOWN');
      return { status: 'COMMITTED', writes: 0, imageHash: record.imageHash, idempotent: true };
    }
    const candidate = candidates.get(key);
    if (record?.status === 'PENDING') {
      ensure(candidate && await imageMatches(ctx, asset, candidate), 'DESIGN_ASSET_OUTCOME_UNKNOWN');
      await verify(ctx);
      try { await hooks.writeLedger(ctx.binding, asset, { ...record, status: 'COMMITTED', imageHash: candidate }); await verify(ctx); }
      catch { throw new Error('DESIGN_ASSET_OUTCOME_UNKNOWN'); }
      release(key);
      return { status: 'COMMITTED', writes: 1, imageHash: candidate, idempotent: true, reconciled: true };
    }
    const bucket = buckets.get(key);
    const reusable = candidate && await imageMatches(ctx, asset, candidate);
    ensure(!candidate || reusable, 'DESIGN_ASSET_OUTCOME_UNKNOWN');
    let bytes;
    if (!reusable) {
      ensure(bucket && bucket.received === asset.decodedBytes, 'DESIGN_ASSET_INCOMPLETE');
      bytes = new Uint8Array(asset.decodedBytes);
      for (const [offset, part] of bucket.parts) bytes.set(part.bytes, offset);
      ensure(digest(bytes) === asset.sha256, 'DESIGN_ASSET_HASH_MISMATCH');
      ensure(mimeMatches(bytes, asset.mimeType), 'DESIGN_ASSET_MIME_MISMATCH');
    }
    ensure(candidates.size < ASSET_TRANSFER_LIMITS.assets || candidates.has(key), 'DESIGN_ASSET_MEMORY_BUDGET');
    const receipt = { status: 'PENDING', sha256: asset.sha256, decodedBytes: asset.decodedBytes, mimeType: asset.mimeType, bindingHash: ctx.bindingHash };
    await verify(ctx);
    // Persist intent before createImage. An interrupted native result must not
    // cause another create after a plugin restart loses its ephemeral candidate.
    try {
      await hooks.writeLedger(ctx.binding, asset, receipt); await verify(ctx);
      let imageHash = candidate;
      if (!reusable) {
        await verify(ctx); const image = await hooks.createImage(bytes); imageHash = image?.hash;
        if (typeof imageHash === 'string' && imageHash.length <= 256) candidates.set(key, imageHash);
        await verify(ctx); ensure(await imageMatches(ctx, asset, imageHash), 'DESIGN_ASSET_NATIVE_READBACK_FAILED');
      }
      await verify(ctx); await hooks.writeLedger(ctx.binding, asset, { ...receipt, status: 'COMMITTED', imageHash }); await verify(ctx);
      release(key);
      return { status: 'COMMITTED', writes: 3, imageHash, idempotent: Boolean(candidate) };
    } catch { throw new Error('DESIGN_ASSET_OUTCOME_UNKNOWN'); }
  }
  const locked = operation => async request => { ensure(!busy, 'DESIGN_ASSET_BUSY'); busy = true; try { return await operation(request); } finally { busy = false; } };
  return { plan: locked(plan), stage: locked(stage), commit: locked(commit) };
}
