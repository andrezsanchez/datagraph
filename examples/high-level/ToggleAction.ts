import { Action, makeActionCreator, makeFnActionHandlerCreator } from '../../src/Action';

export namespace ToggleAction {
  export const name = 'ToggleAction';
  export type Payload = void;
  export type Name = typeof name;
  export type KeyValue = { [name]: Payload };
  export type Type = Action<typeof name, Payload>;
  export const create = makeActionCreator(name);
  export const handler = makeFnActionHandlerCreator<KeyValue>(name);
}

export namespace ToggleAction2 {
  export const name = 'ToggleAction2';
  export type Payload = boolean;

  export type Name = typeof name;
  export type KeyValue = { [name]: Payload };
  export type Type = Action<Name, Payload>;
  export const create = makeActionCreator<Name, Payload>(name);
  export const handler = makeFnActionHandlerCreator<KeyValue>(name);
}