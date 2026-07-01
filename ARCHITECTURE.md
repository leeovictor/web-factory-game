# Arquitetura — Protótipo Simulador de Esteiras

> Documento de referência viva. Atualize conforme decisões mudam.
> Stack confirmada: **Vite + React 19 + TypeScript + HTML5 Canvas**.

## 1. Princípios

1. **Canvas dono do jogo, React dono do chrome.** O loop principal roda fora do ciclo de render do React. React apenas hospeda o `<canvas>` e desenha a UI de seleção/contadores.
2. **Camadas unidirecionais.** `core` (lógica pura) ← `simulation` (tick) ← `rendering` (desenha o estado) ← `input` (traduz mouse/teclado em ações). Nenhuma camada posterior conhece a anterior.
3. **Determinismo first.** Tick fixo 60Hz; render interpola com `_alpha`. Mantém a porta aberta para save/replay futuro sem refatoração.
4. **Sem acoplamento React ↔ tick.** O jogo expõe um emitter mínimo de eventos (`storage-count`, `fps`); React só assina esses eventos esparsos. Não há `useState` por item.
5. **Simples primeiro, extensível depois.** Tudo em código TS plano; sem state managers, sem engines externas. Estrutura pensada para crescer, mas sem over-engineering no protótipo.

## 2. Estrutura de diretórios

```
src/
  game/                       # núcleo puro, zero React
    core/
      Direction.ts            # enum N/E/S/W + helpers (delta, opposite)
      Grid.ts                 # grid 2D indexado por (x,y); lookup de tile/building
    entities/
      Building.ts            # tipo-base + variantes: Miner, Belt, Furnace, Storage, Inserter
      Item.ts                # item físico: type + posição contínua tile-local (0..1)
    map/
      GameMap.ts             # tiles fixos {empty, ore}; buildings storage (multi-tile indexadas por key(x,y))
      mapData.ts             # mapa 40x25 com veio central de minério
    simulation/
      Simulation.ts          # tick(dt=1/60): orquestra produção + movimento + inserter
      Movers.ts              # movimento físico dos itens pelas esteiras
      Production.ts          # lógica de mineradora (eject) e fornalha (process)
      InserterArm.ts         # lógica+ciclo do inserter (pick/place)
  rendering/
    Renderer.ts              # desenha grid, buildings, itens, overlay de placement
    Palette.ts               # cores/formas por tipo (sem assets externos)
  input/
    InputController.ts       # listeners mouse/teclado → ações; conversão screen→world→tile
    Camera.ts                # pan (botão do meio/drag) + wheel zoom
    BuildSystem.ts           # seleção, placement com ghost, rotação R, remoção
  GameLoop.ts                # requestAnimationFrame + acumulador fixed timestep
  Game.ts                    # composição raiz: cria map/sim/renderer/input e liga o loop
  eventBus.ts                 # emitter tipo-tipoado mínimo (game → React)
  types.ts                   # tipos/interfaces compartilhados
  constants.ts               # GRID_W, GRID_H, TILE_SIZE, BELT_SPEED, timings...

components/
  GameCanvas.tsx             # <canvas ref> + useEffect que instancia Game
  BuildBar.tsx               # 5 botões (Miner/Belt/Furnace/Storage/Inserter) + dir atual
  Hud.tsx                    # contadores (barras armazenadas), FPS opcional
hooks/
  useGameEvents.ts           # assina bus e retorna {storageCount, fps} via useState esparsa
App.tsx                      # layout: <GameCanvas/> + <BuildBar/> + <Hud/>
```

## 3. Decisões técnicas consolidadas

| Tópico                       | Decisão                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| Mapa                         | Fixo 40x25 tiles, grande veio central de minério (sem procedural)                          |
| Tipos de construção          | **5**: Mineradora, Esteira, Fornalha, Armazenador, Inserter                                |
| Capacidade das esteiras      | 1 item por tile; item ocupa todo o tile (posição contínua 0..1)                            |
| Loop principal               | requestAnimationFrame independente; React não ticka                                         |
| Timestep                     | **Fixed 60Hz**; render desacoplado com interpolação `_alpha`                                |
| Dimensões das buildings      | `miner`/`belt`/`inserter` = 1×1; `furnace`/`storage` = 2×2 (ocupa 4 tiles)                    |
| Visual                       | Formas chapadas + cores; setas de direção. Zero assets externos                             |
| Orientação das máquinas      | Sem I/O fixo nas laterais; entradas/saídas mediadas por inserters                          |
| Mineradora (exceção)         | Tem direção de saída; ejeta minério no tile à frente se houver esteira ou máquina compatível |
| Inserter                     | Ocupa 1 tile, tem direção D. **Pega do tile à frente, solta no tile atrás.** Ciclo fixo ~1 item/s com animação de braço. Source/dest ∈ {esteira, fornalha, armazenador}; **não interage com mineradora** |
| Rotação no placement         | Tecla **R** antes do clique para girar direção N→E→S→W; ghost preview mostrando a seta     |
| Pós-placement                | Permite clicar em building existente e **R** para girar/remover                              |
| Remoção                      | Descarta item em trânsito (sem inventário do protótipo)                                     |
| Câmera                        | Pan (arrastar botão do meio ou meio+esquerdo) + zoom com wheel                            |
| Itens                        | 2 tipos: `iron_ore`, `iron_bar`. Visíveis sobre esteiras e na mão do inserter              |
| Curvas de esteiras           | Curvas emergentes: `inputDir` detectado dos vizinhos. Arco de ¼ círculo no render. U-turn/merge não tratados no protótipo. |
| Fluxo canônico (critério)    | Mineradora →Esteiras → Fornalha →Esteiras → Armazenador; **2 inserters** intermediam belt↔furnace |

