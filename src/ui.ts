import type { Game } from './game';
import { formatRecord, formatScore, heartCount, passagens } from './hud';
import { bannerFor, gameOverMessage, levelLabel, pauseLabel, screenFor } from './screens';
import type { Session } from './session';
import { soundLabel } from './sound';
import { tipForLevel } from './tips';

export type Ui = {
  app: HTMLElement;
  frame: HTMLElement;
  canvas: HTMLCanvasElement;
  plane: HTMLCanvasElement;
  score: HTMLElement;
  hearts: HTMLElement;
  passagens: HTMLElement;
  record: HTMLElement;
  level: HTMLElement;
  tip: HTMLElement;
  screenStart: HTMLElement;
  screenEnd: HTMLElement;
  endMessage: HTMLElement;
  banner: HTMLElement;
  btnStart: HTMLButtonElement;
  btnRetry: HTMLButtonElement;
  btnPause: HTMLButtonElement;
  btnSound: HTMLButtonElement;
  btnRestart: HTMLButtonElement;
};

function byId<T extends HTMLElement>(doc: Document, id: string, kind: { new (): T }): T {
  const el = doc.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} não encontrado no documento`);
  if (!(el instanceof kind)) throw new Error(`Elemento #${id} não é do tipo ${kind.name}`);
  return el;
}

export function getUi(doc: Document = document): Ui {
  const el = (id: string): HTMLElement => byId(doc, id, HTMLElement);
  const canvas = (id: string): HTMLCanvasElement => byId(doc, id, HTMLCanvasElement);
  const button = (id: string): HTMLButtonElement => byId(doc, id, HTMLButtonElement);
  return {
    app: el('app'),
    frame: el('frame'),
    canvas: canvas('game'),
    plane: canvas('plane'),
    score: el('hud-score'),
    hearts: el('hud-hearts'),
    passagens: el('hud-passagens'),
    record: el('hud-record'),
    level: el('level-label'),
    tip: el('tip-text'),
    screenStart: el('screen-start'),
    screenEnd: el('screen-end'),
    endMessage: el('end-message'),
    banner: el('banner'),
    btnStart: button('btn-start'),
    btnRetry: button('btn-retry'),
    btnPause: button('btn-pause'),
    btnSound: button('btn-sound'),
    btnRestart: button('btn-restart'),
  };
}

// Últimos valores escritos em cada elemento, para tocar no DOM só quando algo mudar.
const lastText = new WeakMap<HTMLElement, string>();
const lastHidden = new WeakMap<HTMLElement, boolean>();
const lastDisabled = new WeakMap<HTMLButtonElement, boolean>();
const lastHearts = new WeakMap<HTMLElement, number>();
const lastPressed = new WeakMap<HTMLButtonElement, boolean>();

function setText(el: HTMLElement, value: string): void {
  if (lastText.get(el) === value) return;
  el.textContent = value;
  lastText.set(el, value);
}

function setHidden(el: HTMLElement, hidden: boolean): void {
  if (lastHidden.get(el) === hidden) return;
  el.hidden = hidden;
  lastHidden.set(el, hidden);
}

function setDisabled(btn: HTMLButtonElement, disabled: boolean): void {
  if (lastDisabled.get(btn) === disabled) return;
  btn.disabled = disabled;
  lastDisabled.set(btn, disabled);
}

function setPressed(btn: HTMLButtonElement, pressed: boolean): void {
  if (lastPressed.get(btn) === pressed) return;
  btn.setAttribute('aria-pressed', String(pressed));
  lastPressed.set(btn, pressed);
}

function setHearts(host: HTMLElement, count: number): void {
  if (lastHearts.get(host) === count) return;
  const doc = host.ownerDocument;
  const hearts = Array.from({ length: count }, () => {
    const heart = doc.createElement('span');
    heart.className = 'heart';
    return heart;
  });
  host.replaceChildren(...hearts);
  host.setAttribute('aria-label', `${count} ${count === 1 ? 'vida' : 'vidas'}`);
  lastHearts.set(host, count);
}

export function syncUi(ui: Ui, game: Game, session: Session, soundEnabled: boolean): void {
  setText(ui.score, formatScore(game.score));
  setText(ui.record, formatRecord(game.highScore));
  setText(ui.passagens, String(passagens(game)));
  setHearts(ui.hearts, heartCount(game.lives));
  setText(ui.level, levelLabel(game.level));
  setText(ui.tip, tipForLevel(game.level));

  const screen = screenFor(game.phase, session.started);
  setHidden(ui.screenStart, screen !== 'start');
  setHidden(ui.screenEnd, screen !== 'gameOver');

  const banner = bannerFor(game.phase, session.started);
  setText(ui.banner, banner);
  setHidden(ui.banner, banner === '');

  setText(ui.endMessage, gameOverMessage(game.score));
  setText(ui.btnPause, pauseLabel(game.phase));
  setDisabled(ui.btnPause, !session.started || game.phase === 'gameOver');
  setText(ui.btnSound, soundLabel(soundEnabled));
  setPressed(ui.btnSound, soundEnabled);
}
