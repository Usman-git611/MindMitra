import { readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const projectRoot = path.resolve(import.meta.dirname, '..');
const sourceIcon = path.join(projectRoot, 'public', 'icon-512.png');
const resources = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
const launcherSizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

for (const [density, size] of Object.entries(launcherSizes)) {
  const directory = path.join(resources, `mipmap-${density}`);
  await sharp(sourceIcon).resize(size, size).png().toFile(path.join(directory, 'ic_launcher.png'));
  await sharp(sourceIcon).resize(size, size).png().toFile(path.join(directory, 'ic_launcher_round.png'));

  const foregroundSize = Math.round(size * 2.25);
  const iconSize = Math.round(foregroundSize * 0.72);
  const inset = Math.round((foregroundSize - iconSize) / 2);
  const icon = await sharp(sourceIcon).resize(iconSize, iconSize).png().toBuffer();
  await sharp({ create: { width: foregroundSize, height: foregroundSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: icon, left: inset, top: inset }])
    .png()
    .toFile(path.join(directory, 'ic_launcher_foreground.png'));
}

async function collectSplashImages(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectSplashImages(target));
    else if (entry.name === 'splash.png') files.push(target);
  }
  return files;
}

for (const splashPath of await collectSplashImages(resources)) {
  const metadata = await sharp(splashPath).metadata();
  const width = metadata.width ?? 512;
  const height = metadata.height ?? 512;
  const iconSize = Math.max(160, Math.round(Math.min(width, height) * 0.34));
  const icon = await sharp(sourceIcon).resize(iconSize, iconSize).png().toBuffer();
  const splash = await sharp({ create: { width, height, channels: 4, background: '#fbf7ec' } })
    .composite([{ input: icon, left: Math.round((width - iconSize) / 2), top: Math.round((height - iconSize) / 2) }])
    .png()
    .toBuffer();
  await sharp(splash).toFile(splashPath);
}

console.log('Generated MindMitra Android launcher icons and splash screens.');
