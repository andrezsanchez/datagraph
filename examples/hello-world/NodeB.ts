import { StateMachineNode } from '../../src/StateMachineNode';
import { ToggleAction, ToggleAction2 } from './ToggleAction';

type Handlers = (
  & ToggleAction.KeyValue
  & ToggleAction2.KeyValue
);

export class NodeB extends StateMachineNode<boolean, Handlers> {
  constructor(
    protected initialValue: boolean,
  ) {
    super();
  }

  functionalActionHandlers = {
    ...ToggleAction.handler<boolean>((value) => {
      return !value;
    }),
    ...ToggleAction2.handler<boolean>((value, action) => {
      return action.payload;
    }),
  };
}
