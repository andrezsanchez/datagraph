import { Dispatch as ReduxDispatch } from 'redux';
import { AnyAction } from './Action';

/**
 * The same as Redux's Dispatch, but with our generic action type filled in.
 */
export type Dispatch = (action: AnyAction) => void;
