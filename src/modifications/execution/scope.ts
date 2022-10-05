import * as Shift from 'shift-ast';
import ExecutedFunction from './executedFunction';

export default class Scope {
    node: Shift.Node;
    parent?: Scope;
    children: Map<Shift.Node, Scope>;
    executedFunctions: Map<string, ExecutedFunction>;

    /**
     * Creates a new scope.
     * @param node The node that created the scope.
     * @param parent The parent scope (optional).
     */
    constructor(node: Shift.Node, parent?: Scope) {
        this.node = node;
        this.parent = parent;
        this.children = new Map<Shift.Node, Scope>();
        this.executedFunctions = new Map<string, ExecutedFunction>();

        if (this.parent) {
            this.parent.children.set(this.node, this);
        }
    }

    /**
     * Searches for an executed function by name.
     * @param name The name of the executed function.
     */
    findExecutedFunction(name: string): ExecutedFunction | null {
        if (this.executedFunctions.has(name)) {
            return this.executedFunctions.get(name) as ExecutedFunction;
        }

        return this.parent ? this.parent.findExecutedFunction(name) : null;
    }

    /**
     * Adds an executed function.
     * @param array The executed function to be added.
     */
    addExecutedFunction(func: ExecutedFunction): void {
        if (func.name) {
            this.executedFunctions.set(func.name, func);
        }
    }

    /**
     * Adds an alias for an executed function.
     * @param func The executed function.
     * @param name The alias.
     */
    addAlias(func: ExecutedFunction, name: string): void {
        this.executedFunctions.set(name, func);
    }
}
