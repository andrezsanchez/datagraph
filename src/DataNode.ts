import { AnyProps } from './AnyProps';
import { Action } from './Action';
import { Dispatch } from './Dispatch';

/**
 * An interface for an object whose properties are all handler functions for actions.
 */
export interface ActionHandlers {
  [key: string]: (action: Action<any>) => void;
}

/**
 * A barebones base data node class. This abstract class needs to be extended to be used.
 */
export abstract class DataNode {
  /**
   * A convenience version counter. This is used in conjunction with `incrementVersion`.
   */
  private version: number = 0;

  /**
   * A list of node props. This is the default way of listing a node's dependencies, but it is not
   * the only way. Any other scheme must implement the `getDependencies` function.
   */
  public readonly props?: AnyProps;

  /**
   * A set of action handlers that act like a reducer function. 
   */
  public readonly actionHandlers?: ActionHandlers;

  /**
   * A node may return a set of child nodes for DGF to manage.
   */
  getChildNodes?(): Set<DataNode>;

  /**
   * Return a set of dependencies for DGF to track. If unimplemented DGF will populate a set
   * automatically using the `props` field.
   */
  getDependencies?(): Set<DataNode>;

  /**
   * A lifecycle function that is called after a node is removed from the data graph. For example,
   * if a node is added to the data graph as a child node and then subsequently not listed as a
   * child node, the node will be removed, and then this method will be called.
   */
  nodeDidUnmount?(): void;

  /**
   * A lifecycle function prompting the node to update its value. This function must be idempotent.
   * If the value changes the node is expected to return a different value in `getVersion`. The
   * simplest way to do this is to call `incrementVersion`, but that is not necessarily required.
   */
  updateValue() {}

  /**
   * A number value that represents a unique value. This is used by DGF to determine whether
   * the node's value has changed. This is the default implementation for convenience, but it
   * may be overridden. The function `incrementVersion` and the member property `version` are
   * provided for convenience, but if this function is overridden then they don't need to be used.
   */
  getVersion(): number {
    return this.version;
  }

  /**
   * A convenience function to trigger a change.
   */
  incrementVersion() {
    this.version += 1;
  }

  /**
   * A lifecycle function to deal with any side effects.
   */
  manageSideEffects(dispatch: Dispatch) {}
}
