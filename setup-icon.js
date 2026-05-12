import sharp from 'sharp';
import { mkdirSync, existsSync, rmSync, statSync } from 'fs';
import { join } from 'path';

const SRC_ICON = 'C:\\Users\\33397\\Desktop\\新建文件夹\\b139c5d094a8d75a7a8c5160e7ce3e47.jpg';
const ROOT = process.cwd();
const PUBLIC_DIR = join(ROOT, 'public');
const DIST_DIR = join(ROOT, 'dist');

function ensureFilePath(filePath) {
  try {
    const st = statSync(filePath);
    if (st.isDirectory()) {
      rmSync(filePath, { recursive: true, force: true });
    }
  } catch {}
}

async function generateIcons() {
  const sizes = [
    { name: 'icon.png', size: 1024 },
    { name: 'android/mipmap-mdpi/icon.png', size: 48 },
    { name: 'android/mipmap-hdpi/icon.png', size: 72 },
    { name: 'android/mipmap-xhdpi/icon.png', size: 96 },
    { name: 'android/mipmap-xxhdpi/icon.png', size: 144 },
    { name: 'android/mipmap-xxxhdpi/icon.png', size: 192 },
    { name: 'android/ic_launcher.png', size: 192 },
    { name: 'android/ic_launcher_round.png', size: 192 }
  ];

  for (const s of sizes) {
    const outPath = join(PUBLIC_DIR, s.name);
    const dir = join(PUBLIC_DIR, s.name.replace(/\/[^/]+$/, ''));
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    ensureFilePath(outPath);
    await sharp(SRC_ICON)
      .resize(s.size, s.size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(outPath);
    console.log(`Generated: ${s.name} (${s.size}x${s.size})`);
  }

  const distIconPath = join(DIST_DIR, 'icon.png');
  if (!existsSync(DIST_DIR)) {
    mkdirSync(DIST_DIR, { recursive: true });
  }
  ensureFilePath(distIconPath);
  await sharp(SRC_ICON)
    .resize(1024, 1024, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(distIconPath);
  console.log('Generated: dist/icon.png');
}

generateIcons().catch(console.error);
