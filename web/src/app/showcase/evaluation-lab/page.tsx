import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEvaluationLab } from "@/lib/evaluation-lab/get-evaluation-lab";
import { GOLDEN_EVAL_SET } from "@/lib/evaluation-lab/golden-eval-set";
import {
  formatUtc,
  qualityOutcomeLabel,
  routingOutcomeLabel,
  runStatusLabel,
  type OutcomeLabel,
} from "@/lib/evaluation-lab/evaluation-lab-presentation";
import type { LabCase, LabRunRow, MeanWithSample, OutcomeCounts } from "@/lib/evaluation-lab/evaluation-lab-aggregation";
import { Badge, type BadgeVariant } from "@/design-system/primitives/Badge";
import { Card } from "@/design-system/primitives/Card";
import styles from "./page.module.css";

const OUTCOME_VARIANT: Record<OutcomeLabel, BadgeVariant> = {
  Passed: "success",
  Failed: "danger",
  Errored: "warning",
  "Not run": "neutral",
};

const METHOD_LABEL = {
  deterministic: "A · Deterministic",
  ground_truth: "B · Human-authored ground truth",
  judge: "C · LLM-as-judge",
  uninstrumented: "D · Not currently instrumented",
} as const;

function percent(rate: number | null): string {
  return rate === null ? "No cases evaluated" : `${Math.round(rate * 100)}% of evaluated`;
}

/** Shows the denominator: evaluated passed, then every other outcome, then the total. */
function outcomeLine(c: OutcomeCounts): string {
  return `${c.failed} failed · ${c.errored} errored · ${c.notRun} not run · ${c.total} total`;
}

function score(mean: MeanWithSample): string {
  return mean.mean === null ? "Not scored" : `${mean.mean.toFixed(1)}`;
}


function versionText(run: LabRunRow): string {
  return run.versionLabel ? run.versionLabel : "Legacy run · version not recorded";
}

function modelText(run: LabRunRow): string {
  return run.model ? run.model : "Model not recorded";
}

function expectedText(expected: LabCase["expectedAgent"]): string {
  if (expected === "not_in_dataset") return "Not in the current golden set";
  if (expected === null) return "No curriculum agent expected (off-topic)";
  return `${expected} Agent`;
}

function actualText(actual: string | null): string {
  return actual ? `${actual} Agent` : "No curriculum agent";
}

