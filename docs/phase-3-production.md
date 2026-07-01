# Fase 3 — Produção, mineradora e inserters

> Liga o motor: minério é gerado, transportado, refinado em barra, e barbreado adiante.
> Esta fase tem a maior densidade técnica.

## Objetivo

A cadeia **Mineradora → Esteiras → Fornalha → Esteiras** funciona continuamente, com **2 inserters** conectando o fluxo entre esteira ↔ fornalha. As barras aparecem e viajam até uma esteira final (ainda sem armazenador — fica na fase 4).

## Entregáveis

1. `simulation/Production.ts` (mineração + fornalha).
2. `simulation/InserterArm.ts` (lógica + ciclo animado de inserter).
3. Estados nas entidades `miner`, `furnace`, `inserter`.
4. Renderer atualizado: arm do inserter se movendo entre frente/trás, slot interno visual, fila visual.
5. Decaimento do "teste de injeção" da fase 2 — fluxo de produção é a fonte agora.
6. EventBus emite `production-event` (opcional, para futuras métricas).

## Detalhes técnicos

### 1. Mineradora

```ts
interface Miner extends Building {
  direction: Direction                 // saída
  state: {
    internal: Item | null              // minério já extraído aguardando ejetar
    cooldown: number                   // segundos até próxima extração
  }
}
```

**Comportamento por tick** (`Production.updateMiner`):

```
if state.internal === null:
  state.cooldown -= dt
  if state.cooldown <= 0:
    state.internal = new Item('iron_ore', neste tile, pos=0, prevPos=0)
    state.cooldown += MINER_INTERVAL   // ex.: 1s
// Se já tem internal, tenta ejetar:
if state.internal !== null:
  const out = tile à frente (Grid.buildingAhead)
  if out === belt && out.item === null:
    out.item = state.internal
    out.item.onTile = out tile coords
    out.item.pos = 0; out.item.prevPos = 0
    state.internal = null
  else if out === furnace && slot input vazio (ver abaixo):
    furnace.input = state.internal; state.internal = null
  else if out === storage:
    //_deposita direto (caso raro/ótimo de teste)
    storage.count++; state.internal = null; emit('storage-count', ...)
  else:
    // bloqueado: não produz novo item enquanto internal !== null (impede backpressure)
```

A regra "caso a saída esteja bloqueada, interrompe temporariamente a produção" casaria pela retenção em `internal`: enquanto não consegue ejetar, `cooldown` não volta a rodar. Equivalente a pausar a produção.

### 2. Fornalha

```ts
interface Furnace extends Building {
  state: {
    input: Item | null              // minério aguardando processamento
    processing: Item | null         // em transformação
    timer: number                   // tempo restante para (input → processing)
    output: Item | null             // barra pronta aguardando coleta
  }
}
```

**Comportamento**:

```
// Transição: se output vazio e processing pronto:
if state.processing !== null && state.timer <= 0 && state.output === null:
  // barra está pronta
  state.output = state.processing    // agora é um iron_bar
  state.output.type = 'iron_bar'
  state.processing = null
// Timers:
if state.processing !== null:
  state.timer -= dt
// Promove input → processing:
if state.processing === null && state.input !== null:
  state.processing = state.input
  state.input = null
  state.timer = FURNACE_TIME   // ex.: 2s
// Saída é coletada por um inserter (lógica abaixo).
```

Note que `output` **não é ejetado pela própria fornalha** — ela só "expõe" a barra no slot lógico único da fornalha 2×2. É o **inserter** que puxa.

### 3. Inserter (`simulation/InserterArm.ts`)

Geometria:
- Ocupa tile central (1×1); direção D.
- **Tile à frente (no sentido D)** = **source**. Pode ser qualquer tile adjacente de uma building multi-tile (furnace 2×2, storage 2×2).
- **Tile atrás (oposto de D)** = **dest**. Mesma regra: qualquer tile adjacente da footprint serve como ponto de interação.
- Braço anima entre dois estados: `arm-front` (buscando/acabou de pegar) e `arm-back` (depositando/acabou de depositar).

> Quando `takeFrom(sourceTile)` ou `placeTo(destTile)` encontra uma building multi-tile, localiza a instância via `Grid.getBuilding(tx,ty)` (qualquer tile da footprint retorna a mesma instância) e acessa seu estado central (ex.: `furnace.output` / `furnace.input`).

```ts
interface Inserter extends Building {
  state: {
    arm: 'front' | 'back'      // posição do braço
    phase: number               // 0..1 progresso do movimento atual
    holding: Item | null
    mode: 'idle' | 'to-front' | 'picking' | 'to-back' | 'placing'
    cooldown: number
  }
}
```

**Ciclo (~1 item/s, configurável)**:

