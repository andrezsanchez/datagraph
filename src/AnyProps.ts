import { DataNode } from './DataNode';

/**
 * A type for a props object where every property is a DataNode instance.
 */
export interface AnyProps {
  readonly [key: string]: DataNode;
}
