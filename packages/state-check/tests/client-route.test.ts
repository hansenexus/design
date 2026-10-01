import { describe, expect, test } from "bun:test";
import { check, emptyBaseline, readConfig } from "../src";
import { app, run } from "./fixture";

const routes = (files: Record<string, string>) =>
  check(app(files), emptyBaseline(), { rules: ["client-route"] });
const at = (files: Record<string, string>) => routes(files).new.map((v) => `${v.file}:${v.line}`);

const WOUTER = `import { Route, Switch } from "wouter";\n`;
const PAGES = {
  "src/pages/home.tsx": "export function HomePage() {\n  return <h1>Home</h1>;\n}\n",
  "src/pages/machine.tsx": "export function MachinePage() {\n  return <h1>Machine</h1>;\n}\n",
};
const IMPORTS = `import { HomePage } from "./pages/home";\nimport { MachinePage } from "./pages/machine";\n`;
const SWITCH = `    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/machines/:id">
        <MachinePage />
      </Route>
    </Switch>`;

describe("client-route: violations", () => {
  test("a wouter route without an error boundary is a violation, one per route", () => {
    const shell = `${WOUTER}${IMPORTS}export function Shell() {\n  return (\n${SWITCH}\n  );\n}\n`;
    const r = routes({ ...PAGES, "src/shell.tsx": shell });
    expect(r.new.map((v) => `${v.file}:${v.line}`)).toEqual(["src/shell.tsx:7", "src/shell.tsx:8"]);
    expect(r.new[0]?.message).toContain('route "/": no error boundary');
    expect(r.stats).toMatchObject({ routes: 2, lazy: 0 });
  });

  test("a lazy page without <Suspense> is a violation, even inside a boundary", () => {
    const shell = `import { lazy } from "react";
import { ErrorBoundary } from "react-error-boundary";
${WOUTER}const Audit = lazy(() => import("./pages/audit"));
export function Shell() {
  return (
    <ErrorBoundary fallback={<p>Broke</p>}>
      <Route path="/audit" component={Audit} />
    </ErrorBoundary>
  );
}
`;
    const r = routes({
      "src/shell.tsx": shell,
      "src/pages/audit.tsx": "export default () => null;\n",
    });
    expect(r.new.map((v) => v.line)).toEqual([8]);
    expect(r.new[0]?.message).toBe(
      'route "/audit": its lazy() page has no <Suspense> around the route'
    );
    expect(r.stats).toMatchObject({ routes: 1, lazy: 1 });
  });

  test("React Router routes, aliased and namespace imports are tracked", () => {
    const rr = `import { Route as R, Routes } from "react-router-dom";\nimport { HomePage } from "./pages/home";\nexport function A() {\n  return <Routes><R path="/" element={<HomePage />} /></Routes>;\n}\n`;
    const ns = `import * as W from "wouter";\nimport { HomePage } from "./pages/home";\nexport function B() {\n  return <W.Route path="/" component={HomePage} />;\n}\n`;
    expect(at({ ...PAGES, "src/a.tsx": rr, "src/b.tsx": ns })).toEqual([
      "src/a.tsx:4",
      "src/b.tsx:4",
    ]);
  });

  test("a component that holds the routes must be wrapped wherever it is used", () => {
    const shell = `${WOUTER}${IMPORTS}export function Shell() {\n  return (\n${SWITCH}\n  );\n}\n`;
    const main = `import { Shell } from "./shell";
import { Boundary } from "./boundary";
export function App() {
  return <Boundary><Shell /></Boundary>;
}
export function Preview() {
  return <Shell />;
}
`;
    const boundary = `import { Component } from "react";
export class Boundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <p>Broke</p> : this.props.children;
  }
}
`;
    const files = {
      ...PAGES,
      "src/shell.tsx": shell,
      "src/main.tsx": main,
      "src/boundary.tsx": boundary,
    };
    // <Preview> renders the shell without the boundary.
    expect(at(files)).toEqual(["src/shell.tsx:7", "src/shell.tsx:8"]);
  });

  test("other <Route> components and router-less files are ignored", () => {
    const own = `import { Route } from "./route";\nexport function A() {\n  return <Route path="/" />;\n}\n`;
    expect(at({ "src/a.tsx": own, "src/route.tsx": "export const Route = () => null;\n" })).toEqual(
      []
    );
  });
});

