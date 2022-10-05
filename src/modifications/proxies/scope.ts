import * as Shift from 'shift-ast';
import ProxyFunction from './proxyFunction';

export default class Scope {
    node: Shift.Node;
    parent?: Scope;
    children: Map<Shift.Node, Scope>;
    proxyFunctions: Map<string, ProxyFunction>;

    /**
     * Creates a new scope.
     * @param node The node that created the scope.
     * @param parent The parent scope (optional).
     */
    constructor(node: Shift.Node, parent?: Scope) {
        this.node = node;
        this.parent = parent;
        this.children = new Map<Shift.Node, Scope>();
        this.proxyFunctions = new Map<string, ProxyFunction>();

        if (this.parent) {
            this.parent.children.set(this.node, this);
        }
    }

    /**
     * Searches for a proxy function by name.
     * @param name The name of the proxy function.
     */
    findProxyFunction(name: string): ProxyFunction | null {
        if (this.proxyFunctions.has(name)) {
            return this.proxyFunctions.get(name) as ProxyFunction;
        }

        return this.parent ? this.parent.findProxyFunction(name) : null;
    }

    /**
     * Adds a proxy function.
     * @param proxyFunction The proxy function to be added.
     */
    addProxyFunction(proxyFunction: ProxyFunction): void {
        this.proxyFunctions.set(proxyFunction.name, proxyFunction);
    }

    /**
     * Adds an alias for a proxy function.
     * @param func The proxy function.
     * @param name The alias.
     */
    addAlias(func: ProxyFunction, name: string): void {
        this.proxyFunctions.set(name, func);
    }
}
