import type { ThemePackDefinition } from "@hansenexus/ui";

/**
 * B2 Ledger, lexilink's default direction: data-theme="lexilink". Recipes only, no skins.
 * @hansenexus/tokens still bundles these tokens (tokens.css) until lexilink adopts this package.
 */
export const lexilink: ThemePackDefinition = { id: "lexilink" };

/** Every direction of the pack, the default first. */
export const directions: readonly ThemePackDefinition[] = [lexilink];
