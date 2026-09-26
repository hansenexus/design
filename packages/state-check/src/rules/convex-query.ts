// convex-query (opt-in): a Convex `useQuery` result is never rendered without its `undefined`
// (loading) branch.
//
// Only `useQuery` imported from Convex counts (`convex/react`, `convex-helpers/react…`), aliases
// and `import * as` included. Its result is handled when, anywhere in the function that holds it:
//   - it is compared with undefined or null (`x === undefined`, `x != null`, `typeof x`);
//   - it is a condition: `if (x)`, `if (!x)`, `x ? … : …`, `x && …`;
//   - it is passed to `<QueryState>` (or a configured wrapper) or to `queryStatus(x)`;
//   - it is returned from a custom hook (`use…`), which hands the branch to the caller.
// A fallback is not a loading branch: `x ?? []`, `x || []` and `x?.length` show the empty state
// while the query is still loading. Destructuring the result (`const { a } = useQuery(…)`) throws
// while loading and always fails.
//
// Limits: the guard's position is not checked (a guard after the first use still counts),
// shadowed names are not told apart, and a custom hook's callers are not followed.
import ts from "typescript";
import type { Rule, RuleContext, Violation } from "../types";
import { enclosingFunction, functionName, lineOf, outer, scriptFiles, tagName } from "./ast";

export const CONVEX_MODULES = [
  "convex/react",
  "convex-helpers/react",
  "convex-helpers/react/cache",
  "convex-helpers/react/cache/hooks",
];
export const QUERY_WRAPPERS = ["QueryState"];

/** Local names that call Convex's useQuery: `useQuery`, an alias, or `ns.useQuery`. */
function queryHooks(sf: ts.SourceFile): { names: Set<string>; namespaces: Set<string> } {
  const names = new Set<string>();
  const namespaces = new Set<string>();
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    if (!CONVEX_MODULES.includes(stmt.moduleSpecifier.text)) continue;
    const bindings = stmt.importClause?.namedBindings;
    if (!bindings) continue;
    if (ts.isNamespaceImport(bindings)) namespaces.add(bindings.name.text);
    else
      for (const el of bindings.elements)
        if ((el.propertyName ?? el.name).text === "useQuery") names.add(el.name.text);
  }
  return { names, namespaces };
}

function isQueryCall(
  call: ts.CallExpression,
  hooks: { names: Set<string>; namespaces: Set<string> }
): boolean {
  const c = call.expression;
  if (ts.isIdentifier(c)) return hooks.names.has(c.text);
  return (
    ts.isPropertyAccessExpression(c) &&
    ts.isIdentifier(c.expression) &&
    hooks.namespaces.has(c.expression.text) &&
    c.name.text === "useQuery"
  );
}

const isNullish = (e: ts.Expression) =>
  (ts.isIdentifier(e) && e.text === "undefined") ||
  e.kind === ts.SyntaxKind.NullKeyword ||
  ts.isVoidExpression(e);

const EQUALITY = new Set([
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
]);

/** `node` decides a branch: an if/ternary/loop condition, a `!` operand, the left of `&&`. */
export function isCondition(node: ts.Node): boolean {
  const e = outer(node);
  const p = e.parent;
  if ((ts.isIfStatement(p) || ts.isWhileStatement(p) || ts.isDoStatement(p)) && p.expression === e)
    return true;
  if (ts.isConditionalExpression(p) && p.condition === e) return true;
  if (ts.isPrefixUnaryExpression(p) && p.operator === ts.SyntaxKind.ExclamationToken) return true;
  if (ts.isBinaryExpression(p)) {
    const op = p.operatorToken.kind;
    if (op === ts.SyntaxKind.AmpersandAmpersandToken && p.left === e) return true;
    // `a && x` or `a || x` inside a condition is still a condition on x.
    if (op === ts.SyntaxKind.AmpersandAmpersandToken || op === ts.SyntaxKind.BarBarToken)
      return isCondition(p);
  }
  return false;
}

