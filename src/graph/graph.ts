import Node from './node';
import Edge from './edge';

export default class Graph {
    nodes: Node[];
    edges: Edge[];

    private nodeMap: Map<string, Node>;
    private edgeMap: Map<string, Edge>;

    /**
     * Creates a new graph.
     */
    constructor() {
        this.nodes = [];
        this.edges = [];

        this.nodeMap = new Map<string, Node>();
        this.edgeMap = new Map<string, Edge>();
    }

    /**
     * Finds a node by name.
     * @param name The name of the node.
     */
    findNode(id: string): Node | null {
        return this.nodeMap.has(id) ? (this.nodeMap.get(id) as Node) : null;
    }

    /**
     * Returns whether a node with a given id exists in the graph.
     * @param id The id of the node.
     */
    hasNode(id: string): boolean {
        return this.nodeMap.has(id);
    }

    /**
     * Finds an edge by name.
     * @param name The name of the edge.
     */
    findEdge(name: string): Edge | null {
        return this.edgeMap.has(name) ? (this.edgeMap.get(name) as Edge) : null;
    }

    /**
     * Returns whether an edge with a given name exists in the graph.
     * @param name The name of the edge.
     */
    hasEdge(name: string): boolean {
        return this.edgeMap.has(name);
    }

    /**
     * Adds a node to the graph.
     * @param node The node to be added.
     */
    addNode(node: Node): void {
        if (this.nodeMap.has(node.id)) {
            throw new Error(`Cannot add duplicate node ${node.id}`);
        }

        this.nodes.push(node);
        this.nodeMap.set(node.id, node);
    }

    /**
     * Adds an edge to the graph.
     * @param edge The edge to be added.
     */
    addEdge(edge: Edge): void {
        if (this.edgeMap.has(edge.name)) {
            throw new Error(`Cannot add duplicate edge ${edge.name}`);
        }

        this.edges.push(edge);
        this.edgeMap.set(edge.name, edge);
    }

    /**
     * Removes a node from the graph, returns whether the removal
     * was successful.
     * @param node The node to be removed.
     */
    removeNode(node: Node): boolean {
        if (!this.nodeMap.has(node.id)) {
            return false;
        }

        this.nodeMap.delete(node.id);
        this.nodes.splice(this.nodes.indexOf(node), 1);
        return true;
    }

    /**
     * Removes an edge from the graph, returns whether the removal
     * was successful.
     * @param edge The edge to be removed.
     */
    removeEdge(edge: Edge): boolean {
        if (!this.edgeMap.has(edge.name)) {
            return false;
        }

        this.edgeMap.delete(edge.name);
        this.edges.splice(this.edges.indexOf(edge), 1);
        return true;
    }

    /**
     * Returns the roots of the graph.
     */
    roots(): Node[] {
        return this.nodes.filter(n => n.inDegree == 0);
    }

    /**
     * Returns the leaves of the graph.
     */
    leaves(): Node[] {
        return this.nodes.filter(n => n.outDegree == 0);
    }
}
