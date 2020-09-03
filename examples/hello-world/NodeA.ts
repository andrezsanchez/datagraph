import { DataNode } from '../../src/DataNode';
import { GettableNode } from '../../src/GettableNode';

interface Props {
  readonly value: boolean;
}

class Dep extends DataNode {
}

export class NodeA extends GettableNode<string, Props> {
  private dep = new Dep();

  calculateValue(props: Props) {
    return props.value
      ? 'Hello, world'
      : 'Boo';
  }

  getChildNodes(): Set<DataNode> {
    // const value = this.props.value.get();

    // if (value) {
    //   return new Set([this.dep]);
    // }

    return new Set();
  }
}
