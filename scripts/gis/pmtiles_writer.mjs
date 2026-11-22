import fs from 'node:fs';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { zxyToTileId, Compression, TileType, PMTiles, FileSource } from 'pmtiles';

const HEADER_SIZE = 127;

function writeVarint(out, value) {
  let n = BigInt(value);
  while (n >= 128n) {
    out.push(Number((n & 127n) | 128n));
    n >>= 7n;
  }
  out.push(Number(n));
}

function serializeDirectory(entries) {
  const out = [];
  writeVarint(out, entries.length);

  let lastId = 0;
  for (const e of entries) {
    const delta = e.tileId - lastId;
    if (delta < 0) {
      throw new Error(`Entries not sorted by tileId: ${lastId} -> ${e.tileId}`);
    }
    writeVarint(out, delta);
    lastId = e.tileId;
  }

  for (const e of entries) {
    writeVarint(out, e.runLength);
  }

  for (const e of entries) {
    writeVarint(out, e.length);
  }

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (i > 0 && e.offset === entries[i - 1].offset + entries[i - 1].length) {
      writeVarint(out, 0);
    } else {
      writeVarint(out, e.offset + 1);
    }
  }

  return zlib.gzipSync(Buffer.from(out), { level: 9 });
}

function buildDirectories(tileEntries) {
  let rootGz = serializeDirectory(tileEntries);
  if (HEADER_SIZE + rootGz.length <= 16384) {
    return { rootGz, leafBuf: Buffer.alloc(0) };
  }

  // Split into leaf directories if root doesn't fit in initial 16KB fetch
  for (const leafSize of [4096, 2048, 1024, 512]) {
    const leafChunks = [];
    const rootEntries = [];
    let leafOffset = 0;

    for (let i = 0; i < tileEntries.length; i += leafSize) {
      const slice = tileEntries.slice(i, i + leafSize);
      const gz = serializeDirectory(slice);
      leafChunks.push(gz);
      rootEntries.push({
        tileId: slice[0].tileId,
        offset: leafOffset,
        length: gz.length,
        runLength: 0,
      });
      leafOffset += gz.length;
    }

    rootGz = serializeDirectory(rootEntries);
    if (HEADER_SIZE + rootGz.length <= 16384) {
      return { rootGz, leafBuf: Buffer.concat(leafChunks) };
    }
  }

  throw new Error('Too many leaf directories to fit root directory in 16KB');
}

function encodeHeader({
  rootDirectoryOffset,
  rootDirectoryLength,
  jsonMetadataOffset,
  jsonMetadataLength,
  leafDirectoryOffset,
  leafDirectoryLength,
  tileDataOffset,
  tileDataLength,
  numAddressedTiles,
  numTileEntries,
  numTileContents,
  minZoom,
  maxZoom,
  minLon,
  minLat,
  maxLon,
  maxLat,
  centerZoom,
  centerLon,
  centerLat,
}) {
  const buf = Buffer.alloc(HEADER_SIZE);
  buf.write('PMTiles', 0, 'ascii');
  buf.writeUInt8(3, 7); // specVersion 3

  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  dv.setBigUint64(8, BigInt(rootDirectoryOffset), true);
  dv.setBigUint64(16, BigInt(rootDirectoryLength), true);
  dv.setBigUint64(24, BigInt(jsonMetadataOffset), true);
  dv.setBigUint64(32, BigInt(jsonMetadataLength), true);
  dv.setBigUint64(40, BigInt(leafDirectoryOffset), true);
  dv.setBigUint64(48, BigInt(leafDirectoryLength), true);
  dv.setBigUint64(56, BigInt(tileDataOffset), true);
  dv.setBigUint64(64, BigInt(tileDataLength), true);
  dv.setBigUint64(72, BigInt(numAddressedTiles), true);
  dv.setBigUint64(80, BigInt(numTileEntries), true);
  dv.setBigUint64(88, BigInt(numTileContents), true);

  buf.writeUInt8(1, 96); // clustered
  buf.writeUInt8(Compression.Gzip, 97); // internalCompression
  buf.writeUInt8(Compression.Gzip, 98); // tileCompression
  buf.writeUInt8(TileType.Mvt, 99); // tileType
  buf.writeUInt8(minZoom, 100);
  buf.writeUInt8(maxZoom, 101);

  dv.setInt32(102, Math.round(minLon * 1e7), true);
  dv.setInt32(106, Math.round(minLat * 1e7), true);
  dv.setInt32(110, Math.round(maxLon * 1e7), true);
  dv.setInt32(114, Math.round(maxLat * 1e7), true);
  buf.writeUInt8(centerZoom, 118);
  dv.setInt32(119, Math.round(centerLon * 1e7), true);
  dv.setInt32(123, Math.round(centerLat * 1e7), true);

  return buf;
}

/**
 * Streams vector tiles into a valid PMTiles v3 archive on disk with payload deduplication.
 */