### Mínimo de inserters no fluxo canônico

A cadeia completa exige, no mínimo:

```
[Mine] --belt--> [Belt ...] --inserter--> [Furnace] --inserter--> [Belt ...] --inserter--> [Storage]
```

Total: **3 inserters** (1 entre esteira e fornalha, 1 da fornalha p/ a esteira, 1 da esteira p/ o armazenador). A mineradora precisa de **zero** inserters porque ejeta direto na esteira.

## 4. Game loop — fixed timestep com interpolação

```ts
// pseudocódigo de GameLoop.ts
let acc = 0
const STEP = 1 / 60
let last = performance.now()
function frame(now: number) {
  acc += (now - last) / 1000
  last = now
  // clamp para evitar espiral da morte
  if (acc > 0.25) acc = 0.25
  while (acc >= STEP) {
    simulation.tick(STEP)   // lógica determinística
    acc -= STEP
  }
  renderer.render(acc / STEP)  // _alpha interpola posições visuais dos itens
  requestAnimationFrame(frame)
}
```

- `Item` guarda `prevPos` e `pos` (ambas 0..1 dentro do tile). Render interpola `prevPos + (pos − prevPos) * _alpha`.
- No fim de cada tick lógico, `prevPos := pos`.

## 5. Ordem de resolução dentro de um tick

Para evitar races na borda entre tiles, cada `simulation.tick(dt)` executa nesta ordem exata:

1. **Produção**: mineradoras processam countdown → se pronto e tile de saída aceita, eject; caso contrário, esperam em slot interno.
2. **Fornalhas**: decrementam timer de processamento; se pronto e saída/slot de saída livre, produzem barra no slot de saída.
3. **Inserters**: avançam animação; ao fim do ciclo de pick (braço na frente) tenta retirar do tile à frente; ao fim do ciclo de place (braço atrás) tenta depositar no tile atrás. Cada inserter tem estado `idle | picking | placing`.
4. **Movimento das esteiras**: para cada esteira, mover item em `pos` na direção da esteira a `+BELT_SPEED*dt`; quando `pos >= 1`:
   - se o próximo tile é esteira vazia → transfere (item passa a viver no próximo tile com `pos -= 1`).
   - se é máquina com slot de entrada livre → item é absorvido (caso raro/direto; geralmente via inserter).
   - senão → `pos = 1` (bloqueado; item aguarda).

**Importante**: a iteração de movimento deve respeitar dependência entre tiles vizinhos — processar do fim da cadeiaStamped para o início evita item "saltar" dois tiles no mesmo tick. Implementação simples: iterar todos os itens ordenados por (distância até destino ao longo da direção) decrescente. Detalhado em `phase-2`.

## 6. Tipos compartilhados (resumo)

```ts
type Direction = 'N' | 'E' | 'S' | 'W'
type ItemType  = 'iron_ore' | 'iron_bar'
type TileKind  = 'empty' | 'ore'
type BuildingKind = 'miner' | 'belt' | 'furnace' | 'storage' | 'inserter'

interface Building {
  id: string
  kind: BuildingKind
  x: number; y: number          // tile-âncora (canto superior-esquerdo da footprint)
  width: number; height: number // em tiles (furnace/storage = 2×2)
  direction: Direction           // saída (miner/furnace via inserter/belt)
  // estado específico por kind (slots, timers, etc.) — ver entidades
}
interface Item {
  id: string
  type: ItemType
  onTile: { x: number; y: number }
  pos: number       // 0..1 dentro do tile no sentido da direção de saída da esteira
  prevPos: number
  inputDir: Direction // direção de entrada no tile atual (para curvas)
  carrying?: boolean // true quando na mão de um inserter (não sobre esteira)
}
```

## 7. Comunicação React ↔ jogo

- `eventBus.ts` expõe `on(type, cb)` e `emit(type, payload)` — tipado, sem dependências.
- O jogo emite:
  - `storage-count` (número) — só quando muda.
  - `fps` (número) — no máximo 1x por segundo (throttle interno).
  - `selection` (BuildingKind | null) — quando ghost/placement muda (opcional).
- React lê via `useGameEvents()` hook com `useState` esparsa; **nenhum** `setState` por tick.
- A seleção atual de tipo de construção vive no React e é repassada por referência mutável em `BuildSystem.setCurrent(kind)` (não causa re-render no jogo).

## 8. Convenções de código

- TypeScript estrito; `strict: true` já está ligado no `tsconfig.app.json`.
- **Sem comentários** salvo quando o usuário solicitar explícito患上 (alinhado às instruções globais).
- Nomenclatura: arquivos PascalCase para entidades (`Building.ts`), camelCase para helpers (`mapData.ts`).
- Sem reacreditar libs externas além das já no `package.json`. Caso algo pareça exigir (ex.:gence emitter tipada), escrever arquivo próprio mínimo em vez de adicionar dependência.
- Testes: o repositório não tem runner configurado. Em princípio, validaremos pelo critério de sucesso (rodar `npm run dev` e observar). Se surgir necessidade isolamos pure logic em `core/` e usamos vitest apenas se solicitado.

## 9. Como rodar

```bash
npm run dev      # Vite dev server
npm run build    # tsc -b && vite build
npm run lint
```

## 10. Fases

- `docs/phase-0-foundations.md` — grid, mapa, loop, render mínimo, cursor.
- `docs/phase-1-building.md` — placement/rotação/remoção + câmera + BuildBar.
- `docs/phase-2-items-belts.md` — itens físicos, movimento das esteiras.
- `docs/phase-3-production.md` — mineradora, fornalha, inserters.
- `docs/phase-4-storage-loop.md` — armazenador, HUD, cadeia completa.
- `docs/phase-5-polish.md` — feedback, restart, debug overlay.