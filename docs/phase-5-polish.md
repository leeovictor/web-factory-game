# Fase 5 — Polish (opcional)

> Não é estritamente necessária para o critério de sucesso. Escolher o que agrega valor ao "validar se é satisfatório".

## Objetivo

Ajudar a "sentir" o protótipo — feedback, legibilidade, robustez mínima.

## Entregáveis (selecionáveis, sem prioridade obrigatória)

### 5.1 Feedback de placement inválido
- Animação sutil de "rejeição" no ghost inválido (piscar/tremer 0.2s).
- Tooltip textual curto abaixo do cursor com o motivo ("Mineradora só sobre minério", "Tile ocupado").

### 5.2 Tornar direções claras
- Setas maiores e mais legíveis; marcas de "ENTRADA"/"SAÍDA" nos inserters (frente vermelho pequeno, atrás verde pequeno).
- Pré-highlight do source/render do inserter com tracejado quando válido/inálido.

### 5.3 Restart / limpar mapa
- Botão "Limpar" no HUD: remove todas as buildings e zera contadores do storage.
- Atalho `Backspace` (segurar para evitar acidentes?).

### 5.4 Debug overlay
- `F3` alterna overlay: FPS, número de entidades, número de itens ativos, tick ms.
- Linhas-amarelas mostrando grid exclusion de picking (opcional).

### 5.5 Sensação de "fábrica"
- Som opcional (irmaquete): tick suave ao depositar no storage.
- Pequena puff particle quando fornalha produz barra.

### 5.6 Conforto
- Ajuste de velocidade globale: teclas `+`/`-` (0.5x, 1x, 2x) para sim speed (multiplica dt).
- Persistência mínima (localStorage) — **não recomendado** na no-salvar lista de exclusão; citedária judge.

## Critérios de aceite (caso escolha qualquer subitem)

- [ ] Subitem implementado funciona sem regressão nos critérios das fases 0-4.
- [ ] `npm run lint` + `npm run build` passam.
- [ ] Escopo dentro de "polimento leve" — não implementa nada das exclusões listadas no spec (pesquisa, economia, etc).

## Riscos / armadilhas

- **Over-investimento**: tendência de adicionar visual pegajoso. Lembrar que o objetivo é validar o coração de gameplay, não polimento comercial.
- **Velocidade global**: se multiplicar dt por um fator com `+`/`-`, **clamp** entre 0.25x e 4x; abaixo disso a interpolação fica estranha.
- Áudio/sons adicionam assets e dependem de autoplay policy; pondere pular antes.