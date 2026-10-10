// Turns the client's black-background JPEG into a transparent PNG/WebP + favicons + OG image.
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const src = path.join(process.env.USERPROFILE || 'C:/Users/DELL', 'Downloads', 'the immigrant place logo.jpeg');
const out = path.join(__dirname, '..', 'public', 'img');
fs.mkdirSync(out, { recursive: true });

async function keyed() {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const lo = 14, hi = 46; // max-channel ramp: <=lo fully transparent, >=hi opaque
  for (let i = 0; i < data.length; i += 4) {
    const m = Math.max(data[i], data[i + 1], data[i + 2]);
    const a = m <= lo ? 0 : m >= hi ? 255 : Math.round(((m - lo) / (hi - lo)) * 255);
    data[i + 3] = a;
    if (a > 0 && a < 255) { // un-premultiply the dark fringe so edges don't halo
      const k = 255 / Math.max(m, 1) * 0.55 + 0.45;
      data[i] = Math.min(255, data[i] * k); data[i + 1] = Math.min(255, data[i + 1] * k); data[i + 2] = Math.min(255, data[i + 2] * k);
    }
  }
  return sharp(data, { raw: info }).png().trim({ threshold: 1 }).toBuffer();
}

(async () => {
  const logo = await keyed();
  const pad = (b, p) => sharp(b).extend({ top: p, bottom: p, left: p, right: p, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const padded = await pad(logo, 8);
  await sharp(padded).resize({ width: 900, withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 95 }).toFile(out + '/logo.webp');
  await sharp(padded).resize({ width: 900, withoutEnlargement: true }).png().toFile(out + '/logo.png');
  await sharp(padded).resize({ width: 420 }).webp({ quality: 90 }).toFile(out + '/logo-sm.webp');
  const meta = await sharp(padded).metadata();
  console.log('logo', meta.width, meta.height);
  for (const s of [16, 32, 180, 192, 512]) {
    await sharp(padded).resize(s, s, { fit: 'contain', background: '#ffffff' }).flatten({ background: '#ffffff' }).png().toFile(out + `/icon-${s}.png`);
  }
  const og = await sharp(padded).resize({ width: 1000, height: 520, fit: 'inside' }).toBuffer();
  await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#fbf8f2' } })
    .composite([{ input: og, gravity: 'center' }]).jpeg({ quality: 86 }).toFile(out + '/og-default.jpg');
  // preview on white for eyeballing
  await sharp({ create: { width: 900, height: 700, channels: 3, background: '#ffffff' } })
    .composite([{ input: await sharp(padded).resize({ width: 880 }).toBuffer(), gravity: 'center' }]).png().toFile(path.join(__dirname, 'preview-logo.png'));
})();
