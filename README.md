# DGF (Datagraph Framework)

DGF is a state management framework written in TypeScript that allows in-application data to be organized as a directed acyclic graph in which each piece of data is a node and the edges are the dependencies between the data.

The two primary types of nodes are (1) functional nodes (FN) and state machine nodes (SMN). Each of these nodes exports a single value. The value an FN exports is a function of its dependency nodes, while an SMN's value depends on what actions it listens to and the dispatch history.
