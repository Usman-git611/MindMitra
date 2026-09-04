import sharp from 'sharp';

function iconSvg(size) {
  const radius = Math.round(size * 0.22);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${radius}" fill="#fbf7ec"/>
    <rect x="${size * .13}" y="${size * .13}" width="${size * .74}" height="${size * .74}" rx="${size * .21}" fill="#4e7564"/>
    <circle cx="${size * .73}" cy="${size * .28}" r="${size * .07}" fill="#e9ad5d"/>
    <text x="50%" y="63%" text-anchor="middle" font-family="Georgia,serif" font-size="${size * .52}" font-weight="700" fill="#fffdf8">m</text>
  </svg>`);
}

await sharp(iconSvg(192)).png().toFile('public/icon-192.png');
await sharp(iconSvg(512)).png().toFile('public/icon-512.png');
