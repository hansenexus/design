import { DropdownMenu as MenuPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cx } from "./cx";
import { CheckIcon, ChevronRightIcon } from "./icons";

export const Menu = MenuPrimitive.Root;
export const MenuTrigger = MenuPrimitive.Trigger;
export const MenuGroup = MenuPrimitive.Group;
export const MenuSub = MenuPrimitive.Sub;
export const MenuRadioGroup = MenuPrimitive.RadioGroup;

/**
 * The menu look, shared with ContextMenu so both menus stay one surface: `content` for the
 * popup and a sub-menu, `item` for every row, `label`, `separator` and `indicator` (the slot a
 * check or a radio dot sits in).
 */
export const MENU_STYLES = {
  content:
    "z-50 flex min-w-44 flex-col gap-px overflow-hidden rounded-hn-lg border border-hn-line-strong bg-hn-surface-card p-1 font-hn-sans shadow-hn-lift",
  item:
    "relative flex h-8 min-h-hn-target cursor-pointer items-center gap-2.5 rounded-hn-sm px-2.5 text-sm text-hn-ink-body outline-none select-none " +
    "data-highlighted:bg-hn-surface-raised data-highlighted:text-hn-ink-primary " +
    "data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  danger: "text-hn-status-crit data-highlighted:text-hn-status-crit",
  subTrigger: "data-[state=open]:bg-hn-surface-raised data-[state=open]:text-hn-ink-primary",
  indicator: "absolute left-2.5 flex size-4 items-center justify-center text-hn-action-text",
  radioDot: "block size-2 rounded-hn-pill bg-hn-action-text",
  label: "px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-[0.06em] text-hn-ink-muted uppercase",
  separator: "-mx-1 my-1 h-px bg-hn-line-subtle",
} as const;

export type MenuContentProps = ComponentProps<typeof MenuPrimitive.Content> & {
  /** Portal target; defaults to document.body. */
  container?: HTMLElement | null;
};

export function MenuContent({ className, sideOffset = 6, container, ...props }: MenuContentProps) {
  return (
    <MenuPrimitive.Portal container={container}>
      <MenuPrimitive.Content
        sideOffset={sideOffset}
        className={cx(MENU_STYLES.content, className)}
        {...props}
      />
    </MenuPrimitive.Portal>
  );
}

export type MenuItemProps = ComponentProps<typeof MenuPrimitive.Item> & {
  /** danger: a destructive act, label in status.crit. */
  variant?: "default" | "danger";
};

export function MenuItem({ variant = "default", className, ...props }: MenuItemProps) {
  return (
    <MenuPrimitive.Item
      data-variant={variant}
      className={cx(MENU_STYLES.item, variant === "danger" && MENU_STYLES.danger, className)}
      {...props}
    />
  );
}

export function MenuCheckboxItem({
  className,
  children,
  ...props
}: ComponentProps<typeof MenuPrimitive.CheckboxItem>) {
  return (
    <MenuPrimitive.CheckboxItem className={cx(MENU_STYLES.item, "pl-8", className)} {...props}>
      <span className={MENU_STYLES.indicator}>
        <MenuPrimitive.ItemIndicator>
          <CheckIcon />
        </MenuPrimitive.ItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}

/** One choice of a MenuRadioGroup: the checked one carries a lime dot. */
export function MenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof MenuPrimitive.RadioItem>) {
  return (
    <MenuPrimitive.RadioItem className={cx(MENU_STYLES.item, "pl-8", className)} {...props}>
      <span className={MENU_STYLES.indicator}>
        <MenuPrimitive.ItemIndicator>
          <span className={MENU_STYLES.radioDot} />
        </MenuPrimitive.ItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  );
}

/** The row that opens a MenuSub: ArrowRight or hover opens it, a chevron marks it. */
export function MenuSubTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof MenuPrimitive.SubTrigger>) {
  return (
    <MenuPrimitive.SubTrigger
      className={cx(MENU_STYLES.item, MENU_STYLES.subTrigger, className)}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto text-hn-ink-muted" />
    </MenuPrimitive.SubTrigger>
  );
}

export type MenuSubContentProps = ComponentProps<typeof MenuPrimitive.SubContent> & {
  /** Portal target; defaults to document.body. */
  container?: HTMLElement | null;
};

/** The sub-menu's popup, beside its trigger; ArrowLeft or Escape closes it. */
export function MenuSubContent({
  className,
  sideOffset = 4,
  alignOffset = -5,
  container,
  ...props
}: MenuSubContentProps) {
  return (
    <MenuPrimitive.Portal container={container}>
      <MenuPrimitive.SubContent
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        className={cx(MENU_STYLES.content, className)}
        {...props}
      />
    </MenuPrimitive.Portal>
  );
}

export function MenuLabel({ className, ...props }: ComponentProps<typeof MenuPrimitive.Label>) {
  return <MenuPrimitive.Label className={cx(MENU_STYLES.label, className)} {...props} />;
}

export function MenuSeparator({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Separator>) {
  return <MenuPrimitive.Separator className={cx(MENU_STYLES.separator, className)} {...props} />;
}

/** A right-aligned shortcut hint inside a MenuItem. */
export function MenuShortcut({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cx("ml-auto pl-4 font-hn-mono text-[11.5px] text-hn-ink-muted", className)}
      {...props}
    />
  );
}
