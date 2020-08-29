import { Equality } from './Equality';
import { Clone } from './Clone';

export enum MaybeType {
  Value,
  Unset,
}

export interface MaybeSet<T> {
  type: MaybeType.Value;
  value: T;
}

export interface MaybeUnset {
  type: MaybeType.Unset;
}

/**
 * A type that allows for out of band indication of the absence of a value.
 */
export type Maybe<T> = MaybeSet<T> | MaybeUnset;

export class MaybeOps {
  public static unset(): MaybeUnset {
    return {
      type: MaybeType.Unset,
    };
  }

  public static value<T>(value: T): MaybeSet<T> {
    return {
      type: MaybeType.Value,
      value,
    };
  }

  public static getEquals<T>(equalsT: Equality<T>): Equality<Maybe<T>> {
    return (a: Maybe<T>, b: Maybe<T>): boolean => (
      MaybeOps.equals(a, b, equalsT)
    );
  }

  public static equals<T>(a: Maybe<T>, b: Maybe<T>, equalsT: Equality<T>) {
    if (a.type === MaybeType.Value && b.type === MaybeType.Value) {
      return equalsT(a.value, b.value);
    }

    if (a.type === MaybeType.Unset && b.type === MaybeType.Unset) {
      return true;
    }

    return false;
  }

  /**
   * Return the value, if it exists, or a fallback value if it does not.
   */
  public static valueOr<T, U>(maybe: Maybe<T>, fallback: U): T | U {
    if (maybe.type === MaybeType.Unset) {
      return fallback;
    }

    return maybe.value;
  }

  public static isValue<T>(maybe: Maybe<T>): boolean {
    return maybe.type === MaybeType.Value;
  }

  public static getClone<T>(cloneT: Clone<T>): Clone<Maybe<T>> {
    return (source: Maybe<T>) => MaybeOps.clone(source, cloneT);
  }

  public static clone<T>(source: Maybe<T>, cloneT?: Clone<T>): Maybe<T> {
    if (source.type === MaybeType.Value) {
      return {
        type: MaybeType.Value,
        value: cloneT ? cloneT(source.value) : source.value,
      };
    }

    return {
      type: MaybeType.Unset,
    };
  }
}
