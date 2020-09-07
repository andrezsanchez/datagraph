import { DataNode, dataNode } from './DataNode';

export class ConstantNode<T> implements DataNode {
  [dataNode]: true

  constructor (
    private readonly value: T,
  ) {
  }

  getVersion() {
    return 0;
  }

  get(): T {
    return this.value;
  }
}
