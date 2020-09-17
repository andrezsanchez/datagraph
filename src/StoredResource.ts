import { Clone } from './Clone';
import { Equality } from './Equality';

/**
 * A interface for key-value like pairs, but allows for the key to be
 * something other than a string.
 */
export interface StoredResource<D, R> {
  descriptor: D;
  resource: R;
}

export class StoredResourceOps {
  public static getEquals<D, R>(
    equalityD: Equality<D>,
    equalityR: Equality<R>,
  ): Equality<StoredResource<D, R>> {
    return (
      a: StoredResource<D, R>,
      b: StoredResource<D, R>,
    ) => (
      StoredResourceOps.equals(a, b, equalityD, equalityR)
    );
  }

  public static equals<D, R>(
    a: StoredResource<D, R>,
    b: StoredResource<D, R>,
    equalityD: Equality<D>,
    equalityR: Equality<R>,
  ) {
    return (
      equalityD(a.descriptor, b.descriptor) && equalityR(a.resource, b.resource)
    );
  }

  public static getClone<D, R>(
    cloneD: Clone<D>,
    cloneR: Clone<R>,
  ): Clone<StoredResource<D, R>> {
    return (source: StoredResource<D, R>) => (
      StoredResourceOps.clone(source, cloneD, cloneR)
    );
  }

  public static clone<D, R>(
    source: StoredResource<D, R>,
    cloneD: Clone<D>,
    cloneR: Clone<R>,
  ): StoredResource<D, R> {
    return {
      descriptor: cloneD(source.descriptor),
      resource: cloneR(source.resource),
    };
  }
}
