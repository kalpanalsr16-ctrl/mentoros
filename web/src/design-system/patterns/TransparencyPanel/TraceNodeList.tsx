import { AgentTraceNode } from "@/design-system/patterns/AgentTraceNode";
import { EvaluationScoreCard } from "@/design-system/patterns/EvaluationScoreCard";
import type { AgentNodeView } from "@/lib/observability/transparency-provider";

/**
 * The pipeline-node rendering shared between the chat-integrated
 * TransparencyPanel (Epic E4) and Architecture Explorer's full-page trace
 * detail view (Epic E6) -- extracted so E6 reuses E3's actual components
 * exactly, per 13_Implementation_Sequence.md's "Full-page reuse of E3/E4's
 * components," rather than a second copy of this same agent -> card
 * mapping.
 */
export function TraceNodeList({ nodes }: { nodes: AgentNodeView[] }) {
  return (
    <>
      {nodes.map((node) =>
        node.agent === "Evaluation" ? (
          <EvaluationScoreCard key={node.agent} node={node} />
        ) : (
          <AgentTraceNode key={node.agent} node={node} />
        ),
      )}
    </>
  );
}
