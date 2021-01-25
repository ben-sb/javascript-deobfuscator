import { traverse } from 'shift-traverser';
import * as Shift from 'shift-ast';
import Scope, { ScopeType } from './scope';
import Variable from './variable';

class Identifier {
    name: string;
    references: [Shift.Node, Shift.Node][];

    constructor(name: string) {
        this.name = name;
        this.references = [];
    }
}

export default class ScopeAnalyzer {

    /**
     * Analyzes an AST and returns the scope.
     * @param $script The Shift AST.
     */
    static analyze(script: Shift.Node): Scope {
        let scope = new Scope(ScopeType.Global, script);
        let globalScope = scope;
        let identifierMap = new Map<Scope, Map<string, Identifier>>();

        traverse(script, {
            enter(node: Shift.Node, parent: Shift.Node) {
                if (!identifierMap.has(scope)) {
                    identifierMap.set(scope, new Map<string, Identifier>());
                }

                switch (node.type) {
                    case 'Script': {
                        let newScope = new Scope(ScopeType.Script, node, scope);
                        scope.children.push(newScope);
                        scope = newScope;
                        break;
                    }

                    case 'ForStatement': {
                        let newScope = new Scope(ScopeType.ForStatement, node, scope);
                        scope.children.push(newScope);
                        scope = newScope;
                        break;
                    }

                    case 'SwitchStatement':
                    case 'SwitchStatementWithDefault': {
                        let newScope = new Scope(ScopeType.Block, node, scope);
                        scope.children.push(newScope);
                        scope = newScope;
                        break;
                    }

                    case 'Block': {
                        let newScope = new Scope(ScopeType.Block, node, scope);
                        scope.children.push(newScope);
                        scope = newScope;
                        break;
                    }

                    case 'FunctionDeclaration': {
                        let variable: Variable;
                        let lookup = scope.lookupVariable(node.name.name);
                        if (lookup.found) {
                            variable = lookup.result as Variable;
                        } else {
                            variable = scope.addVariable(node.name.name, 'let');

                            let identifiers = identifierMap.get(scope) as Map<string, Identifier>;
                            if (identifiers.has(node.name.name)) {
                                let identifier = identifiers.get(node.name.name) as Identifier;
                                identifier.references.forEach(r => variable.addReference(r[0], r[1]));
                            }
                        }
                        variable.addDeclaration(node, parent);
                    }
                    case 'FunctionExpression':
                    case 'ArrowExpression': {
                        let newScope = new Scope(ScopeType.Function, node, scope);
                        scope.children.push(newScope);
                        scope = newScope;
                        
                        let argumentsName = node.type == 'ArrowExpression' ? 'arrowArguments' : 'arguments';
                        scope.addVariable(argumentsName, 'let');
            
                        node.params.items.forEach(i => {
                            if (i.type != 'BindingIdentifier') {
                                throw new Error(`Unexpected parameter type ${i.type}`);
                            }
                            scope.addVariable(i.name, 'let')
                        });
                        break;
                    }

                    case 'VariableDeclaration': {
                        node.declarators.forEach(d => {
                            if (d.binding.type == 'BindingIdentifier') {
                                let variable: Variable;
                                let lookup = scope.lookupVariable(d.binding.name);
                                if (lookup.found) {
                                    variable = lookup.result as Variable;
                                } else {
                                    variable = scope.addVariable(d.binding.name, node.kind);

                                    let identifiers = identifierMap.get(scope) as Map<string, Identifier>;
                                    if (identifiers.has(d.binding.name,)) {
                                        let identifier = identifiers.get(d.binding.name,) as Identifier;
                                        identifier.references.forEach(r => variable.addReference(r[0], r[1]));
                                    }
                                }
                                variable.addDeclaration(d.binding, d);
                            }
                        });
                        break;
                    }

                    case 'IdentifierExpression':
                    case 'AssignmentTargetIdentifier':
                        let lookup = scope.lookupVariable(node.name);
                        if (lookup.found) {
                            let variable = lookup.result as Variable;

                            if (parent.type != 'VariableDeclarator') {
                                variable.addReference(node, parent);
                            }
                        } else {
                            let identifiers = identifierMap.get(scope) as Map<string, Identifier>;
                            if (identifiers.has(node.name)) {
                                let identifier = identifiers.get(node.name) as Identifier;
                                identifier.references.push([node, parent]);
                                break;
                            }

                            let identifier = new Identifier(node.name);
                            identifier.references.push([node, parent]);
                            identifiers.set(node.name, identifier);
                            break;
                        }
                }
            },
            leave(node: Shift.Node) {
                if (scope.node == node && scope.parent) {
                    let identifiers = identifierMap.get(scope);
                    identifiers?.forEach(i => {
                        if (!scope.lookupVariable(i.name).found) {
                            let variable = scope.addVariable(i.name);
                            i.references.forEach(r => variable.addReference(r[0], r[1]));
                        }
                    })
                    scope = scope.parent;
                }
            }
        });

        return globalScope;
    }
}