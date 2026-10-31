import { drawEnergizer, drawFugitivo, drawThreat } from './sprites';
import type { ThreatName } from './types';

const BOX = 22; // área lógica de cada ícone; os sprites têm 16 px e a coroa passa um pouco do topo

function paintOne(canvas: HTMLCanvasElement, dpr: number, energizer: CanvasImageSource | null): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const css = canvas.clientWidth || 40;
  const px = Math.round(css * dpr);
  canvas.width = px;
  canvas.height = px;
  ctx.setTransform(px / BOX, 0, 0, px / BOX, 0, 0);
  ctx.clearRect(0, 0, BOX, BOX);
  const who = canvas.dataset.sprite ?? '';
  const cx = BOX / 2;
  const cy = BOX / 2 + 1;
  if (who === 'fugitivo') drawFugitivo(ctx, cx, cy, 16, 'right', { stride: 1, fall: 0 });
  else if (who === 'laranjas') drawEnergizer(ctx, energizer, cx, cy, 17, 0.6);
  else if (who === 'delegado' || who === 'agente' || who === 'perito' || who === 'estagiario') {
    drawThreat(ctx, who as ThreatName, cx, cy, 'right', 0);
  }
}

// Pinta os ícones da legenda (canvas com data-sprite) com os mesmos desenhos usados no jogo.
export function paintLegend(root: ParentNode, dpr: number, energizer: CanvasImageSource | null = null): void {
  root.querySelectorAll<HTMLCanvasElement>('canvas[data-sprite]').forEach((c) => paintOne(c, dpr, energizer));
}
