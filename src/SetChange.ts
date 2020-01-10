export class SetChange<T> {
  public added: Set<T> = new Set();
  public removed: Set<T> = new Set();

  public isEmpty(): boolean {
    return this.added.size === 0 && this.removed.size === 0;
  }
}

/**
 * Calculates the differences between two sets. If one set is "before", and the other "after", then
 * there will be some nodes that have been added, and some that have been removed. The result is
 * stored in the `change` parameter in place.
 */
export function calculateSetChange<T>(
  change: SetChange<T>,
  before: ReadonlySet<T>,
  after: ReadonlySet<T>,
) {
  change.added.clear();
  change.removed.clear();

  before.forEach((item) => {
    if (!after.has(item)) {
      change.removed.add(item);
    }
  });
  after.forEach((item) => {
    if (!before.has(item)) {
      change.added.add(item);
    }
  });
}
