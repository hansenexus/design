// next-route: a dynamic Next.js App Router segment must be covered by a loading.tsx (in the
// segment or an ancestor) or a <Suspense> boundary in the page.
//
// A page is dynamic when any of these holds:
//   - a `[param]`, `[...param]` or `[[...param]]` directory in its path, unless the page or a
//     layout at or below that segment exports `generateStaticParams` (then the known params are
//     prerendered at build time, like `[locale]` under next-intl);
//   - an `await` in the default-exported page component (or at module top level), except
//     `await params`, which only unwraps the route input; `await searchParams` does count;
//   - a call to a request API (cookies(), headers(), draftMode(), connection()) or an auth
//     helper, in the page or in a same-file function it calls;
//   - `export const dynamic = "force-dynamic"`.
// Static RSC pages have none of these and are exempt.
//
// A <Suspense> in the page only covers work below it. When the page component itself blocks
// (awaits data, or reads the request in its own body) the Suspense cannot cover that, so only a
// loading.tsx does. Awaiting `params` / `searchParams` does not count as blocking: it is how
// Next 15 hands them over, and it is what a page does before rendering its <Suspense>.
//
// Limits: helpers are followed within the page file only, and a <Suspense> anywhere in the
// page file counts as covering its async children.
//
// The rule never looks at what the fallback renders or which library it comes from.
import { posix } from "node:path";
import ts from "typescript";
import type { Rule, RuleContext, Violation } from "../types";
import { calleeName, type FunctionLike, isFunctionLike, lineOf } from "./ast";

export const REQUEST_APIS = ["cookies", "headers", "draftMode", "connection"];
export const AUTH_HELPERS = [
  "auth",
  "currentUser",
  "getServerSession",
  "convexAuthNextjsToken",
  "isAuthenticatedNextjs",
];

const PAGE = /(?:^|\/)page\.(?:tsx|jsx|ts|js)$/;
const LAYOUTS = ["layout.tsx", "layout.jsx", "layout.js", "layout.ts"];
const LOADING = ["loading.tsx", "loading.jsx", "loading.js", "loading.ts"];
const PARAM = /^\[{1,2}(?:\.\.\.)?[^\]]+\]{1,2}$/;

type Signal = { what: string; line: number; blocking: boolean };

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((m) => m.kind === kind);
}

/** Same-file functions by name: `function f() {}` and `const f = () => {}` / `function () {}`. */
function localFunctions(sf: ts.SourceFile): Map<string, FunctionLike> {
  const map = new Map<string, FunctionLike>();
  for (const stmt of sf.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.name) map.set(stmt.name.text, stmt);
    if (ts.isVariableStatement(stmt)) {
      for (const d of stmt.declarationList.declarations) {
        if (
          ts.isIdentifier(d.name) &&
          d.initializer &&
          (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))
        )
          map.set(d.name.text, d.initializer);
      }
    }
  }
  return map;
}

/** The default-exported page component and the line a violation is reported on. */
function pageComponent(
  sf: ts.SourceFile,
  locals: Map<string, FunctionLike>
): { fn?: FunctionLike; line: number } {
  for (const stmt of sf.statements) {
    if (
      ts.isFunctionDeclaration(stmt) &&
      hasModifier(stmt, ts.SyntaxKind.ExportKeyword) &&
      hasModifier(stmt, ts.SyntaxKind.DefaultKeyword)
    )
      return { fn: stmt, line: lineOf(sf, stmt) };
    if (ts.isExportAssignment(stmt) && !stmt.isExportEquals) {
      const e = stmt.expression;
      if (ts.isArrowFunction(e) || ts.isFunctionExpression(e))
        return { fn: e, line: lineOf(sf, stmt) };
      if (ts.isIdentifier(e)) return { fn: locals.get(e.text), line: lineOf(sf, stmt) };
      return { line: lineOf(sf, stmt) };
    }
  }
  return { line: 1 };
}

/** `params` / `searchParams` (or `props.params`) when awaited: Next 15 route input, not data. */
function routeInput(expr: ts.Expression): "params" | "searchParams" | undefined {
  const e = ts.isParenthesizedExpression(expr) ? expr.expression : expr;
  const name = ts.isIdentifier(e)
    ? e.text
    : ts.isPropertyAccessExpression(e)
      ? e.name.text
      : undefined;
  return name === "params" || name === "searchParams" ? name : undefined;
}

