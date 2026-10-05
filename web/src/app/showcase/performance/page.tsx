import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPerformanceRows } from "@/lib/showcase/performance/get-performance-rows";
import {
  MEDIAN_MIN_N,
  P90_MIN_N,
  composition,
  economics,
  interpretations,
  latencyByStage,
  reliability,
  textVsVoiceStageSum,
  trafficCounts,
  voice,
  wallClock,
  type SampleStats,
} from "@/lib/showcase/performance/performance-metrics";
import { formatUtc } from "@/lib/evaluation-lab/evaluation-lab-presentation";
import styles from "./page.module.css";

const seconds = (ms: number | null) => (ms === null ? "—" : `${(ms / 1000).toFixed(1)} s`);
const usd = (v: number | null) => (v === null ? "not priced" : `$${v.toFixed(4)}`);

/** Observed range always; median from n=30, p90 from n=50 (Phase E sample policy). */
function describe(s: SampleStats): string {
  if (s.n === 0) return "No samples";
  if (s.n === 1) return seconds(s.min);
  return `${seconds(s.min)} – ${seconds(s.max)}`;
}

function medianText(s: SampleStats): string {
  if (s.median !== null) return seconds(s.median);
  return `Not shown (needs n ≥ ${MEDIAN_MIN_N})`;
}

