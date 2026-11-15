import { cx, type Skin } from "@hansenexus/ui";
import { Brace } from "./_brace";

/**
 * Gefache, not cards: a card's head is fachwerk's PanelHead, a brace cell at the left and the
 * title stack beside it, on a beam. Replaces Base, whose padding assumes no cell.
 */
export const CardHeader: Skin<"card.header"> = ({
  Base: _replaced,
  className,
  children,
  ...props
}) => (
  <div className={cx("flex items-stretch border-b border-hn-line-subtle", className)} {...props}>
    <Brace className="w-11 border-r border-hn-line-subtle" />
    <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4 py-2">{children}</div>
  </div>
);
