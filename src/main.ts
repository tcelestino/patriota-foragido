import '@fontsource/press-start-2p/latin-400.css';
import './style.css';
import { loadEnergizer } from './energizer';
import { Game } from './game';
import { bindInput } from './input';
import { computeLayout, LOGICAL_HEIGHT, LOGICAL_WIDTH } from './layout';
import { FixedLoop } from './loop';
import { paintLegend } from './legend';
import { paintPlane } from './plane';
import { render } from './render';
import { Session } from './session';
import { loadSoundEnabled, saveSoundEnabled } from './sound';
import { loadHighScore, saveHighScore } from './storage';
import { getUi, syncUi } from './ui';

const PLANE_PIXEL = 4;

// Espaço que a moldura (padding + borda) ocupa em volta do canvas, em px CSS.
function bezelExtra(bezel: HTMLElement): { x: number; y: number } {
  const s = getComputedStyle(bezel);
  const px = (v: string): number => Number.parseFloat(v) || 0;
  return {
    x: px(s.paddingLeft) + px(s.paddingRight) + px(s.borderLeftWidth) + px(s.borderRightWidth),
    y: px(s.paddingTop) + px(s.paddingBottom) + px(s.borderTopWidth) + px(s.borderBottomWidth),
  };
}

// Um botão com foco é dono de Enter/Espaço e do toque: o atalho global de
// window não deve agir de novo sobre o mesmo gesto.
function isolateButton(btn: HTMLButtonElement, action: () => void): void {
  btn.addEventListener('click', () => {
    action();
    btn.blur();
  });
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
  });
  btn.addEventListener('touchstart', (e) => e.stopPropagation());
  btn.addEventListener('touchend', (e) => e.stopPropagation());
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Contexto 2D do canvas #game indisponível');
  return ctx;
}

function bezelOf(canvas: HTMLCanvasElement): HTMLElement {
  const bezel = canvas.parentElement;
  if (!bezel) throw new Error('Canvas #game sem moldura no documento');
  return bezel;
}

async function main(): Promise<void> {
  const ui = getUi();
  const canvas = ui.canvas;
  const ctx = context2d(canvas);
  const bezel = bezelOf(canvas);

  const game = new Game({ highScore: loadHighScore() });
  const loop = new FixedLoop(() => game.step());
  const session = new Session(game, () => loop.reset());
  let soundEnabled = loadSoundEnabled();
  let energizer: HTMLImageElement | null = null;
  let frame = 0;
  let scale = 1;
  let lastSavedScore = game.highScore;
  let wasGameOver = false;

  function draw(): void {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.clip();
    render(ctx, game, frame, energizer);
    ctx.restore();
  }

  // Mede #frame (cujo tamanho não depende do canvas) e cabe o labirinto dentro da moldura.
  function applyLayout(): void {
    const extra = bezelExtra(bezel);
    const dpr = window.devicePixelRatio || 1;
    const layout = computeLayout(ui.frame.clientWidth - extra.x, ui.frame.clientHeight - extra.y, dpr);
    canvas.style.width = `${layout.cssWidth}px`;
    canvas.style.height = `${layout.cssHeight}px`;
    // Redimensionar o canvas apaga o desenho: só quando o tamanho em pixels muda.
    if (canvas.width === layout.pixelWidth && canvas.height === layout.pixelHeight) return;
    canvas.width = layout.pixelWidth;
    canvas.height = layout.pixelHeight;
    scale = layout.scale;
    draw();
  }

  function persistHighScore(): void {
    const isGameOver = game.phase === 'gameOver';
    if (game.highScore > lastSavedScore || (isGameOver && !wasGameOver)) {
      saveHighScore(game.highScore);
      lastSavedScore = game.highScore;
    }
    wasGameOver = isGameOver;
  }

  paintPlane(ui.plane, PLANE_PIXEL);
  paintLegend(document, window.devicePixelRatio || 1);
  syncUi(ui, game, session, soundEnabled);
  applyLayout();
  draw();

  // Entrada, botões e laço ligados antes de esperar a imagem das laranjas: até ela chegar,
  // o render usa um desenho simples de reserva.
  window.addEventListener('resize', applyLayout);
  window.addEventListener('orientationchange', applyLayout);
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => applyLayout()).observe(ui.frame);
  }
  void document.fonts.ready.then(applyLayout);
  window.addEventListener('blur', () => session.pauseForBackground());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) session.pauseForBackground();
  });

  bindInput(window, {
    onDir: (d) => game.setDirection(d),
    onPause: () => session.togglePause(),
    onStart: () => session.primary(),
  });

  isolateButton(ui.btnStart, () => session.primary());
  isolateButton(ui.btnRetry, () => session.primary());
  isolateButton(ui.btnPause, () => session.togglePause());
  isolateButton(ui.btnRestart, () => session.restart());
  isolateButton(ui.btnSound, () => {
    soundEnabled = !soundEnabled;
    saveSoundEnabled(soundEnabled);
  });

  function onFrame(now: number): void {
    if (session.started) {
      loop.tick(now);
      persistHighScore();
    }
    frame++;
    draw();
    syncUi(ui, game, session, soundEnabled);
    requestAnimationFrame(onFrame);
  }
  requestAnimationFrame(onFrame);

  energizer = await loadEnergizer();
  paintLegend(document, window.devicePixelRatio || 1, energizer);
}

void main().catch((err: unknown) => {
  console.error('Falha ao iniciar o jogo', err);
  throw err;
});
