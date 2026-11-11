// Turns a photo / render into a Klein-blue pencil sketch on a transparent background
// (blends into the paper in light mode; inverted with the other diagrams in dark mode).
//   node tools/sketch-thumb.mjs <src> <out.webp> <left> <top> <width> <height> [blurSigma] [gamma]
import sharp from 'sharp';

const [src, out, l, t, w, h, sigmaArg, gammaArg] = process.argv.slice(2);
const crop = { left: +l, top: +t, width: +w, height: +h };
const WIDTH = 900;
const sigma = +(sigmaArg || 9);   // pencil "dodge" radius
const gamma = +(gammaArg || 1.25); // >1 thins faint strokes

const base = sharp(src).extract(crop).resize({ width: WIDTH }).greyscale();
const { data: g, info } = await base.clone().raw().toBuffer({ resolveWithObject: true });
const { data: blurInv } = await base.clone().negate({ alpha: false }).blur(sigma).raw().toBuffer({ resolveWithObject: true });
const { data: soft } = await base.clone().blur(1.1).raw().toBuffer({ resolveWithObject: true });

const W = info.width, H = info.height;
const ink = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) {
  // colour-dodge pencil: light areas vanish, edges and shadows remain as strokes
  const dodge = Math.min(1, (g[i] / 255) / Math.max(0.02, 1 - blurInv[i] / 255));
  ink[i] = 1 - dodge;
}
// add crisp outlines from a Sobel pass on the lightly blurred image
const at = (x, y) => soft[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))] / 255;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const gx = -at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1) + at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1);
  const gy = -at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1) + at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1);
  const e = Math.min(1, Math.hypot(gx, gy) * 1.6);
  const i = y * W + x;
  ink[i] = Math.max(ink[i] * 1.6, e * 0.85);
}
const rgba = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) {
  let a = Math.min(1, Math.max(0, ink[i]));
  a = a < 0.06 ? 0 : Math.pow(a, gamma); // drop paper noise
  rgba[i * 4] = 0x1f; rgba[i * 4 + 1] = 0x2f; rgba[i * 4 + 2] = 0xcf; rgba[i * 4 + 3] = Math.round(a * 255);
}
await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 90, alphaQuality: 90 }).toFile(out);
console.log('wrote', out, W, 'x', H);
