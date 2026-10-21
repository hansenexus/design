#!/usr/bin/env python3
"""Workflow baseline policy for GitHub Actions workflow files (hn-infra#528).

Rules, one per column of the report:

  timeout      every job has `timeout-minutes`. Jobs that call a reusable
               workflow (`uses:`) are exempt: GitHub rejects the key there,
               the called workflow's jobs carry it.
  concurrency  a workflow triggered by push, pull_request or
               pull_request_target has a top-level `concurrency`.
  permissions  every workflow has a top-level `permissions:` block.
  inherit      no job passes `secrets: inherit`; name the secrets.

Usage:
  workflow_policy.py [--mode warn|block] [--annotate] [--summary FILE] DIR...

Exit status: 1 in block mode when any rule fails or a file does not parse,
0 otherwise. Needs PyYAML (CI runs it through `uv run --with pyyaml`).
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass, field
from pathlib import Path

import yaml

RULES = ("timeout", "concurrency", "permissions", "inherit")
PR_PUSH_EVENTS = {"push", "pull_request", "pull_request_target"}


@dataclass
class Violation:
    rule: str
    line: int
    message: str


@dataclass
class Result:
    path: Path
    violations: list[Violation] = field(default_factory=list)
    applicable: set[str] = field(default_factory=set)
    error: str | None = None

    def ok(self, rule: str) -> bool:
        return not any(v.rule == rule for v in self.violations)


def _key(node: yaml.Node) -> str:
    # PyYAML resolves a bare `on` key to the boolean true (YAML 1.1).
    return "on" if node.tag == "tag:yaml.org,2002:bool" else str(node.value)


def _mapping(node: yaml.Node | None) -> dict[str, tuple[yaml.Node, yaml.Node]]:
    if not isinstance(node, yaml.MappingNode):
        return {}
    return {_key(k): (k, v) for k, v in node.value}


def _events(node: yaml.Node | None) -> set[str]:
    if isinstance(node, yaml.ScalarNode):
        return {str(node.value)}
    if isinstance(node, yaml.SequenceNode):
        return {str(n.value) for n in node.value if isinstance(n, yaml.ScalarNode)}
    return set(_mapping(node))


def check_text(text: str, path: Path) -> Result:
    result = Result(path)
    try:
        root = yaml.compose(text)
    except yaml.YAMLError as exc:
        result.error = f"YAML parse error: {exc}".replace("\n", " ")
        return result
    top = _mapping(root)
    if not top:
        result.error = "not a workflow (no top-level mapping)"
        return result

    result.applicable.update({"timeout", "permissions", "inherit"})
    if "permissions" not in top:
        result.violations.append(Violation("permissions", 1, "no top-level `permissions:` block"))

    on = top.get("on")
    if on and _events(on[1]) & PR_PUSH_EVENTS:
        result.applicable.add("concurrency")
        if "concurrency" not in top:
            result.violations.append(
                Violation(
                    "concurrency",
                    on[0].start_mark.line + 1,
                    "push/pull_request workflow without a top-level `concurrency`",
                )
            )

    for job_id, (key, job) in _mapping(top.get("jobs", (None, None))[1]).items():
        fields = _mapping(job)
        line = key.start_mark.line + 1
        if "uses" not in fields and "timeout-minutes" not in fields:
            result.violations.append(Violation("timeout", line, f"job `{job_id}` has no `timeout-minutes`"))
        secrets = fields.get("secrets")
        if secrets and isinstance(secrets[1], yaml.ScalarNode) and secrets[1].value == "inherit":
            result.violations.append(
                Violation(
                    "inherit",
                    secrets[0].start_mark.line + 1,
                    f"job `{job_id}` uses `secrets: inherit`; pass the named secrets",
                )
            )
    return result


def workflow_files(directory: Path) -> list[Path]:
    return sorted(p for p in directory.iterdir() if p.is_file() and p.suffix in (".yml", ".yaml"))


def markdown(results: list[Result], mode: str) -> str:
    def cell(r: Result, rule: str) -> str:
        if r.error:
            return "–"
        if rule not in r.applicable:
            return "n/a"
        return "✅" if r.ok(rule) else "❌"

    failing = sum(1 for r in results if r.error or r.violations)
    lines = [
        f"### Workflow policy ({mode}): {failing} of {len(results)} files failing",
        "",
        "| File | timeout-minutes | concurrency | permissions | no secrets: inherit |",
        "|---|---|---|---|---|",
    ]
    lines += [f"| `{r.path}` | " + " | ".join(cell(r, rule) for rule in RULES) + " |" for r in results]
    details = [
        f"- `{r.path}`: {r.error}" if r.error else f"- `{r.path}:{v.line}` {v.message}"
        for r in results
        for v in (r.violations or [None])
        if r.error or v
    ]
    if details:
        lines += ["", *details]
    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("dirs", nargs="+", type=Path, help="workflow directories, e.g. .github/workflows")
    parser.add_argument("--mode", choices=("warn", "block"), default="warn")
    parser.add_argument("--annotate", action="store_true", help="print GitHub workflow-command annotations")
    parser.add_argument("--summary", type=Path, help="append the markdown report to this file")
    args = parser.parse_args(argv)

    results = [check_text(p.read_text(), p) for d in args.dirs for p in workflow_files(d)]
    level = "error" if args.mode == "block" else "warning"
    for r in results:
        if r.error:
            print(f"::{level} file={r.path}::{r.error}" if args.annotate else f"{r.path}: {r.error}")
        for v in r.violations:
            print(
                f"::{level} file={r.path},line={v.line},title=workflow-policy/{v.rule}::{v.message}"
                if args.annotate
                else f"{r.path}:{v.line}: [{v.rule}] {v.message}"
            )

    report = markdown(results, args.mode)
    if args.summary:
        with args.summary.open("a") as f:
            f.write(report)
    else:
        print(report)

    failed = any(r.error or r.violations for r in results)
    return 1 if failed and args.mode == "block" else 0


if __name__ == "__main__":
    sys.exit(main())
