import Modification from '../../modification';
import * as Shift from 'shift-ast';
import { Scope, ScopeType } from './scope';
import { traverse } from '../../helpers/traverse';
import { blockScopedTypes, Variable } from './variable';
import names from './names.json';
import NameMapping from './nameMapping';

export default class VariableRenamer extends Modification {
    private globalScope: Scope;
    private variableNames: string[];
    private usedVariableNames: Set<string>;
    private nameMapping: NameMapping;

    /**
     * Creates a new modification.
     * @param ast The AST.
     */
    constructor(ast: Shift.Script) {
        super('Rename Variables', ast);
        this.globalScope = new Scope(this.ast, ScopeType.Global);
        this.variableNames = [];
        this.usedVariableNames = new Set<string>(['if', 'do', 'in', 'var', 'let', 'try', 'for']);
        this.nameMapping = new NameMapping();
    }

    /**
     * Executes the modification.
     */
    execute(): void {
        this.collectDeclarations();
        this.collectReferences();

        this.generateNames();
        this.renameVariables(this.globalScope);
    }

    /**
     * Finds all variable declarations.
     */
    private collectDeclarations(): void {
        const self = this;
        let scope = this.globalScope;

        traverse(this.ast, {
            enter(node: Shift.Node) {
                switch (node.type) {
                    case 'FunctionDeclaration': {
                        const variable = new Variable(node.name.name, 'var');
                        variable.declarations.push(node.name);
                        scope.addVariable(variable);
                        self.addName(node.name.name);
                    }
                    case 'FunctionExpression':
                    case 'ArrowExpression': {
                        scope = new Scope(node, ScopeType.Function, scope);

                        // name of function expressions is added to inner function scope
                        if (node.type == 'FunctionExpression' && node.name) {
                            const variable = new Variable(node.name.name, 'var');
                            variable.declarations.push(node.name);
                            scope.addVariable(variable);
                            self.addName(node.name.name);
                        }

                        // add function params to scope
                        for (const param of node.params.items) {
                            if (param.type == 'BindingIdentifier') {
                                const variable = new Variable(param.name, 'var');
                                variable.declarations.push(param);
                                scope.addVariable(variable);
                                self.addName(param.name);
                            }
                        }

                        // add 'arguments' to scope
                        if (node.type != 'ArrowExpression') {
                            const variable = new Variable('arguments', 'var');
                            scope.addVariable(variable);
                        }
                        break;
                    }

                    case 'CatchClause': {
                        if (node.binding && node.binding.type == 'BindingIdentifier') {
                            const variable = new Variable(node.binding.name, 'var');
                            variable.declarations.push(node.binding);
                            scope.addVariable(variable);
                            self.addName(node.binding.name);
                        }
                    }
                    case 'ForStatement':
                    case 'ForInStatement':
                    case 'ForOfStatement':
                    case 'ForAwaitStatement':
                    case 'BlockStatement': {
                        scope = new Scope(node, ScopeType.Other, scope);
                        break;
                    }

                    case 'VariableDeclaration': {
                        for (const declarator of node.declarators) {
                            if (declarator.binding.type != 'BindingIdentifier') {
                                break;
                            }

                            let variable: Variable;
                            const declarationScope = scope.getDeclarationScope(node.kind);

                            if (declarationScope.variables.has(declarator.binding.name)) {
                                variable = declarationScope.variables.get(
                                    declarator.binding.name
                                ) as Variable;
                                if (variable.isBlockScoped() || blockScopedTypes.has(node.kind)) {
                                    throw new Error(
                                        `Identifier ${variable.name} has already been declared`
                                    );
                                }
                            } else {
                                variable = new Variable(declarator.binding.name, node.kind);
                                scope.addVariable(variable);
                                self.addName(declarator.binding.name);
                            }

                            variable.declarations.push(declarator.binding);
                        }
                        break;
                    }
                }
            },
            leave(node: Shift.Node) {
                if (node == scope.node && scope.parent) {
                    scope = scope.parent;
                }
            }
        });
    }

    /**
     * Finds all references of variables.
     */
    private collectReferences(): void {
        const self = this;
        let scope = this.globalScope;

        traverse(this.ast, {
            enter(node: Shift.Node) {
                switch (node.type) {
                    case 'FunctionDeclaration':
                    case 'FunctionExpression':
                    case 'ArrowExpression':
                    case 'CatchClause':
                    case 'ForStatement':
                    case 'ForInStatement':
                    case 'ForOfStatement':
                    case 'ForAwaitStatement':
                    case 'BlockStatement': {
                        const newScope = scope.children.find(s => s.node == node);
                        if (!newScope) {
                            throw new Error(`Failed to find scope of type ${node.type}`);
                        }
                        scope = newScope;
                        break;
                    }

                    case 'IdentifierExpression':
                    case 'AssignmentTargetIdentifier': {
                        let variable = scope.lookupVariable(node.name);

                        // handle global variables
                        if (!variable) {
                            variable = new Variable(node.name, 'var');
                            self.addName(node.name);
                        }

                        variable.references.push(node);
                        break;
                    }
                }
            },
            leave(node: Shift.Node) {
                if (node == scope.node && scope.parent) {
                    scope = scope.parent;
                }
            }
        });
    }

    /**
     * Renames all suitable variables within a given scope and it's
     * children.
     * @param scope The scope.
     */
    private renameVariables(scope: Scope, parentMapping: NameMapping = this.nameMapping): void {
        const nameMapping = new NameMapping();
        parentMapping.addChild(nameMapping);

        for (const [name, variable] of scope.variables) {
            if (this.shouldRename(name)) {
                const newName = this.getVariableName();
                variable.rename(newName);
                nameMapping.addMapping(name, newName);
            }
        }

        for (const childScope of scope.children) {
            this.renameVariables(childScope, nameMapping);
        }
    }

    /**
     * Returns the name mapping.
     * @returns The name mapping.
     */
    getNameMapping(): any {
        return this.nameMapping.serialize();
    }

    /**
     * Generates a list of unique variable names.
     */
    private generateNames(): void {
        const variableNames = this.shuffleArray(names).reduce((arr, name) => {
            if (!this.usedVariableNames.has(name)) {
                arr.push(name);
            }
            return arr;
        }, [] as string[]);

        this.variableNames = variableNames;
    }

    /**
     * Randomly shuffles an array.
     * @param array The array to be shuffled.
     * @returns The shuffled array.
     */
    private shuffleArray<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }

        return array;
    }

    /**
     * Returns the next unique variable name.
     * @returns The next variable name.
     */
    private getVariableName(): string {
        if (this.variableNames.length == 0) {
            throw new Error(`Ran out of variable names`);
        }

        return this.variableNames.shift() as string;
    }

    /**
     * Records a variable name as used.
     * @param name The variable name.
     */
    private addName(name: string): void {
        if (!this.shouldRename(name)) {
            this.usedVariableNames.add(name);
        }
    }

    /**
     * Returns whether a variable name should be renamed.
     * @param name The variable name.
     * @returns Whether.
     */
    private shouldRename(name: string): boolean {
        return name.startsWith('_0x');
    }
}
