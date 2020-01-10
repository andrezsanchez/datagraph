/**
 * Merges all of `source` into `target`.
 */
export function mergeSet<T>(target:Set<T>, source:ReadonlySet<T>) {
  source.forEach((value:T) => {
    target.add(value);
  });
}
