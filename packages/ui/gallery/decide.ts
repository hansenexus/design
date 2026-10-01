// The board's Decide control (#76): where a click goes and what it carries. Pure, so the tests
// cover it without a browser. On the local server (`bun run gallery -- --serve`, 127.0.0.1) the
// control POSTs to DECIDE_PATH and scripts/gallery.ts runs decide() from scripts/variants.ts in
// that checkout. On the hosted static site (design.hansenexus.dev, nothing writes) it opens a
// prefilled GitHub issue instead, so an agent runs `bun run decide` and opens the PR.
// Either way only the owner presses it (dec_2026-09-26_global-frontend-state-contract): a lane
// prepares the board and stops at "Awaiting decision"; agents never record a vote.

export const DECIDE_PATH = "/api/decide";
export const REPO = "hansenexus/design";

export type DecideBody = { category: string; winner: string; rationale: string };

/** What the local server answers a POST with. */
export type DecideReply =
  | { category: string; winner: string; date: string; deleted: string[] }
  | { error: string };

export type DecideTarget = "server" | "issue";

/** `server` when the gallery is served by scripts/gallery.ts on the loopback, `issue` elsewhere. */
export function decideTarget(hostname: string): DecideTarget {
  return ["127.0.0.1", "localhost", "[::1]"].includes(hostname) ? "server" : "issue";
}

/** The check the hosted board runs itself; the local one leaves it to decide() on the server. */
export function decideProblem(body: DecideBody): string | null {
  return body.rationale.trim() ? null : "a decision needs a rationale";
}

/** The rationale as one double-quoted shell word for the `bun run decide` line in the issue. */
const shellQuote = (s: string) => `"${s.replace(/(["\\$`])/g, "\\$1")}"`;

/** The issue body: the decision as `decide` records it, and the command an agent runs. */
export function issueBody(body: DecideBody, considered: readonly string[]): string {
  const rationale = body.rationale.trim();
  return [
    `Owner's decision on the \`${body.category}\` vote, recorded from the gallery board.`,
    "",
    `- Winner: \`${body.winner}\``,
    `- Considered: ${considered.map((v) => `\`${v}\``).join(", ")}`,
    `- Rationale: ${rationale}`,
    "",
    "Run it in a lane and open the PR:",
    "",
    "```sh",
    `cd packages/ui && bun run decide ${body.category} ${body.winner} --rationale ${shellQuote(rationale)}`,
    "```",
    "",
  ].join("\n");
}

/** The prefilled new-issue URL for the hosted board: "decide <category> <winner>", rationale in the body. */
export function issueUrl(body: DecideBody, considered: readonly string[]): string {
  const q = new URLSearchParams({
    title: `decide ${body.category} ${body.winner}`,
    body: issueBody(body, considered),
    labels: "ready",
  });
  return `https://github.com/${REPO}/issues/new?${q}`;
}
