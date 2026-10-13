import { ContextMenu as ContextMenuPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cx } from "./cx";
import { CheckIcon, ChevronRightIcon } from "./icons";
import { MENU_STYLES } from "./menu";

export const ContextMenu = ContextMenuPrimitive.Root;
export const ContextMenuGroup = ContextMenuPrimitive.Group;
export const ContextMenuSub = ContextMenuPrimitive.Sub;
export const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

/**
 * The area that opens the menu on a right click, a long press or Shift+F10 / the context-menu
 * key. Wrap an element with `asChild`, or give the area a size of its own.
 */
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;

export type ContextMenuContentProps = ComponentProps<typeof ContextMenuPrimitive.Content> & {
  /** Portal target; defaults to document.body. */
  container?: HTMLElement | null;
};

/** The menu at the pointer: the same surface, rows and keys as Menu. */
export function ContextMenuContent({ className, container, ...props }: ContextMenuContentProps) {
  return (
    <ContextMenuPrimitive.Portal container={container}>
      <ContextMenuPrimitive.Content className={cx(MENU_STYLES.content, className)} {...props} />
    </ContextMenuPrimitive.Portal>
  );
}

export type ContextMenuItemProps = ComponentProps<typeof ContextMenuPrimitive.Item> & {
  /** danger: a destructive act, label in status.crit. */
  variant?: "default" | "danger";
};

export function ContextMenuItem({
  variant = "default",
  className,
  ...props
}: ContextMenuItemProps) {
  return (
    <ContextMenuPrimitive.Item
      data-variant={variant}
      className={cx(MENU_STYLES.item, variant === "danger" && MENU_STYLES.danger, className)}
      {...props}
    />
  );
}

export function ContextMenuCheckboxItem({
  className,
  children,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      className={cx(MENU_STYLES.item, "pl-8", className)}
      {...props}
    >
      <span className={MENU_STYLES.indicator}>
        <ContextMenuPrimitive.ItemIndicator>
          <CheckIcon />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
}

/** One choice of a ContextMenuRadioGroup: the checked one carries a lime dot. */
export function ContextMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.RadioItem>) {
  return (
    <ContextMenuPrimitive.RadioItem className={cx(MENU_STYLES.item, "pl-8", className)} {...props}>
      <span className={MENU_STYLES.indicator}>
        <ContextMenuPrimitive.ItemIndicator>
          <span className={MENU_STYLES.radioDot} />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
}

/** The row that opens a ContextMenuSub: ArrowRight or hover opens it, a chevron marks it. */
export function ContextMenuSubTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.SubTrigger>) {
  return (
    <ContextMenuPrimitive.SubTrigger
      className={cx(MENU_STYLES.item, MENU_STYLES.subTrigger, className)}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto text-hn-ink-muted" />
    </ContextMenuPrimitive.SubTrigger>
  );
}

export type ContextMenuSubContentProps = ComponentProps<typeof ContextMenuPrimitive.SubContent> & {
  /** Portal target; defaults to document.body. */
  container?: HTMLElement | null;
};

/** The sub-menu's popup, beside its trigger; ArrowLeft or Escape closes it. */
export function ContextMenuSubContent({
  className,
  sideOffset = 4,
  alignOffset = -5,
  container,
  ...props
}: ContextMenuSubContentProps) {
  return (
    <ContextMenuPrimitive.Portal container={container}>
      <ContextMenuPrimitive.SubContent
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        className={cx(MENU_STYLES.content, className)}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
}

export function ContextMenuLabel({
  className,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.Label>) {
  return <ContextMenuPrimitive.Label className={cx(MENU_STYLES.label, className)} {...props} />;
}

export function ContextMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return (
    <ContextMenuPrimitive.Separator className={cx(MENU_STYLES.separator, className)} {...props} />
  );
}

/** A right-aligned shortcut hint inside a ContextMenuItem. */
export function ContextMenuShortcut({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cx("ml-auto pl-4 font-hn-mono text-[11.5px] text-hn-ink-muted", className)}
      {...props}
    />
  );
}
