import sharp from "sharp";

const { data, info } = await sharp("server/assets/certificate-template.jpg")
  .raw()
  .ensureAlpha()
  .toBuffer({ resolveWithObject: true });
const W = info.width;

for (const y of [548, 552, 555, 558, 560, 562, 565]) {
  const dark: number[] = [];
  for (let x = 250; x < 750; x++) {
    const i = (y * W + x) * 4;
    const L = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (L < 80) dark.push(x);
  }
  if (!dark.length) continue;
  // cluster contiguous
  const gaps: number[] = [];
  for (let i = 1; i < dark.length; i++) if (dark[i] - dark[i - 1] > 8) gaps.push(i);
  console.log({
    y,
    xMin: dark[0],
    xMax: dark[dark.length - 1],
    count: dark.length,
    firstGapAt: gaps[0] ? dark[gaps[0]] : null,
  });
}
