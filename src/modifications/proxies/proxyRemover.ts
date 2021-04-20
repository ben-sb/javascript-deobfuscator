import Modification from "../../modification";
import * as Shift from 'shift-ast';
import { traverse } from 'shift-traverser';
import TraversalHelper from "../../helpers/traversalHelper";
import Scope from "./scope";
import ProxyFunction from "./proxyFunction";

export default class ProxyRemover extends Modification {
    private readonly scopeTypes = ['Block', 'FunctionBody'];
    private readonly proxyExpressionTypes = ['CallExpression', 'BinaryExpression', 'ComputedMemberExpression'];
    private shouldRemoveProxyFunctions: boolean;
    private globalScope: Scope;

    /**
     * Creates a new modification.
     * @param ast The AST.
     * @param removeProxyFunctions Whether the functions should be removed.
     */
    constructor(ast: Shift.Script, removeProxyFunctions: boolean) {
        super('Remove Proxy Functions', ast);
        this.shouldRemoveProxyFunctions = removeProxyFunctions;
        this.globalScope = new Scope(this.ast);
    }

    /**
     * Executes the modification.
     */
    execute(): void {
        this.findProxyFunctions();
        this.replaceProxyFunctionUsages(this.ast, this.globalScope);
        
        if (this.shouldRemoveProxyFunctions) {
            this.removeProxyFunctions(this.globalScope);
        }
    }

    /**
     * Finds all proxy functions and records them in the according scope.
     */
    private findProxyFunctions(): void {
        const self = this;
        let scope = this.globalScope;

        traverse(this.ast, {
            enter(node: Shift.Node, parent: Shift.Node) {
                if (self.scopeTypes.includes(node.type)) {
                    scope = new Scope(node, scope);
                }
                else if (self.isProxyFunctionDeclaration(node)) {
                    const name = (node as any).name.name;
                    const params = (node as any).params.items;
                    const expression = (node as any).body.statements[0].expression;

                    const proxyFunction = new ProxyFunction(node, parent, name, params, expression);
                    scope.addProxyFunction(proxyFunction);
                }
                else if (self.isProxyFunctionExpressionDeclaration(node)) {
                    const name = (node as any).binding.name;
                    const params = (node as any).init.params.items;
                    const expression = (node as any).init.body.statements[0].expression;

                    const proxyFunction = new ProxyFunction(node, parent, name, params, expression);
                    scope.addProxyFunction(proxyFunction);
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
     * Replaces all usages of proxy functions in a given node.
     * @param node The node to replace usages in.
     * @param startScope The scope of the node.
     */
    private replaceProxyFunctionUsages(node: Shift.Node, scope: Scope): Shift.Node {
        const self = this;
        let replacedNode = node;

        traverse(node, {
            enter(node: Shift.Node, parent: Shift.Node) {
                if (self.scopeTypes.includes(node.type)) {
                    scope = new Scope(node, scope);
                }
                else if (self.isFunctionCall(node)) {
                    const name = (node as any).callee.name;
                    const proxyFunction = scope.findProxyFunction(name);

                    if (proxyFunction) {
                        const args = (node as any).arguments;
                        let replacement: Shift.Node = proxyFunction.getReplacement(args);
                        replacement = self.replaceProxyFunctionUsages(replacement, scope);

                        if (parent) {
                            TraversalHelper.replaceNode(parent, node, replacement);
                        } else {
                            replacedNode = replacement;
                        }
                    }
                }
            },
            leave(node: Shift.Node) {
                if (node == scope.node && scope.parent) {
                    scope = scope.parent;
                }
            }
        });

        return replacedNode;
    }

    /**
     * Removes all proxy functions from a scope and its children.
     * @param scope The scope to remove proxy functions from.
     */
    private removeProxyFunctions(scope: Scope): void {
        for (const [_, proxyFunction] of scope.proxyFunctions) {
            TraversalHelper.removeNode(proxyFunction.parentNode, proxyFunction.node);
        }

        for (const [_, child] of scope.children) {
            this.removeProxyFunctions(child);
        }
    }

    /**
     * Returns whether a node is a proxy function declaration.
     * @param node The AST node.
     */
    private isProxyFunctionDeclaration(node: Shift.Node): boolean {
        return node.type == 'FunctionDeclaration' && node.body.statements.length == 1
            && node.body.statements[0].type == 'ReturnStatement' && node.body.statements[0].expression != null 
            && this.proxyExpressionTypes.includes(node.body.statements[0].expression.type) && node.params.items.find(p => p.type != 'BindingIdentifier') == undefined;
    }

    /**
     * Returns whether a node is a proxy function expression variable
     * declaration.
     * @param node The AST node.
     */
    private isProxyFunctionExpressionDeclaration(node: Shift.Node): boolean {
        return node.type == 'VariableDeclarator' && node.binding.type == 'BindingIdentifier'
            && node.init != null && node.init.type == 'FunctionExpression'
            && node.init.body.statements.length == 1 && node.init.body.statements[0].type == 'ReturnStatement'
            && node.init.body.statements[0].expression != null && this.proxyExpressionTypes.includes(node.init.body.statements[0].expression.type);
    }

    /**
     * Returns whether a node is a function call.
     * @param node The AST node.
     */
    private isFunctionCall(node: Shift.Node): boolean {
        return node.type == 'CallExpression' && node.callee.type == 'IdentifierExpression';
    }
}