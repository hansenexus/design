// Syntax helpers shared by the rules.
import ts from "typescript";

export type FunctionLike =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration;

export function lineOf(sf: ts.SourceFile, node: ts.Node): number {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
}

export function isFunctionLike(node: ts.Node): node is FunctionLike {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node)
  );
}

export function calleeName(call: ts.CallExpression): string | undefined {
  const c = call.expression;
  if (ts.isIdentifier(c)) return c.text;
  if (ts.isPropertyAccessExpression(c)) return c.name.text;
  return undefined;
}

/** Steps out of wrappers that do not change the value: `(x)`, `x!`, `x as T`, `x satisfies T`. */
export function outer(node: ts.Node): ts.Node {
  let n = node;
  while (
    ts.isParenthesizedExpression(n.parent) ||
    ts.isNonNullExpression(n.parent) ||
    ts.isAsExpression(n.parent) ||
    ts.isSatisfiesExpression(n.parent) ||
    ts.isTypeAssertionExpression(n.parent)
  )
    n = n.parent;
  return n;
}

/** The name of a function-like node: its own, or the variable it is assigned to. */
export function functionName(fn: FunctionLike): string | undefined {
  if (fn.name && ts.isIdentifier(fn.name)) return fn.name.text;
  const p = fn.parent;
  if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return p.name.text;
  return undefined;
}

/** The innermost function around `node`, if any. */
export function enclosingFunction(node: ts.Node): FunctionLike | undefined {
  for (let n = node.parent; n; n = n.parent) if (isFunctionLike(n)) return n;
  return undefined;
}

/** The last segment of a JSX tag name: `Suspense` for `<React.Suspense>`. */
export function tagName(tag: ts.JsxTagNameExpression, sf: ts.SourceFile): string {
  return tag.getText(sf).split(".").pop() ?? "";
}

const TEST = /(?:\.(?:test|spec|stories)\.[^/]+$)|(?:^|\/)__(?:tests|mocks)__\//;

/** Script files a component rule reads: no declarations, tests or stories. */
export function scriptFiles(files: string[], jsxOnly = false): string[] {
  const ext = jsxOnly ? /\.(?:tsx|jsx|js)$/ : /\.(?:tsx|jsx|ts|js)$/;
  return files.filter((f) => ext.test(f) && !f.endsWith(".d.ts") && !TEST.test(f));
}
