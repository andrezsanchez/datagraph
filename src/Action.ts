// import { AnyAction as ReduxAnyAction } from 'redux';

// extends ReduxAnyAction
export interface Action<P>  {
  type: string;
  payload: P;
}

export type AnyAction = Action<any>;

export function makeActionCreator<P>(type: string) {
  return function createAction(payload: P) {
    return {
      type,
      payload,
    };
  };
}

export function makePayloadlessActionCreator(type: string) {
  return function createAction() {
    return {
      type,
      payload: undefined,
    };
  };
}
