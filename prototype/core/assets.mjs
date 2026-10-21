import { z } from 'zod';
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, realpath, open } from 'node:fs/promises';
import path from 'node:path';
import { designEvidenceId, assertEvidenceData } from './design-catalog.mjs';

const SINGLE_BYTES = 20 * 1024 * 1024;
const TOTAL_BYTES = 80 * 1024 * 1024;
const positiveInteger = z.number().finite().int().positive().max(Number.MAX_SAFE_INTEGER);
const hash = z.string().regex(/^[a-f0-9]{64}$/);

function safeAssetPath(value) {
  if (!value || value.length > 2000 || /[\\:\u0000-\u001f\u007f<>"|?*]/.test(value) || value.startsWith('/')) return false;
  return value.split('/').every(part => part && !['.', '..'].includes(part) && !/[ .]$/.test(part)
    && !/^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(part));
}

export const AssetSchema = z.object({
  id: designEvidenceId, sha256: hash, mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
  width: positiveInteger, height: positiveInteger, bytes: positiveInteger.max(SINGLE_BYTES),
  path: z.string().refine(safeAssetPath, 'Unsafe asset path'),
  source: z.object({ kind: z.enum(['figma', 'manual']), sourceId: designEvidenceId }).strict(),
  sceneIds: z.array(designEvidenceId).max(25000).refine(ids => new Set(ids).size === ids.length, 'Duplicate asset scene'),
}).strict();

export const AssetsSchema = z.array(AssetSchema).max(2000).superRefine((assets, context) => {
  const ids = new Set();
  for (const asset of assets) {
    if (ids.has(asset.id)) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Duplicate asset ID' });
    ids.add(asset.id);
  }
});

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const failure = code => { throw new Error(`ASSET_${code}`); };
const inside = (root, target) => { const relative = path.relative(root, target); return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative); };
const sameFile = (a, b) => a.dev === b.dev && a.ino === b.ino && a.size === b.size && a.mtimeMs === b.mtimeMs && a.ctimeMs === b.ctimeMs;

async function assertNoLinks(target) {
  const volume = path.parse(target).root;
  let cursor = volume;
  for (const part of target.slice(volume.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    if ((await lstat(cursor)).isSymbolicLink()) failure('SYMLINK');
  }
}

async function readAsset(root, relative, declaredBytes) {
  const target = path.resolve(root, ...relative.split('/'));
  if (!inside(root, target)) failure('PATH');
  let handle;
  try {
    await assertNoLinks(target);
    const resolved = await realpath(target);
    if (!inside(root, resolved)) failure('PATH');
    const before = await lstat(target);
    if (!before.isFile()) failure('FILE_TYPE');
    if (before.size > SINGLE_BYTES || before.size !== declaredBytes) failure('BYTES');
    handle = await open(target, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const opened = await handle.stat();
    if (!sameFile(before, opened)) failure('FILE_CHANGED');
    const bytes = Buffer.alloc(declaredBytes + 1);
    let read = 0;
    while (read < bytes.length) {
      const result = await handle.read(bytes, read, bytes.length - read, read);
      if (!result.bytesRead) break;
      read += result.bytesRead;
    }
    if (read !== declaredBytes) failure('BYTES');
    const after = await handle.stat();
    await assertNoLinks(target);
    if (!sameFile(opened, after) || !sameFile(after, await lstat(target)) || await realpath(target) !== resolved) failure('FILE_CHANGED');
    return bytes.subarray(0, read);
  } catch (error) {
    if (error.message?.startsWith('ASSET_')) throw error;
    failure(error.code === 'ENOENT' ? 'FILE_MISSING' : 'FILE_READ');
  } finally { await handle?.close(); }
}

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let result = value;
  for (let i = 0; i < 8; i++) result = result & 1 ? 0xedb88320 ^ result >>> 1 : result >>> 1;
  return result >>> 0;
});
function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 255] ^ value >>> 8;
  return (value ^ 0xffffffff) >>> 0;
}

