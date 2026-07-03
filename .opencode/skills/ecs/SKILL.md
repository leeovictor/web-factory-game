---
name: ecs
description: Reusable patterns for the custom ECS (Entity Component System) used in this project. Covers component/resource definition, world setup, entity spawning, system creation, queries, and project conventions.
---

## Visão Geral

A ECS é uma implementação customizada baseada em **archétipos** (archetypes), onde entidades são apenas números (`number`) e componentes são dados planos armazenados em arrays tipados. O motor está em `src/ecs/`.

## Componentes

```typescript
import { defineComponent, defineTag } from '../ecs';

// Componente com dados
export const Position = defineComponent('Position', { x: 0, y: 0 });

// Tag (marcador sem dados)
export const Fast = defineTag('Fast');
```

O retorno de `defineComponent` é um `ComponentToken<T>` que também é uma **factory function**:
- `Position()` → `{ token: Position, data: { x: 0, y: 0 } }`
- `Position({ x: 10 })` → merge parcial com defaults
- `Fast()` → `{ token: Fast, data: undefined }` (tags)

## Resources

```typescript
import { defineResource } from '../ecs';

export const Score = defineResource('Score', { value: 0, multiplier: 1 });
```

- Resources são singletons por tipo, acessados via `world.getResource(Score)` — retorna referência mutável direta.
- Inicialização lazy: na primeira `getResource`, usa os defaults se nunca foi inserido.

## World

### Simples (sem loop)

```typescript
import { createWorld } from '../ecs';

const world = createWorld({ phases: ['update', 'render'] });
world.addSystem(mySystem, 'update');
world.step(dt);
```

### Com loop (rAF)

```typescript
import { createDefaultWorld } from '../ecs/builtin';

const dw = createDefaultWorld({ canvas, width: 800, height: 600 });
dw.spawn(Position({ x: 100 }), Sprite({ src: 'hero.png' }));
dw.start();
```

`createDefaultWorld` cria phases `['input', 'update', 'render', 'postRender']`, já adiciona `Time` e `CanvasCtx`, e inicia um `requestAnimationFrame`.

## Entidades

```typescript
const entity = world.instantiate(Position(), Velocity({ vx: 5 }), Sprite());

// Despawn
world.despawn(entity);

// Adicionar/remover componente depois
world.insert(entity, Health({ hp: 100 }));
world.remove(entity, Health);

// Verificar/ler
const has = world.has(entity, Position);
const pos = world.get(entity, Position); // T | undefined
```

## Systems

Systems são **funções factory** que retornam `(world: World, dt: number) => void`.

```typescript
import { createWorld } from '../ecs';

export function createMovementSystem() {
  return (world: World, dt: number) => {
    for (const [entity, pos, vel] of world.queryComponents(Position, Velocity)) {
      pos.x += vel.vx * dt;
      pos.y += vel.vy * dt;
    }
  };
}

// Registro
world.addSystem(createMovementSystem(), 'update');
world.addSystem(createRenderSystem(), 'render');
world.removeSystem(createMovementSystem(), 'update');
```

Dependências externas (ex: refs do DOM) são injetadas via closure, não via ECS:

```typescript
export function createInputSystem(canvas: HTMLCanvasElement) {
  return (world: World, dt: number) => {
    // usa canvas por closure
  };
}
```

## Queries

```typescript
// EntityQuery — itera sobre IDs de entidade
for (const entity of world.query(Position, Sprite)) {
  // entity: number
}

// EntityQuery com filtro de tag
for (const entity of world.query(Position).withTag(Fast)) {
  // só entidades que também têm a tag Fast
}

// ComponentQuery — itera sobre tuplas [Entity, ...componentData]
for (const [id, pos, spr] of world.queryComponents(Position, Sprite)) {
  pos.x += 1; // mutação direta
}

// ComponentQuery com tag
for (const [_, pos] of world.queryComponents(Position).withTag(Fast)) {
  /* ... */
}
```

**Importante:** resultados de query são referências mutáveis diretas aos arrays internos. Mutação dentro do loop é o padrão esperado.

## Operações Diferidas

Durante `world.step(dt)`, chamadas a `insert()`, `remove()` e `despawn()` são **enfileiradas** e só executadas no **flush** entre phases. Isso garante estabilidade dos iterators durante a execução de uma fase.

Para forçar o flush manualmente: `world.flush()`.

## Convenções do Projeto

| Convenção | Regra |
|---|---|
| **Comentários** | Nunca adicionar comentários em arquivos de código |
| **Nomes de tokens** | PascalCase: `Transform`, `Velocity`, `PlayerControlled` |
| **Nomes de factories** | camelCase com prefixo `create` e sufixo `System`: `createMovementSystem` |
| **Arquivos de sistema** | Um arquivo por sistema em `src/demo/systems/` ou `src/ecs/builtin/systems/` |
| **Arquivos de componente** | Um arquivo por componente ou grupo coeso em `src/ecs/builtin/components/` |
| **Imports** | ESM com barrel exports via `index.ts` |
| **External libs** | Não adicionar libs externas além do que já está em `package.json` |
| **Phases** | `input` → `update` → `render` → `postRender` no DefaultWorld |

## Estrutura de Diretórios (ECS)

```
src/ecs/
├── index.ts              # Barrel: tipos, defineComponent, defineTag, defineResource, createWorld
├── types.ts              # Interfaces: Entity, World, ComponentToken, ResourceToken, Query* etc
├── component.ts          # defineComponent, defineTag
├── resource.ts           # defineResource
├── world.ts              # createWorld (core do motor)
├── builtin/
│   ├── index.ts
│   ├── DefaultWorld.ts   # createDefaultWorld (rAF + canvas + time)
│   ├── components/       # Transform, Circle, Rect, Capsule, Sprite
│   ├── resources/        # Time, CanvasCtx
│   └── systems/          # timeSystem, renderSystem
└── __tests__/            # Testes com Vitest
```

## Exemplo Completo

```typescript
// components.ts
import { defineComponent, defineTag } from '../ecs';

export const Position = defineComponent('Position', { x: 0, y: 0 });
export const Velocity = defineComponent('Velocity', { vx: 0, vy: 0 });
export const Player = defineTag('Player');

// systems/movement.ts
import { createWorld } from '../ecs';

export function createMovementSystem() {
  return (world: World, dt: number) => {
    for (const [_, pos, vel] of world.queryComponents(Position, Velocity)) {
      pos.x += vel.vx * dt;
      pos.y += vel.vy * dt;
    }
  };
}

// main.ts
import { createDefaultWorld } from './ecs/builtin';
import { createMovementSystem } from './systems/movement';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const dw = createDefaultWorld({ canvas, width: 800, height: 600 });

dw.spawn(Position({ x: 50 }), Velocity({ vx: 100, vy: 50 }), Player());
dw.addSystem(createMovementSystem(), 'update');
dw.start();
```

## Testes

Os testes usam **Vitest**. Padrão:

```typescript
import { describe, it, expect } from 'vitest';
import { createWorld } from '../ecs';

describe('meu sistema', () => {
  it('deve mover entidades', () => {
    const world = createWorld();
    // ...
  });
});
```

Comandos: `npm run test` ou `npx vitest`.
