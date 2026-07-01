# Fase 1 — Building System

> Adiciona a capacidade de **colocar, girar e remover** construções.
> A simulação ainda não existe; apenas o estado de placement.

## Objetivo

O jogador consegue selecionar um dos 5 tipos na barra superior, mover o mouse sobre o mapa com um **ghost preview** mostrando a seta de direção, apertar **R** para girar a direção, **clicar com o botão esquerdo** para confirmar placement, e **clicar com o botão direito** (ou tecla X) para remover. O canvas reflete o estado em tempo real.

## Entregáveis

1. `game/entities/Building.ts` com a interface base + 5 variantes (ainda sem lógica de produção, só dados).
2. `game/simulation/Simulation.ts` (vazio — só existe para o Renderer ler estado).
3. `input/BuildSystem.ts`: orquestra seleção, ghost, rotação, placement, remoção.
4. `rendering/Renderer.ts` estendido para desenhar buildings + ghost.
5. `rendering/Palette.ts`: mapa de cores/formas por kind.
6. `components/BuildBar.tsx` + `hooks/useGameEvents.ts` + ponte básica com `eventBus`.
7. `BuildSystem` mostrando grid de ocupação atual no Renderer.

## Detalhes técnicos

### Entidade Building (`entities/Building.ts`)

```ts
export type BuildingKind = 'miner' | 'belt' | 'furnace' | 'storage' | 'inserter'

export interface Building {
  id: string
  kind: BuildingKind
  x: number; y: number
  direction: Direction
  // estado por kind — inicializado vazio/predefinido nesta fase
  // miner:     { internal: Item | null; cooldown }
  // belt:      { item: Item | null }
  // furnace:   { input: Item | null; processing: Item | null; timer: number; output: Item | null }
  // storage:   { count: number; itemTypes: Set<ItemType> }
  // inserter:  { arm: 'front'|'back'; phase: number; holding: Item | null }
}
```

Cada instância ganha `id` incremental simples (`crypto.randomUUID()` ou contador TS simples).

### Regras de placement (`BuildSystem.ts`)

| Kind       | Tile alvo válido                                | Direção relevante                          | Footprint |
| ---------- | ----------------------------------------------- | ------------------------------------------ | --------- |
| miner      | tile `ore` (sem building)                       | saída — aponta para onde ejeta             | 1×1       |
| belt       | tile `empty` (sem building)                     | sentido de transporte                      | 1×1       |
| furnace    | todos os tiles da footprint `empty`             | (informativa; sem I/O fixo)                | 2×2       |
| storage    | todos os tiles da footprint `empty`             | (informativa)                              | 2×2       |
| inserter   | tile `empty` (sem building)                     | define onde pick (frente) e place (`back)  | 1×1       |

- **Não pode sobrepor**: toda a footprint deve estar livre (`Grid.canPlace(b) === true`). Se qualquer tile da área já tiver building, placement é recusado (overlay vermelho no ghost).
- **Mineradora só sobre `ore`**: ghost vermelho se inválido. Regra aplica-se ao tile principal `(x,y)` da mineradora (1×1).
- **Default direction no ghost**: `E` ao iniciar o programa. **R** gira CLOCKWISE: N→E→S→→W→N.
- O ghost re-renderiza a cada rotação sem precisar mover o mouse.

Inserir/Remover fluem por funções puras que devolvem `Result<{ ok: true } | { ok: false, reason: string }>` para o Renderer mostrar cor do ghost.

### Remoção

- Botão direito sobre **qualquer tile** de uma building remove a **building inteira** (todas as tiles da footprint).
- Atalho alternativo: segurar `X` + clicar com esquerdo.
- Regras de mineradora existenciais: só podem ser colocadas sobre `ore`; ao remover, o tile volta a ser `ore` (não se consome).
- Buildings multi-tile (`furnace`, `storage` 2×2): remoção limpa todas as chaves do `buildings` map.

### Ghost preview

- `BuildSystem` mantém `current: { kind: BuildingKind | null, direction: Direction }`.
- A cada mouse-move em novo tile, solicita validação e guarda `ghost: { x, y, valid: boolean }`.
- Renderer desenha:
  - Se `current.kind !== null` e `hover` em tile: bounding shape semi-transparente cobrindo toda a **footprint** do kind; seta no centro;
  - **cor verde** se válido, **vermelho** se inválido;
  - seta de direção bem legível (linha + ponta preenchida).

### Render das buildings (`Renderer.ts` estendido)

Por kind (versão chapada, sem sprite):

| Kind     | Visual                                                                                    | Footprint draw |
| -------- | ----------------------------------------------------------------------------------------- | -------------- |
| miner    | Retângulo cinza-escuro com picareta/entalhe marrom desenhado em canvas; saída: pequena seta amarela | 1×1            |
| belt     | Retângulo mais claro com **faixa de transporte** no sentido da seta + seta              | 1×1            |
| furnace  | Retângulo alaranjado 2×2 com uma "fornalha" (retângulo lateral)                              | 2×2 (64×64 px) |
| storage  | Retângulo azul/ciano 2×2 com símbolo "box"                                                   | 2×2 (64×64 px) |
| inserter | Retângulo menor com **braço** estendido à frente (linha/círculo + cor)                    | 1×1            |

Tudo em `Palette.ts` para centralizar cores.

### BuildBar (React)

- 5 botões (icons em SVG inline simples ou só texto colorido).
- Estado React: `selectedKind`. Ao clicar muda. Também via teclas `1`..`5` registradas no `InputController`.
- Botão ativo destacado.
- Repassa seleção: `game.buildSystem.setCurrent(kind)` via ref (não re-render do jogo).
- Não há botão "none/deselecionar" nesta fase; seleção é obrigatória. R pode ser usada com seleção existente.

### EventBus / ponte

- Nesta fase praticamente inerte: `BuildBar` assina `None` ainda. A ponte é criada para usar na fase 4.
- Garantir que mutar `selectedKind` no React **não** dispara re-render do `<canvas>` (GameCanvas não depende dele).

## Critérios de aceite

- [ ] Posso clicar em cada um dos 5 tipos na barra; botão fica destacado.
- [ ] Mover o mouse sobre o mapa mostra ghost com seta na cor correta (verde/vemelho).
- [ ] Apertar R sem mover o mouse gira o ghost no mesmo tile.
- [ ] Clicar com esquerdo posiciona a building (ícone persistente aparece).
- [ ] Clicar com direito remove a building sob o cursor.
- [ ] Mineradora só pode ser colocada sobre minério; ghost vermelho em outros tiles.
- [ ] Não é possível sobrepor duas buildings; ghost fica vermelho.
- [ ] Pan/zoom continuam funcionando. Durante pan com botão do meio, **não** dispara clique de placement ao soltar (debounce por drag threshold).
- [ ] `npm run lint` + `npm run build` passam.

## Riscos / armadilhas

- **Clique vs drag**: distinguir pan (drag) de clique de placement. Solução: track `mousedownPos` + `mouseupPos`; se deslocar > N px no botão do meio durante o tempo, suprime placement. Definir threshold ~5px.
- **Botão direito**: prevenir menu de contexto do browser com `event.preventDefault()`.
- **R enquanto mouse fora do canvas**: decidido ignorar (R só age se hover ativo). Documentar.
- **Rotação sem mudança de tile**: garantit que um `R` sozinho re-renderiza o ghost. Basta garantir que `BuildSystem.rotateCW()` emita um sinal que dispara novo frame — ou o próprio loop já re-renderiza continuamente, e o ghost só é estado mutável lido a cada frame (simples).