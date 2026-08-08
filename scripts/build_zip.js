import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createZip(files, outputPath) {
  const localHeaders = [];
  const centralDirs = [];
  let offset = 0;

  for (const file of files) {
    const content = fs.readFileSync(file.path);
    const fileName = file.name.replace(/\\/g, '/');
    const fileNameBuf = Buffer.from(fileName, 'utf8');

    const crc = crc32(content);
    const uncompressedSize = content.length;
    const compressedData = zlib.deflateRawSync(content);
    const compressedSize = compressedData.length;

    // Local file header
    const localHeader = Buffer.alloc(30 + fileNameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Signature
    localHeader.writeUInt16LE(20, 4); // Version needed
    localHeader.writeUInt16LE(0, 6); // General flags
    localHeader.writeUInt16LE(8, 8); // Compression method (deflate)
    localHeader.writeUInt16LE(0, 10); // Mod time
    localHeader.writeUInt16LE(0, 12); // Mod date
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressedSize, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(fileNameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);
    fileNameBuf.copy(localHeader, 30);

    localHeaders.push(localHeader);
    localHeaders.push(compressedData);

    // Central directory header
    const centralHeader = Buffer.alloc(46 + fileNameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Signature
    centralHeader.writeUInt16LE(20, 4); // Made by
    centralHeader.writeUInt16LE(20, 6); // Version needed
    centralHeader.writeUInt16LE(0, 8); // Flags
    centralHeader.writeUInt16LE(8, 10); // Compression
    centralHeader.writeUInt16LE(0, 12); // Mod time
    centralHeader.writeUInt16LE(0, 14); // Mod date
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressedSize, 20);
    centralHeader.writeUInt32LE(uncompressedSize, 24);
    centralHeader.writeUInt16LE(fileNameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30); // Extra len
    centralHeader.writeUInt16LE(0, 32); // Comment len
    centralHeader.writeUInt16LE(0, 34); // Disk num
    centralHeader.writeUInt16LE(0, 36); // Int attr
    centralHeader.writeUInt32LE(0, 38); // Ext attr
    centralHeader.writeUInt32LE(offset, 42); // Local header offset
    fileNameBuf.copy(centralHeader, 46);

    centralDirs.push(centralHeader);

    offset += localHeader.length + compressedData.length;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const c of centralDirs) centralDirSize += c.length;

  // End of central directory record
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // Signature
  eocd.writeUInt16LE(0, 4); // Disk num
  eocd.writeUInt16LE(0, 6); // Start disk
  eocd.writeUInt16LE(files.length, 8); // Disk entries
  eocd.writeUInt16LE(files.length, 10); // Total entries
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20); // Comment length

  const zipBuffer = Buffer.concat([...localHeaders, ...centralDirs, eocd]);
  fs.writeFileSync(outputPath, zipBuffer);
  console.log(`Created Chrome Web Store package: ${outputPath} (${(zipBuffer.length / 1024).toFixed(1)} KB)`);
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

function getAllFiles(dirPath, arrayOfFiles = [], baseDir = dirPath) {
  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'scripts' && file !== '.git' && file !== 'node_modules') {
        getAllFiles(fullPath, arrayOfFiles, baseDir);
      }
    } else {
      if (!file.endsWith('.zip') && file !== 'README.md') {
        const relPath = path.relative(baseDir, fullPath);
        arrayOfFiles.push({ path: fullPath, name: relPath });
      }
    }
  });
  return arrayOfFiles;
}

const rootDir = '.';
const filesToZip = getAllFiles(rootDir);
createZip(filesToZip, './cleanar-extension.zip');
