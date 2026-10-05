"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, type BadgeVariant } from "@/design-system/primitives/Badge";
import {
  ARCHITECTURE_DECISIONS,
  ARCHITECTURE_NODES,
  CLAIMS_NOT_MADE,
  type ArchitectureNode,
  type NodeStatus,
} from "@/lib/showcase/architecture/architecture-model";
import styles from "./ArchitectureExplorer.module.css";

const CORE_ORDER = [
  "student-turn",
  "safety",
  "context",
  "router",
  "planning",
  "knowledge",
  "teaching",
  "reflection",
  "memory",
  "evaluation",
  "reply",
];
const ENTER_ORDER = ["mic", "stt", "student-turn-voice"];
const EXIT_ORDER = ["speech", "avatar"];

const STATUS_LABEL: Record<NodeStatus, string> = {
  implemented: "Implemented",
  conditional: "Conditional",
  external_provider: "External provider",
  deferred: "Deferred",
};
const STATUS_VARIANT: Record<NodeStatus, BadgeVariant> = {
  implemented: "success",
  conditional: "brand",
  external_provider: "neutral",
  deferred: "warning",
};

const byId = (id: string): ArchitectureNode => {
  const node = ARCHITECTURE_NODES.find((n) => n.id === id);
  if (!node) throw new Error(`Unknown architecture node: ${id}`);
  return node;
};

