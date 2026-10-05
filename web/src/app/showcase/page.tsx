import Link from "next/link";
import styles from "./page.module.css";

const CAPABILITIES = [
  {
    title: "Learner state",
    body: "Per-concept mastery, attempts, and recorded misconceptions, updated after every assessed answer.",
  },
  {
    title: "Routing",
    body: "Each question is classified by intent before any teaching agent runs, and the decision is logged.",
  },
  {
    title: "Planning",
    body: "A teaching strategy is chosen per question and recorded, separate from the teaching itself.",
  },
  {
    title: "Curriculum graph",
    body: "Answers are tied to a relational curriculum with prerequisite links, not free recall.",
  },
  {
    title: "Teaching agents",
    body: "Concept, Practice, and Assessment agents each have one job and their own structured output.",
  },
  {
    title: "Independent evaluation",
    body: "A separate Evaluation Agent scores each reply on groundedness, accuracy, and safety. A safety failure caps the overall score.",
  },
  {
    title: "Voice",
    body: "A spoken question is transcribed, answered by the same pipeline as typed questions, and spoken back by Dr. Paws.",
  },
  {
    title: "Observability",
    body: "Every turn has a trace ID. Model calls record latency, tokens, and estimated cost for each stage.",
  },
];

const TEXT_PATH = ["Student", "Safety", "Context", "Router", "Planning", "Knowledge retrieval", "Concept · Practice · Assessment", "Evaluation", "Memory / learner state", "Revision"];
const VOICE_PATH = ["Microphone", "Muse speech-to-text", "MentorOS pipeline", "Tavus Echo", "Dr. Paws"];

export default function ShowcaseOverviewPage() {
  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>Explore the AI System</p>
      <h1 className={styles.heading}>MentorOS is not an LLM wrapper.</h1>
      <p className={styles.lead}>
        ChatGPT can answer a student&apos;s question. MentorOS models what the learner knows, decides how to teach them,
        checks whether they learned it, and knows when they need to revisit it.
      </p>

      <section className={styles.section} aria-labelledby="capabilities-heading">
        <h2 id="capabilities-heading" className={styles.sectionHeading}>
          What the system does
        </h2>
        <ul className={styles.capabilityGrid}>
          {CAPABILITIES.map((capability) => (
            <li key={capability.title} className={styles.capability}>
              <h3 className={styles.capabilityTitle}>{capability.title}</h3>
              <p className={styles.capabilityBody}>{capability.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="flow-heading">
        <h2 id="flow-heading" className={styles.sectionHeading}>
          How a question moves through it
        </h2>
        <ol className={styles.flow} aria-label="Text question pipeline">
          {TEXT_PATH.map((stage) => (
            <li key={stage} className={styles.flowStage}>
              {stage}
            </li>
          ))}
        </ol>
        <p className={styles.flowLabel}>Voice path</p>
        <ol className={styles.flow} aria-label="Voice question path">
          {VOICE_PATH.map((stage) => (
            <li key={stage} className={styles.flowStage}>
              {stage}
            </li>
          ))}
        </ol>
        <p className={styles.note}>
          Voice and typed questions share one tutoring pipeline. The avatar presents the answer; it does not decide
          it.
        </p>
      </section>

      <section className={styles.section}>
        <Link href="/showcase/flight-recorder" className={styles.cta}>
          Open the AI Flight Recorder
        </Link>
        <p className={styles.note}>
          The Flight Recorder shows the trace of your own recent questions. Sections marked &ldquo;Next phase&rdquo; are
          not built yet.
        </p>
      </section>
    </div>
  );
}