export class StreamingPMTilesWriter {
  constructor(outputPath, options) {
    this.outputPath = outputPath;
    this.tempTileDataPath = `${outputPath}.tiles.tmp`;
    this.options = options;
    this.tileStream = fs.createWriteStream(this.tempTileDataPath);
    this.hashToBlob = new Map(); // hash -> { offset, length }
    this.entries = [];
    this.tileDataLength = 0;
    this.numTileContents = 0;
  }

  addTile(z, x, y, gzippedMvtBuffer) {
    if (!gzippedMvtBuffer || gzippedMvtBuffer.length === 0) return;
    const tileId = zxyToTileId(z, x, y);
    const hash = crypto.createHash('md5').update(gzippedMvtBuffer).digest('hex');

    let blob = this.hashToBlob.get(hash);
    if (!blob) {
      blob = { offset: this.tileDataLength, length: gzippedMvtBuffer.length };
      this.hashToBlob.set(hash, blob);
      this.tileStream.write(gzippedMvtBuffer);
      this.tileDataLength += gzippedMvtBuffer.length;
      this.numTileContents++;
    }

    this.entries.push({
      tileId,
      offset: blob.offset,
      length: blob.length,
      runLength: 1,
    });
  }

  async finalize(metadataJsonObj) {
    await new Promise((resolve) => this.tileStream.end(resolve));

    // Sort entries strictly ascending by tileId
    this.entries.sort((a, b) => a.tileId - b.tileId);
    // Deduplicate identical tileId if any
    const deduped = [];
    for (const e of this.entries) {
      if (deduped.length > 0 && deduped[deduped.length - 1].tileId === e.tileId) {
        continue;
      }
      deduped.push(e);
    }

    const { rootGz, leafBuf } = buildDirectories(deduped);
    const metadataGz = zlib.gzipSync(Buffer.from(JSON.stringify(metadataJsonObj), 'utf8'), { level: 9 });

    const rootDirectoryOffset = HEADER_SIZE;
    const rootDirectoryLength = rootGz.length;
    const jsonMetadataOffset = rootDirectoryOffset + rootDirectoryLength;
    const jsonMetadataLength = metadataGz.length;
    const leafDirectoryOffset = jsonMetadataOffset + jsonMetadataLength;
    const leafDirectoryLength = leafBuf.length;
    const tileDataOffset = leafDirectoryOffset + leafDirectoryLength;

    const header = encodeHeader({
      rootDirectoryOffset,
      rootDirectoryLength,
      jsonMetadataOffset,
      jsonMetadataLength,
      leafDirectoryOffset,
      leafDirectoryLength,
      tileDataOffset,
      tileDataLength: this.tileDataLength,
      numAddressedTiles: deduped.length,
      numTileEntries: deduped.length,
      numTileContents: this.numTileContents,
      minZoom: this.options.minZoom,
      maxZoom: this.options.maxZoom,
      minLon: this.options.minLon,
      minLat: this.options.minLat,
      maxLon: this.options.maxLon,
      maxLat: this.options.maxLat,
      centerZoom: this.options.centerZoom,
      centerLon: this.options.centerLon,
      centerLat: this.options.centerLat,
    });

    const outFd = fs.openSync(this.outputPath, 'w');
    fs.writeSync(outFd, header);
    fs.writeSync(outFd, rootGz);
    fs.writeSync(outFd, metadataGz);
    if (leafBuf.length > 0) {
      fs.writeSync(outFd, leafBuf);
    }

    // Stream temp tile data payload into final archive in 4MB chunks
    const inFd = fs.openSync(this.tempTileDataPath, 'r');
    const copyBuf = Buffer.allocUnsafe(4 * 1024 * 1024);
    let pos = 0;
    while (true) {
      const bytesRead = fs.readSync(inFd, copyBuf, 0, copyBuf.length, pos);
      if (bytesRead <= 0) break;
      fs.writeSync(outFd, copyBuf, 0, bytesRead);
      pos += bytesRead;
    }
    fs.closeSync(inFd);
    fs.closeSync(outFd);
    fs.unlinkSync(this.tempTileDataPath);

    return {
      fileSize: tileDataOffset + this.tileDataLength,
      numAddressedTiles: deduped.length,
      numUniqueContents: this.numTileContents,
    };
  }
}

export async function verifyPMTilesArchive(pmtilesPath, sampleZxy = null) {
  const stat = fs.statSync(pmtilesPath);
  const fd = fs.openSync(pmtilesPath, 'r');
  const source = {
    getKey: () => pmtilesPath,
    async getBytes(offset, length) {
      const buf = Buffer.allocUnsafe(length);
      const bytesRead = fs.readSync(fd, buf, 0, length, offset);
      return {
        data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + bytesRead),
      };
    },
  };
  try {
    const reader = new PMTiles(source);
    const header = await reader.getHeader();
    const metadata = await reader.getMetadata();
    let sampleBytes = 0;
    if (sampleZxy) {
      const tile = await reader.getZxy(sampleZxy[0], sampleZxy[1], sampleZxy[2]);
      sampleBytes = tile?.data?.byteLength || 0;
    }
    return { fileSize: stat.size, header, metadata, sampleBytes };
  } finally {
    fs.closeSync(fd);
  }
}
