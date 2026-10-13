import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const svg = readFileSync(new URL('../public/favicon.svg', import.meta.url));
// Square (non-rounded) variant for iOS, which applies its own mask.
const square = Buffer.from(svg.toString().replace('rx="112"', 'rx="0"'));

await sharp(square).resize(180, 180).png().toFile('public/apple-touch-icon.png');
await sharp(square).resize(192, 192).png().toFile('public/icon-192.png');
await sharp(square).resize(512, 512).png().toFile('public/icon-512.png');
console.log('icons written');
