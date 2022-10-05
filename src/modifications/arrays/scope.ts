import * as Shift from 'shift-ast';
import Array from './array';

export default class Scope {
    node: Shift.Node;
    parent?: Scope;
    children: Map<Shift.Node, Scope>;
    arrays: Map<string, Array>;

    /**
     * Creates a new scope.
     * @param node The node that created the scope.
     * @param parent The parent scope (optional).
     */
    constructor(node: Shift.Node, parent?: Scope) {
        this.node = node;
        this.parent = parent;
        this.children = new Map<Shift.Node, Scope>();
        this.arrays = new Map<string, Array>();

        if (this.parent) {
            this.parent.children.set(this.node, this);
        }
    }

    /**
     * Searches for an array by name.
     * @param name The name of the array.
     */
    findArray(name: string): Array | null {
        if (this.arrays.has(name)) {
            return this.arrays.get(name) as Array;
        }

        return this.parent ? this.parent.findArray(name) : null;
    }

    /**
     * Adds an array.
     * @param array The array to be added.
     */
    addArray(array: Array): void {
        this.arrays.set(array.name, array);
    }
}
