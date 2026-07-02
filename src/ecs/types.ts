/* eslint-disable @typescript-eslint/no-explicit-any */
export type Entity = number;

export interface ComponentToken<T = any> {
  readonly id: number;
  readonly name: string;
  readonly defaults: T;
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
  query(...tokens: ComponentToken<any>[]): IterableIterator<Entity>;
  queryComponents<T extends readonly ComponentToken<any>[]>(
    ...tokens: T
  ): IterableIterator<[Entity, ...QueryResult<T>]>;
  insertResource<T>(token: ResourceToken<T>, data: T): void;
  getResource<T>(token: ResourceToken<T>): T;
  addSystem(system: (world: World, dt: number) => void, phase?: string): void;
  removeSystem(system: (world: World, dt: number) => void, phase?: string): void;
  addPhase(name: string, index?: number): void;
  setPhaseOrder(names: string[]): void;
  flush(): void;
  step(dt: number): void;
  phaseTimings: Record<string, number>;
}
