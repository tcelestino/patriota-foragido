// Imagem do energizer (as "laranjas"): PNG com fundo transparente em public/assets.
export const ENERGIZER_URL = '/assets/bolas.png';
const TIMEOUT_MS = 5000;

// Nunca rejeita: falha ou demora vira null e o render usa um desenho simples de reserva.
export function loadEnergizer(url: string = ENERGIZER_URL): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(null), TIMEOUT_MS);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      console.warn(`imagem ${url} indisponível; usando desenho de reserva`);
      resolve(null);
    };
    img.src = url;
  });
}
