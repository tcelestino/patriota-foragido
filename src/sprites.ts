import type { FruitKind } from './levels';
import { DIR_VEC, type Dir, type ThreatName } from './types';

// Personagens desenhados em vetor (canvas 2D), centrados em (cx, cy). Todos são fictícios:
// um fugitivo e quatro agentes genéricos, todos figuras humanas de corpo inteiro que andam
// (de perfil na horizontal, de frente ao descer e de costas ao subir). Só o energizer
// (as "laranjas") usa uma imagem.

export const DIR_ANGLE: Record<Dir, number> = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };

export const THREAT_INFO: Record<ThreatName, { nome: string; descricao: string }> = {
  delegado: { nome: 'DELEGADO', descricao: 'Vai direto atrás de você.' },
  agente: { nome: 'AGENTE', descricao: 'Tenta cortar o seu caminho.' },
  perito: { nome: 'PERITO', descricao: 'Imprevisível: age junto com o Delegado.' },
  estagiario: { nome: 'ESTAGIÁRIO', descricao: 'Avança, mas recua quando você chega perto.' },
};

const THREAT_COLORS: Record<ThreatName, { top: string; base: string }> = {
  delegado: { top: '#ff7a86', base: '#d92a43' },
  agente: { top: '#ff9bdc', base: '#d4409a' },
  perito: { top: '#9af3ff', base: '#1fb5d6' },
  estagiario: { top: '#ffc46b', base: '#ee8416' },
};

const INK = '#0b1236';
const NAVY = '#1b2250';
const FLAG_YELLOW = '#ffdf00';
const FLAG_GREEN = '#12b457';
const SKIN = '#f0c08c';
const FRIGHT_BASE = '#7d86a8';
const FRIGHT_TOP = '#a6aecb';
const FRIGHT_LIGHT = '#eef1ff';

type View = 'side' | 'front' | 'back';
export type Stride = 0 | 1 | 2;

// Pose do Fugitivo: `stride` alterna os passos (0 = parado) e `fall` (0 a 1) é a queda ao ser pego.
export type FugitivoPose = { stride: Stride; fall: number };

type PersonStyle = {
  coatTop: string;
  coatBase: string;
  pants: string;
  skin: string;
  hair: string;
  shoe: string;
};

type Hand = { x: number; y: number };

function viewFor(dir: Dir): View {
  if (dir === 'up') return 'back';
  if (dir === 'down') return 'front';
  return 'side';
}

// Posição da mão da frente, no espaço local do boneco (virado para a direita quando de perfil).
function handFor(view: View, stride: Stride): Hand {
  if (view === 'side') return { x: stride === 1 ? 2.6 : stride === 2 ? -0.6 : 1.5, y: 2.3 };
  return { x: 3.7, y: stride === 2 ? 1.8 : 2.5 };
}

function bodyRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawLegs(ctx: CanvasRenderingContext2D, view: View, stride: Stride, style: PersonStyle): void {
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = style.pants;
  const hipY = 3;
  let ends: Array<[number, number]>;
  if (view === 'side') {
    ends =
      stride === 0
        ? [[-0.8, 7.2], [1, 7.2]]
        : stride === 1
          ? [[3.2, 7], [-2.8, 6.3]]
          : [[-2.6, 6.3], [3, 7]];
  } else {
    const lift = (s: Stride, leg: 0 | 1): number => (s === 0 ? 0 : (s === 1) === (leg === 0) ? 1 : 0);
    ends = [[-1.4, 7.2 - lift(stride, 0)], [1.4, 7.2 - lift(stride, 1)]];
  }
  for (const [x, y] of ends) {
    ctx.beginPath();
    ctx.moveTo(view === 'side' ? 0 : x, hipY);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillStyle = style.shoe;
    ctx.beginPath();
    ctx.ellipse(x + (view === 'side' ? 0.7 : 0), y + 0.2, 1.5, 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Boneco base, no espaço local (0,0 = centro). `extras` desenha acessórios ainda com a mesma transformação.
function drawPerson(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  dir: Dir,
  stride: Stride,
  style: PersonStyle,
  extras: (ctx: CanvasRenderingContext2D, view: View, hand: Hand, head: { x: number; y: number }) => void,
): void {
  const view = viewFor(dir);
  const bounce = stride === 2 ? -0.5 : 0;
  ctx.save();
  ctx.translate(cx, cy + 1 + bounce);
  if (dir === 'left') ctx.scale(-1, 1);

  drawLegs(ctx, view, stride, style);

  // Tronco.
  const half = view === 'side' ? 2.6 : 3.1;
  const grad = ctx.createLinearGradient(0, -2.4, 0, 3.6);
  grad.addColorStop(0, style.coatTop);
  grad.addColorStop(1, style.coatBase);
  ctx.fillStyle = grad;
  bodyRect(ctx, -half, -2.4, half * 2, 6, 1.5);
  ctx.fill();

  // Braços.
  const hand = handFor(view, stride);
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.7;
  ctx.strokeStyle = style.coatBase;
  ctx.beginPath();
  if (view === 'side') {
    ctx.moveTo(0, -1.4);
    ctx.lineTo(hand.x, hand.y);
  } else {
    ctx.moveTo(-half + 0.3, -1.4);
    ctx.lineTo(-half - 0.6, 2.4);
    ctx.moveTo(half - 0.3, -1.4);
    ctx.lineTo(hand.x - 0.6, hand.y);
  }
  ctx.stroke();
  ctx.fillStyle = style.skin;
  ctx.beginPath();
  ctx.moveTo(hand.x + 0.9, hand.y);
  ctx.arc(hand.x, hand.y, 0.9, 0, Math.PI * 2);
  if (view !== 'side') {
    ctx.moveTo(-half - 0.6 + 0.9, 2.4);
    ctx.arc(-half - 0.6, 2.4, 0.9, 0, Math.PI * 2);
  }
  ctx.fill();

  // Cabeça, cabelo e olhos.
  const head = { x: view === 'side' ? 0.4 : 0, y: -5.1 };
  ctx.fillStyle = style.skin;
  ctx.beginPath();
  ctx.arc(head.x, head.y, 2.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = style.hair;
  ctx.beginPath();
  if (view === 'side') ctx.arc(head.x, head.y, 3, Math.PI * 0.72, Math.PI * 1.92);
  else if (view === 'back') ctx.arc(head.x, head.y, 3, Math.PI * 0.85, Math.PI * 2.15);
  else ctx.arc(head.x, head.y, 3, Math.PI * 1.05, Math.PI * 1.95);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = INK;
  if (view === 'side') {
    ctx.fillRect(head.x + 1.1, head.y - 0.4, 0.9, 1.1);
  } else if (view === 'front') {
    ctx.fillRect(head.x - 1.5, head.y - 0.4, 0.9, 1.1);
    ctx.fillRect(head.x + 0.6, head.y - 0.4, 0.9, 1.1);
  }

  extras(ctx, view, hand, head);
  ctx.restore();
  ctx.lineCap = 'butt';
}

// O Fugitivo: figura verde-amarela de óculos escuros, que corre com uma mala na mão.
export function drawFugitivo(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  _size: number,
  dir: Dir,
  pose: FugitivoPose,
): void {
  if (pose.fall >= 1) return;
  ctx.save();
  if (pose.fall > 0) {
    // Tomba de lado, girando em torno dos pés, e some.
    ctx.globalAlpha = 1 - pose.fall;
    ctx.translate(cx, cy + 8);
    ctx.rotate(pose.fall * (dir === 'left' ? -1 : 1) * (Math.PI / 2));
    ctx.translate(-cx, -(cy + 8));
  }
  drawPerson(
    ctx,
    cx,
    cy,
    dir,
    pose.stride,
    { coatTop: '#fff27a', coatBase: FLAG_YELLOW, pants: '#0a9a46', skin: SKIN, hair: '#3a2410', shoe: '#0b5a2c' },
    (c, view, hand, head) => {
      // Gola e faixa verdes na camisa.
      c.fillStyle = FLAG_GREEN;
      c.fillRect(view === 'side' ? -1.6 : -2, -2.4, view === 'side' ? 3.2 : 4, 1);
      // Óculos escuros.
      c.fillStyle = INK;
      if (view === 'side') {
        c.beginPath();
        c.ellipse(head.x + 1.4, head.y - 0.1, 1.6, 1.1, 0, 0, Math.PI * 2);
        c.fill();
        c.fillRect(head.x - 2.6, head.y - 0.6, 3, 0.6);
        c.fillStyle = 'rgba(255, 255, 255, 0.75)';
        c.fillRect(head.x + 0.7, head.y - 0.6, 0.8, 0.5);
      } else if (view === 'front') {
        c.beginPath();
        c.ellipse(head.x - 1.2, head.y, 1.3, 1, 0, 0, Math.PI * 2);
        c.ellipse(head.x + 1.2, head.y, 1.3, 1, 0, 0, Math.PI * 2);
        c.fill();
        c.fillRect(head.x - 0.4, head.y - 0.3, 0.8, 0.5);
        c.fillStyle = 'rgba(255, 255, 255, 0.75)';
        c.fillRect(head.x - 1.9, head.y - 0.5, 0.8, 0.5);
      }
      // Mala marrom pendurada na mão.
      c.strokeStyle = '#7d3f10';
      c.lineWidth = 0.7;
      c.beginPath();
      c.moveTo(hand.x - 0.8, hand.y + 0.4);
      c.lineTo(hand.x - 0.8, hand.y + 1.2);
      c.moveTo(hand.x + 0.8, hand.y + 0.4);
      c.lineTo(hand.x + 0.8, hand.y + 1.2);
      c.stroke();
      c.fillStyle = '#a85a1c';
      c.fillRect(hand.x - 2.2, hand.y + 1.2, 4.4, 3.4);
      c.fillStyle = '#e8c27a';
      c.fillRect(hand.x - 0.6, hand.y + 2.4, 1.2, 0.9);
    },
  );
  ctx.restore();
}

type Accessory = (ctx: CanvasRenderingContext2D, view: View, hand: Hand, head: { x: number; y: number }, frame: number) => void;

// Quepe/boné sobre a cabeça. A sirene só existe no Delegado.
function drawCap(ctx: CanvasRenderingContext2D, head: { x: number; y: number }, view: View): void {
  const x = head.x - 3.1;
  ctx.fillStyle = NAVY;
  ctx.fillRect(x, head.y - 3.3, 6.2, 2);
  const brim = view === 'front' ? 6.8 : view === 'back' ? 6.8 : 8;
  ctx.fillRect(head.x - 3.4, head.y - 1.5, brim, 0.9);
  if (view !== 'back') {
    ctx.fillStyle = FLAG_YELLOW;
    ctx.fillRect(head.x - 0.6 + (view === 'side' ? 0.8 : 0), head.y - 3, 1.2, 1.2);
  }
}

const THREAT_ACCESSORY: Record<ThreatName, Accessory> = {
  delegado: (ctx, view, _hand, head, frame) => {
    drawCap(ctx, head, view);
    // Sirene sobre o quepe, alternando vermelho e azul.
    const red = Math.floor(frame / 10) % 2 === 0;
    ctx.fillStyle = red ? '#ff3b3b' : '#4da3ff';
    ctx.beginPath();
    ctx.arc(head.x, head.y - 3.3, 1.9, Math.PI, 0);
    ctx.fill();
  },
  agente: (ctx, view, _hand, head) => {
    drawCap(ctx, head, view);
    // Gravata.
    if (view === 'front') {
      ctx.fillStyle = NAVY;
      ctx.fillRect(-0.5, -2.2, 1, 3);
    }
  },
  perito: (ctx, _view, hand) => {
    // Lupa na mão.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(hand.x, hand.y);
    ctx.lineTo(hand.x + 1.6, hand.y - 1.6);
    ctx.stroke();
    ctx.fillStyle = 'rgba(190, 240, 255, 0.35)';
    ctx.beginPath();
    ctx.arc(hand.x + 2.5, hand.y - 2.6, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  },
  estagiario: (ctx, _view, hand) => {
    // Prancheta com texto.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(hand.x - 1.6, hand.y - 2, 4.2, 5);
    ctx.fillStyle = '#6b7396';
    ctx.fillRect(hand.x - 0.9, hand.y - 0.6, 2.8, 0.7);
    ctx.fillRect(hand.x - 0.9, hand.y + 0.9, 2.8, 0.7);
    ctx.fillStyle = NAVY;
    ctx.fillRect(hand.x - 0.4, hand.y - 2.4, 1.8, 0.8);
  },
};

const THREAT_STYLE: Record<ThreatName, Pick<PersonStyle, 'hair' | 'pants' | 'shoe'>> = {
  delegado: { hair: '#2a1a12', pants: '#1b2250', shoe: '#0b1236' },
  agente: { hair: '#5a3416', pants: '#1b2250', shoe: '#0b1236' },
  perito: { hair: '#d8d8e0', pants: '#35406e', shoe: '#0b1236' },
  estagiario: { hair: '#7a3a14', pants: '#4a5a8c', shoe: '#f4f6ff' },
};

// Passo alternado a cada 8 quadros.
function strideFor(frame: number): Stride {
  return Math.floor(frame / 8) % 2 === 0 ? 1 : 2;
}

// Um agente desenhado só com o boné: é o que volta à delegacia depois de ser dispensado.
export function drawThreatCap(ctx: CanvasRenderingContext2D, cx: number, cy: number, dir: Dir): void {
  const v = DIR_VEC[dir];
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(v.x * 0.18);
  ctx.fillStyle = NAVY;
  bodyRect(ctx, -3.6, -2.4, 7.2, 3.4, 1.4);
  ctx.fill();
  ctx.fillRect(-4.4, 0.6, 8.8, 1);
  ctx.fillStyle = FLAG_YELLOW;
  ctx.beginPath();
  ctx.arc(0, -0.7, 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawThreat(
  ctx: CanvasRenderingContext2D,
  name: ThreatName,
  cx: number,
  cy: number,
  dir: Dir,
  frame: number,
): void {
  const { top, base } = THREAT_COLORS[name];
  const s = THREAT_STYLE[name];
  const accessory = THREAT_ACCESSORY[name];
  drawPerson(
    ctx,
    cx,
    cy,
    dir,
    strideFor(frame),
    { coatTop: top, coatBase: base, skin: SKIN, ...s },
    (c, view, hand, head) => accessory(c, view, hand, head, frame),
  );
}

// Estrelinhas de tontura em volta da cabeça.
function drawDizzyStars(ctx: CanvasRenderingContext2D, cx: number, cy: number, frame: number, color: string): void {
  ctx.fillStyle = color;
  for (let i = 0; i < 3; i++) {
    const a = frame / 9 + (i * Math.PI * 2) / 3;
    const x = cx + Math.cos(a) * 4;
    const y = cy - 9 + Math.sin(a) * 1.3;
    ctx.fillRect(x - 0.35, y - 1.1, 0.7, 2.2);
    ctx.fillRect(x - 1.1, y - 0.35, 2.2, 0.7);
  }
}

// Agente atordoado pelas laranjas: encolhido, cinza, de olhos em X e com estrelas girando; pisca claro no fim do efeito.
export function drawWeakThreat(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  frame: number,
  flashLight: boolean,
): void {
  const wobble = Math.sin(frame / 4) * 0.7;
  drawPerson(
    ctx,
    cx + wobble,
    cy,
    'down',
    0,
    {
      coatTop: flashLight ? '#ffffff' : FRIGHT_TOP,
      coatBase: flashLight ? FRIGHT_LIGHT : FRIGHT_BASE,
      pants: flashLight ? '#c9cfe8' : '#56608a',
      skin: flashLight ? '#ffffff' : '#c9cfe8',
      hair: '#56608a',
      shoe: '#3a4268',
    },
    (c, _view, _hand, head) => {
      c.strokeStyle = flashLight ? '#c4162f' : INK;
      c.lineWidth = 0.8;
      c.beginPath();
      for (const ex of [head.x - 1.1, head.x + 1.1]) {
        c.moveTo(ex - 0.7, head.y - 0.8);
        c.lineTo(ex + 0.7, head.y + 0.6);
        c.moveTo(ex + 0.7, head.y - 0.8);
        c.lineTo(ex - 0.7, head.y + 0.6);
      }
      c.stroke();
    },
  );
  drawDizzyStars(ctx, cx + wobble, cy, frame, flashLight ? '#c4162f' : '#ffe27a');
}

// Energizer (as "laranjas"): a imagem fornecida, com um halo laranja pulsante. `glow` vai de 0 a 1.
// Sem a imagem (ainda carregando ou com falha), desenha uma bola laranja simples.
export function drawEnergizer(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource | null,
  cx: number,
  cy: number,
  size: number,
  glow: number,
): void {
  const halo = ctx.createRadialGradient(cx, cy, 1, cx, cy, size * 0.75);
  halo.addColorStop(0, `rgba(255, 150, 40, ${0.12 + glow * 0.3})`);
  halo.addColorStop(1, 'rgba(255, 150, 40, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(cx - size, cy - size, size * 2, size * 2);
  if (img) {
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
    return;
  }
  ctx.fillStyle = '#ff8a14';
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

// Bônus de viagem, um por tipo de "fruta" do jogo clássico.
export const BONUS_NAMES: Record<FruitKind, string> = {
  cherry: 'Passaporte',
  strawberry: 'Mala',
  orange: 'Bilhete',
  apple: 'Óculos escuros',
  melon: 'Globo',
  galaxian: 'Avião',
  bell: 'Mapa',
  key: 'Passagem dourada',
};

export function drawBonus(ctx: CanvasRenderingContext2D, kind: FruitKind, cx: number, cy: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  switch (kind) {
    case 'cherry': // passaporte
      ctx.fillStyle = '#1b2f7a';
      ctx.fillRect(-4.5, -6, 9, 12);
      ctx.fillStyle = '#12205a';
      ctx.fillRect(-4.5, -6, 1.4, 12);
      ctx.strokeStyle = FLAG_YELLOW;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0.6, -0.8, 2.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = FLAG_YELLOW;
      ctx.fillRect(-1.6, 3.4, 4.4, 0.9);
      break;
    case 'strawberry': // mala
      ctx.fillStyle = '#a85a1c';
      ctx.fillRect(-6.5, -3.5, 13, 9);
      ctx.fillStyle = '#7d3f10';
      ctx.fillRect(-6.5, 0.4, 13, 0.9);
      ctx.strokeStyle = '#7d3f10';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-2.4, -6, 4.8, 2.6);
      ctx.fillStyle = '#e8c27a';
      ctx.fillRect(-1, 0, 2, 2);
      break;
    case 'orange': // bilhete de avião
      ctx.fillStyle = '#f4f6ff';
      ctx.fillRect(-7, -4, 14, 8);
      ctx.fillStyle = '#1f4fd8';
      ctx.fillRect(-7, -4, 14, 2);
      ctx.fillStyle = '#8b93b4';
      ctx.fillRect(-5.5, -0.6, 7, 0.9);
      ctx.fillRect(-5.5, 1.6, 5, 0.9);
      ctx.fillStyle = '#ee2f48';
      ctx.fillRect(3.6, -0.4, 2, 3.4);
      break;
    case 'apple': // óculos escuros
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.ellipse(-3.8, 0, 3.4, 2.6, 0, 0, Math.PI * 2);
      ctx.ellipse(3.8, 0, 3.4, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-1, -0.8, 2, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(-5.2, -1.4, 1.4, 0.9);
      ctx.fillRect(2.4, -1.4, 1.4, 0.9);
      break;
    case 'melon': // globo
      ctx.fillStyle = '#1f6fe0';
      ctx.beginPath();
      ctx.arc(0, -0.6, 5.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = FLAG_GREEN;
      ctx.beginPath();
      ctx.ellipse(-1.6, -1.8, 2.4, 1.8, 0.4, 0, Math.PI * 2);
      ctx.ellipse(2, 1.6, 1.8, 1.4, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7d86a8';
      ctx.fillRect(-0.5, 5, 1, 1.6);
      ctx.fillRect(-2.6, 6.2, 5.2, 0.9);
      break;
    case 'galaxian': // avião
      ctx.fillStyle = '#f4f6ff';
      ctx.beginPath();
      ctx.moveTo(-6.5, 0.8);
      ctx.lineTo(5.5, -1);
      ctx.lineTo(7, 0);
      ctx.lineTo(5.5, 1.2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#9bb3ff';
      ctx.beginPath();
      ctx.moveTo(-1.5, 0);
      ctx.lineTo(1.5, -5.6);
      ctx.lineTo(3, -5.6);
      ctx.lineTo(2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-1.5, 1);
      ctx.lineTo(1.5, 6);
      ctx.lineTo(3, 6);
      ctx.lineTo(2, 1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ee2f48';
      ctx.fillRect(-6.5, -2.2, 1.4, 3);
      break;
    case 'bell': // mapa com rota tracejada e X
      ctx.fillStyle = '#f0dca8';
      ctx.fillRect(-6, -5, 12, 10);
      ctx.fillStyle = '#d8c080';
      ctx.fillRect(-2, -5, 0.8, 10);
      ctx.fillRect(2, -5, 0.8, 10);
      ctx.fillStyle = '#7d3f10';
      for (let i = 0; i < 4; i++) ctx.fillRect(-5 + i * 2, 2 - (i % 2) * 2, 1, 1);
      ctx.strokeStyle = '#ee2f48';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(2.8, -3.6);
      ctx.lineTo(5, -1.4);
      ctx.moveTo(5, -3.6);
      ctx.lineTo(2.8, -1.4);
      ctx.stroke();
      break;
    case 'key': // passagem dourada
      ctx.fillStyle = FLAG_YELLOW;
      ctx.fillRect(-7, -4, 14, 8);
      ctx.fillStyle = '#c99a1e';
      ctx.fillRect(-7, -4, 14, 1.4);
      ctx.fillRect(2, -2.6, 0.8, 6.6);
      ctx.fillStyle = '#7d5a00';
      ctx.fillRect(-5.5, -0.6, 6, 0.9);
      ctx.fillRect(-5.5, 1.6, 4, 0.9);
      break;
  }
  ctx.restore();
}