// These parsers verify image containers, signatures and encoded dimensions.
// They do not decode image pixels or claim visual/codec acceptance.
function pngDimensions(bytes) {
  let cursor = 8, dimensions, data = false, ended = false;
  while (cursor < bytes.length) {
    if (cursor + 12 > bytes.length) failure('IMAGE_INVALID');
    const size = bytes.readUInt32BE(cursor), end = cursor + 12 + size;
    if (end > bytes.length) failure('IMAGE_INVALID');
    const typeBytes = bytes.subarray(cursor + 4, cursor + 8);
    if (!typeBytes.every(byte => byte >= 65 && byte <= 90 || byte >= 97 && byte <= 122)
      || typeBytes[2] & 0x20 || crc32(bytes.subarray(cursor + 4, cursor + 8 + size)) !== bytes.readUInt32BE(cursor + 8 + size)) failure('IMAGE_INVALID');
    const type = typeBytes.toString('latin1');
    if (cursor === 8 && type !== 'IHDR') failure('IMAGE_INVALID');
    if (type === 'IHDR') {
      if (dimensions || size !== 13) failure('IMAGE_INVALID');
      const width = bytes.readUInt32BE(cursor + 8), height = bytes.readUInt32BE(cursor + 12);
      const depth = bytes[cursor + 16], color = bytes[cursor + 17];
      const depths = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
      if (!width || !height || width > 0x7fffffff || height > 0x7fffffff || !depths[color]?.includes(depth)
        || bytes[cursor + 18] || bytes[cursor + 19] || bytes[cursor + 20] > 1) failure('IMAGE_INVALID');
      dimensions = { width, height };
    } else if (type === 'IDAT') data ||= size > 0;
    else if (type === 'IEND') {
      if (size || !data || end !== bytes.length) failure('IMAGE_INVALID');
      ended = true;
    }
    cursor = end;
  }
  if (!ended || !dimensions) failure('IMAGE_INVALID');
  return dimensions;
}

function jpegDimensions(bytes) {
  if (bytes.length < 4 || bytes.readUInt16BE(bytes.length - 2) !== 0xffd9) failure('IMAGE_INVALID');
  let cursor = 2, dimensions;
  while (cursor + 1 < bytes.length) {
    if (bytes[cursor++] !== 0xff) failure('IMAGE_INVALID');
    while (bytes[cursor] === 0xff) cursor++;
    const marker = bytes[cursor++];
    if (marker === 0xda) {
      if (!dimensions || cursor + 2 > bytes.length) failure('IMAGE_INVALID');
      const size = bytes.readUInt16BE(cursor);
      if (size < 6 || cursor + size >= bytes.length - 2) failure('IMAGE_INVALID');
      return dimensions;
    }
    if (marker === 0xd9 || marker === 0xd8 || marker === 0 || marker >= 0xd0 && marker <= 0xd7) failure('IMAGE_INVALID');
    if (marker === 0x01) continue;
    if (cursor + 2 > bytes.length) failure('IMAGE_INVALID');
    const size = bytes.readUInt16BE(cursor);
    if (size < 2 || cursor + size > bytes.length) failure('IMAGE_INVALID');
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      if (dimensions || size < 8) failure('IMAGE_INVALID');
      const height = bytes.readUInt16BE(cursor + 3), width = bytes.readUInt16BE(cursor + 5), components = bytes[cursor + 7];
      if (!width || !height || !components || size !== 8 + 3 * components) failure('IMAGE_INVALID');
      dimensions = { width, height };
    }
    cursor += size;
  }
  failure('IMAGE_INVALID');
}

function webpDimensions(bytes) {
  if (bytes.length < 20 || bytes.readUInt32LE(4) + 8 !== bytes.length) failure('IMAGE_INVALID');
  let cursor = 12, canvas, image;
  while (cursor < bytes.length) {
    if (cursor + 8 > bytes.length) failure('IMAGE_INVALID');
    const typeBytes = bytes.subarray(cursor, cursor + 4), size = bytes.readUInt32LE(cursor + 4);
    if (!typeBytes.every(byte => byte >= 0x20 && byte <= 0x7e)) failure('IMAGE_INVALID');
    const type = typeBytes.toString('latin1');
    const start = cursor + 8, end = start + size, next = end + (size & 1);
    if (next > bytes.length || size & 1 && bytes[end] !== 0) failure('IMAGE_INVALID');
    const data = bytes.subarray(start, end);
    if (type === 'VP8X') {
      if (cursor !== 12 || size !== 10 || data[0] & 0xc3 || data[1] || data[2] || data[3]) failure('IMAGE_UNSUPPORTED');
      canvas = { width: data.readUIntLE(4, 3) + 1, height: data.readUIntLE(7, 3) + 1 };
    } else if (type === 'VP8 ') {
      if (image || size < 11 || data[0] & 1 || !data.subarray(3, 6).equals(Buffer.from([0x9d, 0x01, 0x2a]))) failure('IMAGE_INVALID');
      image = { width: data.readUInt16LE(6) & 0x3fff, height: data.readUInt16LE(8) & 0x3fff };
    } else if (type === 'VP8L') {
      if (image || size < 6 || data[0] !== 0x2f || data[4] >>> 5) failure('IMAGE_INVALID');
      const bits = data.readUInt32LE(1);
      image = { width: (bits & 0x3fff) + 1, height: (bits >>> 14 & 0x3fff) + 1 };
    } else if (type === 'ANIM' || type === 'ANMF') failure('IMAGE_UNSUPPORTED');
    cursor = next;
  }
  if (!image?.width || !image?.height || canvas && (canvas.width !== image.width || canvas.height !== image.height)) failure('IMAGE_INVALID');
  return canvas ?? image;
}

