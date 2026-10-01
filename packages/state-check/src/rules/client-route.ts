// client-route (opt-in): every route of a client-side router (a Vite app on wouter or React Router)
// renders inside an error boundary, and a `lazy()` page renders inside a <Suspense>.
//
// A route is a `<Route>` imported from `wouter` or `react-router` / `react-router-dom` (aliases and
// `import * as` included). Its page is what `component={…}` names (both arms of a ternary), or the
// outermost elements of `element={…}` or its children.
//
// The route has an error state when any of these holds:
//   - an error boundary is a JSX ancestor of the route: a class component of the app with
//     `static getDerivedStateFromError` or `componentDidCatch`, an `ErrorBoundary` element (as
//     react-error-boundary exports it), or one of `errorBoundaries`;
//   - the route, or an ancestor `<Route>`, has an `errorElement` or `ErrorBoundary` prop (React
//     Router data routers);
//   - the page's outermost element is an error boundary, or the page component returns one.
// The route has a loading state when its page is not `lazy(() => import(…))`, or when a <Suspense>
// is a JSX ancestor of the route.
//
// Ancestors are followed out of the component that renders the routes: when `<Shell>` holds the
// routes, every `<Shell>` in the app must sit under the boundary (or its own parent component must).
//
// Limits: components are matched by name across the app, the page component is followed one import
// deep, and route objects (`createBrowserRouter([{ … }])`) are not read.
import ts from "typescript";
import type { Rule, RuleContext, Violation } from "../types";
import {
  calleeName,
  type FunctionLike,
  functionName,
  isFunctionLike,
  lineOf,
  resolveImport,
  scriptFiles,
  tagName,
} from "./ast";

export const ROUTER_MODULES = ["wouter", "react-router", "react-router-dom"];
export const ERROR_BOUNDARIES = ["ErrorBoundary"];
const ROUTE_ERROR_PROPS = ["errorElement", "ErrorBoundary"];

type Element = ts.JsxOpeningElement | ts.JsxSelfClosingElement;
type Usage = { file: string; el: Element };

function isElement(n: ts.Node): n is Element {
  return ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n);
}

function attribute(el: Element, name: string): ts.JsxAttribute | undefined {
  return el.attributes.properties.find(
    (p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText() === name
  );
}

function attributeExpression(el: Element, name: string): ts.Expression | undefined {
  const init = attribute(el, name)?.initializer;
  return init && ts.isJsxExpression(init) ? init.expression : undefined;
}

/** Local names (and namespaces) bound to `Route` from a router module. */
function routeImports(sf: ts.SourceFile): { names: Set<string>; namespaces: Set<string> } {
  const names = new Set<string>();
  const namespaces = new Set<string>();
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    const spec = stmt.moduleSpecifier.text;
    if (!ROUTER_MODULES.some((m) => spec === m || spec.startsWith(`${m}/`))) continue;
    const bindings = stmt.importClause?.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) namespaces.add(bindings.name.text);
    if (bindings && ts.isNamedImports(bindings))
      for (const el of bindings.elements)
        if ((el.propertyName ?? el.name).text === "Route") names.add(el.name.text);
  }
  return { names, namespaces };
}

function isRoute(el: Element, imports: ReturnType<typeof routeImports>): boolean {
  const t = el.tagName;
  if (ts.isIdentifier(t)) return imports.names.has(t.text);
  return (
    ts.isPropertyAccessExpression(t) &&
    t.name.text === "Route" &&
    ts.isIdentifier(t.expression) &&
    imports.namespaces.has(t.expression.text)
  );
}

