/**
 * `@hansenexus/ui/chart` (design#179): the Recharts half of the chart base, shadcn's
 * ChartTooltip and ChartLegend. It is its own entry so the core never loads Recharts: an app
 * without charts pays nothing, and an app with charts adds `recharts` (an optional peer, v3).
 * Not a registry item: a copied-in chart imports Tooltip and Legend from recharts directly.
 *
 * ChartContainer, ChartTooltipContent, ChartLegendContent and ChartConfig come from the core
 * (`@hansenexus/ui`), and only from there, so the container and its contents share one context.
 *
 * ```tsx
 * import { ChartContainer, ChartLegendContent, ChartTooltipContent, chartColor } from "@hansenexus/ui";
 * import { ChartTooltip } from "@hansenexus/ui/chart";
 *
 * <ChartContainer config={config}>
 *   <ResponsiveContainer height={200}>
 *     <BarChart data={rows}>
 *       <ChartTooltip content={<ChartTooltipContent unit="h" />} />
 *       <Bar dataKey="carpentry" fill={chartColor("carpentry")} />
 *     </BarChart>
 *   </ResponsiveContainer>
 *   <ChartLegendContent />
 * </ChartContainer>
 * ```
 */
export { Legend as ChartLegend, Tooltip as ChartTooltip } from "recharts";
