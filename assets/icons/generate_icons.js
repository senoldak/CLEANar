import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createEraserPNG(targetSize) {
  const scale = 4;
  const width = targetSize * scale;
  const height = targetSize * scale;

  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  const ihdrBuf = Buffer.alloc(13);
  ihdrBuf.writeUInt32BE(targetSize, 0);
  ihdrBuf.writeUInt32BE(targetSize, 4);
  ihdrBuf.writeUInt8(8, 8);
  ihdrBuf.writeUInt8(6, 9);
  ihdrBuf.writeUInt8(0, 10);
  ihdrBuf.writeUInt8(0, 11);
  ihdrBuf.writeUInt8(0, 12);
  const ihdrChunk = createChunk('IHDR', ihdrBuf);

  const hiRes = new Uint8Array(width * height * 4);
  const cx = width / 2;
  const cy = height / 2;
  const r = width * 0.45;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= r) {
        // Dark Cyan/Indigo Radial Background
        const t = (x + y) / (width + height);
        const bgR = Math.round(15 + (30 - 15) * t);
        const bgG = Math.round(23 + (41 - 23) * t);
        const bgB = Math.round(42 + (59 - 42) * t);

        // Angled Eraser Block (Rotated 35 degrees)
        // Transform (x,y) to rotated coordinate space
        const rad = -35 * (Math.PI / 180);
        const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const ry = dx * Math.sin(rad) + dy * Math.cos(rad);

        const ew = width * 0.28; // Half width
        const eh = height * 0.16; // Half height

        const isEraserBody = Math.abs(rx) <= ew && Math.abs(ry) <= eh;
        const isSleeve = Math.abs(rx) <= ew && (ry >= -eh && ry <= 0); // Bottom sleeve

        if (isEraserBody) {
          if (isSleeve) {
            // Electric Cyan Sleeve
            hiRes[idx] = 6;
            hiRes[idx + 1] = 182;
            hiRes[idx + 2] = 212;
            hiRes[idx + 3] = 255;
          } else {
            // Crisp White Rubber Top
            hiRes[idx] = 255;
            hiRes[idx + 1] = 255;
            hiRes[idx + 2] = 255;
            hiRes[idx + 3] = 255;
          }
        } else {
          // Dust/Clean swoosh lines underneath
          const isDust = (ry > eh + height * 0.04 && ry < eh + height * 0.1) &&
                         (rx > -ew * 0.8 && rx < ew * 0.8);
          if (isDust) {
            hiRes[idx] = 148;
            hiRes[idx + 1] = 163;
            hiRes[idx + 2] = 184;
            hiRes[idx + 3] = 255;
          } else {
            hiRes[idx] = bgR;
            hiRes[idx + 1] = bgG;
            hiRes[idx + 2] = bgB;
            hiRes[idx + 3] = 255;
          }
        }
      } else {
        hiRes[idx + 3] = 0; // Transparent
      }
    }
  }

  // Downsample 4x with Box Filter
  const rawData = [];
  for (let ty = 0; ty < targetSize; ty++) {
    rawData.push(0);
    for (let tx = 0; tx < targetSize; tx++) {
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0;
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const hy = ty * scale + sy;
          const hx = tx * scale + sx;
          const hIdx = (hy * width + hx) * 4;
          rSum += hiRes[hIdx];
          rSum += hiRes[hIdx]; // Red
          gSum += hiRes[hIdx + 1];
          bSum += hiRes[hIdx + 2];
          aSum += hiRes[hIdx + 3];
        }
      }
      const count = scale * scale;
      rawData.push(
        Math.round(rSum / count),
        Math.round(gSum / count),
        Math.round(bSum / count),
        Math.round(aSum / count)
      );
    }
  }

  const compressedData = zlib.deflateSync(Buffer.from(rawData));
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crc = crc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xEDB88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

const dir = './assets/icons';
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

[16, 48, 128].forEach(size => {
  const pngBuffer = createEraserPNG(size);
  const filePath = path.join(dir, `icon-${size}.png`);
  fs.writeFileSync(filePath, pngBuffer);
  console.log(`Generated Eraser PNG ${filePath}`);
});
