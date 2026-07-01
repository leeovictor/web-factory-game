# Fase 4 — Armazenador e fechamento do loop

> Item final da cadeia: armazenar as barras. Critério de sucesso do protótipo é completo aqui.

## Objetivo

Cadeia **Mineradora → Esteiras → Fornalha → Esteiras → Armazenador** roda indefinidamente. HUD mostra contadores. Sem bugs visuais significativos.

## Entregáveis

1. Estado do `storage` completo (`Storage` interface) e contagem por tipo.
2. EventBus emitiu corretamente `storage-count` e `storage-by-type`; HUD reage sem re-renderizar o canvas.
3. `components/Hud.tsx`: total de barras + composição (ore vs bar) + FPS throttled.
4. `hooks/useGameEvents.ts`: assinatura tipada; zustand-free; apenas `useState` esparsa.
5. Teste de stress manual: 3 mineradoras, 2 fornalhas, 1 storage durante 1-2 min sem deadlock.

## Detalhes técnicos

### Storage (`entities/Building.ts` — variante)

```ts
interface Storage extends Building {
  state: {
    counts: Record<ItemType, number>   // { iron_ore: n, iron_bar: m }
  }
}
```

**Comportamento**: storage é passivo. Recebe itens de:
- inserter depositando nele (placeTo).
- mineradora ejetando direto nele (caso raro, só se colocada adjacente — permitido mas não canônico).

Ao receber:

```
state.counts[item.type] += 1
bus.emit('storage-count', totalAll())
```

Não há limite (protótipo); futuro: capacidade + transbordo.

### HUD (`components/Hud.tsx`)

Layout sobre o canto superior direito do canvas:

```
Armazenadas
☼ Barra:  17
♟ Minério: 0
FPS: 60
```

Estilização mínima via CSS inline da `App.css`. Não mistura com a canvas.

### `useGameEvents.ts`

```ts
export function useStorageCount() {
  const [c, setC] = useState({ iron_ore: 0, iron_bar: 0 })
  useEffect(() => bus.on('storage-count', (counts) => setC(counts)), [])
  return c
}
```

`emit` é throttled internamente: máximo 1 emissão/200ms por tipo (evita muitas emissões quando storage está pegando 5 itens/s).

### Validação do critério de sucesso

Roteiro manual que serve como teste de aceitação:

1. Colocar mineradora sobre minério (direção E).
2. Ligar 4-6 esteiras no sentido E até parar perto da fornalha.
3. Antes da fornalha, posicionar **inserter** com:
   - tile à frente = última esteira (source);
   - tile atrás = tile da fornalha (dest), com direção W (frente aponta p/ leste? — confirmar convenção com teste prático).
4. Colocar fornalha à direita/atrás do inserter.
5. Após a fornalha, outro **inserter** com:
   - tile à frente = tile da fornalha (source);
   - tile atrás = esteira de saída (dest).
6. Ligar esse segundo inserter a mais esteiras até o armazenador.
7. Final: **inserter** puxa da última esteira e solta no armazenador (total = 3 inserters).
8. Observar continua ≈ 1 min.
9. HUD mostra contador crescendo.
10. Remover uma esteira do meio deve congestionar a chain (itens param, miner retém, furnac espera) sem crash.
11. Recolocar a esteira deve retomar o fluxo automaticamente.

## Critérios de aceite

- [ ] Cadeia completa funciona sem intervenção por > 1 min.
- [ ] HUD atualiza barras/minério/FPS sem re-render do canvas.
- [ ] Remover e recolocar uma esteira restaura fluxo sem precisar reiniciar.
- [ ] Remove_build durante operação não corrompe (item em trânsito naquele tile descartado, conforme decisão).
- [ ] Sem deadlock detectado: inserter para com item na mão por tempo indeterminado se dest bloqueado, e retoma sozinho ao liberar.
- [ ] `npm run lint` + `npm run build` passam.

## Riscos / armadilhas

- **Performance**: emissões de `storage-count` a cada item (1/s/storage é ok). Atinge-se 10/s mais chargado ainda leve.
- **Item fantasma ao remover**: Sempre que inserter estiver `holding` um item e o destino/storage for removido, o inserter permanece parado — confirmar que ele deposita corretamente ao re inserir algo no tile de destino.
- **Conflito de endereço**: duas furnaces com mesmo `id` se IDs colidirem — usar `crypto.randomUUID()` ou contador global monótono (iniciar `Game` único).