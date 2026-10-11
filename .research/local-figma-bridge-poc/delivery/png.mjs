import { inflateSync } from 'node:zlib';
import { crc32 } from './zip.mjs';

export const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

// Actual decoded pixel comparison, not compressed byte equality. Unsupported encodings fail closed.
export function decodePng(bytes, { maxPixels = 32 * 1024 * 1024 } = {}) {
  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('PNG_SIGNATURE_INVALID');
  let cursor = 8, width, height, channels;
  const data = [];
  let ended = false, startedData = false, finishedData = false;
  while (cursor < bytes.length) {
    if (cursor + 12 > bytes.length) throw new Error('PNG_CHUNK_TRUNCATED');
    const size = bytes.readUInt32BE(cursor);
    const finish = cursor + 12 + size;
    if (finish > bytes.length) throw new Error('PNG_CHUNK_TRUNCATED');
    const type = bytes.toString('ascii', cursor + 4, cursor + 8);
    const chunk = bytes.subarray(cursor + 8, cursor + 8 + size);
    if (crc32(bytes.subarray(cursor + 4, cursor + 8 + size)) !== bytes.readUInt32BE(cursor + 8 + size)) throw new Error('PNG_CRC_MISMATCH');
    if (cursor === 8 && type !== 'IHDR') throw new Error('PNG_IHDR_MISSING');
    if (type === 'IHDR') {
      if (width !== undefined || size !== 13) throw new Error('PNG_IHDR_INVALID');
      width = chunk.readUInt32BE(0); height = chunk.readUInt32BE(4);
      channels = chunk[9] === 2 ? 3 : chunk[9] === 6 ? 4 : 0;
      if (!width || !height || width * height > maxPixels) throw new Error('PNG_SIZE_LIMIT');
      if (chunk[8] !== 8 || !channels || chunk[10] || chunk[11] || chunk[12]) throw new Error('PNG_ENCODING_UNSUPPORTED');
    } else if (type === 'IDAT') {
      if (finishedData) throw new Error('PNG_IDAT_ORDER_INVALID');
      startedData = true;
      data.push(chunk);
    } else if (type === 'IEND') {
      if (size || !data.length || finish !== bytes.length) throw new Error('PNG_IEND_INVALID');
      ended = true;
    } else {
      if (startedData) finishedData = true;
      // Transparency in truecolor needs additional interpretation; do not compare opaque pixels by mistake.
      if (type === 'tRNS' || type === 'acTL' || /^[A-Z]/.test(type) && type !== 'PLTE') throw new Error('PNG_ENCODING_UNSUPPORTED');
    }
    cursor = finish;
  }
  if (!ended) throw new Error('PNG_IEND_MISSING');
  const stride = width * channels;
  const expectedSize = (stride + 1) * height;
  const inflated = inflateSync(Buffer.concat(data), { maxOutputLength: expectedSize });
  if (inflated.length !== expectedSize) throw new Error('PNG_SCANLINE_SIZE_INVALID');
  const decoded = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y++) {
    const row = y * (stride + 1), target = y * stride, filter = inflated[row];
    if (filter > 4) throw new Error('PNG_FILTER_UNSUPPORTED');
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? decoded[target + x - channels] : 0;
      const up = y ? decoded[target + x - stride] : 0;
      const upperLeft = y && x >= channels ? decoded[target + x - stride - channels] : 0;
      const predictor = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : paeth(left, up, upperLeft);
      decoded[target + x] = (inflated[row + x + 1] + predictor) & 255;
    }
  }
  const rgba = Buffer.alloc(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel++) {
    for (let channel = 0; channel < 3; channel++) rgba[pixel * 4 + channel] = decoded[pixel * channels + channel];
    rgba[pixel * 4 + 3] = channels === 4 ? decoded[pixel * 4 + 3] : 255;
  }
  return { width, height, rgba };
}

export function comparePng(reference, actual, { maxChangedPixels = 0, maxChannelDelta = 0 } = {}) {
  if (!Number.isSafeInteger(maxChangedPixels) || maxChangedPixels < 0 || !Number.isSafeInteger(maxChannelDelta) || maxChannelDelta < 0 || maxChannelDelta > 255) throw new Error('VISUAL_TOLERANCE_INVALID');
  const a = decodePng(reference), b = decodePng(actual);
  if (a.width !== b.width || a.height !== b.height) return { status: 'FAIL', reason: 'DIMENSIONS_DIFFER', reference: { width: a.width, height: a.height }, actual: { width: b.width, height: b.height } };
  let changedPixels = 0, largestDelta = 0;
  let minX = a.width, minY = a.height, maxX = -1, maxY = -1;
  for (let pixel = 0; pixel < a.width * a.height; pixel++) {
    let delta = 0;
    for (let channel = 0; channel < 4; channel++) delta = Math.max(delta, Math.abs(a.rgba[pixel * 4 + channel] - b.rgba[pixel * 4 + channel]));
    largestDelta = Math.max(largestDelta, delta);
    if (delta > maxChannelDelta) {
      changedPixels++;
      const x = pixel % a.width, y = Math.floor(pixel / a.width);
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  return { status: changedPixels <= maxChangedPixels ? 'PASS' : 'FAIL', width: a.width, height: a.height,
    changedPixels, largestDelta, threshold: { maxChangedPixels, maxChannelDelta },
    bounds: changedPixels ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 } : null };
}
