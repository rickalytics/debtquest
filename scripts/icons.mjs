import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
const source = await readFile("assets/app-icon.svg");
await sharp(source)
  .flatten({ background: "#234c3b" })
  .png()
  .toFile("ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");
// Generate from our vector source, keeping assets reproducible without emoji fonts.
for (const [name, size] of [
  ["pwa-192x192.png", 192],
  ["pwa-512x512.png", 512],
  ["apple-touch-icon.png", 180],
]) {
  await sharp(source).resize(size, size).png().toFile(`public/${name}`);
}
const splash = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732"><path fill="#faf9f5" d="M0 0h2732v2732H0z"/></svg>',
);
for (const name of [
  "splash-2732x2732.png",
  "splash-2732x2732-1.png",
  "splash-2732x2732-2.png",
]) {
  await sharp(splash)
    .png()
    .toFile(`ios/App/App/Assets.xcassets/Splash.imageset/${name}`);
}
await writeFile("public/favicon.svg", source);
console.log("Generated iOS and PWA artwork from assets/app-icon.svg.");