export function ArchitectureExplorer() {
  const [selectedId, setSelectedId] = useState("safety");
  const selected = byId(selectedId);

  return (
    <div className={styles.explorer}>
      <div className={styles.legend} aria-label="Status legend">
        <Badge variant="success">Implemented</Badge>
        <Badge variant="brand">Conditional: runs on some turns</Badge>
        <Badge variant="neutral">External provider</Badge>
        <span className={styles.legendNote}>Badges on each step show what is measured and stored.</span>
      </div>

      <div className={styles.layout}>
        <div className={styles.map}>
          <section className={styles.lane} aria-labelledby="core-lane">
            <h2 id="core-lane" className={styles.laneTitle}>
              Core tutoring path <span className={styles.laneSub}>MentorOS intelligence</span>
            </h2>
            <ol className={styles.flow}>
              {CORE_ORDER.map((id, i) => (
                <li key={id} className={styles.flowItem}>
                  <NodeButton node={byId(id)} selected={selectedId === id} onSelect={setSelectedId} />
                  {i < CORE_ORDER.length - 1 && <span className={styles.arrow} aria-hidden="true">→</span>}
                </li>
              ))}
            </ol>
            <p className={styles.persisted}>
              Stages with events write them to the event log, which the <Link href="/showcase/flight-recorder">Flight Recorder</Link> reads.
            </p>
          </section>

          <section className={styles.laneVoice} aria-labelledby="voice-lane">
            <h2 id="voice-lane" className={styles.laneTitle}>
              Voice interface <span className={styles.laneSub}>same pipeline, different input and output</span>
            </h2>
            <div className={styles.voiceRow}>
              <p className={styles.direction}>Enters at Student turn</p>
              <ol className={styles.flow}>
                {ENTER_ORDER.map((id, i) => (
                  <li key={id} className={styles.flowItem}>
                    <NodeButton node={byId(id)} selected={selectedId === id} onSelect={setSelectedId} />
                    {i < ENTER_ORDER.length - 1 && <span className={styles.arrow} aria-hidden="true">→</span>}
                  </li>
                ))}
              </ol>
            </div>
            <div className={styles.voiceRow}>
              <p className={styles.direction}>Exits from Reply</p>
              <ol className={styles.flow}>
                {EXIT_ORDER.map((id, i) => (
                  <li key={id} className={styles.flowItem}>
                    <NodeButton node={byId(id)} selected={selectedId === id} onSelect={setSelectedId} />
                    {i < EXIT_ORDER.length - 1 && <span className={styles.arrow} aria-hidden="true">→</span>}
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>

        <aside className={styles.detail} aria-live="polite" aria-label="Selected component">
          <NodeDetail node={selected} />
        </aside>
      </div>

      <section className={styles.section} aria-labelledby="decisions-heading">
        <h2 id="decisions-heading" className={styles.sectionHeading}>
          Architecture decisions
        </h2>
        <p className={styles.muted}>
          Only decisions with a written rationale in the repository are shown. Where the structure is verified but the reason is not recorded, the card says so.
        </p>
        <ul className={styles.decisions}>
          {ARCHITECTURE_DECISIONS.map((d) => (
            <li key={d.id} id={d.id} className={styles.decision}>
              <h3 className={styles.decisionTitle}>{d.decision}</h3>
              {d.rationale === "open" && <Badge variant="warning">Rationale not recorded</Badge>}
              <dl className={styles.decisionFacts}>
                <dt>Why</dt>
                <dd>{d.why}</dd>
                <dt>Trade-off</dt>
                <dd>{d.tradeOff}</dd>
                <dt>Source</dt>
                <dd className={styles.sources}>{d.sources.map((src) => src.split("/").pop()).join(" · ")}</dd>
              </dl>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="claims-heading">
        <h2 id="claims-heading" className={styles.sectionHeading}>
          Claims this map does not make
        </h2>
        <ul className={styles.claims}>
          {CLAIMS_NOT_MADE.map((claim) => (
            <li key={claim}>{claim}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function NodeButton({
  node,
  selected,
  onSelect,
}: {
  node: ArchitectureNode;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className={selected ? styles.nodeSelected : styles.node}
      aria-pressed={selected}
      onClick={() => onSelect(node.id)}
    >
      <span className={styles.nodeTitle}>{node.title}</span>
      <span className={styles.nodeMeta}>
        <Badge variant={STATUS_VARIANT[node.status]}>{STATUS_LABEL[node.status]}</Badge>
        {node.provider && <span className={styles.provider}>{node.provider}</span>}
      </span>
    </button>
  );
}

function NodeDetail({ node }: { node: ArchitectureNode }) {
  return (
    <div className={styles.detailInner}>
      <p className={styles.detailLabel}>{node.lane === "core" ? "Core tutoring path" : "Voice interface"}</p>
      <h2 className={styles.detailTitle}>{node.title}</h2>
      <div className={styles.badgeRow}>
        <Badge variant={STATUS_VARIANT[node.status]}>{STATUS_LABEL[node.status]}</Badge>
        {node.measured ? <Badge variant="success">Measured</Badge> : <Badge variant="neutral">Not timed on its own</Badge>}
        {node.persisted && <Badge variant="neutral">Persisted</Badge>}
      </div>
      {node.when && <p className={styles.when}>When: {node.when}</p>}

      <DetailRow label="Responsibility" value={node.responsibility} />
      <DetailRow label="Input" value={node.input} />
      <DetailRow label="Output" value={node.output} />
      <DetailRow label="Dependencies" value={node.dependencies.join(", ")} />
      <DetailRow label="Failure and degradation" value={node.failure} />
      <DetailRow label="Observability" value={node.observability} />
      {node.persisted && <DetailRow label="Persisted state" value={node.persisted} />}

      <div className={styles.detailBlock}>
        <p className={styles.detailKey}>Events written</p>
        {node.events.length === 0 ? (
          <p className={styles.muted}>None. This stage has no event of its own.</p>
        ) : (
          <ul className={styles.eventList}>
            {node.events.map((e) => (
              <li key={e}>
                <code>{e}</code>
              </li>
            ))}
          </ul>
        )}
      </div>

      {node.decisionId && (
        <p className={styles.decisionLink}>
          Design decision: <a href={`#${node.decisionId}`}>see the decision below</a>
        </p>
      )}

      {node.events.length > 0 && (
        <Link href="/showcase/flight-recorder" className={styles.traceLink}>
          View in Flight Recorder
        </Link>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.detailBlock}>
      <p className={styles.detailKey}>{label}</p>
      <p className={styles.detailValue}>{value}</p>
    </div>
  );
}
