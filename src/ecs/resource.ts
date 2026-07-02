import type { ResourceToken } from './types';

let nextResourceId = 0;

export function defineResource<T extends object>(name: string, defaults: T): ResourceToken<T> {
  const id = nextResourceId++;
  return { id, name, defaults } as ResourceToken<T>;
}
