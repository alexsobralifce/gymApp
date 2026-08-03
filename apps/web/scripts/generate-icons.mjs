/**
 * generate-icons.mjs
 * Rasteriza app-icon.svg → todos os PNGs para PWA + Android + iOS.
 *
 * Uso: node scripts/generate-icons.mjs
 * Requisito: sharp (já instalado como devDependency)
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, '..', 'public');
const CAPACITOR = resolve(__dirname, '..', 'capacitor-assets');

// ── Constantes ──────────────────────────────────────────────────────────────
const BLACK = { r: 10, g: 10, b: 10, alpha: 1 }; // #0A0A0A
const GREEN = '#76FF03';
const SAFE_ZONE_SCALE = 0.6; // mark scaled to 60% of canvas for maskable / adaptive safe zone

// Lê as fontes SVG
let svgFull, svgMark;
try {
  svgFull = readFileSync(resolve(PUBLIC, 'app-icon.svg'), 'utf8');
} catch {
  console.error('ERRO: public/app-icon.svg não encontrado. Execute generate-icons.mjs a partir de apps/web/');
  process.exit(1);
}
// SVG sem o fundo (para foreground adaptativo e maskable)
svgMark = svgFull.replace(/<rect[^>]*\/>/g, '');

// ── Helpers ─────────────────────────────────────────────────────────────────
async function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

/** Gera PNG full-bleed (fundo preto + símbolo) no tamanho especificado */
async function generateFull(src, size, outPath) {
  await sharp(Buffer.from(src))
    .resize(size, size)
    .png()
    .toFile(outPath);
}

/** Gera PNG com o símbolo no centro, escalado para o safe zone, sobre fundo preto ou transparente */
async function generateSafeZone(markSvg, size, outPath, opts = {}) {
  const { transparent = false } = opts;
  const markSize = Math.round(size * SAFE_ZONE_SCALE);

  const markBuf = await sharp(Buffer.from(markSvg))
    .resize(markSize, markSize)
    .png()
    .toBuffer();

  const bg = transparent
    ? { r: 0, g: 0, b: 0, alpha: 0 }
    : BLACK;

  await sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: markBuf, gravity: 'center' }])
    .png()
    .toFile(outPath);
}

