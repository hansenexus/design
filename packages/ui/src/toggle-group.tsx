import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { type ComponentProps, createContext, useContext } from "react";
import { cx, focusRing } from "./cx";
import { TOGGLE_STYLES, type ToggleSize, type ToggleVariant } from "./toggle";

type GroupLook = { variant: ToggleVariant; size: ToggleSize };
const LookContext = createContext<GroupLook>({ variant: "ghost", size: "md" });

export type ToggleGroupProps = ComponentProps<typeof ToggleGroupPrimitive.Root> & {
  variant?: ToggleVariant;
  size?: ToggleSize;
};

/**
 * A row of toggles on Radix ToggleGroup: `type="single"` keeps at most one on (a view switch),
 * `type="multiple"` any number (text styles). Tab enters the group, the arrow keys move inside it.
 * Name it with aria-label. Every item takes the group's variant and size.
 */
export function ToggleGroup({
  variant = "ghost",
  size = "md",
  className,
  children,
  ...props
}: ToggleGroupProps) {
  return (
    <ToggleGroupPrimitive.Root
      data-variant={variant}
      className={cx(
        "inline-flex items-center",
        variant === "outline" ? "[&>*:not(:first-child)]:-ml-px" : "gap-0.5",
        className
      )}
      {...props}
    >
      <LookContext.Provider value={{ variant, size }}>{children}</LookContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

export function ToggleGroupItem({
  className,
  ...props
}: ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  const { variant, size } = useContext(LookContext);
  return (
    <ToggleGroupPrimitive.Item
      className={cx(
        TOGGLE_STYLES.base,
        TOGGLE_STYLES.variant[variant],
        TOGGLE_STYLES.size[size],
        variant === "outline" &&
          "rounded-none first:rounded-l-hn-md last:rounded-r-hn-md focus-visible:z-10 data-[state=on]:z-[1]",
        focusRing,
        className
      )}
      {...props}
    />
  );
}
