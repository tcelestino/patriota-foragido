export type ThreatMode = 'scatter' | 'chase';

export class ModeTimer {
  mode: ThreatMode = 'scatter';
  private index = 0;
  private elapsed = 0;
  private paused = false;

  constructor(private readonly schedule: number[]) {}

  /** Chamar uma vez por frame. Retorna 'reversed' no frame em que o modo troca. */
  update(): 'reversed' | null {
    if (this.paused) return null;
    const duration = this.schedule[this.index];
    if (duration === undefined || duration === Infinity) return null;
    this.elapsed++;
    if (this.elapsed < duration) return null;
    this.index++;
    this.elapsed = 0;
    this.mode = this.mode === 'scatter' ? 'chase' : 'scatter';
    return 'reversed';
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }
}