export default async function PerformancePage() {
  const supabase = await createClient();
  const rows = await getPerformanceRows(supabase);

  if (!rows) {
    return (
      <div className={styles.page}>
        <p className={styles.eyebrow}>Performance and economics</p>
        <h1 className={styles.heading}>Performance data couldn&apos;t be loaded</h1>
        <p className={styles.muted}>The performance measurements are not available right now.</p>
      </div>
    );
  }

  const counts = trafficCounts(rows);
  const stages = latencyByStage(rows);
  const wall = wallClock(rows);
  const share = composition(rows);
  const econ = economics(rows);
  const v = voice(rows);
  const cmp = textVsVoiceStageSum(rows);
  const rel = reliability(rows);
  const notes = interpretations(rows);
  const ordinaryTimes = rows.filter((r) => r.traffic === "other").map((r) => r.createdAt).sort();

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>Performance and economics</p>
      <h1 className={styles.heading}>How MentorOS performs as an AI system</h1>
      <p className={styles.lead}>
        Measured values and estimates, each with the sample size behind it. Speed and cost are read alongside quality:
        see the <Link href="/showcase/evaluation-lab">Evaluation Lab</Link>. Faster or cheaper does not mean better.
      </p>

      <section className={styles.section} aria-labelledby="context">
        <h2 id="context" className={styles.sectionHeading}>Measurement context</h2>
        <ul className={styles.list}>
          <li>
            Unclassified ordinary traffic in these figures: <strong>n = {counts.ordinaryTurns}</strong>. This is not
            verified real-student traffic. It can include students, the demo account, and automated tests, which cannot
            be told apart.
          </li>
          <li>
            Excluded: {counts.tutorAutoTurns} AI Tutor automatic requests and {counts.benchmarkTraces} benchmark traces.
            Benchmark runs are measured separately in the Evaluation Lab.
          </li>
          <li>
            Period covered: {ordinaryTimes.length ? `${formatUtc(ordinaryTimes[0])} to ${formatUtc(ordinaryTimes[ordinaryTimes.length - 1])}` : "no ordinary turns yet"}.
          </li>
          <li>
            Stage timing exists for turns since the instrumentation was added. Earlier turns have stage timing where it was
            recorded at the time, and no wall-clock.
          </li>
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="latency">
        <h2 id="latency" className={styles.sectionHeading}>Latency <Tag kind="measured">Measured</Tag></h2>
        <p className={styles.muted}>
          Each row is one stage event. Medians appear only at n ≥ {MEDIAN_MIN_N}, and p90 is not shown below n ≥ {P90_MIN_N}.
        </p>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Stage</th>
              <th scope="col">n</th>
              <th scope="col">Observed range</th>
              <th scope="col">Median</th>
            </tr>
          </thead>
          <tbody>
            {stages.filter((s) => s.stats.n > 0).map((s) => (
              <tr key={s.key}>
                <td>{s.label}</td>
                <td>{s.stats.n}</td>
                <td>{describe(s.stats)}</td>
                <td>{medianText(s.stats)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className={styles.subheading}>Turn wall-clock <Tag kind="measured">Measured since E1</Tag></h3>
        <p className={styles.body}>
          {wall.stats.n === 0
            ? "No instrumented turns yet."
            : `Observed ${wall.stats.n} instrumented turn${wall.stats.n === 1 ? "" : "s"}: ${wall.observed.map(seconds).join(", ")}. Not enough samples for statistics.`}
        </p>
        <p className={styles.muted}>Wall-clock runs from authentication to the reply being saved. It is not the sum of stages.</p>

        <h3 className={styles.subheading}>Measured stage durations</h3>
        <p className={styles.muted}>
          Share of measured core-stage time across {share.reduce((acc, s) => acc + s.n, 0)} stage calls. This is not a
          timeline. Bars do not imply order or parallelism, and unmeasured work (such as Context and knowledge retrieval)
          is not in them, so they do not add up to wall-clock.
        </p>
        <ul className={styles.bars}>
          {share.map((s) => (
            <li key={s.key} className={styles.barRow}>
              <span className={styles.barLabel}>{s.label}</span>
              <span className={styles.barTrack} aria-hidden="true">
                <span className={styles.barFill} style={{ width: `${Math.max(2, Math.round(s.share * 100))}%` }} />
              </span>
              <span className={styles.barValue}>{Math.round(s.share * 100)}% · n={s.n}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="economics">
        <h2 id="economics" className={styles.sectionHeading}>AI economics <Tag kind="estimated">Estimated</Tag></h2>
        <p className={styles.muted}>{econ.costBasis}. Token counts come from the provider&apos;s responses. Prices come from the application&apos;s pricing constants.</p>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Model</th>
              <th scope="col">Calls</th>
              <th scope="col">Input tokens</th>
              <th scope="col">Output tokens</th>
              <th scope="col">Estimated cost</th>
            </tr>
          </thead>
          <tbody>
            {econ.models.map((m) => (
              <tr key={m.model}>
                <td>{m.model}</td>
                <td>{m.calls}</td>
                <td>{m.inputTokens.toLocaleString()}</td>
                <td>{m.outputTokens.toLocaleString()}</td>
                <td>{m.priced ? `${usd(m.estimatedCostUsd)} (ESTIMATED)` : "Not priced"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {econ.unpricedCalls > 0 && <p className={styles.muted}>{econ.unpricedCalls} calls use a model with no price and are excluded from cost.</p>}

        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Stage</th>
              <th scope="col">Calls</th>
              <th scope="col">Mean input tokens</th>
              <th scope="col">Mean output tokens</th>
              <th scope="col">Estimated cost</th>
            </tr>
          </thead>
          <tbody>
            {econ.byStage.filter((s) => s.calls > 0).map((s) => (
              <tr key={s.key}>
                <td>{s.label}</td>
                <td>{s.calls}</td>
                <td>{s.meanInputTokens === null ? "—" : Math.round(s.meanInputTokens)}</td>
                <td>{s.meanOutputTokens === null ? "—" : Math.round(s.meanOutputTokens)}</td>
                <td>{usd(s.estimatedCostUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className={styles.body}>
          Approximate cost per observed turn: {econ.perTurn.n === 0 ? "no fully priced turns yet" : `${usd(econ.perTurn.median ?? econ.perTurn.min)}${econ.perTurn.median === null ? ` (range ${usd(econ.perTurn.min)} – ${usd(econ.perTurn.max)})` : ""}`} <Tag kind="estimated">ESTIMATED</Tag> · n={econ.perTurn.n} turns.
        </p>
        <p className={styles.muted}>
          Not included: Meta Muse and Tavus charges (<strong>Provider cost: Not currently instrumented</strong>), and database
          and hosting costs.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="voice">
        <h2 id="voice" className={styles.sectionHeading}>Voice <Tag kind="measured">Measured in the browser</Tag></h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Segment</th>
              <th scope="col">n</th>
              <th scope="col">Observed range</th>
              <th scope="col">Median</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Speech-to-text (Meta Muse, server)</td><td>{v.transcription.n}</td><td>{describe(v.transcription)}</td><td>{medianText(v.transcription)}</td></tr>
            <tr><td>Question end → transcript</td><td>{v.questionToTranscript.n}</td><td>{describe(v.questionToTranscript)}</td><td>{medianText(v.questionToTranscript)}</td></tr>
            <tr><td>Transcript → reply</td><td>{v.transcriptToReply.n}</td><td>{describe(v.transcriptToReply)}</td><td>{medianText(v.transcriptToReply)}</td></tr>
            <tr><td>Reply → first avatar audio</td><td>{v.replyToFirstAudio.n}</td><td>{describe(v.replyToFirstAudio)}</td><td>{medianText(v.replyToFirstAudio)}</td></tr>
            <tr><td>Question end → first avatar audio</td><td>{v.totalToFirstAudio.n}</td><td>{describe(v.totalToFirstAudio)}</td><td>{medianText(v.totalToFirstAudio)}</td></tr>
          </tbody>
        </table>
        <p className={styles.body}>
          Typed turns: stage-time sum per turn, n={cmp.text.n}, range {describe(cmp.text)}. Spoken turns: stage-time sum per turn,
          n={cmp.voice.n}, range {describe(cmp.voice)}. These compare measured stage time only.
        </p>
        <p className={styles.muted}>
          Avatar outcomes observed: {Object.entries(v.avatarStatuses).map(([s, c]) => `${s} ${c}`).join(", ") || "none yet"}.
          Dr. Paws speech is linked to its voice turn: implemented and unit-tested; live end-to-end verification pending.
          Provider cost (Muse, Tavus): Not currently instrumented.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="reliability">
        <h2 id="reliability" className={styles.sectionHeading}>Reliability <Tag kind="measured">Observed counts</Tag></h2>
        <p className={styles.body}>
          Ordinary turns n={counts.ordinaryTurns}: completed {rel.completed}, errored {rel.errored}, cancelled {rel.cancelled}.
          Model-call failures {rel.llmCallFailures}, evaluation failures {rel.evaluationFailures}, planning failures {rel.planningFailures},
          transcription failures {rel.transcriptionFailures}.
        </p>
        <p className={styles.muted}>
          Counts are shown rather than rates: the samples are too small for a meaningful error rate.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="quality">
        <h2 id="quality" className={styles.sectionHeading}>Quality context</h2>
        <p className={styles.body}>
          Latency and cost are shown alongside quality, not instead of it. The current quality baseline, including its
          routing failure and errored case, is in the <Link href="/showcase/evaluation-lab">Evaluation Lab</Link>.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="gaps">
        <h2 id="gaps" className={styles.sectionHeading}>Measurement gaps</h2>
        <ul className={styles.list}>
          <li>Time to first streamed token: not instrumented.</li>
          <li>Context and knowledge retrieval: no duration of their own. Retrieved items are not stored.</li>
          <li>Positioned waterfall: not available. Stage start times are not stored.</li>
          <li>Meta Muse and Tavus cost: not instrumented.</li>
          <li>Traffic: students, the demo account, and tests cannot be separated.</li>
          <li>Small samples: most stages and all wall-clock figures are below the statistics threshold.</li>
          <li>Pre-E1 turns: no wall-clock, and no planning duration.</li>
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="interpretation">
        <h2 id="interpretation" className={styles.sectionHeading}>Interpretation <Tag kind="interpretation">From the measurements above</Tag></h2>
        {notes.length === 0 ? (
          <p className={styles.muted}>No conclusions yet. The current samples are below the threshold for drawing one.</p>
        ) : (
          <ul className={styles.list}>
            {notes.map((n) => (
              <li key={n.text}>
                {n.text} <span className={styles.muted}>({n.basis})</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Tag({ kind, children }: { kind: "measured" | "estimated" | "interpretation"; children: React.ReactNode }) {
  return <span className={styles[`tag_${kind}`]}>{children}</span>;
}
