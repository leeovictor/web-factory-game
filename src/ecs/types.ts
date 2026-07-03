/* eslint-disable @typescript-eslint/no-explicit-any */
export type Entity = number;

export interface ComponentToken<T = any> {
  readonly id: number;
  readonly name: string;
  readonly defaults: T;
  readonly isTag?: true;
  (partial?: Partial<T>): ComponentPayload<T>;
}

export interface ComponentPayload<T = any> {
  readonly token: ComponentToken<T>;
  readonly data: T;
}

export interface ResourceToken<T = any> {
  readonly id: number;
  readonly name: string;
  readonly defaults: T;
}

export type QueryResult<T extends readonly ComponentToken<any>[]> = {
  [K in keyof T]: T[K] extends ComponentToken<infer D> ? D : never;
};

export interface EntityQuery extends Iterable<Entity> {
  withTag(...tokens: ComponentToken<undefined>[]): EntityQuery;
}

export interface ComponentQuery<T extends readonly ComponentToken<any>[]> extends Iterable<[Entity, ...QueryResult<T>]> {
  withTag(...tokens: ComponentToken<undefined>[]): ComponentQuery<T>;
}

export interface WorldConfig {
  phases?: string[];
}

export interface World {
  instantiate(...payloads: ComponentPayload<any>[]): Entity;
  despawn(entity: Entity): void;
  insert<T>(entity: Entity, payload: ComponentPayload<T>): void;
  remove<T>(entity: Entity, token: ComponentToken<T>): void;
  get<T>(entity: Entity, token: ComponentToken<T>): T | undefined;
  has(entity: Entity, token: ComponentToken<any>): boolean;
  query(...tokens: ComponentToken<any>[]): EntityQuery;
  queryComponents<T extends readonly ComponentToken<any>[]>(
    ...tokens: T
  ): ComponentQuery<T>;
  insertResource<T>(token: ResourceToken<T>, data: T): void;
  getResource<T>(token: ResourceToken<T>): T;
  addSystem(system: (world: World, dt: number) => void, phase?: string): void;
  removeSystem(system: (world: World, dt: number) => void, phase?: string): void;
  addPhase(name: string, index?: number): void;
  setPhaseOrder(names: string[]): void;
  flush(): void;
  clearQueryCache(): void;
  step(dt: number): void;
  phaseTimings: Record<string, number>;
}
