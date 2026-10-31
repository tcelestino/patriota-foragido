import type { Game } from './game';

// Controla início, pausa e reinício da partida, isolando essa lógica do main.
export class Session {
  started = false;

  constructor(
    private readonly game: Game,
    private readonly resetClock: () => void,
  ) {}

  start(): void {
    this.started = true;
    this.resetClock();
  }

  restart(): void {
    this.started = true;
    this.game.restart();
    this.resetClock();
  }

  togglePause(): void {
    if (!this.started || this.game.phase === 'gameOver') return;
    this.game.togglePause();
    this.resetClock();
  }

  pauseForBackground(): void {
    if (this.started) this.game.pause();
    this.resetClock();
  }

  // Ação principal (Enter/Espaço/toque/botão): inicia, reinicia ou retoma.
  primary(): void {
    if (!this.started) {
      this.start();
    } else if (this.game.phase === 'gameOver') {
      this.restart();
    } else if (this.game.phase === 'paused') {
      this.togglePause();
    }
  }
}
