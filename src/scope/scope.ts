import * as Shift from 'shift-ast';

export default class Scope<T> {
    node: Shift.Node;
    type: ScopeType;
    parent?: Scope<T>;
    children: Map<Shift.Node, Scope<T>>;
    elements: Map<string, T>;

    /**
     * Creates a new scope.
     * @param node The node that created the scope.
     * @param type The type of scope.
     * @param parent The parent scope (optional).
     */
    constructor(node: Shift.Node, type: ScopeType, parent?: Scope<T>) {
        this.node = node;
        this.type = type;
        this.parent = parent;
        this.children = new Map<Shift.Node, Scope<T>>();
        this.elements = new Map<string, T>();

        if (this.parent) {
            this.parent.children.set(this.node, this);
        }
    }

    /**
     * Gets an element by name.
     * @param name The name associated with the element.
     * @returns The element or null.
     */
    public get(name: string): T | null {
        if (this.elements.has(name)) {
            return this.elements.get(name) as T;
        }

        return this.parent ? this.parent.get(name) : null;
    }

    /**
     * Adds an element.
     * @param name The name associated with the element.
     * @param element The element.
     * @param type The type of the variable.
     */
    public add(name: string, element: T, type: VariableType = 'const'): void {
        switch (type) {
            case 'const':
            case 'let': {
                this.elements.set(name, element);
                break;
            }

            case 'var': {
                const scope = this.findScope([ScopeType.Function, ScopeType.Global]);
                if (!scope) {
                    throw new Error(`Failed to find scope for var ${name}`);
                }
                scope.elements.set(name, element);
                break;
            }

            case undefined: {
                const scope = this.findScope([ScopeType.Global]);
                if (!scope) {
                    throw new Error(`Failed to find scope for global var ${name}`);
                }
                scope.elements.set(name, element);
                break;
            }
        }
    }

    /**
     * Gets the scope for a given declaration type.
     * @param type The declaration type.
     * @returns The scope.
     */
    public getDeclarationScope(type: VariableType): Scope<T> {
        switch (type) {
            case 'const':
            case 'let':
                return this;

            case 'var':
            case 'global': {
                const scopeTypes =
                    type === 'var' ? [ScopeType.Function, ScopeType.Global] : [ScopeType.Global];
                const scope = this.findScope(scopeTypes);
                if (!scope) {
                    throw new Error(`Failed to find scope for variable declaration type ${type}`);
                }
                return scope;
            }
        }
    }

    /**
     * Finds a scope with a given type. Looks back up the scope tree.
     * @param types The desired scope types.
     * @returns The scope found or undefined.
     */
    private findScope(types: ScopeType[]): Scope<T> | undefined {
        let scope: Scope<T> | undefined = this;

        while (scope && !types.includes(scope.type)) {
            scope = scope.parent;
        }

        return scope;
    }
}

export type VariableType = 'var' | 'const' | 'let' | 'global';

export enum ScopeType {
    Global = 'Global',
    Function = 'Function',
    Other = 'Other'
}
