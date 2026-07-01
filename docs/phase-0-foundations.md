# Fase 0 — Fundações

> Pré-requisito de tudo. Sem nada aqui, nenhuma fase posterior faz sentido.
> **Duração estimada:** curta. Foco em esqueleto e visual mínimo.

## Objetivo

Ver o grid na tela, com tiles de minério destacados e um cursor de tile que acompanha o mouse. Ainda não há construção nem simulação.

## Entregáveis

1. `GameLoop.ts` com fixed timestep 60Hz + acumulador + `_alpha`.
2. `game/core/Direction.ts` e `game/core/Grid.ts`.
3. `game/map/GameMap.ts` + `mapData.ts` com o mapa fixo 40x25 (veio central de minério).
4. `rendering/Renderer.ts` que desenha: fundo, tiles `ore`, bordas de grid.
5. `input/InputController.ts` capaz de converter coord. de tela → tile sob o mouse.
6. `input/Camera.ts` com pan (botão do meio) + zoom (wheel). Render usa `Camera` para transformar world→screen.
7. `components/GameCanvas.tsx` que instancia `Game` e roda o loop.
8. Substituir `App.tsx` por layout com `<GameCanvas/>` ocupando a área do jogo.

## Detalhes técnicos

### Direções (`Direction.ts`)

```ts
export type Direction = 'N' | 'E' | 'S' | 'W'
export const DIRS: Record<Direction, { dx: number; dy: number }> = {
  N: { dx:  0, dy: -1 },
  E: { dx:  1, dy:  0 },
  S: { dx:  0, dy:  1 },
  W: { dx: -1, dy:  0 },
}
export function opposite(d: Direction): Direction { /* ... */ }
export function rotateCW(d: Direction): Direction { /* N→E→S→W */ }
```

Convenção do grid: `+x` para leste, `+y` para **sul** (canvas). Por isso `N = -y`.

### Mapa 40x25 com veio central (`mapData.ts`)

- Borda inteira do grid é `empty` (margem de 1 tile) apenas para безопас нāo colar nada na beira.
- Veio central: um retângulo ~10x6 de `ore` em torno do centro do mapa (alias `x=15..24, y=10..14`). Tamanho final a ajustar visualmente.
- `GameMap` expõe: `width`, `height`, `tileAt(x,y): TileKind`, e um `buildings: Map<string, Building>` indexado por `${x},${y}`. Buildings multi-tile (ex.: furnace 2×2) são registradas sob **todas** as chaves de sua footprint. Remoção apaga todas as chaves.
- Função `key(x,y)` padronizada e usada em todo o projeto via `Grid.ts`.

### Grid (`Grid.ts`)

Encapsula helpers sobre o `GameMap.buildings`:
- `getBuilding(x,y): Building | undefined`
- `setBuilding(b)`, `removeBuilding(x,y)`
- `isFree(x,y)` (`tile === 'empty' && !buildings.has(key)`)
- `canPlace(b): boolean` — verifica se toda a footprint está livre e dentro dos limites
- `isOre(x,y)`, `inBounds(x,y)`.

### GameLoop (`GameLoop.ts`)

- `start()` registra `requestAnimationFrame(frame)`; `stop()` cancela.
- Acumulador com clamp de 0.25s (anti-espiral).
- Chama `sim.tick(STEP)` quantas vezes couber; depois `renderer.render(alpha)`.
- Nesta fase o `sim` e `renderer` são mock — só desenha o mapa e bounding box do cursor. O objetivo é validar o loop correto e não stuttering.

### Renderer mínimo (`Renderer.ts`)

- Recebe `Camera`, `GameMap`, e o estado do cursor (tile sob o mouse).
- Limpa com cor de fundo (ex.: `#1a1d23`).
- Para cada tile:
  - `empty`: nada (ou cor sutil de floor);
  - `ore`: retângulo marrom/acinzentado com leve textura (cor sólida é suficiente).
- Desenha linhas de grid finas (`strokeRect`) em cor alpha baixa.
- Cursor: `strokeRect` amarelo no tile sob o mouse.
- Aplica `ctx.save()`, translada/escala pela `Camera`, desenha, `ctx.restore()`.

### Câmera (`Camera.ts`)

```ts
interface Camera {
  x: number; y: number    // world position under canvas origin (top-left)
  zoom: number            // scale factor
  screenToWorld(sx, sy): { x, y }
  worldToScreen(wx, wy): { x, y }
  pan(dx, dy)             // drag by delta screen pixels (ajusta x,y por zoom)
  zoomBy(factor, centerScreen) // zoom toward cursor
}
```

Limites de zoom: 0.5x a 3x. Inicial zoom escolhido para o cabeçalho inteiro 40x25 ficar visível.

### Input básico (`InputController.ts`)

- Anexa listeners no `<canvas>`: `mousemove`, `mousedown`, `mouseup`, `wheel`, `keydown`/`keyup` em `window`.
- Mantém estado interno (botões pressionados, mouse pos).
- Converte mouse screen → world via `Camera` → tile (Math.floor).
- Emite para um callback `onTileHover(x,y)` que o Renderer usa para desenhar o cursor.
- Botão do meio → inicia pan (track de drag delta).

### `GameCanvas.tsx`

```tsx
export function GameCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const game = new Game(ref.current!)
    game.start()
    return () => game.stop()
  }, [])
  return <canvas ref={ref} />
}
```

`Game` compõe `Camera`, `GameMap`, `Renderer`, `InputController`, `GameLoop` e os amarra.

### App.tsx

Layout simples:
- Topo: barra horizontal (`BuildBar.tsx` — vazio/placeholder nesta fase).
- Corpo: `<GameCanvas/>` ocupando `flex: 1`.
- CSS mínimo: zero margem do `<body>`, canvas `display: block; width: 100%; height: 100%`.

## Critérios de aceite

- [ ] `npm run dev` mostra a área do jogo com o grid 40x25.
- [ ] Veio central de minério é visível com cor diferenciada.
- [ ] Mover o mouse destaca o tile atual com um retângulo amarelo e acompanha mesmo após pan/zoom.
- [ ] Botão do meio + arrastar faz pan; wheel faz zoom em direção ao cursor; não stuttering.
- [ ] `npm run lint` e `npm run build` passam sem erros.
- [ ] Sem re-renders perceptíveis do React durante hover/pan/zoom (loop está fora do React).

## Riscos / armadilhas

- **Coordenadas Canvas vs CSS**: `canvas.width/height` precisam acompanhar `clientWidth/Height` via `ResizeObserver`, senão fica borrado. Tratar no `GameCanvas` resize handler.
- **DPR (device pixel ratio)**: para nitidez multiplicar por `window.devicePixelRatio`. Ajustar `Camera` para trabalhar em unidades CSS (não pixels físicos).
- **Picking do tile sob o mouse**: cuidado com offset do canvas relativo à página (`getBoundingClientRect()`).