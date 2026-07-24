/** Shared between TransparencyPanel (Epic E4) and Architecture Explorer (Epic E6) so both format cost/latency identically. */
export function formatCostUsd(costUsd: number): string {
  return costUsd < 0.001 ? "<$0.001" : `$${costUsd.toFixed(3)}`;
}

export function formatLatencyMs(latencyMs: number): string {
  return `${(latencyMs / 1000).toFixed(1)}s`;
}
