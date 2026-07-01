---
description: Inicia a implementação de uma fase do protótipo Simulador de Esteiras (carregando o plano daquela fase e a arquitetura). Use quando o usuário escribir /start-phase <fase N>.
agent: plan
---

Você vai conduzir a implementação de uma fase específica do protótipo **Simulador de Esteiras** (Vite + React + TS + HTML5 Canvas) seguindo rigorosamente o plano estabelecido na documentação.

## Argumento recebido

`$ARGUMENTS`

Parse do argumento: identifique o número da fase (0-5). Aceita formatos flexíveis como "fase 1", "1", "phase 1". Se não conseguir identificar, pare e peça esclarecimento.

## Passos obrigatórios

1. **Leitura de contexto**: em paralelo, leia obrigatoriamente:
   - `/home/leonardo/Projects/belt-system-canvas/ARCHITECTURE.md` (arquitetura geral e decisões consolidadas).
   - `/home/leonardo/Projects/belt-system-canvas/docs/phase-<N>-*.md` (a fase solicitada — útil fazer glob `docs/phase-*.md` e abrir a correspondente).
   - Se fases anteriores não estiverem completas (verifique via leitura de `src/game/` e `src/rendering/`), sinalize ao usuário ANTES de começar: provavelmente precisa implementar as anteriores primeiro. Não assuma que estão prontas só porque existem arquivos.

2. **Toda-lista**: use a ferramenta `todowrite` para criar a lista de entregáveis daquela fase usando os "Entregáveis" e "Critérios de aceite" do documento da fase. Mantenha-os atualizados conforme trabalha.

3. **Implementação**: escreva o código seguindo:
   - A **estrutura de diretórios** e os **nomes de arquivo** definidos em ARCHITECTURE.md.
   - As **decisões consolidadas** e **ordem de resolução do tick** definidas para aquela fase.
   - **Sem comentários** nos arquivos (política global do projeto — salvo o usuário pedir expressamente).
   - **Sem adicionar libs externas** além das já em `package.json`.
   - Respeitar as **convenções** e a camadas unidirecionais da arquitetura.

4. **Verificação**: ao final de cada tarefa completável, rode:
   - `npm run lint`
   - `npm run build`
   - corrija qualquer erro ou warning.

5. **Validação manual**: ao concluir todos os itens, instrua o usuário a rodar `npm run dev` e percorrer os **Critérios de aceite** daquela fase. Aguarde o feedback antes de marcar a fase como concluída.

6. **Relatório**: ao final, summarize sucintamente o que foi feito, lista de arquivos criados/modificados e os critérios que ainda precisam ser validados pelo usuário.

## Notas

- **Não avance para a próxima fase** automaticamente. Apenas conclua a solicitada.
- Se houver **decisões técnicas ainda em aberto** relevantes para a fase (não detalhadas no plano), pergunte ao usuário antes de codar — não decida unilateralmente em requisitos novos.
- Não adicione nada das **exclusões** listadas no spec original (pesquisa, economia, savar/restore, etc).
- Se aparecer um bloco ambíguo no plano da fase, interrompa, refine com o usuário e só então proponha atualizar o doc da fase correspondente antes de seguir.