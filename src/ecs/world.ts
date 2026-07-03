/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Entity, ComponentToken, ComponentPayload, QueryResult, World, WorldConfig, EntityQuery, ComponentQuery } from './types';

type Mask = bigint;

interface ArchetypeInternal {
  mask: Mask;
  tokens: Set<ComponentToken<any>>;
  entities: Entity[];
  data: Map<ComponentToken<any>, any[]>;
}

interface EntityLocation {
  archetype: ArchetypeInternal;
  row: number;
}

interface Phase {
  name: string;
  systems: Array<(world: World, dt: number) => void>;
}

type PendingOp =
  | { kind: 'insert'; entity: Entity; payload: ComponentPayload<any> }
  | { kind: 'remove'; entity: Entity; token: ComponentToken<any> }
  | { kind: 'despawn'; entity: Entity };

function tokensToMask(tokens: Iterable<ComponentToken<any>>): Mask {
  let mask = 0n;
  for (const token of tokens) {
    mask |= 1n << BigInt(token.id);
  }
  return mask;
}

export function createWorld(config?: WorldConfig): World {
  let nextEntityId = 0;
  const archetypes = new Map<Mask, ArchetypeInternal>();
  const entityIndex = new Map<Entity, EntityLocation>();
  const pendingOps: PendingOp[] = [];
  const resources = new Map<number, any>();
  const phases: Phase[] = [];
  const phaseIndex = new Map<string, Phase>();
  let inStep = false;

  const phaseNames = config?.phases ?? ['default'];
  for (const name of phaseNames) {
    const phase: Phase = { name, systems: [] };
    phases.push(phase);
    phaseIndex.set(name, phase);
  }

  function getOrCreateArchetype(tokens: ComponentToken<any>[]): ArchetypeInternal {
    const mask = tokensToMask(tokens);
    if (archetypes.has(mask)) return archetypes.get(mask)!;

    const archetype: ArchetypeInternal = {
      mask,
      tokens: new Set(tokens),
      entities: [],
      data: new Map(),
    };

    for (const token of tokens) {
      archetype.data.set(token, []);
    }

    archetypes.set(mask, archetype);
    return archetype;
  }

  function addToArchetype(
    entity: Entity,
    archetype: ArchetypeInternal,
    dataMap: Map<ComponentToken<any>, any>
  ) {
    const row = archetype.entities.length;
    archetype.entities.push(entity);
    for (const [token, arr] of archetype.data.entries()) {
      if ((token as any).isTag) {
        arr.push(undefined);
      } else {
        arr.push(dataMap.get(token) ?? { ...token.defaults });
      }
    }
    entityIndex.set(entity, { archetype, row });
  }

  function removeFromArchetype(entity: Entity, archetype: ArchetypeInternal) {
    const loc = entityIndex.get(entity);
    if (!loc) return;
    const { row } = loc;
    const lastRow = archetype.entities.length - 1;

    if (row !== lastRow) {
      const lastEntity = archetype.entities[lastRow];
      archetype.entities[row] = lastEntity;

      for (const arr of archetype.data.values()) {
        arr[row] = arr[lastRow];
      }

      entityIndex.set(lastEntity, { archetype, row });
    }

    archetype.entities.pop();
    for (const arr of archetype.data.values()) {
      arr.pop();
    }

    entityIndex.delete(entity);
  }

  function applyInsert(entity: Entity, payload: ComponentPayload<any>) {
    const loc = entityIndex.get(entity);
    if (!loc) return;

    if (loc.archetype.tokens.has(payload.token)) {
      loc.archetype.data.get(payload.token)![loc.row] = payload.data;
      return;
    }

    const currentData = new Map<ComponentToken<any>, any>();
    for (const [token, arr] of loc.archetype.data.entries()) {
      currentData.set(token, arr[loc.row]);
    }

    currentData.set(payload.token, payload.data);

    const newTokens = Array.from(currentData.keys());
    const newArchetype = getOrCreateArchetype(newTokens);

    removeFromArchetype(entity, loc.archetype);
    addToArchetype(entity, newArchetype, currentData);
  }

  function applyRemove(entity: Entity, token: ComponentToken<any>) {
    const loc = entityIndex.get(entity);
    if (!loc || !loc.archetype.tokens.has(token)) return;

    const currentData = new Map<ComponentToken<any>, any>();
    for (const [t, arr] of loc.archetype.data.entries()) {
      if (t !== token) {
        currentData.set(t, arr[loc.row]);
      }
    }

    const newTokens = Array.from(currentData.keys());
    const newArchetype = getOrCreateArchetype(newTokens);

    removeFromArchetype(entity, loc.archetype);
    addToArchetype(entity, newArchetype, currentData);
  }

  function applyDespawn(entity: Entity) {
    const loc = entityIndex.get(entity);
    if (!loc) return;
    removeFromArchetype(entity, loc.archetype);
  }

  function flushPending() {
    const ops = pendingOps.splice(0);
    for (const op of ops) {
      switch (op.kind) {
        case 'insert':
          applyInsert(op.entity, op.payload);
          break;
        case 'remove':
          applyRemove(op.entity, op.token);
          break;
        case 'despawn':
          applyDespawn(op.entity);
          break;
      }
    }
  }

  const world: World = {
    instantiate(...payloads) {
      const entity = nextEntityId++;
      const dataMap = new Map<ComponentToken<any>, any>();
      const tokens: ComponentToken<any>[] = [];

      for (const payload of payloads) {
        dataMap.set(payload.token, payload.data);
        tokens.push(payload.token);
      }

      const archetype = getOrCreateArchetype(tokens);
      addToArchetype(entity, archetype, dataMap);

      return entity;
    },

    despawn(entity) {
      if (inStep) {
        pendingOps.push({ kind: 'despawn', entity });
      } else {
        applyDespawn(entity);
      }
    },

    insert(entity, payload) {
      if (inStep) {
        pendingOps.push({ kind: 'insert', entity, payload });
      } else {
        applyInsert(entity, payload);
      }
    },

    remove(entity, token) {
      if (inStep) {
        pendingOps.push({ kind: 'remove', entity, token });
      } else {
        applyRemove(entity, token);
      }
    },

    get(entity, token) {
      const loc = entityIndex.get(entity);
      if (!loc || !loc.archetype.tokens.has(token)) return undefined;
      return loc.archetype.data.get(token)![loc.row];
    },

    has(entity, token) {
      const loc = entityIndex.get(entity);
      if (!loc) return false;
      return loc.archetype.tokens.has(token);
    },

    query(...tokens: ComponentToken<any>[]): EntityQuery {
      const self = (mandatory: ComponentToken<any>[], all: ComponentToken<any>[]): EntityQuery => ({
        withTag(...tags: ComponentToken<undefined>[]) {
          return self(mandatory, [...all, ...tags]);
        },
        *[Symbol.iterator]() {
          const queryMask = tokensToMask(all);
          for (const archetype of archetypes.values()) {
            if ((archetype.mask & queryMask) === queryMask) {
              yield* archetype.entities;
            }
          }
        },
      });
      return self(tokens, [...tokens]);
    },

    queryComponents<T extends readonly ComponentToken<any>[]>(
      ...tokens: T
    ): ComponentQuery<T> {
      const mandatory = [...tokens];
      const self = (all: ComponentToken<any>[]): ComponentQuery<T> => ({
        withTag(...tags: ComponentToken<undefined>[]) {
          return self([...all, ...tags]);
        },
        *[Symbol.iterator]() {
          const queryMask = tokensToMask(all);
          for (const archetype of archetypes.values()) {
            if ((archetype.mask & queryMask) === queryMask) {
              const cols = mandatory.map(t => archetype.data.get(t)!);
              for (let row = 0; row < archetype.entities.length; row++) {
                yield [archetype.entities[row], ...cols.map(c => c[row])] as unknown as [Entity, ...QueryResult<T>];
              }
            }
          }
        },
      });
      return self([...tokens]);
    },

    insertResource(token, data) {
      resources.set(token.id, data);
    },

    getResource(token) {
      if (!resources.has(token.id)) {
        resources.set(token.id, { ...token.defaults });
      }
      return resources.get(token.id);
    },

    addSystem(system, phaseName?) {
      const name = phaseName ?? phases[0]?.name ?? 'default';
      let phase = phaseIndex.get(name);
      if (!phase) {
        phase = { name, systems: [] };
        phases.push(phase);
        phaseIndex.set(name, phase);
      }
      phase.systems.push(system);
    },

    removeSystem(system, phaseName?) {
      if (phaseName) {
        const phase = phaseIndex.get(phaseName);
        if (phase) {
          const idx = phase.systems.indexOf(system);
          if (idx !== -1) phase.systems.splice(idx, 1);
        }
      } else {
        for (const phase of phases) {
          const idx = phase.systems.indexOf(system);
          if (idx !== -1) phase.systems.splice(idx, 1);
        }
      }
    },

    addPhase(name, index?) {
      if (phaseIndex.has(name)) return;
      const phase: Phase = { name, systems: [] };
      if (index !== undefined) {
        phases.splice(index, 0, phase);
      } else {
        phases.push(phase);
      }
      phaseIndex.set(name, phase);
    },

    setPhaseOrder(names) {
      const reordered: Phase[] = [];
      for (const name of names) {
        const phase = phaseIndex.get(name);
        if (!phase) throw new Error(`Phase '${name}' does not exist`);
        reordered.push(phase);
      }
      phases.length = 0;
      phases.push(...reordered);
    },

    flush() {
      flushPending();
    },

    phaseTimings: {},

    step(dt) {
      inStep = true;
      for (const phase of phases) {
        const t0 = performance.now();
        const currentSystems = [...phase.systems];
        for (const system of currentSystems) {
          system(world, dt);
        }
        flushPending();
        world.phaseTimings[phase.name] = performance.now() - t0;
      }
      inStep = false;
    },
  };

  return world;
}
