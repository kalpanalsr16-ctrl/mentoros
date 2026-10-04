import styles from "./MathSpaceBackground.module.css";

const SYMBOLS = ["π", "∑", "√", "∞", "÷", "×", "+", "−", "=", "Δ", "θ", "∫", "≈", "½", "¼", "¾", "2", "3", "5", "7", "9", "12", "25", "100", "∠", "%", "x²", "≠"];

/** Fixed layout (no randomness) so server and client render identically. */
const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  symbol: SYMBOLS[(i * 7) % SYMBOLS.length],
  left: (i * 37) % 100,
  delay: ((i * 2.3) % 11).toFixed(1),
  duration: (14 + ((i * 3) % 12)).toFixed(1),
  size: 16 + ((i * 5) % 30),
}));

export function MathSpaceBackground() {
  return (
    <div className={styles.field} aria-hidden="true">
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.left}%`,
            fontSize: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
          className={styles.particle}
        >
          {p.symbol}
        </span>
      ))}
    </div>
  );
}
