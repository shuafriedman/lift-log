/** Chart chrome shared by every graph on the Progress tab, so they match. */

export const chartTooltipStyle = {
  cursor: { fill: "rgba(255,255,255,0.04)" },
  contentStyle: {
    background: "rgba(10, 10, 10, 0.95)",
    border: "1px solid rgba(45, 212, 191, 0.3)",
    borderRadius: "12px",
    fontSize: "13px",
  },
  labelStyle: { color: "#fff" },
} as const;

/** "12 Aug" — short enough that a phone fits six of them on an axis. */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function fullDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatKg(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${Math.round(value * 10) / 10} kg`;
}

/** Tonnage runs to five digits fast; 12,400 kg reads better as 12.4t. */
export function formatVolume(kg: number): string {
  if (kg >= 10000) return `${Math.round(kg / 100) / 10}t`;
  return `${Math.round(kg).toLocaleString()} kg`;
}

/**
 * Axis ticks, shortened so they fit. A 6,446 kg tick needs ~48px of gutter on a
 * 360px screen; "6.4k" needs half that, and the axis title carries the unit.
 */
export function compactTick(value: number): string {
  if (Math.abs(value) >= 1000) {
    const k = value / 1000;
    return `${Math.abs(k) >= 10 ? Math.round(k) : Math.round(k * 10) / 10}k`;
  }
  // A three-digit load plus a decimal ("127.5") overruns the gutter and gets
  // clipped to "27.5", which reads as a real number. Drop the decimal instead.
  if (Math.abs(value) >= 100) return `${Math.round(value)}`;
  return `${Math.round(value * 10) / 10}`;
}

/**
 * A padded axis domain snapped to whole numbers.
 *
 * Recharts' string form ("dataMin - 2") happily yields ticks like 83.9, which
 * needs a wider gutter than a phone can spare and gets clipped to "3.9" — a
 * plausible-looking wrong number. Integers keep every tick two or three chars.
 */
export function paddedIntDomain(pad: number) {
  return [
    (dataMin: number) => Math.floor(dataMin - pad),
    (dataMax: number) => Math.ceil(dataMax + pad),
  ] as const;
}
