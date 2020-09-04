import { Gettable } from './Gettable';
import { Clone } from './Clone';
import { Equality } from './Equality';
import { isDataNode, DataNode } from '../src/DataNode';

function primitiveClone<T>(primitive: T): T {
  return primitive;
}

function simpleEquality<T>(a: T, b: T): boolean {
  return a === b;
}

interface NodeOps<T> {
  equals: Equality<T>;
}

type GettableDataNode<T> = T | (DataNode & Gettable<GettableDataNode<T>>);
function isGettableDataNode<T>(x: T | GettableDataNode<T>): x is (DataNode & Gettable<GettableDataNode<T>>) {
  if (isDataNode(x)) {
    return typeof x.get === 'function';
  }

  return false;
}

// type GettableDataNode<T> = DataNode & Gettable<T>;

export type PropNodeMap<P> = {
  readonly [K in keyof P]: GettableDataNode<P[K]>;
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

export abstract class GettableNode<T, Props> extends DataNode {
  private value!: T;
  private initialized: boolean = false;

  private propValues!: Props;

  private readonly dependencies: Set<DataNode> = new Set();

  constructor(
    private readonly _props: PropNodeMap<Props>,
  ) {
    super();
    this.propValues = Object.create(null) as PropMap<Props>;
  }

  protected equals(a: T, b: T) {
    return a === b;
  }

  protected clone(value: T): T {
    return value;
  }

  protected abstract calculateValue(props: PropMap<Props>): T;

  private set(value: T) {
    if (!this.initialized || !this.equals(this.value, value)) {
      this.value = this.clone(value);
      this.incrementVersion();
    }
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

    this.initialized = true;
  }

  get(): T {
    if (!this.initialized) {
      throw new Error('DGF lifecycle error');
    }
    return this.value;
  }
}

/**
 * This is used to improve the type inference for `createGettableNode`.
 */
export type RootPropNodeMap<P> = {
  readonly [K in keyof P]: DataNode & Gettable<GettableDataNode<P[K]>>;
}

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
