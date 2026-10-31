// "Dicas de fuga": uma por fase, todas baseadas nas regras reais do jogo.
export const TIPS: readonly string[] = [
  'O túnel lateral é um atalho: os agentes ficam mais lentos nele.',
  'Os agentes alternam entre se espalhar pelos cantos e partir para cima de você. Aproveite as pausas.',
  'Comer vários agentes atordoados seguidos vale cada vez mais: 200, 400, 800 e 1600 pontos.',
  'O bônus aparece no centro do labirinto depois de 70 e de 170 passagens coletadas.',
  'Você ganha uma vida extra ao chegar em 10 000 pontos.',
  'Em alguns cruzamentos perto da casa os agentes não podem subir. Use isso para despistar.',
  'Quando o efeito das laranjas está acabando, os agentes piscam: hora de voltar a fugir.',
  'A cada fase os agentes ficam mais rápidos e as laranjas duram menos.',
];

export function tipForLevel(level: number): string {
  const i = Math.max(0, Math.floor(level) - 1) % TIPS.length;
  return TIPS[i];
}
