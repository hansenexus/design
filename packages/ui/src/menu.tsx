import { DropdownMenu as MenuPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cx } from "./cx";
import { CheckIcon } from "./icons";

export const Menu = MenuPrimitive.Root;
export const MenuTrigger = MenuPrimitive.Trigger;
export const MenuGroup = MenuPrimitive.Group;

export type MenuContentProps = ComponentProps<typeof MenuPrimitive.Content> & {
  /** Portal target; defaults to document.body. */
  container?: HTMLElement | null;
};

export function MenuContent({ className, sideOffset = 6, container, ...props }: MenuContentProps) {
  return (
    <MenuPrimitive.Portal container={container}>
      <MenuPrimitive.Content
        sideOffset={sideOffset}
        className={cx(
          "z-50 flex min-w-44 flex-col gap-px overflow-hidden rounded-hn-lg border border-hn-line-strong bg-hn-surface-card p-1 font-hn-sans shadow-hn-lift",
          className
        )}
        {...props}
      />
    </MenuPrimitive.Portal>
  );
}

const ITEM =
  "relative flex h-8 min-h-hn-target cursor-pointer items-center gap-2.5 rounded-hn-sm px-2.5 text-sm text-hn-ink-body outline-none select-none " +
  "data-highlighted:bg-hn-surface-raised data-highlighted:text-hn-ink-primary " +
  "data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

export type MenuItemProps = ComponentProps<typeof MenuPrimitive.Item> & {
  /** danger: a destructive act, label in status.crit. */
  variant?: "default" | "danger";
};

export function MenuItem({ variant = "default", className, ...props }: MenuItemProps) {
  return (
    <MenuPrimitive.Item
      data-variant={variant}
      className={cx(
        ITEM,
        variant === "danger" && "text-hn-status-crit data-highlighted:text-hn-status-crit",
        className
      )}
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
    <MenuPrimitive.CheckboxItem className={cx(ITEM, "pl-8", className)} {...props}>
      <span className="absolute left-2.5 flex size-4 items-center justify-center text-hn-action-text">
        <MenuPrimitive.ItemIndicator>
          <CheckIcon />
        </MenuPrimitive.ItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}

export function MenuLabel({ className, ...props }: ComponentProps<typeof MenuPrimitive.Label>) {
  return (
    <MenuPrimitive.Label
      className={cx(
        "px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-[0.06em] text-hn-ink-muted uppercase",
        className
      )}
      {...props}
    />
  );
}

export function MenuSeparator({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Separator>) {
  return (
    <MenuPrimitive.Separator
      className={cx("-mx-1 my-1 h-px bg-hn-line-subtle", className)}
      {...props}
    />
  );
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
