import test from 'tape';
import { anything, deepEqual, instance, mock, spy, verify, when } from 'ts-mockito';
import { DataGraph } from '../DataGraph';
import { DataNode, ActionHandlerMap } from '../DataNode';
import { Action } from '../Action';
import { SetChange, calculateSetChange } from '../SetChange';
import { MockDispatcher } from './MockDispatcher';

function setsEqual<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean {
  const change = new SetChange<T>();
  calculateSetChange(change, a, b);
  return change.added.size === 0 && change.removed.size === 0;
}

function graphNodes(graph: DataGraph): Set<DataNode> {
  return new Set(graph.nodeContextMap.keys());
}

class MockDataNode extends DataNode {
  public dependencies: Set<DataNode> = new Set();
  public children: Set<DataNode> = new Set();
  public actionHandlers?: ActionHandlerMap<unknown>;

  getDependencies() {
    return this.dependencies;
  }

  getChildNodes() {
    return this.children;
  }
}

const dummyAction: Action<'dummy', 'payload'> = { type: 'dummy', payload: 'payload' };

class TestFixture {
  public graph: DataGraph;

  public a: MockDataNode;
  public a1: MockDataNode;
  public b: MockDataNode;

  public spiedA: MockDataNode;
  public spiedA1: MockDataNode;
  public spiedB: MockDataNode;

  public dispatcher: MockDispatcher = new MockDispatcher();

  constructor() {
    this.graph = new DataGraph();

    this.a1 = new MockDataNode();

    this.a = new MockDataNode();
    this.a.children.add(this.a1);

    this.b = new MockDataNode();
    this.b.dependencies.add(this.a);

    this.spiedA = spy(this.a);
    this.spiedA1 = spy(this.a1);
    this.spiedB = spy(this.b);
  }
}

test('DataGraph_initialAdd', (t) => {
  const fixture = new TestFixture();
  t.plan(1);

  fixture.graph.addNodes(new Set<DataNode>([ fixture.a, fixture.b ]));

  const expected = new Set<DataNode>([ fixture.a, fixture.b, fixture.a1 ]);
  t.assert(setsEqual(graphNodes(fixture.graph), expected));
});

test('DataGraph_removeNode', (t) => {
  const fixture = new TestFixture();
  t.plan(1);

  fixture.graph.addNodes(new Set<DataNode>([ fixture.a, fixture.b ]));
  fixture.graph.removeNodes(new Set<DataNode>([ fixture.b ]));

  const expected = new Set<DataNode>([ fixture.a, fixture.a1 ]);
  t.assert(setsEqual(graphNodes(fixture.graph), expected));
});

test('DataGraph_removeNode_withChildren', (t) => {
  const fixture = new TestFixture();
  t.plan(1);

  fixture.graph.addNodes(new Set<DataNode>([ fixture.a, fixture.b ]));
  fixture.graph.removeNodes(new Set<DataNode>([ fixture.a ]));

  const expected = new Set<DataNode>([ fixture.b ]);
  t.assert(setsEqual(graphNodes(fixture.graph), expected));
});

test('DataGraph_updateValue', (t) => {
  const fixture = new TestFixture();
  t.plan(1);

  fixture.a.actionHandlers = {
    'dummy': () => { fixture.a.incrementVersion(); }
  }
  fixture.graph.addNodes(new Set<DataNode>([ fixture.a ]));

  fixture.graph.handleAction(fixture.dispatcher.dispatch, dummyAction);

  t.doesNotThrow(() => {
    verify(fixture.spiedA.updateValue()).once();
    verify(fixture.spiedA1.updateValue()).never();
  });
});

test('DataGraph_dependentsUpdateValue', (t) => {
  const fixture = new TestFixture();
  t.plan(1);

  fixture.a.actionHandlers = {
    'dummy': () => { fixture.a.incrementVersion(); }
  }
  fixture.graph.addNodes(new Set<DataNode>([ fixture.a, fixture.b ]));

  fixture.graph.handleAction(fixture.dispatcher.dispatch, dummyAction);

  t.doesNotThrow(() => {
    verify(fixture.spiedA.updateValue()).once();
    verify(fixture.spiedA1.updateValue()).never();
    verify(fixture.spiedB.updateValue()).once();
  });
});

test('DataGraph_handleChildren_add', (t) => {
  const fixture = new TestFixture();
  t.plan(2);

  const b1 = new MockDataNode();
  const b2 = new MockDataNode();
  b2.dependencies.add(b1);

  fixture.b.actionHandlers = {
    'dummy': () => {
      fixture.b.children.add(b1);
      fixture.b.children.add(b2);
      fixture.b.incrementVersion();
    }
  }
  fixture.graph.addNodes(new Set<DataNode>([ fixture.a, fixture.b ]));
  t.assert(setsEqual(graphNodes(fixture.graph),
    new Set<DataNode>([ fixture.a, fixture.b, fixture.a1 ])));

  fixture.graph.handleAction(fixture.dispatcher.dispatch, dummyAction);
  t.assert(setsEqual(graphNodes(fixture.graph),
    new Set<DataNode>([ fixture.a, fixture.b, fixture.a1, b1, b2 ])),
    'New children should be in set');
});

