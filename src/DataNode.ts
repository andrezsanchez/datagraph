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
 * A barebones base class for a Node, to be extended.
 */
export abstract class DataNode {
  private version: number = 0;
  public readonly props?: AnyProps;
  public readonly actionHandlers?: ActionHandlers;

  getChildNodes?(): Set<DataNode>;
  getDependencies?(): Set<DataNode>;
  nodeDidUnmount?(): void;
  updateValue() {}
  getVersion(): number {
    return this.version;
  }
  incrementVersion() {
    this.version += 1;
  }
  manageSideEffects(dispatch: Dispatch) {}
}
