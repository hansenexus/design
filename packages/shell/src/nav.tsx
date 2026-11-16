// The nav slot's content: RailItems in a column from 768 px of shell width, a bottom tab bar
// below. Both come from one list, filtered by the app's capabilities (navVisible), so a row the
// context cannot reach is in neither.
import {
  cx,
  focusRing,
  RailItem,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@hansenexus/ui";
import {
  type ComponentProps,
  type ComponentType,
  Fragment,
  type MouseEvent,
  type ReactNode,
  useState,
} from "react";
import { SHELL_COPY } from "./copy";
import { type Capabilities, navVisible } from "./nav-visibility";
import { useShellIfAny } from "./shell";

export type ShellNavItem = {
  id: string;
  label: string;
  href: string;
  /** Drawn in the rail, and alone in the tab bar (the label stays for assistive tech). */
  icon?: ReactNode;
  /** Right-aligned in the rail: a count, a Kbd. Not in the tab bar. */
  trailing?: ReactNode;
  /** Capabilities the row needs; it is hidden unless all are on. */
  requires?: readonly string[];
  /** Extra words the palette matches when the nav becomes a command set (navCommands). */
  keywords?: string[];
  /**
   * The id of the section the row belongs to (`ShellNavProps.sections`). The rail draws a
   * section's heading before its first visible row; rows keep the order they are given in.
   */
  section?: string;
};

/** A heading in the rail. A section with no visible row draws nothing. */
export type ShellNavSection = { id: string; label: string };

/**
 * What a row renders as instead of a plain `<a>`: a router's Link, so client navigation,
 * prefetch and modifier clicks stay the router's. It receives `href`, `className`,
 * `aria-current`, `title`, `onClick` and the children.
 */
export type ShellNavLink = ComponentType<ComponentProps<"a"> & { href: string }>;

export type ShellNavProps = {
  items: readonly ShellNavItem[];
  /** The current page's item id: aria-current="page". `activeNavId` finds it from a path. */
  activeId?: string;
  capabilities?: Capabilities;
  /** Section headings, by id, for the rail and the More sheet. */
  sections?: readonly ShellNavSection[];
  /** The head of the rail: the mark and app name. Not drawn in the tab bar. */
  brand?: ReactNode;
  /**
   * A click on a row, for a client-side router: call `event.preventDefault()` and navigate.
   * Without it (and without `link`) the rows are plain links.
   */
  onNavigate?: (item: ShellNavItem, event: MouseEvent<HTMLAnchorElement>) => void;
  /** Render rows as this component instead of `<a>`, e.g. a router's Link. */
  link?: ShellNavLink;
  /**
   * The most tabs the phone tab bar shows. With more visible rows, the bar shows the first
   * `tabLimit - 1` and a More tab that opens a sheet with the whole nav, sections included.
   * Default: no limit.
   */
  tabLimit?: number;
  /** The More tab's label; the default comes from SHELL_COPY. */
  moreLabel?: string;
};

/** The items the capabilities allow, in order. */
export function visibleNavItems(
  items: readonly ShellNavItem[],
  capabilities: Capabilities = {}
): ShellNavItem[] {
  return items.filter((item) => navVisible(item.requires, capabilities));
}

function pathOf(href: string): string {
  const path = href.split(/[?#]/)[0] ?? "";
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

/**
 * The id of the item whose href is the longest prefix of `pathname` on a segment boundary:
 * `/space/quiz/host` makes `/space/quiz` active, not `/space`, and `/space/quizzes` does not
 * match `/space/quiz`. Query and hash are ignored. Undefined when nothing matches.
 */
export function activeNavId(
  items: readonly Pick<ShellNavItem, "id" | "href">[],
  pathname: string
): string | undefined {
  const path = pathOf(pathname);
  let best: { id: string; length: number } | undefined;
  for (const item of items) {
    const href = pathOf(item.href);
    const hit =
      path === href || (path.startsWith(href) && (href.endsWith("/") || path[href.length] === "/"));
    if (hit && (best === undefined || href.length > best.length))
      best = { id: item.id, length: href.length };
  }
  return best?.id;
}

/** A section heading, ruled like the rows below it. */
const SECTION =
  "mt-(--hn-shell-nav-gap) flex min-h-8 items-end px-(--hn-shell-nav-pad) pt-2 pb-1 font-hn-mono text-[11px] text-hn-ink-muted uppercase tracking-wide";

/** The divider recipe under a cell: a width of 0 draws nothing. */
const DIVIDER = "border-0 border-b-(length:--hn-shell-nav-divider) border-hn-line-subtle";

type Click = (item: ShellNavItem) => ((e: MouseEvent<HTMLAnchorElement>) => void) | undefined;

function Rows({
  items,
  activeId,
  sections,
  link: Link,
  click,
}: {
  items: readonly ShellNavItem[];
  activeId?: string;
  sections?: readonly ShellNavSection[];
  link?: ShellNavLink;
  click: Click;
}) {
  const label = new Map(sections?.map((s) => [s.id, s.label]));
  return items.map((item, i) => {
    const heading =
      item.section !== undefined && item.section !== items[i - 1]?.section
        ? label.get(item.section)
        : undefined;
    const rail = {
      icon: item.icon,
      active: item.id === activeId,
      trailing: item.trailing,
      className: DIVIDER,
    };
    return (
      <Fragment key={item.id}>
        {heading !== undefined ? (
          <div data-shell-nav-section={item.section} className={cx(SECTION, DIVIDER)}>
            {heading}
          </div>
        ) : null}
        {Link ? (
          <RailItem asChild {...rail}>
            <Link href={item.href} onClick={click(item)}>
              {item.label}
            </Link>
          </RailItem>
        ) : (
          <RailItem href={item.href} onClick={click(item)} {...rail}>
            {item.label}
          </RailItem>
        )}
      </Fragment>
    );
  });
}

const TAB = cx(
  "flex min-h-hn-target min-w-0 items-center justify-center rounded-hn-md px-1 text-hn-ink-muted no-underline",
  "border-0 border-r-(length:--hn-shell-nav-divider) border-hn-line-subtle last:border-r-0",
  "hover:text-hn-ink-primary aria-[current=page]:bg-hn-nav-tab aria-[current=page]:text-hn-nav-tab-ink [&_svg]:size-5",
  focusRing
);

function TabFace({ icon, label }: { icon?: ReactNode; label: string }) {
  return icon ? (
    <>
      <span aria-hidden="true" className="flex">
        {icon}
      </span>
      <span className="sr-only">{label}</span>
    </>
  ) : (
    <span className="truncate font-medium text-xs">{label}</span>
  );
}

function MoreIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function ShellNav({
  items,
  activeId,
  capabilities,
  sections,
  brand,
  onNavigate,
  link: Link,
  tabLimit,
  moreLabel,
}: ShellNavProps) {
  const shell = useShellIfAny();
  const [moreOpen, setMoreOpen] = useState(false);
  const visible = visibleNavItems(items, capabilities);
  const click: Click = (item) =>
    onNavigate ? (e: MouseEvent<HTMLAnchorElement>) => onNavigate(item, e) : undefined;
  const overflow = tabLimit !== undefined && visible.length > tabLimit;
  const tabs = overflow ? visible.slice(0, Math.max(tabLimit - 1, 0)) : visible;
  const moreActive =
    overflow && activeId !== undefined && !tabs.some((item) => item.id === activeId);
  const more = moreLabel ?? SHELL_COPY[shell?.locale ?? "en"].more;
  // A row picked in the sheet closes it; the router then shows the page behind.
  const sheetClick: Click = (item) => (e) => {
    onNavigate?.(item, e);
    setMoreOpen(false);
  };

  return (
    <>
      <div
        data-shell-nav="rail"
        className="hidden h-full flex-col gap-(--hn-shell-nav-gap) p-(--hn-shell-nav-inset) @3xl:flex"
      >
        {brand ? (
          <div
            data-shell-nav="brand"
            className={cx(
              "mb-(--hn-shell-nav-inset) flex h-(--hn-shell-brand-row) shrink-0 items-center px-[calc(var(--hn-shell-nav-pad)-4px)]",
              DIVIDER
            )}
          >
            {brand}
          </div>
        ) : null}
        <Rows items={visible} activeId={activeId} sections={sections} link={Link} click={click} />
      </div>
      <div data-shell-nav="tabs" className="grid h-full auto-cols-fr grid-flow-col @3xl:hidden">
        {tabs.map((item) => {
          const tab = {
            href: item.href,
            onClick: click(item),
            "aria-current": item.id === activeId ? ("page" as const) : undefined,
            title: item.label,
            className: TAB,
          };
          return Link ? (
            <Link key={item.id} {...tab}>
              <TabFace icon={item.icon} label={item.label} />
            </Link>
          ) : (
            <a key={item.id} {...tab}>
              <TabFace icon={item.icon} label={item.label} />
            </a>
          );
        })}
        {overflow ? (
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              aria-current={moreActive ? "page" : undefined}
              title={more}
              onClick={() => setMoreOpen(true)}
              className={cx(TAB, "cursor-pointer bg-transparent")}
            >
              <TabFace icon={<MoreIcon />} label={more} />
            </button>
            <SheetContent
              side="bottom"
              locale={shell?.locale}
              container={shell?.portal}
              className="max-h-[80dvh]"
            >
              <SheetHeader>
                <SheetTitle>{more}</SheetTitle>
              </SheetHeader>
              <SheetBody>
                <div data-shell-nav="more" className="flex flex-col gap-(--hn-shell-nav-gap)">
                  <Rows
                    items={visible}
                    activeId={activeId}
                    sections={sections}
                    link={Link}
                    click={sheetClick}
                  />
                </div>
              </SheetBody>
            </SheetContent>
          </Sheet>
        ) : null}
      </div>
    </>
  );
}
