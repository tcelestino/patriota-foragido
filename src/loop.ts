// Tolerancia para erro de ponto flutuante ao comparar o acumulador com o passo.
const EPSILON_MS = 1e-6;

export class FixedLoop {
  private readonly stepMs: number;
  private last: number | null = null;
  private acc = 0;

  constructor(
    private readonly step: () => void,
    hz = 60,
    private readonly maxFrameMs = 100,
  ) {
    this.stepMs = 1000 / hz;
  }

  tick(nowMs: number): void {
    if (this.last === null) {
      this.last = nowMs;
      return;
    }
    const delta = Math.min(Math.max(nowMs - this.last, 0), this.maxFrameMs);
    this.last = nowMs;
    this.acc += delta;
    while (this.acc + EPSILON_MS >= this.stepMs) {
      this.acc -= this.stepMs;
      this.step();
    }
  }

  reset(): void {
    this.last = null;
    this.acc = 0;
  }
}