test('DataGraph_handleChildren_remove', (t) => {
  const fixture = new TestFixture();
  t.plan(2);

  fixture.a.actionHandlers = {
    'dummy': () => {
      fixture.a.children.clear();
      fixture.a.incrementVersion();
    }
  }
  fixture.graph.addNodes(new Set<DataNode>([ fixture.a, fixture.b ]));
  t.assert(setsEqual(graphNodes(fixture.graph),
    new Set<DataNode>([ fixture.a, fixture.b, fixture.a1 ])));

  fixture.graph.handleAction(fixture.dispatcher.dispatch, dummyAction);
  t.assert(setsEqual(graphNodes(fixture.graph),
    new Set<DataNode>([ fixture.a, fixture.b ])),
    'Children should be removed');
});

test('DataGraph_handleChildren_childTreeAddedAndRemoved', (t) => {
  const fixture = new TestFixture();
  t.plan(4);

  const c = new MockDataNode();

  const c1 = new MockDataNode();
  const c1i = new MockDataNode();
  const c1ii = new MockDataNode();
  c1.children.add(c1i);
  c1.children.add(c1ii);

  const c2 = new MockDataNode();
  const c2i = new MockDataNode();
  const c2ii = new MockDataNode();
  c2.children.add(c2i);
  c2.children.add(c2ii);

  const spiedC = spy(c);
  const spiedC1 = spy(c1);
  const spiedC1i = spy(c1i);
  const spiedC1ii = spy(c1ii);
  const spiedC2 = spy(c2);
  const spiedC2i = spy(c2i);
  const spiedC2ii = spy(c2ii);

  c.actionHandlers = {
    'add': () => {
      c.children.add(c1);
      c.children.add(c2);
      c.incrementVersion();
    },
    'remove': () => {
      c.children.clear();
      c.incrementVersion();
    }
  }
  fixture.graph.addNodes(new Set<DataNode>([ c ]));
  t.assert(setsEqual(graphNodes(fixture.graph), new Set<DataNode>([ c ])));

  const dispatch = fixture.dispatcher.dispatch
  fixture.graph.handleAction(dispatch, { type: 'add', payload: 'p' });
  t.assert(setsEqual(graphNodes(fixture.graph),
    new Set<DataNode>([ c, c1, c1i, c1ii, c2, c2i, c2ii ])),
    'Children should be added');

  fixture.graph.handleAction(dispatch, { type: 'remove', payload: 'p' });
  t.assert(setsEqual(graphNodes(fixture.graph),
    new Set<DataNode>([ c ])),
    'Children should be removed');

  t.doesNotThrow(() => {
    verify(spiedC.updateValue()).twice();
    verify(spiedC1.updateValue()).once();
    verify(spiedC1i.updateValue()).once();
    verify(spiedC1ii.updateValue()).once();
    verify(spiedC2.updateValue()).once();
    verify(spiedC2i.updateValue()).once();
    verify(spiedC2ii.updateValue()).once();

    verify(spiedC.manageSideEffects(dispatch)).twice();
    verify(spiedC1.manageSideEffects(dispatch)).once();
    verify(spiedC1i.manageSideEffects(dispatch)).once();
    verify(spiedC1ii.manageSideEffects(dispatch)).once();
    verify(spiedC2.manageSideEffects(dispatch)).once();
    verify(spiedC2i.manageSideEffects(dispatch)).once();
    verify(spiedC2ii.manageSideEffects(dispatch)).once();
  });

});

test('DataGraph_addDependency', (t) => {
  const fixture = new TestFixture();
  t.plan(1);

  const c = new MockDataNode();
  const spiedC = spy(c);

  fixture.a.actionHandlers = {
    'add': () => { fixture.b.dependencies.add(c); },
  };
  c.actionHandlers = {
    'dummy': () => { c.incrementVersion(); },
  };
  fixture.graph.addNodes(new Set<DataNode>([ fixture.a, fixture.b, c ]));

  fixture.graph.handleAction(fixture.dispatcher.dispatch, { type: 'add', payload: 'p' });
  fixture.graph.handleAction(fixture.dispatcher.dispatch, dummyAction);

  t.doesNotThrow(() => {
    verify(fixture.spiedA.updateValue()).once();
    verify(fixture.spiedB.updateValue()).twice();
    verify(spiedC.updateValue()).once();
  });
});

test('DataGraph_removeDependency', (t) => {
  const fixture = new TestFixture();
  t.plan(1);

  fixture.a.actionHandlers = {
    'remove': () => { fixture.b.dependencies.delete(fixture.a); },
    'dummy': () => { fixture.a.incrementVersion(); },
  }
  fixture.graph.addNodes(new Set<DataNode>([ fixture.a, fixture.b ]));

  fixture.graph.handleAction(fixture.dispatcher.dispatch, { type: 'remove', payload: 'p' });
  fixture.graph.handleAction(fixture.dispatcher.dispatch, dummyAction);

  t.doesNotThrow(() => {
    verify(fixture.spiedA.updateValue()).twice();
    verify(fixture.spiedB.updateValue()).once();
  });
});