export default async function EvaluationLabPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { run } = await searchParams;
  const supabase = await createClient();
  const lab = await getEvaluationLab(supabase, typeof run === "string" ? run : null);

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>Evaluation Lab</p>
      <h1 className={styles.heading}>What MentorOS is evaluated on, and what it did</h1>
      <p className={styles.lead}>
        Each golden case has a human-written expectation. The Router&apos;s real decision is checked against it, and the
        Evaluation Agent scores the reply as an LLM judge. The two are reported separately.
      </p>

      <section className={styles.section} aria-labelledby="method-heading">
        <h2 id="method-heading" className={styles.sectionHeading}>
          How each result is produced
        </h2>
        <ul className={styles.methods}>
          <li>
            <strong>{METHOD_LABEL.deterministic}</strong> Exact checks, such as whether the Router picked the expected
            agent.
          </li>
          <li>
            <strong>{METHOD_LABEL.ground_truth}</strong> The expected agent for each case. Written by hand, not generated
            by a model.
          </li>
          <li>
            <strong>{METHOD_LABEL.judge}</strong> Quality scores from the Evaluation Agent. A model grades the reply, so
            these are judgements, not ground truth. They can vary between runs, so read them alongside the deterministic
            checks, the sample size shown, and repeated benchmarks.
          </li>
          <li>
            <strong>{METHOD_LABEL.uninstrumented}</strong> Dimensions MentorOS does not record per case yet. These are
            shown as gaps, not estimated.
          </li>
        </ul>
        <p className={styles.note}>
          Routing and response quality are evaluated independently. A response may meet the quality threshold even when
          MentorOS selected a different agent than the human-authored expected route.
        </p>
        <details className={styles.definitions}>
          <summary>What Passed, Failed, Errored and Not run mean</summary>
          <dl>
            <dt>Passed</dt>
            <dd>The case ran and met the deterministic expectation.</dd>
            <dt>Failed</dt>
            <dd>The case ran and did not meet the expectation.</dd>
            <dt>Errored</dt>
            <dd>The case was attempted but execution errored, so no result exists. Errored cases are not counted as passed or failed.</dd>
            <dt>Not run</dt>
            <dd>No execution result exists: the case never finished, or it is not in the current golden set.</dd>
          </dl>
          <p>All timestamps are shown in UTC.</p>
        </details>
      </section>

      {!lab && <p className={styles.muted}>Evaluation results couldn&apos;t be loaded right now.</p>}

      {lab && lab.runs.length === 0 && (
        <Card className={styles.empty}>
          <p className={styles.nextTitle}>Benchmark not yet run</p>
          <p className={styles.body}>
            The golden set has {GOLDEN_EVAL_SET.length} cases ready. No run has been recorded yet.
          </p>
        </Card>
      )}

      {lab && lab.selectedRun && lab.summary && (
        <>
          <section className={styles.section} aria-labelledby="runs-heading">
            <h2 id="runs-heading" className={styles.sectionHeading}>
              Runs
            </h2>
            <ul className={styles.runList}>
              {lab.runs.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/showcase/evaluation-lab?run=${r.id}`}
                    className={r.id === lab.selectedRun!.id ? styles.runActive : styles.run}
                    aria-current={r.id === lab.selectedRun!.id ? "page" : undefined}
                  >
                    <span className={styles.runLabel}>{r.label}</span>
                    <span className={styles.muted}>
                      {formatUtc(r.startedAt)} · {versionText(r)} · {modelText(r)} · {r.isPublic ? "Public" : "Private"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className={styles.muted}>
              Version comparison: not built yet. It needs at least two runs with different version labels.
            </p>
          </section>

          <section className={styles.section} aria-labelledby="summary-heading">
            <h2 id="summary-heading" className={styles.sectionHeading}>
              Selected run: {lab.selectedRun.label}
            </h2>
            <p className={styles.muted}>
              {lab.summary.caseCount} golden cases · {versionText(lab.selectedRun)} · {modelText(lab.selectedRun)} ·{" "}
              {runStatusLabel(lab.selectedRun.status)}
            </p>

            <div className={styles.metrics}>
              <Card className={styles.metric}>
                <p className={styles.label}>{METHOD_LABEL.deterministic} — routing</p>
                <p className={styles.metricValue}>
                  {lab.summary.routing.passed} / {lab.summary.routing.evaluated}
                </p>
                <p className={styles.muted}>
                  evaluated passed · {percent(lab.summary.routing.rate)}
                </p>
                <p className={styles.muted}>{outcomeLine(lab.summary.routing)}</p>
              </Card>
              <Card className={styles.metric}>
                <p className={styles.label}>{METHOD_LABEL.judge} — quality gate</p>
                <p className={styles.metricValue}>
                  {lab.summary.qualityGate.passed} / {lab.summary.qualityGate.evaluated}
                </p>
                <p className={styles.muted}>
                  evaluated passed · {percent(lab.summary.qualityGate.rate)}
                </p>
                <p className={styles.muted}>Overall score meets each case&apos;s threshold.</p>
                <p className={styles.muted}>{outcomeLine(lab.summary.qualityGate)}</p>
              </Card>
              <Card className={styles.metric}>
                <p className={styles.label}>{METHOD_LABEL.judge} — mean scores</p>
                <dl className={styles.means}>
                  <dt>Overall</dt>
                  <dd>
                    {score(lab.summary.judgeMeans.overall)} <span className={styles.muted}>n={lab.summary.judgeMeans.overall.sample}</span>
                  </dd>
                  <dt>Groundedness</dt>
                  <dd>
                    {score(lab.summary.judgeMeans.groundedness)}{" "}
                    <span className={styles.muted}>n={lab.summary.judgeMeans.groundedness.sample}</span>
                  </dd>
                  <dt>Accuracy</dt>
                  <dd>
                    {score(lab.summary.judgeMeans.accuracy)} <span className={styles.muted}>n={lab.summary.judgeMeans.accuracy.sample}</span>
                  </dd>
                  <dt>Safety</dt>
                  <dd>
                    {score(lab.summary.judgeMeans.safety)} <span className={styles.muted}>n={lab.summary.judgeMeans.safety.sample}</span>
                  </dd>
                </dl>
              </Card>
              <Card className={styles.metric}>
                <p className={styles.label}>{METHOD_LABEL.uninstrumented}</p>
                <ul className={styles.gapList}>
                  <li>Expected vs actual concept: Not currently instrumented</li>
                  <li>Per-case safety gate decision: Not currently instrumented</li>
                  <li>Retrieved curriculum nodes: Not currently instrumented</li>
                </ul>
              </Card>
            </div>
            {Object.keys(lab.summary.hallucinationRisk).length > 0 && (
              <p className={styles.muted}>
                {METHOD_LABEL.judge} hallucination risk:{" "}
                {Object.entries(lab.summary.hallucinationRisk)
                  .map(([risk, count]) => `${risk} ${count}`)
                  .join(" · ")}
              </p>
            )}
          </section>

          <section className={styles.section} aria-labelledby="cases-heading">
            <h2 id="cases-heading" className={styles.sectionHeading}>
              Cases
            </h2>
            <ul className={styles.caseList}>
              {lab.cases.map((c) => (
                <li key={c.goldenId}>
                  <details className={styles.case}>
                    <summary className={styles.caseSummary}>
                      <span className={styles.caseQuestion}>{c.question}</span>
                      <Badge variant={OUTCOME_VARIANT[routingOutcomeLabel(c.routing)]}>
                        Routing: {routingOutcomeLabel(c.routing)}
                      </Badge>
                    </summary>
                    <dl className={styles.facts}>
                      <dt>Student input</dt>
                      <dd>{c.question}</dd>
                      <dt>Expected route ({METHOD_LABEL.ground_truth})</dt>
                      <dd>{expectedText(c.expectedAgent)}</dd>
                      <dt>Actual route ({METHOD_LABEL.deterministic})</dt>
                      <dd>{actualText(c.actualAgent)}</dd>
                      <dt>Routing result</dt>
                      <dd>{routingOutcomeLabel(c.routing)}</dd>
                      <dt>Quality result</dt>
                      <dd>{qualityOutcomeLabel(c.status)}</dd>
                      <dt>Overall score ({METHOD_LABEL.judge})</dt>
                      <dd>{c.judge.overall === null ? "Not scored" : `${c.judge.overall} · threshold ${c.minOverallScore ?? 70}`}</dd>
                      <dt>Groundedness / accuracy / safety ({METHOD_LABEL.judge})</dt>
                      <dd>
                        {[c.judge.groundedness, c.judge.accuracy, c.judge.safety].map((v) => (v === null ? "—" : v)).join(" / ")}
                      </dd>
                      <dt>Hallucination risk ({METHOD_LABEL.judge})</dt>
                      <dd>{c.judge.hallucinationRisk ?? "Not scored"}</dd>
                      <dt>Expected vs actual concept ({METHOD_LABEL.uninstrumented})</dt>
                      <dd>Not currently instrumented</dd>
                      <dt>Latency</dt>
                      <dd>{c.latencyMs === null ? "Not recorded" : `${(c.latencyMs / 1000).toFixed(1)}s`}</dd>
                      <dt>Trace</dt>
                      <dd>{c.traceId ?? "Not recorded"}</dd>
                    </dl>
                    {c.responseExcerpt && (
                      <>
                        <p className={styles.label}>Final response (excerpt)</p>
                        <p className={styles.excerpt}>{c.responseExcerpt}</p>
                      </>
                    )}
                    {c.errorMessage && <p className={styles.errorText}>Error: {c.errorMessage}</p>}
                  </details>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
