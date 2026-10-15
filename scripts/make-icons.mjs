// Generates the app icons in public/.
//   npm run icons                  -> from scripts/icon-source.jpg
//   npm run icons -- my-image.png  -> from another square image (PNG/JPG/SVG, ideally 1024×1024)
import sharp from 'sharp';

const source = process.argv[2] ?? 'scripts/icon-source.jpg';

// "cover" crops non-square images to a centred square; flatten removes transparency
// (iOS shows transparent areas as black).
const icon = (size) => sharp(source).resize(size, size, { fit: 'cover' }).flatten({ background: '#ffffff' }).png();

await icon(180).toFile('public/apple-touch-icon.png');
await icon(192).toFile('public/icon-192.png');
await icon(512).toFile('public/icon-512.png');
console.log(`icons written from ${source}`);
