import { randomFillSync } from "node:crypto";
import { deflateSync } from "node:zlib";

// Real picture files for the tests that upload one: a PNG is built in memory,
// so the suite carries no binary fixture.

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}

/** A striped PNG of the given size: woven cloth, seen from far away. */
export function pngPicture(width = 480, height = 320, palette: [number, number, number][] = [[30, 58, 95], [217, 119, 6], [250, 245, 235]]): Buffer {
  const row = 1 + width * 3;
  const pixels = Buffer.alloc(row * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [red, green, blue] = palette[(Math.floor(x / 24) + (Math.floor(y / 80) % 2)) % palette.length];
      pixels.set([red, green, blue], y * row + 1 + x * 3);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8); // 8 bits per channel, RGB
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", header), chunk("IDAT", deflateSync(pixels)), chunk("IEND", Buffer.alloc(0))]);
}

/**
 * A PNG that does not compress, like a photo straight from a phone: about
 * three bytes per pixel. 1800 x 1250 weighs more than the 5 MB a description
 * picture may weigh once stored.
 */
export function heavyPng(width = 1800, height = 1250): Buffer {
  const row = 1 + width * 3;
  const pixels = randomFillSync(Buffer.alloc(row * height));
  for (let y = 0; y < height; y += 1) pixels[y * row] = 0; // filter byte of each line
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", header), chunk("IDAT", deflateSync(pixels, { level: 1 })), chunk("IEND", Buffer.alloc(0))]);
}

export const pngFile = (name: string, width?: number, height?: number) => ({ name, mimeType: "image/png", buffer: pngPicture(width, height) });
