import { Tabs as TabsPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cx, focusRing } from "./cx";

export function Tabs({ className, ...props }: ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root className={cx("flex flex-col gap-4", className)} {...props} />;
}

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cx(
        "flex items-center gap-1 overflow-x-auto border-b border-hn-line-subtle font-hn-sans",
        className
      )}
      {...props}
    />
  );
}

/** Active tab: ink.primary with a 2 px action.text underline, so it never relies on colour alone. */
export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cx(
        "-mb-px inline-flex h-9 min-h-hn-target cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 text-sm font-medium text-hn-ink-muted",
        "hover:text-hn-ink-primary data-[state=active]:border-hn-action-text data-[state=active]:font-semibold data-[state=active]:text-hn-ink-primary",
        "disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
        "transition-colors duration-(--hn-duration-fast) motion-reduce:transition-none",
        focusRing,
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cx("font-hn-sans", focusRing, className)} {...props} />;
}
