import { FunctionalActionHandlerMap } from './StateMachineNode';
import { ActionHandlerMap } from './DataNode';

export interface Action<T extends (string | number | symbol), P>  {
  type: T;
  payload: P;
}

export type AnyAction = Action<string, any>;

export function makeActionCreator<T extends string>(type: T): () => Action<T, void>;
export function makeActionCreator<T extends string, P>(type: T): (payload: P) => Action<T, P>;
export function makeActionCreator<T extends string, P>(type: T) {
  return function createAction(payload: P): Action<T, P> {
    return {
      type,
      payload,
    };
  };
}

export function makeActionHandlerCreator<KV, C>(type: keyof KV) {
  return function createActionHandler(
    fn: (this: C, action: Action<typeof type, KV[typeof type]>) => void
  ): ActionHandlerMap<KV> {
    return {
      [type]: fn,
    } as unknown as ActionHandlerMap<KV>;
  }
}

export function makeFnActionHandlerCreator<KV>(type: keyof KV) {
  type K = typeof type;
  return function createActionHandler<T>(
    fn: (
      value: T,
      action: Action<K, KV[K]>,
    ) => T
  ): FunctionalActionHandlerMap<T, KV> {
    return {
      [type]: fn,
    } as unknown as FunctionalActionHandlerMap<T, KV>;
  }
}
