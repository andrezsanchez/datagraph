import { DataNode } from './DataNode';

export class ConstantNode<T> extends DataNode {
  constructor (
    private readonly value: T,
  ) {
    super();
  }

  get(): T {
    return this.value;
  }
}
