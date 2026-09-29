// The nav slot's content: RailItems in a column from 768 px of shell width, a bottom tab bar
// below. Both come from one list, filtered by the app's capabilities (navVisible), so a row the
// context cannot reach is in neither.
import { cx, focusRing, RailItem } from "@hansenexus/ui";
import type { MouseEvent, ReactNode } from "react";
import { type Capabilities, navVisible } from "./nav-visibility";

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
};

export type ShellNavProps = {
  items: readonly ShellNavItem[];
  /** The current page's item id: aria-current="page". */
  activeId?: string;
  capabilities?: Capabilities;
  /** The head of the rail: the mark and app name. Not drawn in the tab bar. */
  brand?: ReactNode;
  /**
   * A click on a row, for a client-side router: call `event.preventDefault()` and navigate.
   * Without it the rows are plain links.
   */
  onNavigate?: (item: ShellNavItem, event: MouseEvent<HTMLAnchorElement>) => void;
};

/** The items the capabilities allow, in order. */
export function visibleNavItems(
  items: readonly ShellNavItem[],
  capabilities: Capabilities = {}
): ShellNavItem[] {
  return items.filter((item) => navVisible(item.requires, capabilities));
}

export function ShellNav({ items, activeId, capabilities, brand, onNavigate }: ShellNavProps) {
  const visible = visibleNavItems(items, capabilities);
  const click = (item: ShellNavItem) =>
    onNavigate ? (e: MouseEvent<HTMLAnchorElement>) => onNavigate(item, e) : undefined;
  return (
    <>
      <div data-shell-nav="rail" className="hidden h-full flex-col gap-1 p-3 @3xl:flex">
        {brand ? <div className="mb-3 flex h-8 shrink-0 items-center px-2">{brand}</div> : null}
        {visible.map((item) => (
          <RailItem
            key={item.id}
            href={item.href}
            onClick={click(item)}
            icon={item.icon}
            active={item.id === activeId}
            trailing={item.trailing}
          >
            {item.label}
          </RailItem>
        ))}
      </div>
      <div data-shell-nav="tabs" className="grid h-full auto-cols-fr grid-flow-col @3xl:hidden">
        {visible.map((item) => (
          <a
            key={item.id}
            href={item.href}
            onClick={click(item)}
            aria-current={item.id === activeId ? "page" : undefined}
            title={item.label}
            className={cx(
              "flex min-h-hn-target min-w-0 items-center justify-center rounded-hn-md px-1 text-hn-ink-muted no-underline",
              "hover:text-hn-ink-primary aria-[current=page]:text-hn-action-text [&_svg]:size-5",
              focusRing
            )}
          >
            {item.icon ? (
              <>
                <span aria-hidden="true" className="flex">
                  {item.icon}
                </span>
                <span className="sr-only">{item.label}</span>
              </>
            ) : (
              <span className="truncate text-xs font-medium">{item.label}</span>
            )}
          </a>
        ))}
      </div>
    </>
  );
}
