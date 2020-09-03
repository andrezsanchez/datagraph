import invariant from 'invariant';
import { DataNode, UnknownActionHandlerMap } from './DataNode';
import { AnyProps } from './AnyProps';
import { AnyAction } from './Action';
import { mergeSet } from './mergeSet';
import { SetChange, calculateSetChange } from './SetChange';
import { Dispatch } from './Dispatch';

type SubscriptionCallback = () => void;

enum TreeTraversalOrder {
  PRE,
  POST,
}

const DEBUG = false;

function log(...values: unknown[]) {
  if (DEBUG) {
    console.log(...values);
  }
}

function getNodeDependencies(node: DataNode): Set<DataNode> {
  if (node.getDependencies) {
    return node.getDependencies();
  }
  if (node.props) {
    const props = node.props as AnyProps;
    return new Set<DataNode>(Object.keys(props).map(key => (props[key] as DataNode)));
  }
  return new Set<DataNode>();
}

class NodeContext {
  public readonly dependencies: Set<DataNode> = new Set();
  public readonly dependents: Set<DataNode> = new Set();
  public readonly children: Set<DataNode> = new Set();
  public readonly actionHandlers: UnknownActionHandlerMap;
  public subscriptions: Set<SubscriptionCallback> = new Set();
  public version: number = NaN;
  public order: number = NaN;
  constructor(
    public node: DataNode,
  ) {
    this.actionHandlers = node?.getActionHandlers?.() ?? node.actionHandlers ?? Object.create(null);
  }

  /**
   * Calls updateValue() on the node, updates this.version to the node's version, and returns true
   * if the node's version changed.
   */
  updateValue(): boolean {
    this.node.updateValue();
    const versionBefore = this.version;
    const versionAfter = this.node.getVersion();
    this.version = versionAfter;

    return (versionBefore !== versionAfter);
  }

  isOutdated(): boolean {
    return this.version !== this.node.getVersion();
  }
}

export class DataGraph {
  public readonly nodeContextMap: Map<DataNode, NodeContext> = new Map();
  private actionListeners: Map<string, Set<DataNode>> = new Map();

  /**
   * Listen to a node for changes.
   */
  subscribe(node: DataNode, callback: SubscriptionCallback) {
    const nodeContext = this.nodeContextMap.get(node) as NodeContext;
    invariant(nodeContext, 'node must be in the graph');
    nodeContext.subscriptions.add(callback);
  }

  unsubscribe(node: DataNode, callback: SubscriptionCallback) {
    const nodeContext = this.nodeContextMap.get(node) as NodeContext;
    invariant(nodeContext, 'node must be in the graph');
    nodeContext.subscriptions.delete(callback);
  }

  triggerSubscriptionCallbacks(nodes: Set<DataNode>) {
    nodes.forEach((node: DataNode) => {
      const nodeContext = this.nodeContextMap.get(node) as NodeContext;
      invariant(nodeContext, 'node must be in the graph');
      nodeContext.subscriptions.forEach(subscription => subscription());
    });
  }

  /**
   * Add a node to the graph.
   */
  addNode(node: DataNode) {
    this.addNodes(new Set<DataNode>([node]));
  }

  /**
   * Add nodes to the graph. Does not initialize any new children.
   */
  addNodes(nodes: Set<DataNode>) {
    this.forEachInTree(nodes, TreeTraversalOrder.PRE, (node) => {
      log(`Adding node ${node.constructor.name}`);
      invariant(!this.nodeContextMap.has(node), 'node must not already be in the graph');
      const nodeContext = new NodeContext(node);
      this.nodeContextMap.set(node, nodeContext);

      if (node.getChildNodes) {
        mergeSet(nodeContext.children, node.getChildNodes());
      }

      // Go through each of the node's action handlers and add them to the graph's actionListeners
      // map.
      for (const key in nodeContext.actionHandlers) {
        let actionSet = this.actionListeners.get(key);
        if (!actionSet) {
          actionSet = new Set();
          this.actionListeners.set(key, actionSet);
        }
        actionSet.add(node);
      }
    });

    // Add dependencies
    this.forEachInTree(nodes, TreeTraversalOrder.PRE, (node) => {
      getNodeDependencies(node).forEach((dependency: DataNode) => {
        this.addDependency(node, dependency);
      });
    });
  }

