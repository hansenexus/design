// The navigation scene: Breadcrumb (plain, collapsed, loading, German) and Pagination in each of
// its states, plus a live pager with a slow fake fetch that the interaction spec drives.
// Names are an invented estate: no real hostnames, IPs or people in a public repo.

import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  Pagination,
  Skeleton,
} from "../src";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3.5">
      <h2 className="m-0 font-hn-mono text-[13px] font-medium text-hn-ink-muted">{title}</h2>
      <div className="rounded-hn-lg border border-hn-line-subtle bg-hn-surface-card p-4">
        {children}
      </div>
    </section>
  );
}

const noop = (e: { preventDefault: () => void }) => e.preventDefault();

const ROWS = ["kran-01", "kran-02", "kran-03", "kran-04", "pegel", "lotsen-api", "speicher-web"];
const PER_PAGE = 2;

/** A pager over a fake source that answers after 600 ms: aria-current moves only then. */
function LivePager() {
  const [page, setPage] = useState(1);
  const [pendingPage, setPendingPage] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const request = (next: number) => {
    clearTimeout(timer.current);
    setPendingPage(next);
    timer.current = setTimeout(() => {
      setPage(next);
      setPendingPage(null);
    }, 600);
  };
  const pageCount = Math.ceil(ROWS.length / PER_PAGE);
  return (
    <div data-testid="live-pager" className="flex flex-col gap-3">
      <ul
        aria-busy={pendingPage !== null || undefined}
        className="m-0 flex list-none flex-col gap-1 p-0 font-hn-mono text-sm text-hn-ink-primary"
      >
        {ROWS.slice((page - 1) * PER_PAGE, page * PER_PAGE).map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <Pagination
        page={page}
        pageCount={pageCount}
        pendingPage={pendingPage}
        onPageChange={request}
      />
    </div>
  );
}

export function Navigation() {
  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-10 sm:px-10">
      <header className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-hn-ink-muted">@hansenexus/ui</span>
        <h1 className="m-0 font-hn-display text-[32px] leading-tight font-semibold tracking-[-0.02em] sm:text-[44px]">
          Navigation
        </h1>
      </header>
      <div className="grid gap-x-8 gap-y-10 lg:grid-cols-2">
        <Section title="Breadcrumb (en)">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#estate" onClick={noop}>
                  Estate
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="#harbour" onClick={noop}>
                  harbour
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>speicher-web</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </Section>
        <Section title="Breadcrumb: collapsed middle, a Menu of the hidden levels">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#estate" onClick={noop}>
                  Estate
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <Menu modal={false}>
                  <MenuTrigger asChild>
                    <BreadcrumbEllipsis />
                  </MenuTrigger>
                  <MenuContent align="start">
                    <MenuItem>harbour</MenuItem>
                    <MenuItem>quay 4</MenuItem>
                  </MenuContent>
                </Menu>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="#kran-04" onClick={noop}>
                  kran-04
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Rollout history of the crane controller</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </Section>
        <Section title="Breadcrumb: current page still loading (de)">
          <Breadcrumb locale="de">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#estate" onClick={noop}>
                  Bestand
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="#machines" onClick={noop}>
                  Maschinen
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem aria-busy="true">
                <Skeleton shape="text" width={96} />
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </Section>
        <Section title="Breadcrumb: slash separator (de)">
          <Breadcrumb locale="de">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#estate" onClick={noop}>
                  Bestand
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>/</BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage>Einstellungen</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </Section>
        <Section title="Pagination: first page, previous off (en)">
          <Pagination page={1} pageCount={12} />
        </Section>
        <Section title="Pagination: middle, both gaps (en)">
          <Pagination page={6} pageCount={12} />
        </Section>
        <Section title="Pagination: last page, next off (de)">
          <Pagination page={12} pageCount={12} locale="de" />
        </Section>
        <Section title="Pagination: page 5 loading, 4 stays current (en)">
          <div data-pagination="pending">
            <Pagination page={4} pageCount={12} pendingPage={5} />
          </div>
        </Section>
        <Section title="Pagination: disabled (de)">
          <Pagination page={3} pageCount={5} disabled locale="de" />
        </Section>
        <Section title="Pagination: links, few pages (en)">
          <Pagination page={2} pageCount={4} href={(p) => `#page-${p}`} />
        </Section>
        <Section title="Live: 600 ms fetch per page">
          <LivePager />
        </Section>
      </div>
    </main>
  );
}
