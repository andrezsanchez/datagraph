import { Equality } from './Equality';
import { Maybe } from './Maybe';
import { StoredResource } from './StoredResource';

export type ResourceState<D, R> = (
  StoredResource<
    Maybe<D>,
    Maybe<StoredResource<D, R>>
  >
);

export interface ResourceStateOps<D, R> {
  cloneResource(source: R): R;
  cloneDescriptor(source: D): D;
  cloneStoredResource(source: StoredResource<D, R>): StoredResource<D, R>;
  cloneResourceState(source: ResourceState<D, R>): ResourceState<D, R>;
  equalsResourceState(a: ResourceState<D, R>, b: ResourceState<D, R>): boolean;
  equalsDescriptor: Equality<D>;
  equalsResource: Equality<R>;
}

export interface ResourceStateTransitioner<D, R> {
  applyResource(
    state: ResourceState<D, R>,
    resource: StoredResource<D, R>,
  ): ResourceState<D, R>;
  applyDescriptor(
    state: ResourceState<D, R>,
    descriptor: Maybe<D>,
  ): ResourceState<D, R>;
}
