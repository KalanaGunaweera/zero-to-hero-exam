// Generates PWA icons from public/brand/logo.svg.  Run: npm run icons
import sharp from 'sharp';
import fs from 'node:fs';

const svg = fs.readFileSync('public/brand/logo.svg');
fs.mkdirSync('public/icons', { recursive: true });

await sharp(svg, { density: 384 }).resize(192, 192).png().toFile('public/icons/icon-192.png');
await sharp(svg, { density: 384 }).resize(512, 512).png().toFile('public/icons/icon-512.png');
await sharp(svg, { density: 384 }).resize(180, 180).flatten({ background: '#082A1F' }).png().toFile('public/icons/apple-touch-icon.png');

// Maskable: logo at 80% inside a full-bleed safe zone
const inner = await sharp(svg, { density: 384 }).resize(410, 410).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#082A1F' } })
  .composite([{ input: inner, gravity: 'center' }])
  .png()
  .toFile('public/icons/maskable-512.png');

console.log('Icons written to public/icons/');
