import { ArchitectureExplorer } from "@/components/showcase/architecture/ArchitectureExplorer";
import styles from "./page.module.css";

export default function ArchitecturePage() {
  return (
    <div>
      <p className={styles.eyebrow}>System architecture</p>
      <h1 className={styles.heading}>Voice and avatar are interfaces around one tutoring pipeline</h1>
      <p className={styles.lead}>
        Each step shows what MentorOS does, what it depends on, how it fails, and what it records. Select a step to
        inspect it.
      </p>
      <ArchitectureExplorer />
    </div>
  );
}