  removeNodes(nodes: Set<DataNode>) {
    // First remove the dependencies
    this.forEachInTree(nodes, TreeTraversalOrder.POST, (node) => {
      getNodeDependencies(node).forEach((dependency) => {
        this.removeDependency(node, dependency);
      });
    });

    // Now remove the nodes
    this.forEachInTree(nodes, TreeTraversalOrder.POST, (node) => {
      const nodeContext = this.nodeContextMap.get(node) as NodeContext;
      invariant(nodeContext, 'node must be in the graph');
      this.nodeContextMap.delete(node);

      if (node.nodeDidUnmount) {
        node.nodeDidUnmount();
      }

      for (const key in nodeContext.actionHandlers) {
        const actionSet = this.actionListeners.get(key);
        if (actionSet) {
          actionSet.delete(node);
        }
      }
    });
  }

  /**
   * Calls action handlers for all nodes registered with the action type. Returns the set of nodes
   * whose values changed directly or indirectly as a result.
   */
  handleAction(dispatch: Dispatch, action: AnyAction): Set<DataNode> {
    log('Handling action', action);
    const listenerSet = this.actionListeners.get(action.type);
    if (!listenerSet) {
      log('No nodes were affected by action', action);

      return new Set();
    }

    listenerSet.forEach((listener: DataNode) => {
      const nodeContext = this.nodeContextMap.get(listener) as NodeContext;
      invariant(nodeContext, 'node must be in the graph');

      const handler = nodeContext.actionHandlers[action.type];
      invariant(
        handler,
        `Action ${action.type} registered as listener for ${listener.constructor} instance, but \
        function does not exist on the instance`,
      );
      handler(action);
    });

    const allChangedNodes = this.updateNodes(dispatch, listenerSet);

    log(`${allChangedNodes.size} nodes affected by action`, action);
    return allChangedNodes;
  }

  /**
   * Perform a change lifecycle for each node in `nodes` and return a set of nodes that have
   * changed.
   */
  updateNodes(dispatch: Dispatch, nodes: Set<DataNode>): Set<DataNode> {
    const changedNodes = new Set<DataNode>();

    nodes.forEach((node: DataNode) => {
      this.collectChangedNodes(node, changedNodes, nodes);
    });

    // Do this separately since we know all node updates are now complete.
    this.handleNodeChildren(changedNodes);

    changedNodes.forEach((node: DataNode) => {
      this.handleNodeDependencies(node);
    });

    changedNodes.forEach((node:DataNode) => {
      node.manageSideEffects(dispatch);
    });

    return changedNodes;
  }

  private forEachInTree(
    nodes: Set<DataNode>,
    order: TreeTraversalOrder,
    callback: (node: DataNode) => void,
  ) {
    const isPre = (order === TreeTraversalOrder.PRE);
    nodes.forEach((node) => {
      if (isPre) {
        callback(node);
      }

      const nodeContext = this.nodeContextMap.get(node) as NodeContext;
      invariant(nodeContext, 'node must be in the graph');
      this.forEachInTree(nodeContext.children, order, callback);

      if (!isPre) {
        callback(node);
      }
    });
  }

  /**
   * Add a dependency to a node.
   */
  private addDependency(node: DataNode, dependency: DataNode) {
    const nodeContext = this.nodeContextMap.get(node) as NodeContext;
    invariant(nodeContext, 'node must be in the graph');
    nodeContext.dependencies.add(dependency);

    const dependencyNodeContext = this.nodeContextMap.get(dependency) as NodeContext;
    invariant(dependencyNodeContext, 'dependency must be in the graph');
    dependencyNodeContext.dependents.add(node);
  }

  /**
   * Remove a dependency from a node. Calling on an unregistered node is a valid NOOP.
   */
  private removeDependency(node: DataNode, dependency: DataNode) {
    const nodeContext = this.nodeContextMap.get(node);
    if (nodeContext) {
      nodeContext.dependencies.delete(dependency);
    }

    const dependencyNodeContext = this.nodeContextMap.get(dependency);
    if (dependencyNodeContext) {
      dependencyNodeContext.dependents.delete(node);
    }
  }