/** `export function generateStaticParams`, `export const generateStaticParams =`, re-exports. */
function exportsStaticParams(sf: ts.SourceFile): boolean {
  return sf.statements.some((stmt) => {
    if (ts.isFunctionDeclaration(stmt))
      return (
        stmt.name?.text === "generateStaticParams" && hasModifier(stmt, ts.SyntaxKind.ExportKeyword)
      );
    if (ts.isVariableStatement(stmt))
      return (
        hasModifier(stmt, ts.SyntaxKind.ExportKeyword) &&
        stmt.declarationList.declarations.some(
          (d) => ts.isIdentifier(d.name) && d.name.text === "generateStaticParams"
        )
      );
    if (ts.isExportDeclaration(stmt) && stmt.exportClause && ts.isNamedExports(stmt.exportClause))
      return stmt.exportClause.elements.some((e) => e.name.text === "generateStaticParams");
    return false;
  });
}

function forceDynamic(sf: ts.SourceFile): number | undefined {
  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt) || !hasModifier(stmt, ts.SyntaxKind.ExportKeyword)) continue;
    for (const d of stmt.declarationList.declarations) {
      if (
        ts.isIdentifier(d.name) &&
        d.name.text === "dynamic" &&
        d.initializer &&
        ts.isStringLiteralLike(d.initializer) &&
        d.initializer.text === "force-dynamic"
      )
        return lineOf(sf, stmt);
    }
  }
  return undefined;
}

/** Awaits and request reads in `root`. `direct` is true while still in the page's own body. */
function scan(
  sf: ts.SourceFile,
  root: ts.Node,
  direct: boolean,
  requestApis: Set<string>,
  locals: Map<string, FunctionLike>,
  seen: Set<ts.Node>,
  out: Signal[]
): void {
  const visit = (node: ts.Node, inBody: boolean) => {
    if (ts.isAwaitExpression(node)) {
      const input = routeInput(node.expression);
      const line = lineOf(sf, node);
      if (input === "searchParams") out.push({ what: "await searchParams", line, blocking: false });
      else if (!input) out.push({ what: "await", line, blocking: inBody });
    }
    if (ts.isForOfStatement(node) && node.awaitModifier)
      out.push({ what: "for await", line: lineOf(sf, node), blocking: inBody });
    if (ts.isCallExpression(node)) {
      const name = calleeName(node);
      if (name && requestApis.has(name))
        out.push({ what: `${name}()`, line: lineOf(sf, node), blocking: inBody });
      // Follow same-file helpers: what they read makes the page dynamic, but they only block
      // the page through an await at the call site, which is already a signal of its own.
      const local = name && ts.isIdentifier(node.expression) ? locals.get(name) : undefined;
      if (local && !seen.has(local)) {
        seen.add(local);
        scan(sf, local, false, requestApis, locals, seen, out);
      }
    }
    ts.forEachChild(node, (child) => visit(child, inBody && !isFunctionLike(child)));
  };
  if (isFunctionLike(root) && root.body) ts.forEachChild(root.body, (c) => visit(c, direct));
  else visit(root, direct);
}

