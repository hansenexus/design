// Builds the kit gallery into gallery/dist/ and, with --serve, serves packages/ui on
// 127.0.0.1 (default port 4410) at /gallery/?scene=kit&mode=dark. Variant votes are at
// /gallery/?scene=vote&category=<id>.
// Run: bun scripts/gallery.ts [--serve] [--port 4410]
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve, sep } from "node:path";
import type { BunPlugin } from "bun";
import { registrySource } from "./variants";

const ROOT = resolve(import.meta.dir, "..");
const OUT = resolve(ROOT, "gallery/dist");
const BRAND = resolve(ROOT, "../../brand/assets");

/** The generated brand files the brand scene shows as they ship (scripts/brand.ts). */
const BRAND_FILES = [
  ...["lime-on-ink", "ink-on-lime"].flatMap((k) =>
    [16, 32, 1024].map((s) => `app-icon/app-icon-${k}-${s}.png`)
  ),
  "favicon/favicon.svg",
  "favicon/favicon-32.png",
  "favicon/apple-touch-icon.png",
  "tray/trayTemplate@2x.png",
];

// Self-hosted fonts, so screenshots never depend on the network. The token stacks name the
// families without "Variable", so the fontsource faces are re-registered under those names.
const FONTS = [
  ["fraunces", "Fraunces"],
  ["instrument-sans", "Instrument Sans"],
  ["jetbrains-mono", "JetBrains Mono"],
] as const;

function fontsCss(): string {
  return FONTS.map(([pkg, family]) => {
    const dir = dirname(Bun.resolveSync(`@fontsource-variable/${pkg}/index.css`, ROOT));
    return readFileSync(resolve(dir, "index.css"), "utf8")
      .replaceAll(`'${family} Variable'`, `'${family}'`)
      .replaceAll("url(./files/", `url(/node_modules/@fontsource-variable/${pkg}/files/`);
  }).join("\n");
}

/** `virtual:variants`: every vote category, its variants and decision (scripts/variants.ts). */
const variants: BunPlugin = {
  name: "variants",
  setup(build) {
    build.onResolve({ filter: /^virtual:variants$/ }, (args) => ({
      path: args.path,
      namespace: "variants",
    }));
    build.onLoad({ filter: /.*/, namespace: "variants" }, () => ({
      contents: registrySource(ROOT),
      loader: "ts",
    }));
  },
};

export async function buildGallery() {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(resolve(OUT, "fonts.css"), fontsCss());
  mkdirSync(resolve(OUT, "brand"), { recursive: true });
  for (const file of BRAND_FILES) {
    copyFileSync(resolve(BRAND, file), resolve(OUT, "brand", file.split("/").pop() ?? file));
  }
  const js = await Bun.build({
    entrypoints: [resolve(ROOT, "gallery/main.tsx")],
    outdir: OUT,
    target: "browser",
    format: "esm",
    minify: true,
    plugins: [variants],
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
  });
  if (!js.success) {
    for (const log of js.logs) console.error(log);
    throw new Error("gallery: bundling gallery/main.tsx failed");
  }
  const css = Bun.spawnSync(
    ["bunx", "@tailwindcss/cli", "-i", "gallery/gallery.css", "-o", "gallery/dist/gallery.css"],
    { cwd: ROOT, stdout: "inherit", stderr: "inherit" }
  );
  if (css.exitCode !== 0) throw new Error("gallery: tailwind failed");
}

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".map": "application/json",
};

export function serve(port: number) {
  return Bun.serve({
    hostname: "127.0.0.1",
    port,
    async fetch(req) {
      let path = decodeURIComponent(new URL(req.url).pathname);
      if (path.endsWith("/")) path += "index.html";
      const file = resolve(ROOT, `.${path}`);
      if (file !== ROOT && !file.startsWith(ROOT + sep)) return new Response("no", { status: 403 });
      const body = Bun.file(file);
      if (!(await body.exists())) return new Response("not found", { status: 404 });
      return new Response(body, {
        headers: { "content-type": TYPES[extname(file)] ?? "application/octet-stream" },
      });
    },
  });
}

if (import.meta.main) {
  await buildGallery();
  const args = process.argv.slice(2);
  if (args.includes("--serve")) {
    const i = args.indexOf("--port");
    const port = Number(i >= 0 ? args[i + 1] : 4410);
    const server = serve(port);
    console.log(`gallery: http://127.0.0.1:${server.port}/gallery/`);
  } else {
    console.log("gallery: built gallery/dist");
  }
}