function dimensionsFor(bytes, mimeType) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    if (mimeType !== 'image/png') failure('MIME');
    return pngDimensions(bytes);
  }
  if (bytes.length >= 2 && bytes.readUInt16BE(0) === 0xffd8) {
    if (mimeType !== 'image/jpeg') failure('MIME');
    return jpegDimensions(bytes);
  }
  if (bytes.subarray(0, 4).equals(Buffer.from('RIFF')) && bytes.subarray(8, 12).equals(Buffer.from('WEBP'))) {
    if (mimeType !== 'image/webp') failure('MIME');
    return webpDimensions(bytes);
  }
  failure('MIME');
}

export function validateAssetContent(bytes, definition) {
  if (!Buffer.isBuffer(bytes) || bytes.length > SINGLE_BYTES || bytes.length !== definition.bytes) failure('BYTES');
  if (digest(bytes) !== definition.sha256) failure('HASH');
  const dimensions = dimensionsFor(bytes, definition.mimeType);
  if (dimensions.width !== definition.width || dimensions.height !== definition.height) failure('DIMENSIONS');
  return dimensions;
}

export function assetReferencesForNode(node) {
  const ids = node.assetId === undefined ? [] : [node.assetId];
  const collectStyle = style => { for (const paint of [...style?.fills ?? [], ...style?.strokes ?? []]) if (paint.type === 'IMAGE') ids.push(paint.assetId); };
  const collectText = text => { for (const range of text?.ranges ?? []) collectStyle(range); };
  collectStyle(node.style); collectText(node.text);
  for (const override of node.overrides ?? []) { collectStyle(override.style); collectText(override.text); }
  return ids;
}

export async function resolveAssets(model, inputRoot) {
  assertEvidenceData(model);
  const parsed = AssetsSchema.safeParse(model.assets ?? []);
  if (!parsed.success) failure('SCHEMA');
  const assets = parsed.data, byDefinition = new Map(assets.map(asset => [asset.id, asset]));
  const scenes = new Set();
  for (const scene of model.presentation?.scenes ?? []) {
    if (!designEvidenceId.safeParse(scene.id).success || scenes.has(scene.id)) failure('SCENE');
    scenes.add(scene.id);
  }
  for (const asset of assets) if (asset.sceneIds.some(id => !scenes.has(id))) failure('SCENE');
  const used = new Map();
  for (const node of model.presentation?.nodes ?? []) {
    if (!scenes.has(node.sceneId)) failure('SCENE');
    const ids = assetReferencesForNode(node);
    for (const id of ids) {
      const asset = byDefinition.get(id);
      if (!asset) failure('REFERENCE');
      if (!asset.sceneIds.includes(node.sceneId)) failure('SCENE_OWNERSHIP');
      used.set(id, asset);
    }
  }
  const byId = new Map(), unique = new Map();
  let decodedBytes = 0;
  for (const asset of used.values()) {
    const previous = unique.get(asset.sha256);
    if (previous) {
      if (previous.bytes !== asset.bytes || previous.mimeType !== asset.mimeType || previous.width !== asset.width || previous.height !== asset.height) failure('HASH_METADATA');
    } else { unique.set(asset.sha256, asset); decodedBytes += asset.bytes; }
  }
  if (decodedBytes > TOTAL_BYTES) failure('BUDGET');
  if (!used.size) return { assets: [], byId, budget: { assetCount: 0, uniqueAssets: 0, decodedBytes: 0 } };
  if (typeof inputRoot !== 'string' || !inputRoot) failure('PATH');
  let root = path.resolve(inputRoot);
  try { await assertNoLinks(root); if (!(await lstat(root)).isDirectory()) failure('PATH'); root = await realpath(root); }
  catch (error) { if (error.message?.startsWith('ASSET_')) throw error; failure('PATH'); }
  const resolved = new Map();
  for (const asset of used.values()) {
    const bytes = await readAsset(root, asset.path, asset.bytes);
    const dimensions = validateAssetContent(bytes, asset);
    let value = resolved.get(asset.sha256);
    if (!value) {
      value = { sha256: asset.sha256, mimeType: asset.mimeType, ...dimensions, bytes, assetIds: [] };
      resolved.set(asset.sha256, value);
    }
    value.assetIds.push(asset.id); byId.set(asset.id, value);
  }
  return { assets: [...resolved.values()], byId, budget: { assetCount: used.size, uniqueAssets: resolved.size, decodedBytes } };
}
