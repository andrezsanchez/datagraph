/**
 * An interface for classes that have a `get` function. Usually this will be for DataNode instances
 * where the user wants to specify a node with a particular output type, but without specifying the
 * particular node class.
 *
 * This is particularly useful for testing. For example, there might be a screen size node class
 * that another node depends on. Rather than specifying that node type specifically, you could
 * specify the dependency as a Gettable<ReadonlyVector2>.
 */
export interface Gettable<T> {
  get(): T;
}
