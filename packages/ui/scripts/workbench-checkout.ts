// Checks out every app of workbench/apps.json that lives in another repository at its pinned ref,
// into workbench/.checkouts/<app> (design#148), for the gallery build to bundle its screens. A
// shallow fetch of that one commit; the .git folder is removed afterwards, so neither history nor
// a credential reaches the gallery image. Private repositories need GH_TOKEN (read-only contents),
// sent as a header for the fetch only, never written to disk.
// Run: GH_TOKEN=… bun scripts/workbench-checkout.ts [app…]
import { mkdirSync, rmSync } from "node:fs";
import { checkoutDir, readManifest } from "./workbench";

function git(cwd: string, args: string[], token?: string) {
  const auth = token
    ? ["-c", `http.extraheader=AUTHORIZATION: basic ${btoa(`x-access-token:${token}`)}`]
    : [];
  const proc = Bun.spawnSync(["git", ...auth, ...args], { cwd, stderr: "pipe", stdout: "pipe" });
  if (proc.exitCode !== 0)
    throw new Error(`workbench-checkout: git ${args[0]} failed: ${proc.stderr.toString().trim()}`);
}

const only = process.argv.slice(2);
const token = process.env.GH_TOKEN;
for (const [app, source] of Object.entries(readManifest().apps)) {
  if (!source.repo || (only.length && !only.includes(app))) continue;
  if (!source.ref) throw new Error(`workbench-checkout: ${app} has a repo but no ref`);
  const dir = checkoutDir(app);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  git(dir, ["init", "-q"]);
  git(
    dir,
    ["fetch", "-q", "--depth", "1", `https://github.com/${source.repo}.git`, source.ref],
    token
  );
  git(dir, ["checkout", "-q", "FETCH_HEAD"]);
  rmSync(`${dir}/.git`, { recursive: true, force: true });
  console.log(`workbench-checkout: ${app} = ${source.repo}@${source.ref.slice(0, 12)}`);
}
