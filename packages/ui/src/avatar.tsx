import { Avatar as AvatarPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cx } from "./cx";
import { LAYOUT_COPY } from "./layout-copy";
import { Skeleton } from "./skeleton";
import type { StateLocale } from "./state-copy";

export type AvatarSize = "sm" | "md" | "lg";

export const AVATAR_SIZES: readonly AvatarSize[] = ["sm", "md", "lg"];

const PX: Record<AvatarSize, number> = { sm: 24, md: 32, lg: 48 };

const TEXT: Record<AvatarSize, string> = {
  sm: "text-[10px]",
  md: "text-[12.5px]",
  lg: "text-base",
};

/** Up to two initials: first and last word ("Ada Lovelace" → "AL"), one for a single word. */
export function initials(name: string): string {
  const words = name
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return (first + last).toLocaleUpperCase();
}

export type AvatarProps = Omit<ComponentProps<typeof AvatarPrimitive.Root>, "children"> & {
  /** The person or thing; the accessible name and the source of the initials. */
  name: string;
  /** Image URL. Until it loads, and if it fails, the initials show. */
  src?: string;
  size?: AvatarSize;
  /** The record behind the avatar is still loading: a circle skeleton, aria-busy. */
  loading?: boolean;
  /** Wait this long before the initials replace a loading image, so fast images never flash them. */
  fallbackDelayMs?: number;
  /** Language of the loading label. */
  locale?: StateLocale;
};

/**
 * A round picture of a person or machine. The image, else the initials on surface.raised; a
 * circle skeleton while the record loads. The root is the one named element (role=img), so a
 * screen reader hears the name once whichever of the three shows.
 */
export function Avatar({
  name,
  src,
  size = "md",
  loading = false,
  fallbackDelayMs,
  locale = "en",
  className,
  style,
  ...props
}: AvatarProps) {
  const px = PX[size];
  if (loading) {
    return (
      <span
        role="img"
        aria-busy="true"
        aria-label={LAYOUT_COPY[locale].loading}
        data-state="loading"
        className={cx("inline-flex shrink-0", className)}
        style={style}
      >
        <Skeleton shape="circle" width={px} />
      </span>
    );
  }
  return (
    <AvatarPrimitive.Root
      role="img"
      aria-label={name}
      data-size={size}
      className={cx(
        "relative inline-flex shrink-0 overflow-hidden rounded-full bg-hn-surface-raised align-middle",
        className
      )}
      style={{ width: px, height: px, ...style }}
      {...props}
    >
      {src ? <AvatarPrimitive.Image src={src} alt="" className="size-full object-cover" /> : null}
      <AvatarPrimitive.Fallback
        aria-hidden="true"
        delayMs={src ? fallbackDelayMs : undefined}
        className={cx(
          "flex size-full items-center justify-center font-hn-sans font-semibold text-hn-ink-body select-none",
          TEXT[size]
        )}
      >
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
