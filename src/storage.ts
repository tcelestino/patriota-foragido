const KEY = 'patriota-foragido:high-score';

// Fallback para quando o localStorage estiver indisponivel.
let memoryScore = 0;

export function loadHighScore(): number {
  let stored = 0;
  try {
    const parsed = Number.parseInt(localStorage.getItem(KEY) ?? '', 10);
    if (Number.isFinite(parsed) && parsed > 0) stored = parsed;
  } catch {
    // localStorage indisponivel: usa apenas a memoria.
  }
  return Math.max(stored, memoryScore);
}

export function saveHighScore(n: number): void {
  const value = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  memoryScore = Math.max(memoryScore, value);
  try {
    localStorage.setItem(KEY, String(memoryScore));
  } catch {
    // Sem persistencia: o valor segue em memoria.
  }
}
