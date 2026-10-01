// Builds the kit gallery into gallery/dist/ and, with --serve, serves packages/ui on
// 127.0.0.1 (default port 4410) at /gallery/?scene=kit&mode=dark. Variant votes are at
// /gallery/?scene=vote&category=<id>. With --out <dir> it also writes the static site
// (index.html plus dist/, every URL relative) that the kit-gallery image serves at /. There the
// JS and CSS carry a content hash in their names (main.<hash>.js), so an edge cache that keeps
// .js and .css for hours never serves a stale bundle after a deploy (#50). The site also carries
// the built shadcn registry (dist/r from `bun run build`) at r/, so the registry is served next to
// the gallery at design.hansenexus.dev/r/{name}.json (#65). The registry's dependency graph
// (scripts/graph.ts) is built here too, as `virtual:graph` and gallery/dist/graph.json (#59).
// The local server also takes the vote board's Decide control: POST /api/decide runs decide()
// from scripts/variants.ts in this checkout and rebuilds the bundle (#76); the static site has
// no such route, there the control opens a prefilled issue (gallery/decide.ts).
// Run: bun scripts/gallery.ts [--serve] [--port 4410] [--out <dir>]
import { createHash } from "node:crypto";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, resolve, sep } from "node:path";
import type { BunPlugin } from "bun";
import { DECIDE_PATH, type DecideBody, type DecideReply } from "../gallery/decide";
import { graphSource, loadGraph } from "./graph";
import { decide, readDecision, registrySource } from "./variants";

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
// The woff2 files are copied into dist/fonts/ so the built gallery is self-contained. Every theme's
// stacks are here: Fraunces, Instrument Sans and JetBrains Mono for the shared tier, Archivo and
// Geist Mono for lexilink (#62). Archivo comes from wdth.css, the faces with the width axis, since
// lexilink's hierarchy is font-stretch; the other packages ship the weight axis in index.css.
const FONTS = [
  ["fraunces", "Fraunces", "index.css"],
  ["instrument-sans", "Instrument Sans", "index.css"],
  ["jetbrains-mono", "JetBrains Mono", "index.css"],
  ["archivo", "Archivo", "wdth.css"],
  ["geist-mono", "Geist Mono", "index.css"],
] as const;