/** This use of the result handles its undefined branch. */
function handles(node: ts.Node, sf: ts.SourceFile, wrappers: Set<string>): boolean {
  const e = outer(node);
  const p = e.parent;
  if (ts.isBinaryExpression(p) && EQUALITY.has(p.operatorToken.kind)) {
    const other = p.left === e ? p.right : p.left;
    if (isNullish(other)) return true;
  }
  if (ts.isTypeOfExpression(p)) return true;
  if (isCondition(e)) return true;
  if (ts.isCallExpression(p) && p.arguments.includes(e as ts.Expression)) {
    const c = p.expression;
    if (ts.isIdentifier(c) && c.text === "queryStatus") return true;
  }
  if (ts.isJsxExpression(p) && ts.isJsxAttribute(p.parent)) {
    const element = p.parent.parent.parent;
    if (
      (ts.isJsxOpeningElement(element) || ts.isJsxSelfClosingElement(element)) &&
      wrappers.has(tagName(element.tagName, sf))
    )
      return true;
  }
  return false;
}

/** `return x` (or an arrow's expression body) in a custom hook: the caller owns the branch. */
function returnedFromHook(node: ts.Node): boolean {
  const e = outer(node);
  const p = e.parent;
  const returned = ts.isReturnStatement(p) || (ts.isArrowFunction(p) && p.body === e);
  if (!returned) return false;
  const fn = enclosingFunction(e);
  const name = fn && functionName(fn);
  return name !== undefined && /^use[A-Z0-9]/.test(name);
}

/** Every reference to `name` in `scope`, excluding its declaration and property names. */
function references(scope: ts.Node, name: string, decl: ts.Node): ts.Identifier[] {
  const out: ts.Identifier[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isIdentifier(n) && n.text === name && n !== decl) {
      const p = n.parent;
      const isPropertyName =
        (ts.isPropertyAccessExpression(p) && p.name === n) ||
        (ts.isPropertyAssignment(p) && p.name === n) ||
        (ts.isJsxAttribute(p) && p.name === n);
      if (!isPropertyName) out.push(n);
    }
    ts.forEachChild(n, visit);
  };
  visit(scope);
  return out;
}

export function checkQueries(ctx: RuleContext): {
  violations: Violation[];
  queries: number;
  handled: number;
} {
  const wrappers = new Set([...QUERY_WRAPPERS, ...(ctx.options.queryWrappers ?? [])]);
  const violations: Violation[] = [];
  let queries = 0;
  let handled = 0;

  for (const file of scriptFiles(ctx.files)) {
    const sf = ctx.source(file);
    const hooks = queryHooks(sf);
    if (hooks.names.size === 0 && hooks.namespaces.size === 0) continue;

    const report = (node: ts.Node, message: string) =>
      violations.push({ rule: convexQuery.id, file, line: lineOf(sf, node), message });

    const visit = (node: ts.Node) => {
      ts.forEachChild(node, visit);
      if (!ts.isCallExpression(node) || !isQueryCall(node, hooks)) return;
      const e = outer(node);
      const p = e.parent;
      // A bare statement discards the result: nothing is rendered.
      if (ts.isExpressionStatement(p)) return;
      queries++;

      if (ts.isVariableDeclaration(p) && p.initializer === e) {
        if (!ts.isIdentifier(p.name)) {
          report(
            p,
            "useQuery result destructured: it is undefined while loading, so this throws; keep the result and branch on undefined (or use <QueryState>)"
          );
          return;
        }
        const name = p.name.text;
        const scope = enclosingFunction(p) ?? sf;
        const refs = references(scope, name, p.name);
        if (refs.length === 0 || refs.some((r) => handles(r, sf, wrappers) || returnedFromHook(r)))
          handled++;
        else
          report(
            p,
            `useQuery result "${name}" is used without its loading branch: it is undefined until the query resolves; render it through <QueryState> or branch on it (if (${name} === undefined) …)`
          );
        return;
      }
      if (handles(node, sf, wrappers) || returnedFromHook(node)) {
        handled++;
        return;
      }
      report(
        node,
        "useQuery result used inline without its loading branch: it is undefined until the query resolves; assign it and render it through <QueryState> or branch on undefined"
      );
    };
    visit(sf);
  }
  return { violations, queries, handled };
}

export const convexQuery: Rule = {
  id: "convex-query",
  description: "A Convex useQuery result is rendered with its undefined (loading) branch.",
  check(ctx) {
    const { violations, queries, handled } = checkQueries(ctx);
    return { violations, stats: { queries, handled } };
  },
};