/** Class components of a file that catch render errors. */
function boundaryClasses(sf: ts.SourceFile): string[] {
  const out: string[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isClassDeclaration(n) && n.name) {
      const catches = n.members.some(
        (m) =>
          ts.isMethodDeclaration(m) &&
          ts.isIdentifier(m.name) &&
          (m.name.text === "getDerivedStateFromError" || m.name.text === "componentDidCatch")
      );
      if (catches) out.push(n.name.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

/** The opening tags of the JSX elements around `node`, innermost first. */
function jsxAncestors(node: ts.Node): Element[] {
  const out: Element[] = [];
  for (let n = node.parent; n; n = n.parent)
    if (ts.isJsxElement(n) && n.openingElement !== node) out.push(n.openingElement);
  return out;
}

/** The outermost elements of a JSX expression: `<A />`, `c ? <A /> : <B />`, `<>…</>` children. */
function outermost(expr: ts.Node | undefined): Element[] {
  if (!expr) return [];
  if (ts.isParenthesizedExpression(expr)) return outermost(expr.expression);
  if (ts.isConditionalExpression(expr))
    return [...outermost(expr.whenTrue), ...outermost(expr.whenFalse)];
  if (ts.isBinaryExpression(expr)) return outermost(expr.right);
  if (ts.isJsxSelfClosingElement(expr)) return [expr];
  if (ts.isJsxElement(expr)) return [expr.openingElement];
  if (ts.isJsxFragment(expr)) return expr.children.flatMap((c) => outermost(c));
  if (ts.isJsxExpression(expr)) return outermost(expr.expression);
  return [];
}

/** Component identifiers a `component={…}` prop can render: both arms of a ternary. */
function componentNames(expr: ts.Expression | undefined): string[] {
  if (!expr) return [];
  if (ts.isParenthesizedExpression(expr)) return componentNames(expr.expression);
  if (ts.isConditionalExpression(expr))
    return [...componentNames(expr.whenTrue), ...componentNames(expr.whenFalse)];
  if (ts.isIdentifier(expr)) return [expr.text];
  if (ts.isPropertyAccessExpression(expr)) return [expr.name.text];
  return [];
}

/** What `name` is bound to in `file`: a same-file declaration, or one named import followed. */
function declaration(
  ctx: RuleContext,
  files: Set<string>,
  file: string,
  name: string,
  follow = true
): ts.Node | undefined {
  const sf = ctx.source(file);
  for (const stmt of sf.statements) {
    if ((ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) && stmt.name?.text === name)
      return stmt;
    if (ts.isVariableStatement(stmt))
      for (const d of stmt.declarationList.declarations)
        if (ts.isIdentifier(d.name) && d.name.text === name) return d.initializer;
    if (!follow || !ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier))
      continue;
    const bindings = stmt.importClause?.namedBindings;
    const el =
      bindings && ts.isNamedImports(bindings)
        ? bindings.elements.find((e) => e.name.text === name)
        : undefined;
    const isDefault = stmt.importClause?.name?.text === name;
    if (!el && !isDefault) continue;
    const target = resolveImport(file, stmt.moduleSpecifier.text, files);
    if (!target) return undefined;
    if (el) return declaration(ctx, files, target, (el.propertyName ?? el.name).text, false);
    const def = ctx.source(target).statements.find(ts.isExportAssignment);
    if (def) return def.expression;
    return ctx
      .source(target)
      .statements.find(
        (s) =>
          ts.isFunctionDeclaration(s) &&
          (ts.getModifiers(s) ?? []).some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
      );
  }
  return undefined;
}

function isLazy(node: ts.Node | undefined): boolean {
  return node !== undefined && ts.isCallExpression(node) && calleeName(node) === "lazy";
}

/** The outermost elements a function component returns. */
function returned(fn: FunctionLike): Element[] {
  if (!fn.body) return [];
  if (!ts.isBlock(fn.body)) return outermost(fn.body);
  const out: Element[] = [];
  const visit = (n: ts.Node) => {
    if (isFunctionLike(n)) return;
    if (ts.isReturnStatement(n)) out.push(...outermost(n.expression));
    ts.forEachChild(n, visit);
  };
  ts.forEachChild(fn.body, visit);
  return out;
}

/** The nearest named component around `node`: `.map((x) => …)` callbacks are stepped over. */
function enclosingComponent(node: ts.Node): string | undefined {
  for (let n = node.parent; n; n = n.parent) {
    if (!isFunctionLike(n)) continue;
    const name = functionName(n);
    if (name && /^[A-Z]/.test(name)) return name;
  }
  return undefined;
}

export function checkRoutes(ctx: RuleContext): {
  violations: Violation[];
  routes: number;
  lazy: number;
} {
  const all = new Set(ctx.files);
  const files = scriptFiles(ctx.files, true);
  const boundaries = new Set([...ERROR_BOUNDARIES, ...(ctx.options.errorBoundaries ?? [])]);
  const usages = new Map<string, Usage[]>();
  for (const file of files) {
    const sf = ctx.source(file);
    for (const name of boundaryClasses(sf)) boundaries.add(name);
    const visit = (n: ts.Node) => {
      if (isElement(n)) {
        const tag = tagName(n.tagName, sf);
        if (/^[A-Z]/.test(tag)) usages.set(tag, [...(usages.get(tag) ?? []), { file, el: n }]);
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }

  const isBoundary = (el: Element, sf: ts.SourceFile) => boundaries.has(tagName(el.tagName, sf));
  const isSuspense = (el: Element, sf: ts.SourceFile) => tagName(el.tagName, sf) === "Suspense";

  // Whether every place that renders `node` is under a wrapper, following component usages out.
  const memo = new Map<string, boolean>();
  const wrapped = (
    file: string,
    node: ts.Node,
    hit: (el: Element, sf: ts.SourceFile) => boolean,
    kind: string,
    stack: Set<string>
  ): boolean => {
    const sf = ctx.source(file);
    if (jsxAncestors(node).some((el) => hit(el, sf))) return true;
    const component = enclosingComponent(node);
    if (!component) return false;
    const key = `${kind}\0${component}`;
    const known = memo.get(key);
    if (known !== undefined) return known;
    if (stack.has(key)) return false;
    stack.add(key);
    const uses = usages.get(component) ?? [];
    const result = uses.length > 0 && uses.every((u) => wrapped(u.file, u.el, hit, kind, stack));
    stack.delete(key);
    memo.set(key, result);
    return result;
  };

  const violations: Violation[] = [];
  let routes = 0;
  let lazy = 0;
  for (const file of files) {
    const sf = ctx.source(file);
    const imports = routeImports(sf);
    if (imports.names.size === 0 && imports.namespaces.size === 0) continue;

    const visit = (n: ts.Node) => {
      ts.forEachChild(n, visit);
      if (!isElement(n) || !isRoute(n, imports)) return;
      routes++;

      // The page: component={…}, or the outermost elements of element={…} or the children.
      const pageElements = [
        ...outermost(attributeExpression(n, "element")),
        ...(ts.isJsxOpeningElement(n) ? n.parent.children.flatMap((c) => outermost(c)) : []),
      ].filter((el) => !isRoute(el, imports));
      const pageNames = [
        ...componentNames(attributeExpression(n, "component")),
        ...pageElements.map((el) => tagName(el.tagName, sf)),
      ];
      const pages = pageNames.map((name) => declaration(ctx, all, file, name));

      const routeError = (el: Element) =>
        isRoute(el, imports) && ROUTE_ERROR_PROPS.some((p) => attribute(el, p));
      const hasError =
        routeError(n) ||
        pageElements.some((el) => isBoundary(el, sf)) ||
        pages.some(
          (p) =>
            p !== undefined &&
            isFunctionLike(p) &&
            returned(p).some((el) => isBoundary(el, p.getSourceFile()))
        ) ||
        wrapped(file, n, (el, s) => isBoundary(el, s) || routeError(el), "error", new Set());
      const isLazyPage = pages.some(isLazy);
      if (isLazyPage) lazy++;
      const hasLoading =
        !isLazyPage || wrapped(file, n, (el, s) => isSuspense(el, s), "loading", new Set());
      if (hasError && hasLoading) return;

      const path = attribute(n, "path")?.initializer;
      const where = !path
        ? "route without a path"
        : ts.isStringLiteral(path)
          ? `route "${path.text}"`
          : `route ${path.getText(sf)}`;
      const missing = [
        hasError
          ? undefined
          : "no error boundary around it: wrap the routes in an error boundary, give the route an errorElement, or have the page return one",
        hasLoading ? undefined : "its lazy() page has no <Suspense> around the route",
      ].filter((m) => m !== undefined);
      violations.push({
        rule: clientRoute.id,
        file,
        line: lineOf(sf, n),
        message: `${where}: ${missing.join("; ")}`,
      });
    };
    visit(sf);
  }
  return { violations, routes, lazy };
}

export const clientRoute: Rule = {
  id: "client-route",
  description:
    "A client router route (wouter, React Router) renders in an error boundary; a lazy page in <Suspense>.",
  check(ctx) {
    const { violations, routes, lazy } = checkRoutes(ctx);
    return { violations, stats: { routes, lazy } };
  },
};