function fontsCss(): string {
  mkdirSync(resolve(OUT, "fonts"), { recursive: true });
  return FONTS.map(([pkg, family, file]) => {
    const dir = dirname(Bun.resolveSync(`@fontsource-variable/${pkg}/${file}`, ROOT));
    const css = readFileSync(resolve(dir, file), "utf8");
    for (const [, file] of css.matchAll(/url\(\.\/files\/([^)]+)\)/g)) {
      if (file) copyFileSync(resolve(dir, "files", file), resolve(OUT, "fonts", file));
    }
    return css
      .replaceAll(`'${family} Variable'`, `'${family}'`)
      .replaceAll("url(./files/", "url(./fonts/");
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

/**
 * The gallery mounts @hansenexus/shell from its source (gallery/shell.tsx), and the shell imports
 * @hansenexus/ui. Resolve that to this package's src, not its dist: one copy of the primitives in
 * the bundle, and a change to an atom shows in the shell without a rebuild (#64).
 */
const uiSource: BunPlugin = {
  name: "ui-source",
  setup(build) {
    build.onResolve({ filter: /^@hansenexus\/ui$/ }, () => ({
      path: resolve(ROOT, "src/index.ts"),
    }));
  },
};

/** `virtual:graph`: each registry item's direct uses and transitive dependents (#59). */
function graphPlugin(source: string): BunPlugin {
  return {
    name: "graph",
    setup(build) {
      build.onResolve({ filter: /^virtual:graph$/ }, (args) => ({
        path: args.path,
        namespace: "graph",
      }));
      build.onLoad({ filter: /.*/, namespace: "graph" }, () => ({
        contents: source,
        loader: "ts",
      }));
    },
  };
}

export async function buildGallery() {
  mkdirSync(OUT, { recursive: true });
  const graph = loadGraph(ROOT);
  writeFileSync(resolve(OUT, "graph.json"), `${JSON.stringify(graph, null, 2)}\n`);
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
    plugins: [variants, uiSource, graphPlugin(graphSource(graph))],
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

/** The files index.html loads that change with the code. Fonts and brand files keep their names. */
const HASHED = ["main.js", "gallery.css", "fonts.css"] as const;

/** `main.js` -> `main.<first 10 hex of its sha256>.js`: same bytes, same name. */
export function hashedName(file: string, body: Uint8Array | string): string {
  const hash = createHash("sha256").update(body).digest("hex").slice(0, 10);
  const ext = extname(file);
  return `${file.slice(0, -ext.length)}.${hash}${ext}`;
}

/** The built registry (scripts/registry.ts via `bun run build`), copied to the site's r/. */
const REGISTRY = resolve(ROOT, "dist/r");

/**
 * Writes the deployable site: gallery/index.html at the root, the build under dist/, with the
 * HASHED files renamed to hashedName() and index.html pointing at the new names, and the
 * registry under r/.
 */
export function exportSite(dir: string) {
  const site = resolve(dir);
  rmSync(site, { recursive: true, force: true });
  mkdirSync(site, { recursive: true });
  const dist = resolve(site, "dist");
  cpSync(OUT, dist, { recursive: true });
  let html = readFileSync(resolve(ROOT, "gallery/index.html"), "utf8");
  for (const file of HASHED) {
    const ref = `"./dist/${file}"`;
    if (!html.includes(ref)) throw new Error(`gallery: index.html does not reference ${ref}`);
    const body = readFileSync(resolve(dist, file));
    const name = hashedName(file, body);
    writeFileSync(resolve(dist, name), body);
    rmSync(resolve(dist, file));
    html = html.replaceAll(ref, `"./dist/${name}"`);
  }
  writeFileSync(resolve(site, "index.html"), html);
  if (!existsSync(resolve(REGISTRY, "registry.json")))
    throw new Error(`gallery: no registry in ${REGISTRY}, run \`bun run build\` first`);
  cpSync(REGISTRY, resolve(site, "r"), { recursive: true });
}

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".map": "application/json",
  ".json": "application/json",
};

const isBody = (v: unknown): v is DecideBody =>
  typeof v === "object" &&
  v !== null &&
  ["category", "winner", "rationale"].every(
    (k) => typeof (v as Record<string, unknown>)[k] === "string"
  );

/**
 * POST /api/decide, the vote board's Decide control on the local server (#76): runs decide() in
 * `root` (winner, rationale, today's date; the losers deleted), then `rebuild` so a reload shows
 * the category decided. The owner commits and opens the PR as before. A refusal is decide()'s
 * own message: 409 for a decided category, 400 for the rest. The server binds the loopback, and
 * a request whose Origin is another site is 403, so no page on the web can press the control.
 */
export async function decideRoute(
  req: Request,
  root: string,
  rebuild: () => Promise<void>
): Promise<Response> {
  const reply = (status: number, body: DecideReply, headers?: HeadersInit) =>
    Response.json(body, { status, headers });
  if (req.method !== "POST") return reply(405, { error: "POST only" }, { allow: "POST" });
  const origin = req.headers.get("origin");
  const self = new URL(req.url).origin;
  if (origin && origin !== self) return reply(403, { error: `origin ${origin} is not ${self}` });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: "the body is not JSON" });
  }
  if (!isBody(body)) {
    return reply(400, { error: "the body needs category, winner and rationale as strings" });
  }
  let deleted: string[];
  try {
    deleted = decide(root, body.category, body.winner, body.rationale);
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return reply(/already decided/.test(error) ? 409 : 400, { error });
  }
  const date = readDecision(root, body.category)?.date ?? "";
  try {
    await rebuild();
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    return reply(500, {
      error: `${body.category} is decided for ${body.winner}, but rebuilding the gallery failed: ${why}. Restart the server.`,
    });
  }
  return reply(200, { category: body.category, winner: body.winner, date, deleted });
}

export type ServeOptions = {
  /** The package root the files are served from and decide() writes into. */
  root?: string;
  /** Runs after a decision, so the bundle carries the decided board. */
  rebuild?: () => Promise<void>;
};

export function serve(port: number, { root = ROOT, rebuild = buildGallery }: ServeOptions = {}) {
  return Bun.serve({
    hostname: "127.0.0.1",
    port,
    async fetch(req) {
      let path = decodeURIComponent(new URL(req.url).pathname);
      if (path === DECIDE_PATH) return decideRoute(req, root, rebuild);
      if (req.method !== "GET" && req.method !== "HEAD") {
        return new Response("method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
      }
      if (path.endsWith("/")) path += "index.html";
      const file = resolve(root, `.${path}`);
      if (file !== root && !file.startsWith(root + sep)) return new Response("no", { status: 403 });
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
  const o = args.indexOf("--out");
  if (o >= 0) {
    const dir = args[o + 1];
    if (!dir) throw new Error("gallery: --out needs a directory");
    exportSite(dir);
    console.log(`gallery: wrote the static site to ${dir}`);
  }
  if (args.includes("--serve")) {
    const i = args.indexOf("--port");
    const port = Number(i >= 0 ? args[i + 1] : 4410);
    const server = serve(port);
    console.log(`gallery: http://127.0.0.1:${server.port}/gallery/`);
  } else {
    console.log("gallery: built gallery/dist");
  }
}
