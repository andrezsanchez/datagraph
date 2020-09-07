import { Action, makeActionCreator } from '../../src/Action';

/**
 * This is the conventional way to define actions.
 * 
 * Namespaces are generally not great but they are useful in this context because they allow
 * the exporting of both types and values on an object. Someone else can
 * `import { ValueAction }` and then refer to `ValueAction.Type` or `ValueAction.create`. This is
 * great for action listener definitions.
 * 
 * In general these are boilerplate and there should be no deviance from this templates. The only
 * things that should change are `name` (which should match the namespace name) and `Payload` which
 * specifies the type of payload in the action. If there is no need for a payload then use
 * `Payload = void`. You can switch to using an interface for this field as well if desired.
 * A payload should be a POJO object and not include class instances or anything with a prototype
 * chain.
 * 
 * Whether you define one or multiple actions per file is your own decision per this convention.
 * 
 * Would that TypeScript had better templating for this so we could obviate this boilerplate...
 */
export namespace ValueAction {
  export const name = 'ValueAction';
  export type Payload = void;

  // These definitions should never be changed.
  export type Name = typeof name;
  export type Type = Action<Name, Payload>;
  export const create = makeActionCreator<Name, Payload>(name);
}