// ── iOS Contents.json ───────────────────────────────────────────────────────
const IOS_CONTENTS = {
  images: [
    { filename: 'icon-20.png',     idiom: 'ipad',    scale: '1x', size: '20x20' },
    { filename: 'icon-20@2x.png',  idiom: 'ipad',    scale: '2x', size: '20x20' },
    { filename: 'icon-20@2x.png',  idiom: 'iphone',  scale: '2x', size: '20x20' },
    { filename: 'icon-20@3x.png',  idiom: 'iphone',  scale: '3x', size: '20x20' },
    { filename: 'icon-29.png',     idiom: 'ipad',    scale: '1x', size: '29x29' },
    { filename: 'icon-29@2x.png',  idiom: 'ipad',    scale: '2x', size: '29x29' },
    { filename: 'icon-29@2x.png',  idiom: 'iphone',  scale: '2x', size: '29x29' },
    { filename: 'icon-29@3x.png',  idiom: 'iphone',  scale: '3x', size: '29x29' },
    { filename: 'icon-40.png',     idiom: 'ipad',    scale: '1x', size: '40x40' },
    { filename: 'icon-40@2x.png',  idiom: 'ipad',    scale: '2x', size: '40x40' },
    { filename: 'icon-40@2x.png',  idiom: 'iphone',  scale: '2x', size: '40x40' },
    { filename: 'icon-40@3x.png',  idiom: 'iphone',  scale: '3x', size: '40x40' },
    { filename: 'icon-60@2x.png',  idiom: 'iphone',  scale: '2x', size: '60x60' },
    { filename: 'icon-60@3x.png',  idiom: 'iphone',  scale: '3x', size: '60x60' },
    { filename: 'icon-76.png',     idiom: 'ipad',    scale: '1x', size: '76x76' },
    { filename: 'icon-76@2x.png',  idiom: 'ipad',    scale: '2x', size: '76x76' },
    { filename: 'icon-83.5@2x.png', idiom: 'ipad',   scale: '2x', size: '83.5x83.5' },
    { filename: 'icon-1024.png',   idiom: 'ios-marketing', scale: '1x', size: '1024x1024' },
  ],
  info: { author: 'xcode', version: 1 },
};

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  // ============================================================
  // 1. PWA — Ícones full-bleed
  // ============================================================
  const pwaSizes = [
    [180, 'icon-180.png'],
    [192, 'icon-192.png'],
    [512, 'icon-512.png'],
  ];
  for (const [size, name] of pwaSizes) {
    await generateFull(svgFull, size, resolve(PUBLIC, name));
    console.log(`✓ PWA  ${name}  (${size}×${size})`);
  }

  // 1b. PWA — Maskable (símbolo dentro da zona segura 66%)
  await generateSafeZone(svgMark, 512, resolve(PUBLIC, 'icon-maskable-512.png'));
  console.log(`✓ PWA  icon-maskable-512.png  (mark ${Math.round(512 * SAFE_ZONE_SCALE)}px)`);

  // ============================================================
  // 2. Android — Mipmaps (full-bleed para homescreen clássico)
  // ============================================================
  const mipmapSizes = [
    ['mdpi', 48],
    ['hdpi', 72],
    ['xhdpi', 96],
    ['xxhdpi', 144],
    ['xxxhdpi', 192],
  ];
  for (const [density, size] of mipmapSizes) {
    const dir = resolve(CAPACITOR, 'android', `mipmap-${density}`);
    await ensureDir(dir);
    await generateFull(svgFull, size, resolve(dir, 'ic_launcher.png'));
    console.log(`✓ Android  mipmap-${density}/ic_launcher.png  (${size}×${size})`);
  }

  // ============================================================
  // 3. Android — Adaptive Icon (foreground + background)
  //    foreground: símbolo verde sobre fundo transparente, zona segura
  //    background: preto sólido
  // ============================================================
  const adaptiveSize = 432; // xxxhdpi; o Capacitor redimensiona automaticamente
  await ensureDir(resolve(CAPACITOR, 'android'));
  await generateSafeZone(svgMark, adaptiveSize, resolve(CAPACITOR, 'android', 'ic_launcher_foreground.png'), { transparent: true });
  await sharp({
    create: { width: adaptiveSize, height: adaptiveSize, channels: 4, background: BLACK },
  })
    .png()
    .toFile(resolve(CAPACITOR, 'android', 'ic_launcher_background.png'));
  console.log(`✓ Android  ic_launcher_foreground.png + ic_launcher_background.png  (${adaptiveSize}×${adaptiveSize})`);

  // ============================================================
  // 4. iOS — AppIcon.appiconset (todos os tamanhos + Contents.json)
  // ============================================================
  const iosDir = resolve(CAPACITOR, 'ios', 'AppIcon.appiconset');
  await ensureDir(iosDir);

  // Tamanhos únicos (vários são compartilhados entre linhas do Contents.json)
  const iosFiles = [
    ['20', 20],
    ['20@2x', 40],
    ['20@3x', 60],
    ['29', 29],
    ['29@2x', 58],
    ['29@3x', 87],
    ['40', 40],
    ['40@2x', 80],
    ['40@3x', 120],
    ['60@2x', 120],  // mesmo pixel que 40@3x, mas arquivo separado
    ['60@3x', 180],
    ['76', 76],
    ['76@2x', 152],
    ['83.5@2x', 167],
    ['1024', 1024],
  ];
  for (const [name, size] of iosFiles) {
    await generateFull(svgFull, size, resolve(iosDir, `icon-${name}.png`));
  }
  writeFileSync(resolve(iosDir, 'Contents.json'), JSON.stringify(IOS_CONTENTS, null, 2));
  console.log(`✓ iOS  AppIcon.appiconset/  (${iosFiles.length} PNGs + Contents.json)`);

  // ============================================================
  // Resumo
  // ============================================================
  console.log('\n─── Concluído ──────────────────────────────────────');
  console.log(`  Verde: ${GREEN}  |  Preto: #0A0A0A  |  Safe zone: ${Math.round(SAFE_ZONE_SCALE * 100)}%`);
  console.log(`  PWA:      ${PUBLIC}/icon-{180,192,512,maskable-512}.png`);
  console.log(`  Android:  ${CAPACITOR}/android/{mipmap-*,ic_launcher_*}.png`);
  console.log(`  iOS:      ${CAPACITOR}/ios/AppIcon.appiconset/`);
}

main().catch((err) => {
  console.error('Falha:', err);
  process.exit(1);
});
