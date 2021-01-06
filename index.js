const { SmartBuffer } = require('smart-buffer');
const fs = require('fs');

const intFromBytes = (byteArr) => byteArr.reduce(
  (a, c, i) => a + c * 2 ** ((byteArr.length - i - 1) * 8),
  0,
);

const readBplistFile = (name, buffer) => {
  const magicBytes = buffer.readString(8);
  const trailer = buffer.internalBuffer.slice(buffer.length - 32);
  const sortVersion = trailer.readUInt8(5);
  const offsetTableOffsetSize = trailer.readUInt8(6);
  const offsetRefSize = trailer.readUInt8(7);
  const numObjects = trailer.readBigInt64BE(8);
  const topObjectOffset = trailer.readBigInt64BE(16);
  const offsetTableStart = trailer.readBigInt64BE(24);

  if (magicBytes !== 'bplist00') {
    throw Error('Invalid bplist file');
  }

  for (let i = 0; i < numObjects; i += 1) {
    const marker = buffer.readUInt8();
    const type = marker >> 4;
    let length = marker & 0xF;

    if (length === 0xf && type !== 0x1 && type !== 0x2) {
      const nextByte = buffer.readUInt8();
      const lengthOfLengthBytes = 2 ** (nextByte & 0xf);
      const lengthBytes = buffer.readBuffer(lengthOfLengthBytes);
      length = intFromBytes(lengthBytes);
    }

    switch (type) {
      case 0x0:
        break;
      case 0x1:
      case 0x2:
        length = 2 ** length;
        buffer.readBuffer(length);
        break;
      case 0x3:
        buffer.readBuffer(8);
        break;
      case 0x4: {
        const data = buffer.readBuffer(length);
        fs.writeFileSync(`out/data1/${name}-${i}`, Buffer.from(data));
        console.log(`data of size ${length}: ${data.slice(0, 20).toString('hex')}`);
        break;
      }
      case 0x5: {
        const string = buffer.readString(length, 'utf-8');
        // console.log(string);
        break;
      }
      case 0x6: {
        const string = buffer.readBuffer(length * 2).swap16().toString('utf16le');
        // console.log(string);
        break;
      }
      case 0x8:
        buffer.readBuffer(length + 1);
        break;
      case 0xa:
      case 0xc:
        buffer.readBuffer(offsetRefSize * length);
        break;
      case 0xd:
        buffer.readBuffer(offsetRefSize * length * 2);
        break;
      default:
        break;
    }
  }
};

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

const extractData1 = (buffer) => {
  const startAddress = 0xf434c;
  const data1 = fs.readFileSync('Data1.dat');

  for (let i = 0; i < 562; i += 1) {
    const nameOffset = buffer.readUInt32LE(startAddress + i * 12) - 0x1000;
    const name = readNullTerminatedString(buffer, nameOffset);
    const offset = buffer.readUInt32LE(startAddress + i * 12 + 4);
    const length = buffer.readUInt32LE(startAddress + i * 12 + 8);
    readBplistFile(name, SmartBuffer.fromBuffer(data1.slice(offset, offset + length)));
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
    fs.writeFileSync(`out/data2/${name}.raw`, sound);
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
    fs.writeFileSync(`out/data3/${name}.m4a`, sound);
  }
};

const main = () => {
  fs.rmdirSync('out', { recursive: true });
  fs.mkdirSync('out/data1', { recursive: true });
  fs.mkdirSync('out/data2', { recursive: true });
  fs.mkdirSync('out/data3', { recursive: true });

  const codeBuffer = fs.readFileSync('Project1112e03hd');

  // extractData1(codeBuffer);
  // extractData2(codeBuffer);
  extractData3(codeBuffer);
};

main();
