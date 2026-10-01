// pending-action (opt-in): an element that starts a server write shows that it is pending.
//
// What starts a write:
//   - `<form action={…}>` with an expression (a server action or a function; a plain URL string
//     is a native navigation and exempt);
//   - `<form onSubmit={…}>` whose handler is async, awaits, calls `fetch` or triggers a mutation;
//   - `formAction={…}` on any element;
//   - `onClick={…}` on any element whose handler triggers a mutation.
// A mutation is a call to what `useMutation` / `useAction` (plus configured hooks) returned
// (`save()`, `m.mutate()`, a destructured `mutate()`), or to a server action imported from a
// `"use server"` module of the app (relative, `@/` or `~/` imports). Handlers are followed through
// same-file functions and `useCallback`.
//
// What shows it, anywhere in the element (the whole form for a form):
//   - a `pending`, `isPending`, `loading`, `isLoading` or `aria-busy` prop;
//   - `disabled={…}` reading a pending-like name (pending, loading, submitting, saving, busy…);
//   - a `{…}` child reading a pending-like name (`{isPending ? "Saving…" : "Save"}`);
//   - a component that calls `useFormStatus` (found across the app) or a configured one.
//
// Limits: the pending name is matched by spelling, not traced to useTransition / useFormStatus,
// and a handler imported from another file is not followed.
import ts from "typescript";
import type { Rule, RuleContext, Violation } from "../types";
import {
  type FunctionLike,
  functionName,
  isFunctionLike,
  lineOf,
  resolveImport,
  scriptFiles,
  tagName,
} from "./ast";

export const MUTATION_HOOKS = ["useMutation", "useAction"];
export const PENDING_PROPS = ["pending", "isPending", "loading", "isLoading", "aria-busy"];
const PENDING_NAME = /pending|loading|submitting|saving|busy|mutating|inflight|processing/i;

type Element = ts.JsxOpeningElement | ts.JsxSelfClosingElement;

/** The file starts with a `"use server"` directive. */
function isServerModule(sf: ts.SourceFile): boolean {
  const first = sf.statements[0];
  return (
    first !== undefined &&
    ts.isExpressionStatement(first) &&
    ts.isStringLiteral(first.expression) &&
    first.expression.text === "use server"
  );
}