describe("client-route: what covers it", () => {
  test("a class boundary of the app above the routes, followed out of the shell", () => {
    const shell = `${WOUTER}${IMPORTS}export function Shell() {\n  return (\n${SWITCH}\n  );\n}\n`;
    const main = `import { Component } from "react";
import { createRoot } from "react-dom/client";
import { Shell } from "./shell";
class Catch extends Component<{ children: React.ReactNode }> {
  componentDidCatch() {}
  render() {
    return this.props.children;
  }
}
export function App() {
  return <Catch><Shell /></Catch>;
}
createRoot(document.body).render(<App />);
`;
    expect(at({ ...PAGES, "src/shell.tsx": shell, "src/main.tsx": main })).toEqual([]);
  });

  test("errorElement on the route or an ancestor route", () => {
    const rr = `import { Route } from "react-router";
import { HomePage } from "./pages/home";
import { MachinePage } from "./pages/machine";
export const tree = (
  <Route path="/" element={<HomePage />} errorElement={<p>Broke</p>}>
    <Route path="machines/:id" element={<MachinePage />} />
  </Route>
);
`;
    expect(at({ ...PAGES, "src/routes.tsx": rr })).toEqual([]);
  });

  test("a page that returns a boundary, or a boundary as the route's child", () => {
    const page = `import { ErrorBoundary } from "react-error-boundary";
export function HomePage() {
  return (
    <ErrorBoundary fallback={<p>Broke</p>}>
      <h1>Home</h1>
    </ErrorBoundary>
  );
}
`;
    const shell = `${WOUTER}import { HomePage } from "./pages/home";
import { SafeArea } from "./safe";
export function Shell() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/x">
        <SafeArea>
          <h1>X</h1>
        </SafeArea>
      </Route>
    </Switch>
  );
}
`;
    const r = check(
      app({ "src/pages/home.tsx": page, "src/shell.tsx": shell, "src/safe.tsx": "" }),
      emptyBaseline(),
      { rules: ["client-route"], errorBoundaries: ["SafeArea"] }
    );
    expect(r.new).toEqual([]);
  });

  test("a lazy page under <Suspense> and a boundary passes; a ternary checks both pages", () => {
    const shell = `import { lazy, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
${WOUTER}import { HomePage } from "./pages/home";
const Editor = lazy(() => import("./pages/editor"));
export function Shell({ desktop }: { desktop: boolean }) {
  return (
    <ErrorBoundary fallback={<p>Broke</p>}>
      <Suspense fallback={<p>Loading</p>}>
        <Route path="/editor" component={desktop ? Editor : HomePage} />
      </Suspense>
    </ErrorBoundary>
  );
}
`;
    const r = routes({
      ...PAGES,
      "src/shell.tsx": shell,
      "src/pages/editor.tsx": "export default () => null;\n",
    });
    expect(r.new).toEqual([]);
    expect(r.stats).toMatchObject({ routes: 1, lazy: 1 });
  });

  test("a lazy page imported from another file is found", () => {
    const pages = `import { lazy } from "react";\nexport const Editor = lazy(() => import("./editor"));\n`;
    const shell = `import { ErrorBoundary } from "react-error-boundary";
${WOUTER}import { Editor } from "./pages";
export function Shell() {
  return (
    <ErrorBoundary fallback={null}>
      <Route path="/editor" component={Editor} />
    </ErrorBoundary>
  );
}
`;
    const r = routes({
      "src/pages/index.ts": pages,
      "src/pages/editor.tsx": "",
      "src/shell.tsx": shell,
    });
    expect(r.new.map((v) => v.message)).toEqual([
      'route "/editor": its lazy() page has no <Suspense> around the route',
    ]);
  });

  test("routes inside a .map callback follow the enclosing component", () => {
    const shell = `${WOUTER}import { Outlet } from "./outlet";
export function Shell({ pages }: { pages: { path: string }[] }) {
  return (
    <Switch>
      {pages.map((p) => (
        <Route key={p.path} path={p.path}>
          <Outlet />
        </Route>
      ))}
    </Switch>
  );
}
`;
    const main = `import { ErrorBoundary } from "react-error-boundary";\nimport { Shell } from "./shell";\nexport function App() {\n  return <ErrorBoundary fallback={null}><Shell pages={[]} /></ErrorBoundary>;\n}\n`;
    const files = { "src/shell.tsx": shell, "src/outlet.tsx": "", "src/main.tsx": main };
    expect(at(files)).toEqual([]);
    const bare = routes({ ...files, "src/main.tsx": main.replace(/<\/?ErrorBoundary[^>]*>/g, "") });
    expect(bare.new[0]?.message).toStartWith("route {p.path}: no error boundary");
  });
});

describe("client-route: config and cli", () => {
  test("opt-in through the config, with errorBoundaries", () => {
    const dir = app({
      "state-check.config.json": JSON.stringify({
        rules: { "next-route": false, "client-route": true },
        errorBoundaries: ["SafeArea"],
      }),
    });
    expect(readConfig(dir)).toMatchObject({
      rules: ["client-route"],
      options: { errorBoundaries: ["SafeArea"] },
    });
    expect(() =>
      readConfig(app({ "state-check.config.json": JSON.stringify({ errorBoundaries: "x" }) }))
    ).toThrow('"errorBoundaries" must be a list of names');
  });

  test("the cli reports routes and fails on a new one", () => {
    const shell = `${WOUTER}${IMPORTS}export function Shell() {\n  return (\n${SWITCH}\n  );\n}\n`;
    const dir = app({
      ...PAGES,
      "src/shell.tsx": shell,
      "package.json": JSON.stringify({
        "state-check": { rules: { "next-route": false, "client-route": true } },
      }),
    });
    const fail = run(dir);
    expect(fail.code).toBe(1);
    expect(fail.err).toContain("src/shell.tsx:7 client-route:");
    expect(run(dir, "--update-baseline").code).toBe(0);
    const pass = run(dir);
    expect(pass.code).toBe(0);
    expect(pass.out).toContain("state-check [client-route]: 2 routes, 0 lazy, 2 baselined");
  });
});
