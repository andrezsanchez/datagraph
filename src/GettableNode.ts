import { dataNode } from './DataNode';
import { GettableOrValue, isGettableDataNode } from './GettableNodeOrValue';
import { Gettable } from './Gettable';
import { Clone } from './Clone';
import { Equality } from './Equality';
import { isDataNode, DataNode, LegacyDataNode } from '../src/DataNode';

function primitiveClone<T>(primitive: T): T {
  return primitive;
}

function simpleEquality<T>(a: T, b: T): boolean {
  return a === b;
}

interface NodeOps<T> {
  equals: Equality<T>;
}

export type PropNodeMap<P> = {
  readonly [K in keyof P]: GettableOrValue<P[K]>;
}

export type PropMap<P> = {
  [K in keyof P]: P[K];
}

function clearObject<P>(obj: PropMap<P>) {
  for (const key in obj) {
    if (Object.hasOwnProperty.call(obj, key)) {
      delete obj[key];
    }
  }
}

function setPropValues<P>(
  trackedObject: PropMap<P>,
  props: PropNodeMap<P>,
  dependencies: Set<DataNode>,
) {
  for (const key in props) {
    if (Object.hasOwnProperty.call(props, key)) {
      Object.defineProperty(
        trackedObject,
        key,
        {
          enumerable: true,
          configurable: true,
          get() {
            let nodeOrValue = props[key];
            while (true) {
              if (!isGettableDataNode(nodeOrValue)) {
                return nodeOrValue;
              }
              dependencies.add(nodeOrValue);
              nodeOrValue = nodeOrValue.get()
            }
          },
        },
      );
    }
  }
}

export abstract class GettableNode<T, Props> implements DataNode {
  [dataNode]: true = true;
  private version: number = 0;

  private value!: T;
  private hasValidValue: boolean = false;

  private propValues!: Props;

  private readonly dependencies: Set<DataNode> = new Set();

  constructor(
    private readonly _props: PropNodeMap<Props>,
  ) {
    this.propValues = Object.create(null) as PropMap<Props>;
  }

  protected equals(a: T, b: T) {
    return a === b;
  }
  nodeDidUnmount() {
    
    // Remove any value just in case there is something to GC.
    (this.value as unknown) = undefined;

    // The node's value is invalid now so if someone tries to get() it they should get an error.
    this.hasValidValue = false;
  }

  protected clone(value: T): T {
    return value;
  }

  protected abstract calculateValue(props: PropMap<Props>): T;

  private set(value: T) {
    if (!this.hasValidValue || !this.equals(this.value, value)) {
      this.value = this.clone(value);
      this.version += 1;
    }
  }

  getVersion() {
    return this.version;
  }

  getDependencies() {
    return new Set(this.dependencies);
  }

  updateValue() {
    this.dependencies.clear();
    clearObject(this.propValues);
    setPropValues(
      this.propValues,
      this._props,
      this.dependencies,
    );
    this.set(this.calculateValue(this.propValues));

    this.hasValidValue = true;
  }

  get(): T {
    // This should never be called before the initialization.
    if (!this.hasValidValue) {
      throw new Error('DGF lifecycle error');
    }
    return this.value;
  }
}

/**
 * This is used to improve the type inference for `createGettableNode`.
 */
export type RootPropNodeMap<P> = {
  readonly [K in keyof P]: DataNode & Gettable<GettableOrValue<P[K]>>;
}

/**
 * A convenient way to define a GettableNode without making a class.
 */
export function createGettableNode<T, Props extends PropMap<Props>>(
  props: RootPropNodeMap<Props>,
  calculateValue: (props: Readonly<Props>) => T,
  equals: Equality<T> = simpleEquality,
  clone: Clone<T> = primitiveClone,
): DataNode & Gettable<T> {
  class AdHocGettableNode extends GettableNode<T, Props> {
    calculateValue = calculateValue;
    clone = clone;
    equals = equals;
  }

  return new AdHocGettableNode(props);
}
