import { Action } from './Action';
import { Gettable } from './Gettable';
import { Clone } from './Clone';
import { Equality } from './Equality';
import { DataNode, ActionHandlerMap } from './DataNode';

function primitiveClone<T>(primitive: T): T {
  return primitive;
}

function simpleEquality<T>(a: T, b: T): boolean {
  return a === b;
}

export type PropNodeMap<P> = {
  readonly [K in keyof P]: DataNode & Gettable<P[K]>;
}

export type ActionMap<P> = {
  [K in keyof P]: Action<K, P[K]>;
}

export type FunctionalActionHandlerMap<T, N> = {
  readonly [K in keyof N]: (
    value: T,
    action: Action<K, N[K]>,
  ) => T;
};

export abstract class StateMachineNode<T, AHM> extends DataNode {
  private value!: T;
  private initialized: boolean = false;

  protected abstract initialValue: T;

  constructor() {
    super();
  }

  public abstract readonly functionalActionHandlers: FunctionalActionHandlerMap<T, AHM>;

  public getActionHandlers(): ActionHandlerMap<AHM> {
    const ahm: ActionHandlerMap<AHM> = Object.create(null);

    for (const key in this.functionalActionHandlers) {
      ahm[key] = (action) => {
        if (!this.initialized) {
          this.value = this.clone(this.initialValue);
          this.incrementVersion();
        }

        const value = this.functionalActionHandlers[key](
          this.value,
          action,
        );

        this.set(value);
      };
    }

    return ahm;
  };

  protected equals(a: T, b: T): boolean {
    return a === b;
  }

  protected clone(value: T): T {
    return value;
  }

  protected set(value: T) {
    if (!this.initialized || !this.equals(this.value, value)) {
      this.value = this.clone(value);
      this.incrementVersion();
    }
  }

  get(): T {
    return this.value;
  }
}

interface CreateStateMachineNodeParams<T, Actions> {
  initialValue: T;
  actionHandlers: FunctionalActionHandlerMap<T, Actions>;
  equals?: Equality<T>;
  clone?: Clone<T>;
}
export function createStateMachineNode<T, Actions>(
  {
    initialValue,
    actionHandlers,
    equals = simpleEquality,
    clone = primitiveClone,
  }: CreateStateMachineNodeParams<T, Actions>,
): DataNode & Gettable<T> {
  class AdHocStateMachineNode extends StateMachineNode<T, Actions> {
    initialValue = initialValue;
    clone = clone;
    equals = equals;
    functionalActionHandlers = actionHandlers;
  }

  return new AdHocStateMachineNode();
}
