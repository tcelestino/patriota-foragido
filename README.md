# Patriota Foragido: Fugindo em Busca de Atenção

Patriota Foragido é uma sátira em pixel art para navegador (TypeScript, Vite e Vitest), na mecânica clássica de labirinto. Você controla um fugitivo que coleta passagens e escapa de quatro agentes. Os personagens são inventados e não representam pessoas, investigações ou fatos reais.

## Comandos

- `npm run dev`: servidor de desenvolvimento
- `npm test`: roda os testes (Vitest)
- `npm run build`: checa os tipos e gera a pasta `dist/`
- `npm run preview`: serve o resultado do build localmente

## Controles

- Setas ou WASD: mover
- P ou Escape: pausar e retomar (só depois de começar a partida)
- Enter, Espaço ou toque: começar, retomar após a pausa e reiniciar após o fim de jogo
- Celular: deslizar o dedo (swipe) muda a direção
- Botões: COMEÇAR, PAUSAR/RETOMAR, REINICIAR e TENTAR DE NOVO

## Personagens

- Fugitivo: disco verde-amarelo de óculos escuros, com uma mala nas costas.
- Delegado (vermelho, sirene), Agente (rosa, quepe), Perito (ciano, lupa) e Estagiário (laranja, prancheta). Cada um segue a IA do fantasma clássico correspondente.
- Laranjas (energizer): usa `public/assets/bolas.png`, a imagem `bolas.jpeg` convertida para PNG com fundo transparente. Deixa os agentes cinzas e atordoados.
- Bônus de viagem no centro do labirinto: passaporte, mala, bilhete, óculos escuros, globo, avião, mapa e passagem dourada.
- Fim de jogo: "VOO CANCELADO!" com um avião em pixel art.

## Labirinto

O campo tem 32x31 tiles, simétrico, com 274 passagens (270 bolinhas e 4 laranjas). A casa dos agentes e o túnel ficam no centro e na linha 14. Os testes validam a simetria e que todas as passagens são alcançáveis. As posições do centro derivam de `CENTER_COL` em `src/maze.ts`.

O canvas ocupa o máximo do espaço disponível. Como os personagens e as paredes são vetoriais, a escala não precisa ser inteira (`src/layout.ts`).

## Interface

- HTML e CSS ao redor do canvas, em estilo escuro com vidro e neon. A fonte Press Start 2P fica no título, nos números e nos botões principais.
- Telas largas: placar e botões à esquerda, campo no centro, personagens e dicas de fuga à direita. Telas estreitas: tudo empilhado, e a fileira de personagens aparece na tela inicial.
- O botão SOM está escondido por enquanto (atributo `hidden` em `index.html`), porque ainda não há áudio real. A preferência continua sendo guardada em `localStorage`.

## Estrutura do projeto

- `src/main.ts`: bootstrap, canvas, loop de quadros, ligação dos botões
- `src/game.ts`, `src/threat.ts`, `src/threatAi.ts`, `src/fugitivo.ts`, `src/movement.ts`, `src/maze.ts`, `src/levels.ts`, `src/modeTimer.ts`, `src/loop.ts`, `src/input.ts`: regras e movimento do jogo
- `src/render.ts`: fundo, paredes com cantos arredondados e brilho, passagens e atores
- `src/sprites.ts`: fugitivo, agentes e bônus desenhados em vetor, e o desenho das laranjas
- `src/energizer.ts`: carga da imagem das laranjas, com desenho de reserva
- `src/legend.ts`: ícones do painel lateral, com os mesmos desenhos do jogo
- `src/plane.ts`: avião em pixel art da tela de fim
- `src/tips.ts`: dicas de fuga, uma por fase
- `src/hud.ts`, `src/screens.ts`, `src/ui.ts`, `src/session.ts`, `src/sound.ts`, `src/storage.ts`, `src/layout.ts`, `src/style.css`: interface e estado da sessão
- `public/assets/`: imagem das laranjas
- `tests/`: testes unitários

## Fonte

Press Start 2P (licença OFL), empacotada no build via `@fontsource/press-start-2p`.

## Simplificações conhecidas

- Sem som real (botão escondido)
- Sem cortes (cutscenes) entre fases
- Sem cornering do fugitivo
- Sem contador global de liberação dos agentes após a morte
