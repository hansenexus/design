import { Select as SelectPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cx, focusRing } from "./cx";
import { CheckIcon, ChevronDownIcon } from "./icons";

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cx(
        "inline-flex h-9 min-h-hn-target w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-hn-md border border-hn-line-strong bg-hn-surface-card px-3 font-hn-sans text-sm text-hn-ink-primary",
        "data-placeholder:text-hn-ink-muted disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-hn-status-crit",
        "[&>span]:truncate",
        focusRing,
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="shrink-0 text-hn-ink-muted" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export type SelectContentProps = ComponentProps<typeof SelectPrimitive.Content> & {
  /** Portal target; defaults to document.body. */
  container?: HTMLElement | null;
};

export function SelectContent({
  className,
  children,
  position = "popper",
  sideOffset = 6,
  container,
  ...props
}: SelectContentProps) {
  return (
    <SelectPrimitive.Portal container={container}>
      <SelectPrimitive.Content
        position={position}
        sideOffset={position === "popper" ? sideOffset : undefined}
        className={cx(
          "z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-hidden rounded-hn-lg border border-hn-line-strong bg-hn-surface-card font-hn-sans shadow-hn-lift",
          className
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="flex flex-col gap-px p-1">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cx(
        "relative flex h-8 min-h-hn-target cursor-pointer items-center rounded-hn-sm pr-8 pl-2.5 text-sm text-hn-ink-body outline-none select-none",
        "data-highlighted:bg-hn-surface-raised data-highlighted:text-hn-ink-primary data-[state=checked]:text-hn-ink-primary",
        "data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className="absolute right-2.5 flex size-4 items-center justify-center text-hn-action-text">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  );
}

export function SelectLabel({ className, ...props }: ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      className={cx(
        "px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-[0.06em] text-hn-ink-muted uppercase",
        className
      )}
      {...props}
    />
  );
}

export function SelectSeparator({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      className={cx("-mx-1 my-1 h-px bg-hn-line-subtle", className)}
      {...props}
    />
  );
}