  /**
   * Handle adding and removing of a node's children to the graph.
   */
  private handleNodeChildren(changedNodes: Set<DataNode>) {
    const addedNodes = new Set<DataNode>();
    const removedNodes = new Set<DataNode>();
    Array.from(changedNodes).forEach((node) => {

      // If there is no getChildNodes then there will never be any children.
      if (!node.getChildNodes) {
        return;
      }

      const nodeContext = this.nodeContextMap.get(node) as NodeContext;
      const children = nodeContext.children;
      const childrenAfter = node.getChildNodes();

      const change = new SetChange<DataNode>();
      calculateSetChange(change, children, childrenAfter);

      this.forEachInTree(change.removed, TreeTraversalOrder.POST, (node) => {
        changedNodes.delete(node);
      });

      log(
        `Adding children for ${node.constructor.name}: [${
          [...change.added.values()].map(x => x.constructor.name)
        }]`);

      mergeSet(removedNodes, change.removed);
      mergeSet(addedNodes, change.added);

      children.clear();
      mergeSet(children, childrenAfter);
    });
    this.removeNodes(removedNodes);
    this.addNodes(addedNodes);

    // Do an initial update for the added node. Do this after the nodes are all added in case they
    // have mutual dependencies.
    this.forEachInTree(addedNodes, TreeTraversalOrder.PRE, (node) => {
      log(`Initial updateValue call for newly mounted node ${node.constructor.name}`);
      const nodeContext = this.nodeContextMap.get(node) as NodeContext;
      nodeContext.updateValue();
      changedNodes.add(node);
    });
  }

  /**
   * Handle adding and removing of a node's dependencies to the graph.
   */
  private handleNodeDependencies(node: DataNode) {
    // If there is no getDependencies explicitly defined, then the dependencies
    // are static (i.e., based on props).
    if (!node.getDependencies) {
      return;
    }

    const nodeContext = this.nodeContextMap.get(node) as NodeContext;
    invariant(nodeContext, 'node must be in the graph');

    const dependencies = nodeContext.dependencies;
    const dependenciesAfter = node.getDependencies();

    const change = new SetChange<DataNode>();
    calculateSetChange(change, dependencies, dependenciesAfter);
    change.removed.forEach((dependency) => {
      // TODO(mattryavec): If a node depends on one of its children, the
      // child node will be removed before the dependencies are updated.
      // Either depending on children should be disallowed, or the timing
      // of removing dynamic dependencies needs to change.
      this.removeDependency(node, dependency);
    });
    change.added.forEach((dependency) => {
      this.addDependency(node, dependency);
    });
  }

  /**
   * Naively update all of the nodes.
   *
   * @TODO: Use topological sort to do this intelligently.
   */
  updateAllNodes(dispatch: Dispatch) {
    log('updateAllNodes');
    this.updateNodes(dispatch, new Set(this.nodeContextMap.keys()));
  }

  /**
   * Beginning with `node`, call `updateValue` on each node that is a dependency of a changed node
   * and adds all dependencies in the graph that are members of `originalNodes` for the nodes that
   * change as a result of this to `changedNodes`.
   *
   * @TODO: Use topological sort to avoid double-calling.
   * @TODO: Use stack instead of recursively calling self.
   */
  private collectChangedNodes(
    node: DataNode,
    changedNodes: Set<DataNode>,
    originalNodes: Set<DataNode>,
  ) {
    log(`Calling updateValue for ${node.constructor.name}`);
    // Only update the dependents if the node itself has changed.
    const nodeContext = this.nodeContextMap.get(node) as NodeContext;
    invariant(nodeContext, 'node must be in the graph');
    if (nodeContext.updateValue()) {
      log(`Node ${node.constructor.name} had value change`);
      changedNodes.add(node);

      nodeContext.dependents.forEach((dependent: DataNode) => {
        if (!originalNodes.has(dependent)) {
          this.collectChangedNodes(dependent, changedNodes, originalNodes);
        }
      });
    }
  }

}
