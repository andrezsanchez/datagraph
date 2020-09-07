import { FunctionalActionHandlerMap } from '../../src/StateMachineNode';
import { Action } from '../../src/Action';
import { GettableNode, PropNodeMap } from '../../src/GettableNode';
import { Gettable } from '../../src/Gettable';
import { DataNode } from '../../src/DataNode';
import { StateMachineNode } from '../../src/StateMachineNode';

type NodeClass<P, V> = new (props: PropNodeMap<P>) => DataNode & Gettable<V>;

type SMNodeClass<V> = new () => DataNode & Gettable<V>;

type GettableNodeClass<V> = new (...args: any) => DataNode & Gettable<V>;

type DescriptorProps<P> = {
  [K in keyof P]: ND<any, PropNodeMap<P[K]>> | P[K];
};

interface ND<P, V> {
  node: NodeClass<P, V>;
  props: DescriptorProps<P>;
}

interface SMND<V, AHM> {
  node: SMNodeClass<V>;
}

interface GettableND<V> {
  node: GettableNodeClass<V>;
}

interface AProps {
  hi: number;
}

class A extends GettableNode<number, AProps> {
  calculateValue(props: AProps) {
    return props.hi * 7;
  }
}

type ActionHandlers = {
  Add: number;
};

class B extends StateMachineNode<number, ActionHandlers> {
  initialValue = 0;
  functionalActionHandlers: FunctionalActionHandlerMap<number, ActionHandlers> = {
    Add(value: number, action) {
      return value + action.payload;
    }
  }
}

// interface AD<T extends Key, P> {
//   type: T;
//   create: (payload: P) => Action<T, P>;
// }

type Key = string | number | symbol;

type ActionMapping<AHM> = {
  [K in keyof AHM]?: AD<K, AHM[K]>;
};

type ActionFactory<T extends Key, P> = (type: T, payload: P) => Action<T, P>;

type AD2<X> = {
  [K in keyof X]: ActionFactory<K, X[K]>;
};

type AD3<X> = Map<keyof X, X[keyof X]>;

interface ActionListener<K extends Key, P> {
  key: Key;
}

interface AD4<X> {
  listeners: AD3<X>
}

type AD5<T> = Map<GettableND<T>, Key>;
type AD6<P> = Map<
  SMND<P, any>,
  Key
>;

interface ValueActionDescriptor<V> {
  node: GettableND<V>;
  listenerMap: AD6<V>;
}

type ActionMapping2<V, AHM> = {
  // [K in keyof AHM]: AD6<AHM[K]>;
  [K in keyof AHM]: AD6<V>;
};

type AD<T extends Key, Payload> = (
  (
    type: T,
    payload: Payload,
  ) => Action<T, Payload>
);

interface NodeParams {
  get: <P, V>(node: NodeClass<P, V>, props: DescriptorProps<P>) => ND<P, V> & GettableND<V>;
  sm: <V, AHM>(
    node: SMNodeClass<V>,
    actionMapping?: ActionMapping2<V, AHM>,
  ) => SMND<V, AHM>;
  action: <P>() => AD6<P>;
  valueAction: <V>(
    nd: GettableND<V>,
  ) => ValueActionDescriptor<V>;
}

function build() {

  const ndSet: Set<ND<any, any>> = new Set();
  const smSet: Set<SMND<any, any>> = new Set();
  const aSet: Set<AD6<any>> = new Set();
  const valueActionSet: Set<ValueActionDescriptor<any>> = new Set();

  const nodeParams: NodeParams = {
    get: (node, props) => {
      const nd = { node, props };
      ndSet.add(nd);
      return nd;
    },
    sm: <V, AHM>(
      node: SMNodeClass<V>,
      actionMapping?: ActionMapping2<V, AHM>,
    ) => {
      const d: SMND<V, AHM> = { node };
      if (actionMapping) {
        for (const key in actionMapping) {
          const map = actionMapping[key];
          map.set(d, key);
        }
      }

      smSet.add(d);

      return d;
    },
    action: () => {
      const d = new Map();
      aSet.add(d);
      return d;
    },
    valueAction: <V>(nd: GettableND<V>) => {
      const d = {
        node: nd,
        listenerMap: new Map(),
      };
      valueActionSet.add(d);

      return d;
    },
  };


  ////////
  ////////
  ////////
  ////////
  ////////


  function nodes(
    { get: gettable, action, sm, valueAction }: NodeParams
  ) {
    const a = gettable(A, { hi: 123 });
    const b = gettable(A, { hi: a });

    const c = gettable(A, { hi: b });

    valueAction(c);

    const addAction = action<number>();

    const ahm = { Add: addAction };
    const d = sm(B, ahm);

    return { c, addAction };
  }

  console.log(
    nodes(nodeParams)
  );

  console.log({ ndSet, smSet, aSet, valueActionSet });

  for (const nd of ndSet) {
    console.log('nd', nd, 'instance', new nd.node(nd.props));
  }
}

build();
