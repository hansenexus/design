// The nav slot's content: RailItems in a column, the same in the column from 768 px of shell
// width and in the drawer below (design#239, the owner's M2; 0.2's bottom tab bar is gone). The
// rows come from one list, filtered by the app's capabilities (navVisible), so a row the context
// cannot reach is in neither the nav nor the palette.
import { cx, RailItem } from "@hansenexus/ui";
import {
  type ComponentProps,
  type ComponentType,
  Fragment,
  type MouseEvent,
  type ReactNode,
} from "react";
import { type Capabilities, navVisible } from "./nav-visibility";
import { useShellIfAny } from "./shell";

export type ShellNavItem = {
  id: string;
  label: string;
  href: string;
  /** Drawn before the label. */
  icon?: ReactNode;
  /** Right-aligned in the row: a count, a Kbd. */
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
  /** Section headings, by id. */
  sections?: readonly ShellNavSection[];
  /** The head of the rail: the mark and app name. */
  brand?: ReactNode;
  /**
   * A click on a row, for a client-side router: call `event.preventDefault()` and navigate.
   * Without it (and without `link`) the rows are plain links. A row picked in the drawer also
   * closes the drawer.
   */
  onNavigate?: (item: ShellNavItem, event: MouseEvent<HTMLAnchorElement>) => void;
  /** Render rows as this component instead of `<a>`, e.g. a router's Link. */
  link?: ShellNavLink;
  /** @deprecated 0.2's phone tab bar; the 0.3 shell has a drawer instead. Ignored. */
  tabLimit?: number;
  /** @deprecated 0.2's More tab; ignored. */
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

/**
 * The app's navigation as a rail: the brand, then the rows in their sections. The shell draws it
 * in the nav column from 768 px of shell width and in the drawer below.
 */
export function ShellNav({
  items,
  activeId,
  capabilities,
  sections,
  brand,
  onNavigate,
  link: Link,
}: ShellNavProps) {
  const shell = useShellIfAny();
  const visible = visibleNavItems(items, capabilities);
  // A row picked in the drawer closes it; the router then shows the page behind. In the column
  // the drawer is closed already, so closing it again changes nothing.
  const click: Click = (item) =>
    onNavigate || shell?.hasNav
      ? (e: MouseEvent<HTMLAnchorElement>) => {
          onNavigate?.(item, e);
          shell?.setNavOpen(false);
        }
      : undefined;

  return (
    <div
      data-shell-nav="rail"
      className="flex h-full flex-col gap-(--hn-shell-nav-gap) p-(--hn-shell-nav-inset)"
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
  );
}