/** Names of components that call `useFormStatus`: they render the form's pending state. */
function formStatusComponents(sf: ts.SourceFile): string[] {
  const out: string[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
      if (n.expression.text === "useFormStatus") {
        for (let p: ts.Node | undefined = n.parent; p; p = p.parent) {
          if (!isFunctionLike(p)) continue;
          const name = functionName(p);
          if (name && /^[A-Z]/.test(name)) out.push(name);
          break;
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

/** Local names bound to a mutation: hook results (and what is destructured) and server actions. */
function mutationNames(
  sf: ts.SourceFile,
  file: string,
  hooks: Set<string>,
  serverModules: Set<string>,
  files: Set<string>
): Set<string> {
  const names = new Set<string>();
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    const target = resolveImport(file, stmt.moduleSpecifier.text, files);
    if (!target || !serverModules.has(target)) continue;
    const clause = stmt.importClause;
    if (clause?.name) names.add(clause.name.text);
    const bindings = clause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings))
      for (const el of bindings.elements) names.add(el.name.text);
  }
  const visit = (n: ts.Node) => {
    if (
      ts.isVariableDeclaration(n) &&
      n.initializer &&
      ts.isCallExpression(n.initializer) &&
      ts.isIdentifier(n.initializer.expression) &&
      hooks.has(n.initializer.expression.text)
    ) {
      if (ts.isIdentifier(n.name)) names.add(n.name.text);
      else
        for (const el of n.name.elements)
          if (ts.isBindingElement(el) && ts.isIdentifier(el.name)) names.add(el.name.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return names;
}

/** A function named `name` visible from `from`: declared in an enclosing block or the file. */
function resolveLocal(name: string, from: ts.Node): FunctionLike | undefined {
  for (let scope: ts.Node | undefined = from; scope; scope = scope.parent) {
    const statements = ts.isBlock(scope) || ts.isSourceFile(scope) ? scope.statements : undefined;
    if (!statements) continue;
    for (const stmt of statements) {
      if (ts.isFunctionDeclaration(stmt) && stmt.name?.text === name) return stmt;
      if (!ts.isVariableStatement(stmt)) continue;
      for (const d of stmt.declarationList.declarations) {
        if (!ts.isIdentifier(d.name) || d.name.text !== name || !d.initializer) continue;
        let init: ts.Expression = d.initializer;
        // useCallback(fn, deps) and friends: the function is the first argument.
        if (ts.isCallExpression(init) && init.arguments[0]) init = init.arguments[0];
        if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) return init;
      }
    }
  }
  return undefined;
}

type Work = { mutation?: string; async: boolean };

/** What a handler does: which mutation it triggers, and whether it does async work at all. */
function handlerWork(expr: ts.Expression, mutations: Set<string>, seen: Set<ts.Node>): Work {
  const work: Work = { async: false };
  const merge = (w: Work) => {
    work.mutation ??= w.mutation;
    work.async ||= w.async;
  };
  const follow = (fn: FunctionLike) => {
    if (seen.has(fn)) return;
    seen.add(fn);
    if (ts.getModifiers(fn)?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)) work.async = true;
    const visit = (n: ts.Node) => {
      if (ts.isAwaitExpression(n)) work.async = true;
      if (ts.isCallExpression(n)) {
        const c = n.expression;
        if (ts.isIdentifier(c)) {
          if (mutations.has(c.text)) work.mutation ??= c.text;
          else if (c.text === "fetch") work.async = true;
          else {
            const local = resolveLocal(c.text, n);
            if (local) follow(local);
          }
        } else if (
          ts.isPropertyAccessExpression(c) &&
          ts.isIdentifier(c.expression) &&
          mutations.has(c.expression.text)
        )
          work.mutation ??= `${c.expression.text}.${c.name.text}`;
        // A function handed to another call (startTransition, handleSubmit) runs as part of it.
        for (const arg of n.arguments)
          if (ts.isIdentifier(arg)) merge(handlerWork(arg, mutations, seen));
      }
      ts.forEachChild(n, visit);
    };
    if (fn.body) visit(fn.body);
  };

  const e = ts.isParenthesizedExpression(expr) ? expr.expression : expr;
  if (ts.isIdentifier(e)) {
    if (mutations.has(e.text)) work.mutation = e.text;
    else {
      const local = resolveLocal(e.text, e);
      if (local) follow(local);
    }
  } else if (ts.isArrowFunction(e) || ts.isFunctionExpression(e)) follow(e);
  else if (ts.isCallExpression(e))
    // handleSubmit(onValid): what the wrapped handler does.
    for (const arg of e.arguments) merge(handlerWork(arg, mutations, seen));
  return work;
}

function attribute(el: Element, name: string): ts.JsxAttribute | undefined {
  return el.attributes.properties.find(
    (a): a is ts.JsxAttribute => ts.isJsxAttribute(a) && a.name.getText() === name
  );
}

/** The `{…}` value of an attribute, if it is an expression. */
function attributeExpression(el: Element, name: string): ts.Expression | undefined {
  const init = attribute(el, name)?.initializer;
  return init && ts.isJsxExpression(init) ? init.expression : undefined;
}

function readsPendingName(node: ts.Node): boolean {
  let found = false;
  const visit = (n: ts.Node) => {
    if (found) return;
    if (ts.isIdentifier(n) && PENDING_NAME.test(n.text)) found = true;
    else ts.forEachChild(n, visit);
  };
  visit(node);
  return found;
}

/** The element or anything inside it shows a pending state. */
function showsPending(el: Element, sf: ts.SourceFile, components: Set<string>): boolean {
  const root = ts.isJsxOpeningElement(el) ? el.parent : el;
  let found = false;
  const visit = (n: ts.Node) => {
    if (found) return;
    if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
      if (components.has(tagName(n.tagName, sf))) found = true;
      if (PENDING_PROPS.some((p) => attribute(n, p))) found = true;
      const disabled = attributeExpression(n, "disabled");
      if (disabled && readsPendingName(disabled)) found = true;
    }
    if (ts.isJsxExpression(n) && !ts.isJsxAttribute(n.parent) && n.expression)
      if (readsPendingName(n.expression)) found = true;
    ts.forEachChild(n, visit);
  };
  visit(root);
  return found;
}

export function checkActions(ctx: RuleContext): {
  violations: Violation[];
  actions: number;
  pending: number;
} {
  const files = scriptFiles(ctx.files);
  const all = new Set(ctx.files);
  const hooks = new Set([...MUTATION_HOOKS, ...(ctx.options.mutationHooks ?? [])]);
  const components = new Set(ctx.options.pendingComponents ?? []);
  const serverModules = new Set<string>();
  for (const file of files) {
    const sf = ctx.source(file);
    if (isServerModule(sf)) serverModules.add(file);
    if (sf.text.includes("useFormStatus"))
      for (const name of formStatusComponents(sf)) components.add(name);
  }

  const violations: Violation[] = [];
  let actions = 0;
  let pending = 0;
  for (const file of scriptFiles(ctx.files, true)) {
    const sf = ctx.source(file);
    const mutations = mutationNames(sf, file, hooks, serverModules, all);

    const visit = (n: ts.Node) => {
      ts.forEachChild(n, visit);
      if (!ts.isJsxOpeningElement(n) && !ts.isJsxSelfClosingElement(n)) return;
      const tag = tagName(n.tagName, sf);
      let what: string | undefined;
      if (tag === "form") {
        if (attributeExpression(n, "action")) what = "form action";
        const submit = attributeExpression(n, "onSubmit");
        if (!what && submit) {
          const work = handlerWork(submit, mutations, new Set());
          if (work.mutation) what = `form submit calling ${work.mutation}()`;
          else if (work.async) what = "async form submit";
        }
      }
      if (!what && attributeExpression(n, "formAction")) what = `<${tag} formAction>`;
      const click = attributeExpression(n, "onClick");
      if (!what && click) {
        const work = handlerWork(click, mutations, new Set());
        if (work.mutation) what = `<${tag}> onClick calling ${work.mutation}()`;
      }
      if (!what) return;
      actions++;
      if (showsPending(n, sf, components)) {
        pending++;
        return;
      }
      violations.push({
        rule: pendingAction.id,
        file,
        line: lineOf(sf, n),
        message: `${what} without a pending indicator: use a useFormStatus submit button, a pending prop, or disabled={isPending} while the write runs`,
      });
    };
    visit(sf);
  }
  return { violations, actions, pending };
}

export const pendingAction: Rule = {
  id: "pending-action",
  description: "A form action, submit handler or mutation button shows a pending state.",
  check(ctx) {
    const { violations, actions, pending } = checkActions(ctx);
    return { violations, stats: { actions, pending } };
  },
};
