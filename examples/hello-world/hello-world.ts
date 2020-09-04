import { NodeA } from './NodeA';
import { AnyAction } from '../../src/Action';
import { DataGraph } from '../../src/DataGraph';
import { DataNode } from '../../src/DataNode';
import { ToggleAction, ToggleAction2 } from './ToggleAction';
import { createGettableNode } from '../../src/GettableNode';
import { createStateMachineNode } from '../../src/StateMachineNode';

const graph = new DataGraph();

function n(node: DataNode): DataNode {
  if (!graph.nodeContextMap.has(node)) {
    graph.addNode(node);
  }
  return node;
}

const valueNode = createStateMachineNode({
  initialValue: false,
  actionHandlers: {
    ...ToggleAction.handler<boolean>((value, action) => {
      return !value;
    }),
    ...ToggleAction2.handler<boolean>((value, action) => {
      return action.payload;
    }),
  },
});
graph.addNode(valueNode);

const nodeA = new NodeA({ value: valueNode });
graph.addNode(nodeA);

const str = createGettableNode(
  { value: valueNode },
  (props) => {
    return props.value ? 'Hello, world.' : 'Wat';
  },
);
graph.addNode(str);

const strLenNode = createGettableNode(
  { string: str },
  (props) => {
    return props.string.length;
  },
);
graph.addNode(strLenNode);

async function dispatch(action: AnyAction) {
  return new Promise((resolve) => {
    graph.handleAction(dispatch, action);
    resolve();
  });
}

graph.updateAllNodes(dispatch);

async function main() {
  console.log(strLenNode.get());
  await dispatch(ToggleAction.create());
  console.log(strLenNode.get());
  await dispatch(ToggleAction2.create(true));
  console.log(strLenNode.get());
}

main();