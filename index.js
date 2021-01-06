const { SmartBuffer } = require('smart-buffer');
const fs = require('fs');
const bplist = require('bplist-parser');
const pako = require('pako');
const sharp = require('sharp');
const { exit } = require('process');

const readNullTerminatedString = (buffer, offset) => {
  const bytes = [];
  let previous;

  while (previous !== 0) {
    previous = buffer.readUInt8(offset + bytes.length);

    if (previous !== 0) {
      bytes.push(String.fromCharCode(previous));
    }
  }

  return bytes.join('');
};

const getPixelsData = (data, size) => {
  if (size === 0) {
    return null;
  }

  if (data.length !== size) {
    return pako.inflate(data);
  }

  return data;
};

const getPixels = (textureFormat, colorData, alphaData) => {
  const pixels = [];
  switch (textureFormat) {
    case 3:
      for (let i = 0; i < colorData.length / 2; i += 1) {
        pixels.push(
          Math.floor(((colorData[2 * i + 1] & 0b11111000) >> 3) * 255 / 31),
          Math.floor((((colorData[2 * i + 1] & 0b111) << 3) | ((colorData[2 * i] & 0b11100000) >> 5)) * 255 / 63),
          Math.floor((colorData[2 * i] & 0b00011111) * 255 / 31),
          255,
        );
      }
      return pixels;
    case 4:
      for (let i = 0; i < alphaData.length; i += 1) {
        pixels.push(
          Math.floor(((colorData[2 * i + 1] & 0b11111000) >> 3) * 255 / 31),
          Math.floor((((colorData[2 * i + 1] & 0b111) << 3) | ((colorData[2 * i] & 0b11100000) >> 5)) * 255 / 63),
          Math.floor((colorData[2 * i] & 0b00011111) * 255 / 31),
          alphaData[i],
        );
      }
      return pixels;
    case 5:
      for (let i = 0; i < alphaData.length; i += 1) {
        pixels.push(0, 0, 0, alphaData[i]);
      }
      return pixels;
    default:
      throw Error(`Unsupported texture format: ${textureFormat}`);
  }
};

const extractData1 = (buffer) => {
  const startAddress = 0xf434c;
  const data1 = fs.readFileSync('Data1.dat');

  for (let i = 0; i < 562; i += 1) {
    const nameOffset = buffer.readUInt32LE(startAddress + i * 12) - 0x1000;
    const name = readNullTerminatedString(buffer, nameOffset);

    const offset = buffer.readUInt32LE(startAddress + i * 12 + 4);
    const length = buffer.readUInt32LE(startAddress + i * 12 + 8);
    // if (name !== 'AnticShop') {
    //   continue;
    // }
    const data = bplist.parseBuffer(data1.slice(offset, offset + length));
    const textures = data[0].$objects
      ? data[0].$objects.filter((o) => typeof o === 'object' && 'TextureBufferColorData' in o)
      : [];

    // const meshSplitBufferData = data[0].$objects[17]['NS.data'];
    // const meshSplitIndicesData = data[0].$objects[19]['NS.data'];

    textures.forEach((texture) => {
      const width = texture.TextureSizeWidth;
      const height = texture.TextureSizeHeight;
      const textureFormat = texture.TextureFormat;
      const colorData = getPixelsData(
        data[0].$objects[texture.TextureBufferColorData.UID],
        texture.TextureBufferColorDataSize,
      );
      const alphaData = getPixelsData(
        data[0].$objects[texture.TextureBufferAlphaData.UID],
        texture.TextureBufferAlphaDataSize,
      );

      if (textureFormat === 6 || textureFormat === 7) {
        // fs.writeFile(`out/data1/${name}-${i}-color.pvr`, colorData, () => { });
        // fs.writeFile(`out/data1/${name}-${i}-alpha.pvr`, alphaData, () => { });
      } else if (textureFormat === 3) {
        const pixels = getPixels(textureFormat, colorData, alphaData);
        sharp(Buffer.from(pixels), {
          raw: {
            width,
            height,
            channels: 4,
          },
        }).toFile(`out/data1/${name}-${i}-${textureFormat}.png`);
      }
    });
  }
};

const extractData2 = (buffer) => {
  const startAddress = 0xf5e48;
  const data2 = fs.readFileSync('Data2.dat');

  for (let i = 0; i < 222; i += 1) {
    const nameOffset = buffer.readUInt32LE(startAddress + i * 28) - 0x1000;
    const name = readNullTerminatedString(buffer, nameOffset);
    const offset = buffer.readUInt32LE(startAddress + i * 28 + 4);
    const length = buffer.readUInt32LE(startAddress + i * 28 + 8);
    const sound = data2.slice(offset, offset + length);
    fs.writeFile(`out/data2/${name}.raw`, sound, () => {});
  }
};

const extractData3 = (buffer) => {
  const startAddress = 0xf78cc;
  const data3 = fs.readFileSync('Data3.dat');

  for (let i = 0; i < 11; i += 1) {
    const nameOffset = buffer.readUInt32LE(startAddress + i * 12) - 0x1000;
    const name = readNullTerminatedString(buffer, nameOffset);
    const offset = buffer.readUInt32LE(startAddress + i * 12 + 4);
    const length = buffer.readUInt32LE(startAddress + i * 12 + 8);
    const sound = data3.slice(offset, offset + length);
    fs.writeFile(`out/data3/${name}.m4a`, sound, () => {});
  }
};

const main = () => {
  fs.rmdirSync('out', { recursive: true });
  fs.mkdirSync('out/data1', { recursive: true });
  fs.mkdirSync('out/data2', { recursive: true });
  fs.mkdirSync('out/data3', { recursive: true });

  const codeBuffer = fs.readFileSync('Project1112e03hd');

  extractData1(codeBuffer);
  extractData2(codeBuffer);
  extractData3(codeBuffer);
};

main();
