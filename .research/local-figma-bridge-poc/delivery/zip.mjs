import { inflateRawSync } from 'node:zlib';

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

export function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = CRC_TABLE[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

export function safeEntryName(name) {
  if (typeof name !== 'string' || !name || /[\\\x00-\x1f:]/.test(name) || name.startsWith('/') ||
      name.split('/').some((part, index, parts) => part === '..' || part === '.' || (!part && index !== parts.length - 1))) {
    throw new Error('ZIP_UNSAFE_ENTRY_NAME');
  }
  return name;
}

// ZIP32 only. Never extracts paths; bounds, CRC, size and duplicate checks precede use.
export function readZip(bytes, { maxEntries = 10000, maxEntryBytes = 128 * 1024 * 1024,
  maxTotalBytes = 256 * 1024 * 1024 } = {}) {
  if (!Buffer.isBuffer(bytes)) bytes = Buffer.from(bytes);
  let end = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) {
    if (bytes.readUInt32LE(offset) === 0x06054b50 && offset + 22 + bytes.readUInt16LE(offset + 20) === bytes.length) {
      end = offset;
      break;
    }
  }
  if (end < 0) throw new Error('ZIP_END_RECORD_MISSING');
  const count = bytes.readUInt16LE(end + 10);
  const directorySize = bytes.readUInt32LE(end + 12);
  const directoryOffset = bytes.readUInt32LE(end + 16);
  if (bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6) || bytes.readUInt16LE(end + 8) !== count ||
      count === 65535 || count > maxEntries || directoryOffset + directorySize !== end) {
    throw new Error('ZIP_DIRECTORY_UNSUPPORTED_OR_INVALID');
  }
  const entries = new Map();
  const ranges = [];
  let cursor = directoryOffset;
  let expanded = 0;
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > end || bytes.readUInt32LE(cursor) !== 0x02014b50) throw new Error('ZIP_DIRECTORY_CORRUPT');
    const flags = bytes.readUInt16LE(cursor + 8);
    const method = bytes.readUInt16LE(cursor + 10);
    const checksum = bytes.readUInt32LE(cursor + 16);
    const compressedSize = bytes.readUInt32LE(cursor + 20);
    const size = bytes.readUInt32LE(cursor + 24);
    const nameLength = bytes.readUInt16LE(cursor + 28);
    const extraLength = bytes.readUInt16LE(cursor + 30);
    const commentLength = bytes.readUInt16LE(cursor + 32);
    const localOffset = bytes.readUInt32LE(cursor + 42);
    const next = cursor + 46 + nameLength + extraLength + commentLength;
    if (next > end || flags & 1 || ![0, 8].includes(method) || bytes.readUInt16LE(cursor + 34) ||
        ((bytes.readUInt32LE(cursor + 38) >>> 16) & 0xf000) === 0xa000) {
      throw new Error('ZIP_ENTRY_UNSUPPORTED_OR_CORRUPT');
    }
    const rawName = bytes.subarray(cursor + 46, cursor + 46 + nameLength);
    const name = safeEntryName(new TextDecoder('utf-8', { fatal: true }).decode(rawName));
    const collisionKey = name.toLowerCase();
    if ([...entries.keys()].some((key) => key.toLowerCase() === collisionKey)) throw new Error('ZIP_DUPLICATE_ENTRY');
    expanded += size;
    if (size > maxEntryBytes || expanded > maxTotalBytes) throw new Error('ZIP_EXPANDED_SIZE_LIMIT');
    if (localOffset + 30 > directoryOffset || bytes.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('ZIP_LOCAL_HEADER_CORRUPT');
    const localNameLength = bytes.readUInt16LE(localOffset + 26);
    const localExtraLength = bytes.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > directoryOffset || bytes.readUInt16LE(localOffset + 6) !== flags ||
        bytes.readUInt16LE(localOffset + 8) !== method ||
        !bytes.subarray(localOffset + 30, localOffset + 30 + localNameLength).equals(rawName)) {
      throw new Error('ZIP_LOCAL_HEADER_MISMATCH');
    }
    if (!(flags & 8) && (bytes.readUInt32LE(localOffset + 14) !== checksum ||
        bytes.readUInt32LE(localOffset + 18) !== compressedSize || bytes.readUInt32LE(localOffset + 22) !== size)) {
      throw new Error('ZIP_LOCAL_SIZE_MISMATCH');
    }
    if (ranges.some(([start, finish]) => localOffset < finish && dataEnd > start)) throw new Error('ZIP_OVERLAPPING_ENTRIES');
    ranges.push([localOffset, dataEnd]);
    const compressed = bytes.subarray(dataStart, dataEnd);
    const data = method === 0 ? Buffer.from(compressed) : inflateRawSync(compressed, { maxOutputLength: Math.max(1, Math.min(size, maxEntryBytes)) });
    if (data.length !== size || crc32(data) !== checksum) throw new Error('ZIP_ENTRY_INTEGRITY_FAILED');
    if (name.endsWith('/') && data.length) throw new Error('ZIP_DIRECTORY_HAS_CONTENT');
    entries.set(name, data);
    cursor = next;
  }
  if (cursor !== end) throw new Error('ZIP_DIRECTORY_SIZE_MISMATCH');
  return entries;
}

// Deterministic STORE ZIP32 writer; fixed DOS epoch and UTF-8 names.
export function createZip(inputEntries) {
  const entries = [...inputEntries];
  if (entries.length >= 65535) throw new Error('ZIP_ENTRY_LIMIT');
  const locals = [];
  const directory = [];
  const seen = new Set();
  let offset = 0;
  for (const [entryName, raw] of entries) {
    const name = Buffer.from(safeEntryName(entryName), 'utf8');
    const key = entryName.toLowerCase();
    if (seen.has(key)) throw new Error('ZIP_DUPLICATE_ENTRY');
    seen.add(key);
    const data = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    if (name.length > 65535 || data.length >= 0xffffffff) throw new Error('ZIP32_LIMIT');
    const checksum = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x800, 6);
    local.writeUInt16LE(33, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x800, 8);
    central.writeUInt16LE(33, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, data);
    directory.push(central, name);
    offset += local.length + name.length + data.length;
    if (offset >= 0xffffffff) throw new Error('ZIP32_LIMIT');
  }
  const directoryBytes = Buffer.concat(directory);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directoryBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directoryBytes, end]);
}
