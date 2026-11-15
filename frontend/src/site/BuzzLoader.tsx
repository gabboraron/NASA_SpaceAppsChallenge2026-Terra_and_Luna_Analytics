import { CuteBee } from "./CuteBee";
import styles from "./BuzzLoader.module.css";

/** A bee circling while something loads; the text is the status message. */
export function BuzzLoader({ children }: { children: string }) {
  return (
    <div className={styles.loader} role="status">
      <span className={styles.orbit} aria-hidden="true">
        <CuteBee pose="happy" size={56} />
      </span>
      <span>{children}</span>
    </div>
  );
}