```
tick(dt):
  switch (mode):
    case 'idle':
      // decide iniciar: precisa haver item no source e espaço no dest
      if (source tem item && dest aceita item):
        mode = 'to-front'; phase = 0; arm = 'back' // começa em "back" indo p/ "front"
    case 'to-front':
      phase += dt / T_SWING
      if (phase >= 1): phase = 1; mode = 'picking'
      // interpola arm entre back→front visualmente
    case 'picking':
      // instante: tira item do source
      const item = takeFrom(source)   // belt.item → null; furnace.output → null; etc.
      if (item):
        state.holding = item
        mode = 'to-back'; phase = 0; arm = 'front'
      else:
        mode = 'idle'      // fonte secou
    case 'to-back':
      phase += dt / T_SWING
      if (phase >= 1): phase = 1; mode = 'placing'
    case 'placing':
      // deposit holding em dest
      if (placeTo(dest, state.holding)):
        state.holding = null
        mode = 'idle'; arm = 'back'
      else:
        // dest bloqueado — fica parado sem depositar
        // drift back: ficar em waiting (visualmente segurando item)
```

`takeFrom(source)`:

- **source = belt**: `if (belt.item): const i = belt.item; belt.item = null; return i`.
- **source = furnace**: `if (furnace.output): const i = furnace.output; furnace.output = null; return i`.
- **source = storage**: por agora **não retira** de storage (storage é só sumidouro). Documentar.
- **source = miner**: **não interage** — miner ejecta sozinho.

`placeTo(dest, item)`:

- **dest = belt**: exija belt vazio (item === null) → coloca e ajusta `pos=0`, `prevPos=0`.
- **dest = furnace**: se `furnace.input === null && item.type === 'iron_ore'` → entra como input. **Rejeita iron_bar** (não há recombinação).
- **dest = storage**: `storage.count++; storage.recentItemType = item.type; emit('storage-count', storage.count); return true`.
- **dest = miner**: **não deposita**.

Decorrido de `T_SWING ≈ 0.5s` → ~1 item/s completo (ida+volta: T_SWING cada trecho = 0.5, total = T_SWING*2 + picking/placing instantâneo).

### 4. Ordem do tick para fase 3

```
1. Produção (miners): countdown, ejeções internas-miner → slot/belt/furnace direto.
2. Fornalhas: timer decremento, promover input→processing, output→ Output slot.
3. Inserters: ciclo completo (a lógica acima). Importante: inserters que retiram
   de fornalha (furnace.output) e depositam em belt devem rodar ANTES do
   movimento das esteiras, para liberar slots e criar espaço:
     - O furnace.output sendo esvaziado permite furnace aceitar novo input
       (via outro inserter).
4. Movimento das esteiras (igual à fase 2).
```

Note que um inserter depositando em belt na mesma tick que o belt anda causa conflito — resolvido pela ordem: inserter primeiro deixa item em `pos=0` do belt; depois belt anda. Correto.

### 5. Validation na borda

- Miner só ejeta em tile `ore → belt/furnace/storage` válidos. Se saída é `ore` diferente (ie., bloco de minério puro sem building), miner retém em `internal` (saída bloqueada).
- Inserter source/dest tem que ser adjacentes (1 tile) — já está implícito na fórmula `tileAhead/tileBack`.

### 6. Render

- **Arm do inserter**: linha do centro do tile source/target; pivô no centro do inserter; ângulo altera com `phase`. Item aparece na ponta do braço quando `holding !== null`.
- **Miner cooldown**: pequena barra de progresso emcima (formografia).
- **Furnace**: surge brilho (cor quente) quando `processing !== null`; item `iron_ore` à entrada e `iron_bar` na saída visíveis como quadradinhos.
- **Inserter arm**: cor amarela/tombada.

## Critérios de aceite

- [ ] Posso colocar mineradora sobre minério, esteiras à frente, e observar `iron_ore` aparecendo e correndo pelas esteiras.
- [ ] Se o caminho de esteiras estiver bloqueado ao fim, mineradora para de produzir (segura em `internal`).
- [ ] Posso colocar 1 inserter puxando de uma esteira e depositando em uma fornalha; o inserter anima o braço e move folha por folha.
- [ ] A fornalha processa `iron_ore` → `iron_bar` em ~2s e a barra fica no slot de saída.
- [ ] Segundo inserter puxa a barra da fornalha e põe numa esteira; barra percorre essa esteira.
- [ ] A cadeia toda `Miner → Belts → Inserter → Furnace → Inserter → Belts` corre continuamente sem intervenção.
- [ ] Desligamento natural: se eu remover a esteira de destino do segundo inserter, ele para com item na mão (não descarta).
- [ ] `npm run lint` + `npm run build` passam.

## Riscos / armadilhas

- **Inserter "roubar" item de belt antes do item chegar ao fim**: regra importante — só pega item se `belt.item.pos >= ITEM_PICK_THRESHOLD` (ex.: 0.95). Implementar; sem isso, o inserter pode sugar um item que ainda nem chegou.
- **Deadlock furnace↔inserter**: se furnace.output está cheia e inserter não consegue depositar, furnace não processa novo input (já explicícito na lógica). Confirmar com teste manual: o `chain_resume` depois de limpar o obstáculo é automático.
- **T_SWING_xTICK**: garantir `T_SWING > STEP` (60Hz) senão `phase` salta. Ex.: T_SWING = 0.5s → cada tick 1/60 → 30 ticks por swing. OK.
- **Visual do item sob o inserter**: desenhar `holding` na ponta do braço, **não** sobre o tile do inserter (evita confus com um segundo item em algum belt adjacente).