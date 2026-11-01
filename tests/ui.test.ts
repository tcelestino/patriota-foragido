import { beforeEach, describe, expect, test, vi } from 'vitest';
// Texto bruto do index.html real (Vite `?raw`), sem depender de tipos do Node.
import html from '../index.html?raw';
import { Game } from '../src/game';
import { Session } from '../src/session';
import { getUi, syncUi } from '../src/ui';

function loadBody(): string {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  parsed.querySelectorAll('script').forEach((s) => s.remove());
  return parsed.body.innerHTML;
}

const BODY = loadBody();

function setup(): { game: Game; session: Session } {
  const game = new Game({ random: () => 0, highScore: 17950 });
  const session = new Session(game, () => {});
  return { game, session };
}

function text(id: string): string {
  return document.getElementById(id)?.textContent ?? '';
}

function isHidden(id: string): boolean {
  const el = document.getElementById(id);
  if (!el) throw new Error(`sem #${id}`);
  return el.hidden === true;
}

describe('ui', () => {
  beforeEach(() => {
    document.body.innerHTML = BODY;
  });

  test('getUi devolve todos os elementos; falta de um id lança o erro com o id', () => {
    const ui = getUi(document);
    expect(ui.canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(ui.plane).toBeInstanceOf(HTMLCanvasElement);
    expect(ui.level.id).toBe('level-label');
    expect(ui.tip.id).toBe('tip-text');
    expect(ui.frame.id).toBe('frame');
    expect(ui.btnStart.id).toBe('btn-start');
    expect(ui.btnRetry.id).toBe('btn-retry');
    expect(ui.btnPause.id).toBe('btn-pause');
    expect(ui.btnSound.id).toBe('btn-sound');
    expect(ui.btnRestart.id).toBe('btn-restart');

    document.getElementById('hud-passagens')?.remove();
    expect(() => getUi(document)).toThrow('Elemento #hud-passagens não encontrado no documento');
  });

  test('o HTML traz os textos fixos do cabeçalho, das telas e do rodapé', () => {
    const body = document.body.textContent ?? '';
    for (const t of [
      'UM ARCADE DE SÁTIRA',
      'PATRIOTA',
      'FORAGIDO',
      'ADEUS PÁTRIA E FAMÍLIA.',
      'PONTOS',
      'VIDAS',
      'PASSAGENS',
      'RECORDE',
      'ÚLTIMA CHAMADA!',
      'Colete as passagens espalhadas pelo labirinto e escape dos agentes. Pegue as laranjas para deixá-los temporariamente atordoados.',
      'SETAS OU WASD PARA ANDAR · P PARA PAUSAR',
      'NO CELULAR, DESLIZE O DEDO NA TELA',
      'VOO CANCELADO!',
      'FUGITIVO',
      'DELEGADO',
      'AGENTE',
      'PERITO',
      'ESTAGIÁRIO',
      'LARANJAS',
      'DICAS DE FUGA',
      'FEITO PARA JOGAR, NÃO PARA LEVAR A SÉRIO.',
    ]) {
      expect(body).toContain(t);
    }
    expect(body).not.toContain('Uma paródia ficcional');
    expect(text('btn-start').trim()).toBe('COMEÇAR');
    expect(text('btn-retry').trim()).toBe('TENTAR DE NOVO');
    expect(text('btn-restart').trim()).toBe('REINICIAR');
    expect(document.getElementById('start-overlay')).toBeNull();
  });

  test('syncUi: Game novo e Session não iniciada mostra a tela inicial e o HUD inicial', () => {
    const { game, session } = setup();
    const ui = getUi(document);
    syncUi(ui, game, session, true);
    expect(isHidden('screen-start')).toBe(false);
    expect(isHidden('screen-end')).toBe(true);
    expect(isHidden('banner')).toBe(true);
    expect(text('hud-score')).toBe('00000');
    expect(text('hud-passagens')).toBe('274');
    expect(text('level-label')).toBe('FASE 1');
    expect(text('tip-text')).toContain('túnel lateral');
    expect(text('hud-record')).toBe('17950');
    expect(ui.hearts.querySelectorAll('span.heart')).toHaveLength(3);
    expect(ui.btnPause.disabled).toBe(true);
    expect(text('btn-pause')).toBe('PAUSAR');
    expect(text('btn-sound')).toBe('SOM: LIGADO');
  });

  test('syncUi: após session.start e game em ready mostra o banner PRONTO! sem tela', () => {
    const { game, session } = setup();
    const ui = getUi(document);
    session.start();
    syncUi(ui, game, session, true);
    expect(isHidden('screen-start')).toBe(true);
    expect(isHidden('screen-end')).toBe(true);
    expect(isHidden('banner')).toBe(false);
    expect(text('banner')).toBe('PRONTO!');
    expect(ui.btnPause.disabled).toBe(false);
  });

  test('syncUi: game.pause() mostra PAUSADO e o botão RETOMAR', () => {
    const { game, session } = setup();
    const ui = getUi(document);
    session.start();
    game.pause();
    syncUi(ui, game, session, true);
    expect(text('banner')).toBe('PAUSADO');
    expect(isHidden('banner')).toBe(false);
    expect(text('btn-pause')).toBe('RETOMAR');
  });

  test('syncUi: gameOver com score 500 mostra a tela de fim com a mensagem e desabilita pausar', () => {
    const { game, session } = setup();
    const ui = getUi(document);
    session.start();
    syncUi(ui, game, session, true);
    game.score = 500;
    game.lives = 0;
    game.phase = 'gameOver';
    syncUi(ui, game, session, true);
    expect(isHidden('screen-end')).toBe(false);
    expect(isHidden('screen-start')).toBe(true);
    expect(isHidden('banner')).toBe(true);
    expect(text('end-message')).toContain('Fez 500 pontos.');
    expect(text('hud-score')).toBe('00500');
    expect(ui.hearts.querySelectorAll('span.heart')).toHaveLength(0);
    expect(ui.btnPause.disabled).toBe(true);
  });

  test('syncUi: rótulo acessível das vidas concorda em número', () => {
    const { game, session } = setup();
    const ui = getUi(document);
    syncUi(ui, game, session, true);
    expect(ui.hearts.getAttribute('aria-label')).toBe('3 vidas');
    expect(ui.hearts.querySelectorAll('span.heart')).toHaveLength(3);
    game.lives = 1;
    syncUi(ui, game, session, true);
    expect(ui.hearts.querySelectorAll('span.heart')).toHaveLength(1);
    expect(ui.hearts.getAttribute('aria-label')).toBe('1 vida');
  });

  test('o botão SOM está escondido por enquanto, mas continua no documento', () => {
    const ui = getUi(document);
    expect(ui.btnSound.hidden).toBe(true);
  });

  test('syncUi com soundEnabled false mostra SOM: DESLIGADO', () => {
    const { game, session } = setup();
    const ui = getUi(document);
    syncUi(ui, game, session, false);
    expect(text('btn-sound')).toBe('SOM: DESLIGADO');
  });

  test('syncUi: aria-pressed de #btn-sound acompanha o som', () => {
    const { game, session } = setup();
    const ui = getUi(document);
    syncUi(ui, game, session, true);
    expect(ui.btnSound.getAttribute('aria-pressed')).toBe('true');
    syncUi(ui, game, session, false);
    expect(ui.btnSound.getAttribute('aria-pressed')).toBe('false');
  });

  test('syncUi duas vezes sem mudança não reescreve o DOM', () => {
    const { game, session } = setup();
    const ui = getUi(document);
    syncUi(ui, game, session, true);
    const firstHeart = ui.hearts.firstElementChild;
    const scoreNode = ui.score.firstChild;
    const spy = vi.spyOn(Node.prototype, 'textContent', 'set');
    const observer = new MutationObserver(() => {});
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
    syncUi(ui, game, session, true);
    expect(spy).not.toHaveBeenCalled();
    expect(observer.takeRecords()).toHaveLength(0);
    expect(ui.hearts.firstElementChild).toBe(firstHeart);
    expect(ui.score.firstChild).toBe(scoreNode);
    observer.disconnect();
    spy.mockRestore();
  });
});
