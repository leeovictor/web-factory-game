import type { ComponentToken, ComponentPayload } from './types';

let nextComponentId = 0;

export function defineComponent<T extends object>(
  name: string,
  defaults: T
): ComponentToken<T> {
  const id = nextComponentId++;

  const factory = (partial?: Partial<T>): ComponentPayload<T> => {
    const data = { ...defaults, ...partial } as T;
    return { token: factory as unknown as ComponentToken<T>, data };
  };

  Object.defineProperty(factory, 'id', { value: id, writable: false });
  Object.defineProperty(factory, 'name', { value: name, writable: false });
  Object.defineProperty(factory, 'defaults', { value: defaults, writable: false });

  return factory as unknown as ComponentToken<T>;
}
