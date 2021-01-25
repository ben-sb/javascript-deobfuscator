import Shift from 'shift-ast';
import Variable from './variable';

export enum ScopeType {
    Global = 'Global',
    Script = 'Script',
    Function = 'Function',
    ForStatement = 'ForStatement',
    Block = 'Block'
}

export default class Scope {
    type: ScopeType;
    node: Shift.Node;
    parent: Scope | undefined;
    children: Scope[];
    variables: Map<string, Variable>;
    
    /**
     * Creates a new scope.
     * @param type The type of the scope.
     * @param node The AST node that created the scope.
     * @param parent The parent scope (undefined if global scope).
     */
    constructor(type: ScopeType, node: Shift.Node, parent?: Scope) {
        this.type = type;
        this.node = node;
        this.parent = parent;
        this.children = [];
        this.variables = new Map<string, Variable>();
    }

    /**
     * Adds a variable to the scope or a parent (depending on the declaration type).
     * @param name The name of the variable.
     * @param declarationType The type of declaration.
     */
    addVariable(name: string, declarationType?: string): Variable {
        let variable = new Variable(name);
        switch (declarationType) {
            // add to current scope
            case 'let':
            case 'const':
                this.variables.set(variable.name, variable);
                break;

            // add to nearest outer function or global scope
            case 'var': {
                let scope = this.findScope([ScopeType.Global, ScopeType.Function]);
                if (!scope) {
                    throw new Error('Failed to find global scope, scope hierarchy is likely corrupted.');
                }
                scope.variables.set(variable.name, variable);
                break;
            }

            // add to global scope
            case undefined: {
                let scope = this.findScope([ScopeType.Global]);
                if (!scope) {
                    throw new Error('Failed to find global scope, scope hierarchy is likely corrupted.');
                }
                scope.variables.set(variable.name, variable);
                break;
            }
        }

        return variable;
    }

    /**
     * Looks up a variable in the current and all parent scopes.
     * @param name The name of the variable.
     */
    lookupVariable(name: string): { found: boolean, scope?: Scope, result?: Variable | undefined } {
        if (this.variables.has(name)) {
            return { found: true, scope: this, result: this.variables.get(name) };
        }

        if (this.parent) {
            return this.parent.lookupVariable(name);
        } else {
            return { found: false };
        }
    }

    /**
     * Finds the nearest scope of a given type.
     * @param types The types of scope to find.
     */
    private findScope(types: ScopeType[]): Scope | undefined {
        let scope: Scope | undefined = this;
        while (scope && !types.includes(scope.type)) {
            scope = scope.parent;
        }

        return scope;
    }
}