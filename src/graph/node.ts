import Edge from './edge';

export default class Node {
    private _id: string;

    private _incomingEdges: Edge[];
    private _outgoingEdges: Edge[];

    /**
     * Creates a new node.
     * @param name The name of the node.
     */
    constructor(id: string) {
        this._id = id;
        this._incomingEdges = [];
        this._outgoingEdges = [];
    }

    /**
     * Returns the name of the node.
     */
    get id(): string {
        return this._id;
    }

    /**
     * Returns the incoming edges of the node.
     */
    get incomingEdges(): Edge[] {
        return this._incomingEdges;
    }

    /**
     * Returns the outgoing edges of the node.
     */
    get outgoingEdges(): Edge[] {
        return this._outgoingEdges;
    }

    /**
     * Returns the number of edges ending on this node.
     */
    get inDegree(): number {
        return this.incomingEdges.length;
    }

    /**
     * Returns the number of edges originating from this node.
     */
    get outDegree(): number {
        return this.outgoingEdges.length;
    }
}
