import Node from './node';

export default class Edge {
    private _name: string;
    private _source: Node;
    private _target: Node;

    /**
     * Creates a new edge.
     * @param source The node the edge originates from.
     * @param target The node the edge ends at.
     */
    constructor(source: Node, target: Node) {
        this._name = `${source.id} -> ${target.id}`;
        this._source = source;
        this._target = target;

        this.source.outgoingEdges.push(this);
        this.target.incomingEdges.push(this);
    }

    /**
     * Returns the name of the edge.
     */
    get name(): string {
        return this._name;
    }

    /**
     * Returns the source node of the edge.
     */
    get source(): Node {
        return this._source;
    }

    /**
     * Returns the target node of the edge.
     */
    get target(): Node {
        return this._target;
    }
}
