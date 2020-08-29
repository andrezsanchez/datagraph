import { AnyAction } from '../Action';

export class MockDispatcher {
  private actions: AnyAction[] = [];

  constructor() {
    this.dispatch = this.dispatch.bind(this);
  }

  dispatch<A extends AnyAction>(action: A): A {
    this.actions.push(action);
    return action;
  }

  getActions(): ReadonlyArray<AnyAction> {
    return this.actions;
  }
}
