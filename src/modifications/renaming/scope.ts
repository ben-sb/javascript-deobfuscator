import * as Shift from 'shift-ast';
import { Variable } from './variable';

export class Scope {
    node: Shift.Node;
    type: ScopeType;
    parent?: Scope;
    children: Scope[];
    variables: Map<string, Variable>;

    /**
     * Creates a new scope.
     * @param node The AST node that created the scope.
     * @param type The scope type.
     * @param parent The parent scope (if it exists).
     */
    constructor(node: Shift.Node, type: ScopeType, parent?: Scope) {
        this.node = node;
        this.type = type;
        this.parent = parent;
        this.children = [];
        this.variables = new Map<string, Variable>();

        if (this.parent) {
            this.parent.children.push(this);
        }
    }

    /**
     * Searches for a variable by name.
     * @param name The variable name.
     * @returns The variable or null if not found.
     */
    lookupVariable(name: string): Variable | null {
        if (this.variables.has(name)) {
            return this.variables.get(name) as Variable;
        }

        return this.parent ? this.parent.lookupVariable(name) : null;
    }

    /**
     * Adds a variable to the scope (or a parent scope).
     * @param variable The variable.
     */
    addVariable(variable: Variable): void {
        switch (variable.type) {
            case 'const':
            case 'let': {
                this.variables.set(variable.name, variable);
                break;
            }

            case 'var': {
                const scope = this.findScope([ScopeType.Function, ScopeType.Global]);
                if (!scope) {
                    throw new Error('Failed to find scope for variable declaration');
                }

                scope.variables.set(variable.name, variable);
                break;
            }

            case undefined: {
                const scope = this.findScope([ScopeType.Global]);
                if (!scope) {
                    throw new Error('Failed to find scope for variable declaration');
                }
                scope.variables.set(variable.name, variable);
                break;
            }
        }
    }

    /**
     * Gets the scope for a declaration.
     * @param type The declaration type.
     * @returns The scope.
     */
    getDeclarationScope(type: 'const' | 'let' | 'var'): Scope {
        switch (type) {
            case 'const':
            case 'let':
                return this;

            case 'var': {
                const scope = this.findScope([ScopeType.Function, ScopeType.Global]);
                if (!scope) {
                    throw new Error('Failed to find scope for variable declaration');
                }
                return scope;
            }
        }
    }

    /**
     * Finds a scope with a given type.
     * @param types The desired scope types.
     * @returns The scope found or undefined.
     */
    private findScope(types: ScopeType[]): Scope | undefined {
        let scope: Scope | undefined = this;

        while (scope && !types.includes(scope.type)) {
            scope = scope.parent;
        }

        return scope;
    }
}

export enum ScopeType {
    Global = 'Global',
    Function = 'Function',
    Other = 'Other'
}