function hasSuspense(sf: ts.SourceFile): boolean {
  let found = false;
  const visit = (node: ts.Node) => {
    if (found) return;
    const tag =
      ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node) ? node.tagName : undefined;
    if (tag && tag.getText(sf).split(".").pop() === "Suspense") found = true;
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

/** `dir/<name>` for the first of `names` that exists. */
function fileIn(files: Set<string>, dir: string, names: string[]): string | undefined {
  return names.map((name) => `${dir}/${name}`).find((f) => files.has(f));
}

function loadingFor(files: Set<string>, page: string, routerDir: string): string | undefined {
  for (let dir = posix.dirname(page); dir.startsWith(routerDir); dir = posix.dirname(dir)) {
    const found = fileIn(files, dir, LOADING);
    if (found) return found;
    if (dir === routerDir) break;
  }
  return undefined;
}

/** `src/app` or `app` under the app directory. */
export function routerDir(files: string[]): string | undefined {
  for (const dir of ["src/app", "app"]) if (files.some((f) => f.startsWith(`${dir}/`))) return dir;
  return undefined;
}

type PageReport = {
  file: string;
  dynamic: boolean;
  covered?: string;
  signals: Signal[];
};

/** Classifies every routable page. */
export function classify(ctx: RuleContext): { pages: PageReport[]; violations: Violation[] } {
  const router = routerDir(ctx.files);
  if (!router) return { pages: [], violations: [] };
  const requestApis = new Set([
    ...REQUEST_APIS,
    ...AUTH_HELPERS,
    ...(ctx.options.authHelpers ?? []),
  ]);
  const files = new Set(ctx.files);
  const generatesParams = (dir: string) => {
    const layout = fileIn(files, dir, LAYOUTS);
    return layout !== undefined && exportsStaticParams(ctx.source(layout));
  };
  const pages: PageReport[] = [];
  const violations: Violation[] = [];

  for (const file of ctx.files) {
    if (!file.startsWith(`${router}/`) || !PAGE.test(file)) continue;
    const segments = file
      .slice(router.length + 1)
      .split("/")
      .slice(0, -1);
    // `_folder` is private: never a route.
    if (segments.some((s) => s.startsWith("_"))) continue;

    const sf = ctx.source(file);
    const locals = localFunctions(sf);
    const { fn, line } = pageComponent(sf, locals);
    const signals: Signal[] = [];

    // A param is prerendered when the page or a layout from its segment down generates it.
    const pageGenerates = exportsStaticParams(sf);
    const dirs = segments.map((_, i) => [router, ...segments.slice(0, i + 1)].join("/"));
    segments.forEach((seg, i) => {
      if (!PARAM.test(seg) || pageGenerates || dirs.slice(i).some(generatesParams)) return;
      signals.push({ what: `${seg} segment`, line, blocking: false });
    });
    const force = forceDynamic(sf);
    if (force) signals.push({ what: 'dynamic = "force-dynamic"', line: force, blocking: false });

    // Module top level (top-level await), then the page component and what it calls.
    const seen = new Set<ts.Node>(fn ? [fn] : []);
    for (const stmt of sf.statements) {
      if (isFunctionLike(stmt) || ts.isExportAssignment(stmt)) continue;
      if (ts.isVariableStatement(stmt)) {
        // `const X = () => …` is a declaration, not top-level work.
        for (const d of stmt.declarationList.declarations)
          if (d.initializer && !isFunctionLike(d.initializer))
            scan(sf, d.initializer, true, requestApis, locals, seen, signals);
        continue;
      }
      scan(sf, stmt, true, requestApis, locals, seen, signals);
    }
    if (fn) scan(sf, fn, true, requestApis, locals, seen, signals);

    if (signals.length === 0) {
      pages.push({ file, dynamic: false, signals });
      continue;
    }
    const loading = loadingFor(files, file, router);
    const blocking = signals.find((s) => s.blocking);
    const suspense = hasSuspense(sf);
    const covered = loading ?? (suspense && !blocking ? "<Suspense> in page" : undefined);
    pages.push({ file, dynamic: true, covered, signals });
    if (covered) continue;

    const why = signals.map((s) => `${s.what} (line ${s.line})`).join(", ");
    const hint =
      suspense && blocking
        ? `the page itself blocks on ${blocking.what} at line ${blocking.line}, so its <Suspense> cannot cover it; add a loading.tsx`
        : "add a loading.tsx to the segment or an ancestor, or wrap the async child in <Suspense>";
    violations.push({
      rule: nextRoute.id,
      file,
      line,
      message: `dynamic segment without a loading state: ${why}; ${hint}`,
    });
  }
  return { pages, violations };
}

export const nextRoute: Rule = {
  id: "next-route",
  description: "A dynamic Next.js App Router segment is covered by loading.tsx or <Suspense>.",
  check(ctx) {
    const { pages, violations } = classify(ctx);
    const dynamic = pages.filter((p) => p.dynamic);
    return {
      violations,
      stats: {
        pages: pages.length,
        dynamic: dynamic.length,
        covered: dynamic.filter((p) => p.covered).length,
      },
    };
  },
};
