# Fase 2 — Itens e movimentação de esteiras

> Traz os itens físicos para a tela e faz as esteiras funcionarem.
> **Sem produção ainda**: itens são injetados manualmente em uma esteira para validar o movimento.

## Objetivo

Itens visíveis se deslocando continuamente ao longo das esteiras, transferindo entre tiles quando o tile à frente está vazio, e empilhando quando bloqueado. Validar a ordem de resolução do tick para evitar itens "pulando" dois tiles.

## Entregáveis

1. `game/entities/Item.ts`.
2. `game/simulation/Simulation.ts` real (orchestra tick).
3. `game/simulation/Movers.ts` (movimento das esteiras).
4. Renderer desenha itens como quadradinhos coloridos animados.
5. Botão de teste (tecla `I`?) que injeta um item de teste na primeira esteira à frente da posição do mouse (`iron_ore`).
6. Ordem de resolução do tick documentada e implementada.

## Detalhes técnicos

### Item (`entities/Item.ts`)

```ts
export interface Item {
  id: string
  type: ItemType          // 'iron_ore' | 'iron_bar'
  onTile: { x: number; y: number }   // tile atual (na esteira)
  pos: number            // 0..1 dentro do tile no sentido da direção da esteira
  prevPos: number        // posição no tick anterior (p/ interpolação visual)
}
```

Não há `carrying` ainda nesta fase (surgirá na 3 com inserters).

### Modelo de esteira (`Belt`)

Estado do `belt`:

```ts
{ item: Item | null }   // 1 item por tile
```

Quando `item === null`, a esteira está livre para receber.

### Movimento (`Movers.ts`)

Para cada `belt` com item, em cada tick:

```pseudo
belt.item.prevPos := belt.item.pos
belt.item.pos += BELT_SPEED * dt   // BELT_SPEED em tiles/seg (ex.: 1)
if (belt.item.pos >= 1) {
  const next = Grid.buildingAhead(belt.x, belt.y, belt.direction) // próximo tile na direção
  if (next is belt && next.item === null) {
    // transfere: item passa a viver no próximo tile
    next.item = belt.item
    next.item.onTile = { ...nextTile }
    next.item.pos = belt.item.pos - 1   // mantém o excedente
    next.item.prevPos = next.item.pos   // evita pulo visual
    belt.item = null
  } else if (next is máquina compatível && aceita item) {
    // absorção direta (caso especial da miner → furnace/storage, ou belt → máquina via lógica específica)
    // Nesta fase ainda não há produção; só implementamos belt→belt.
    // O caso belt→machine fica para a fase 3.
  } else {
    // bloqueado: clamp em 1
    belt.item.pos = 1
  }
}
```

### Ordem de resolução — anti-pulo

Se iterarmos na ordem dos tiles, um item pode mover-se no próprio tick e pular dois tiles (do A→B, e então B é processado no mesmo tick e B→C). Solução adotada:

**Iterar da "ponta" (destino) para trás.** Construir lista de belts ordenados em **topological backward**: belts mais próximos do destino primeiro. Ou, mais simples e suficiente para protótipo:

- Snapshot das posições lógicas antes do tick: `preItem = new Map(beltId → item?)`.
- Para cada belt, decide a transição usando **preItem** de vizinhos (não o estado pós-mutação). Aplica mutações no estado real.
- Depois avança `pos` dos itens que ficaram.

Sim: dois passes por tick (decisão + avanço). Para ~40x25 tiles é trivial perf.

Implementação organizada em `Movers.ts`:
1. `planBeltTransfers(map): Array<{ from: tile; to: tile; item }>` usando snapshot.
2. `applyBeltTransfers(plan)`.
3. `advanceBeltItems(dt)` — só avança `pos` dos não-transferidos.

### Render de itens

- Item é um quadrado ~60% do tamanho do tile, cor por tipo:
  - `iron_ore`: marrom médio `#8a6d43`.
  - `iron_bar`: cinza-brilhante `#b8c3cc`.
- Posição visual: `lerp(prevPos, pos, alpha)` no tile, deslocado no sentido da direção da esteira.
- Z-order: itens acima da faixa da esteira.

### Injeção de teste

`InputController` escuta `KeyI`: insere um `iron_ore` na esteira sob o mouse (se for belt e estiver vazia). Ajuda a validar o fluxo sem precisar da mineradora.

## Critérios de aceite

- [ ] Construo uma sequência de 5+ esteiras alinhadas e aperto `I` na primeira; o item percorre todas até o fim.
- [ ] Se a última esteira aponta para o vazio, o item para em `pos = 1` da última (clamp).
- [ ] Se eu colocar uma building (storage, ainda sem lógica) na frente da última esteira, o item para em `pos = 1` na última (bloqueado por não-belty/machine-nao-aceita). Validar cor vermelha/bloqueio visual opcional.
- [ ] Itens **não pulam** tiles: ao chegar num tile vazio à frente, todos os itens avançam exatamente 1 tile por tick-limite (sem medo de bugs).
- [ ] Movimento é visualmente contínuo em 60Hz (interpolação com alpha).
- [ ] Remover uma esteira com item descarta o item (não há crash).
- [ ] `npm run lint` + `npm run build` passam.

## Riscos / armadilhas

- **"Item fantasma" pacing**: garantir `prevPos` seja sempre setado **no início** do tick (não copiar do estado pós-tick). A renderização usa `prevPos` da última simulação guardada; pré-armazenar no fim de cada tick: `at end of simulation.tick: for each item: prevPos := pos`. Porém cuidados: para item recém-transferido, `prevPos` deve ser a posição equivalente no tile anterior para que a interpolação produza movimento contínuo. Decisão: **prevPos := 0 quando transferido** (item entra à esquerda do novo tile). Detalhado em código.
- **Belts adjacentes em direções contrárias**: estejam ortogonais ou opostas — items param em pos=1 uns dos outros naturalmente; não surge transição. Confirmar com teste manual.
- **Direction vs Y**: lembrete da convenção (N = -y). Ordem de plot do braço do inserter na próxima fase é sensível a isso.