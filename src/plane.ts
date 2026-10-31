// Avião visto de lado, parado na pista com um X vermelho de "voo cancelado".
// Um caractere por pixel; '.' é transparente. Desenhado à mão para a tela de fim.
export const PLANE_ROWS: readonly string[] = [
  '.KK.............................',
  '.KBK..........RR......RR........',
  '.KBBK..........RR....RR.........',
  '.KBBBK..........RR..RR..........',
  '.KBBBBKKKKKKKKKKKRRRRKKKKKK.....',
  '.KBBBBWWWWWWWWWWWWRRWWWWWWWKK...',
  '.KBBWWYYWYYWYYWYYRRRRWYYWWBBWK..',
  '.KPPPPPPPPPPPPPPRRPPRRPPPPPPPPK.',
  '.KWWWWWWWWWWWWWRRWWWWRRWWWWWWWWK',
  '..KBBBBBBBBBBBRRBBBBBBRRBBBBBBK.',
  '...KKKKKKKKKKKKKKKKKKKKKKKKKKK..',
  '...........KBBBBBBBBBBK...G.....',
  '.........KBBBBBBBBBBK.....G.....',
  '.........KKKKKKKKKKK......G.....',
  '................G.........G.....',
  '...............GWG.......GWG....',
  '...............GGG.......GGG....',
  'YYYY..YYYY..YYYY..YYYY..YYYY..YY',
];

// K: contorno (claro o bastante para aparecer no fundo azul-marinho); W: branco-gelo;
// B: azul-violeta (cauda, ventre, asa, janela do cockpit); Y: janelas e faixa da pista;
// P: listra rosa; R: X de cancelado; G: trem de pouso e rodas.
export const PLANE_PALETTE: Readonly<Record<string, string>> = {
  K: '#2a2f6a',
  W: '#eef4ff',
  B: '#5a6cf0',
  Y: '#ffe35c',
  P: '#e0508a',
  R: '#ff3b3b',
  G: '#8a8fb0',
};

// Desenha o mapa no canvas, um quadrado de `pixel` x `pixel` por caractere opaco.
export function paintPlane(canvas: HTMLCanvasElement, pixel: number): void {
  const cols = PLANE_ROWS[0].length;
  canvas.width = cols * pixel;
  canvas.height = PLANE_ROWS.length * pixel;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('paintPlane: contexto 2d indisponível no canvas');
  ctx.imageSmoothingEnabled = false;
  PLANE_ROWS.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      const color = PLANE_PALETTE[ch];
      if (!color) throw new Error(`paintPlane: caractere sem cor na paleta: "${ch}" (${x}, ${y})`);
      ctx.fillStyle = color;
      ctx.fillRect(x * pixel, y * pixel, pixel, pixel);
    }
  });
}
