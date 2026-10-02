export function validateImage(base64: string, mime: string): Uint8Array {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(mime) ||
    base64.length > 13981016
  )
    throw Error("VALIDATION: image size/type");
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  if (bytes.length > 10485760 || bytes.length < 24)
    throw Error("VALIDATION: image size");
  const v = new DataView(bytes.buffer);
  let width = 0,
    height = 0;
  if (mime === "image/png") {
    if ([137, 80, 78, 71, 13, 10, 26, 10].some((n, i) => bytes[i] !== n))
      throw Error("VALIDATION: PNG signature");
    width = v.getUint32(16);
    height = v.getUint32(20);
  }
  if (mime === "image/jpeg") {
    if (bytes[0] !== 255 || bytes[1] !== 216)
      throw Error("VALIDATION: JPEG signature");
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset++] !== 255) throw Error("VALIDATION: JPEG marker");
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      const length = v.getUint16(offset);
      if (length < 2 || offset + length > bytes.length)
        throw Error("VALIDATION: JPEG segment");
      if (
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker)
      ) {
        height = v.getUint16(offset + 3);
        width = v.getUint16(offset + 5);
        break;
      }
      offset += length;
    }
  }
  if (mime === "image/webp") {
    const text = (a: number, b: number) =>
      String.fromCharCode(...bytes.slice(a, b));
    if (text(0, 4) !== "RIFF" || text(8, 12) !== "WEBP")
      throw Error("VALIDATION: WebP signature");
    const kind = text(12, 16);
    if (kind === "VP8X" && bytes.length >= 30) {
      width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    } else if (kind === "VP8L" && bytes.length >= 25 && bytes[20] === 47) {
      width = 1 + ((bytes[21] | (bytes[22] << 8)) & 16383);
      height =
        1 + (((bytes[22] >> 6) | (bytes[23] << 2) | (bytes[24] << 10)) & 16383);
    } else if (
      kind === "VP8 " &&
      bytes.length >= 30 &&
      bytes[23] === 157 &&
      bytes[24] === 1 &&
      bytes[25] === 42
    ) {
      width = v.getUint16(26, true) & 16383;
      height = v.getUint16(28, true) & 16383;
    }
  }
  if (!width || !height || width * height > 25000000)
    throw Error("VALIDATION: image dimensions");
  return bytes;
}
