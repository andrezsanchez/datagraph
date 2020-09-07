import { Gettable } from './Gettable';
import { DataNode, isDataNode } from './DataNode';

export type GettableOrValue<T> = T | (DataNode & Gettable<GettableOrValue<T>>);

export function isGettableDataNode<T>(
  x: GettableOrValue<T>,
): x is (DataNode & Gettable<GettableOrValue<T>>) {
  if (isDataNode(x)) {
    return typeof x.get === 'function';
  }

  return false;
}
