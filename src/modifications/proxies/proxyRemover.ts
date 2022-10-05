import Modification from '../../modification';
import * as Shift from 'shift-ast';
import { traverse } from '../../helpers/traverse';
import TraversalHelper from '../../helpers/traversalHelper';
import Scope from './scope';
import ProxyFunction from './proxyFunction';
import Graph from '../../graph/graph';
import Node from '../../graph/node';
import Edge from '../../graph/edge';

export default class ProxyRemover extends Modification {
    private readonly scopeTypes = new Set(['Block', 'FunctionBody']);
    private readonly proxyExpressionTypes = new Set([
        'CallExpression',
        'BinaryExpression',
        'UnaryExpression',
        'ComputedMemberExpression',
        'IdentifierExpression'
    ]);
    private shouldRemoveProxyFunctions: boolean;
    private globalScope: Scope;
    private proxyFunctions: ProxyFunction[];
    private proxyFunctionNames: Set<string>;
    private cyclicProxyFunctionIds: Set<string>;
    private graph: Graph;

    /**
     * Creates a new modification.
     * @param ast The AST.
     * @param removeProxyFunctions Whether the functions should be removed.
     */
    constructor(ast: Shift.Script, removeProxyFunctions: boolean) {
        super('Remove Proxy Functions', ast);
        this.shouldRemoveProxyFunctions = removeProxyFunctions;
        this.globalScope = new Scope(this.ast);
        this.proxyFunctions = [];
        this.proxyFunctionNames = new Set<string>();
        this.cyclicProxyFunctionIds = new Set<string>();
        this.graph = new Graph();
    }

    /**
     * Executes the modification.
     */
    execute(): void {
        this.findProxyFunctions();
        this.findAliases();
        this.findCycles();
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
                if (self.scopeTypes.has(node.type)) {
                    scope = new Scope(node, scope);
                }

                let proxyFunction: ProxyFunction;
                if (self.isProxyFunctionDeclaration(node)) {
                    const name = (node as any).name.name;
                    const params = (node as any).params.items;
                    const expression = (node as any).body.statements[0].expression;

                    proxyFunction = new ProxyFunction(node, parent, scope, name, params, expression);
                } else if (self.isProxyFunctionExpressionDeclaration(node)) {
                    const name = (node as any).binding.name;
                    const params = (node as any).init.params.items;
                    const expression = (node as any).init.body.statements[0].expression;

                    proxyFunction = new ProxyFunction(node, parent, scope, name, params, expression);
                } else {
                    return;
                }

                scope.addProxyFunction(proxyFunction);
                self.proxyFunctions.push(proxyFunction);
                self.graph.addNode(new Node(proxyFunction.id));
                if (!self.proxyFunctionNames.has(proxyFunction.name)) {
                    self.proxyFunctionNames.add(proxyFunction.name);
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
     * Finds aliases for proxy functions.
     */
    private findAliases(): void {
        const self = this;
        let scope = this.globalScope;

        traverse(this.ast, {
            enter(node: Shift.Node, parent: Shift.Node) {
                if (self.scopeTypes.has(node.type)) {
                    scope = scope.children.get(node) as Scope;
                }
                if (self.isVariableReassignment(node)) {
                    const name = (node as any).init.name;
                    if (self.proxyFunctionNames.has(name)) {
                        const newName = (node as any).binding.name;

                        const proxyFunction = scope.findProxyFunction(name);
                        if (proxyFunction) {
                            scope.addAlias(proxyFunction, newName);
                            TraversalHelper.removeNode(parent, node);
                            if (!self.proxyFunctionNames.has(newName)) {
                                self.proxyFunctionNames.add(newName);
                            }
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
    }

    /**
     * Finds cycles in the proxy function graph and excludes those
     * proxy functions from replacing.
     */
    private findCycles(): void {
        const self = this;

        for (const proxyFunction of this.proxyFunctions) {
            const thisNode = this.graph.findNode(proxyFunction.id) as Node;

            let scope = proxyFunction.scope;
            traverse(proxyFunction.expression, {
                enter(node: Shift.Node) {
                    if (self.scopeTypes.has(node.type)) {
                        scope = scope.children.get(node) as Scope;
                    }
                    if (self.isFunctionCall(node)) {
                        const calleeName = (node as any).callee.name;
                        if (self.proxyFunctionNames.has(calleeName)) {
                            const otherProxyFunction = scope.findProxyFunction(calleeName);

                            if (otherProxyFunction) {
                                const otherNode = self.graph.findNode(otherProxyFunction.id) as Node;
                                if (!self.graph.hasEdge(`${thisNode.id} -> ${otherNode.id}`)) {
                                    self.graph.addEdge(new Edge(thisNode, otherNode));
                                }
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
        }

        const seenNodes = new Set<Node>();
        for (const node of this.graph.nodes) {
            this.searchBranch(node, seenNodes);
        }
    }

    /**
     * Searches for cycles within a branch.
     * @param node The current node.
     * @param seenNodes The set of all previously seen nodes.
     * @param branch The nodes in the current branch.
     */
    private searchBranch(node: Node, seenNodes: Set<Node>, branch?: Set<Node>): void {
        if (seenNodes.has(node)) {
            return;
        }
        seenNodes.add(node);

        branch ??= new Set<Node>();
        branch.add(node);

        for (const edge of node.outgoingEdges) {
            const target = edge.target;

            if (branch.has(target)) {
                // cycle found
                this.cyclicProxyFunctionIds.add(target.id);
                for (const node of branch) {
                    this.cyclicProxyFunctionIds.add(node.id);
                }
            } else {
                this.searchBranch(target, seenNodes, branch);
            }
        }
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
                if (self.scopeTypes.has(node.type)) {
                    const sc = scope.children.get(node);
                    if (!sc) {
                        throw new Error(`Failed to find scope for node ${node.type}`);
                    }
                    scope = sc;
                } else if (self.isFunctionCall(node)) {
                    const name = (node as any).callee.name;
                    if (self.proxyFunctionNames.has(name)) {
                        const proxyFunction = scope.findProxyFunction(name);

                        if (proxyFunction && !self.cyclicProxyFunctionIds.has(proxyFunction.id)) {
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
            if (!this.cyclicProxyFunctionIds.has(proxyFunction.id)) {
                TraversalHelper.removeNode(proxyFunction.parentNode, proxyFunction.node);
            }
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
        if (
            node.type == 'FunctionDeclaration' &&
            node.body.statements.length == 1 &&
            node.body.statements[0].type == 'ReturnStatement' &&
            node.body.statements[0].expression != null &&
            (this.proxyExpressionTypes.has(node.body.statements[0].expression.type) ||
                node.body.statements[0].expression.type.startsWith('Literal')) &&
            node.params.items.find(p => p.type != 'BindingIdentifier') == undefined
        ) {
            const self = this;
            let hasScopeNode = false;
            traverse(node.body.statements[0].expression, {
                enter(node: Shift.Node) {
                    if (self.scopeTypes.has(node.type)) {
                        hasScopeNode = true;
                    }
                }
            });
            return !hasScopeNode;
        } else {
            return false;
        }
    }

    /**
     * Returns whether a node is a proxy function expression variable
     * declaration.
     * @param node The AST node.
     */
    private isProxyFunctionExpressionDeclaration(node: Shift.Node): boolean {
        if (
            node.type == 'VariableDeclarator' &&
            node.binding.type == 'BindingIdentifier' &&
            node.init != null &&
            node.init.type == 'FunctionExpression' &&
            node.init.body.statements.length == 1 &&
            node.init.body.statements[0].type == 'ReturnStatement' &&
            node.init.body.statements[0].expression != null &&
            (this.proxyExpressionTypes.has(node.init.body.statements[0].expression.type) ||
                node.init.body.statements[0].expression.type.startsWith('Literal'))
        ) {
            const self = this;
            let hasScopeNode = false;
            traverse(node.init.body.statements[0].expression, {
                enter(node: Shift.Node) {
                    if (self.scopeTypes.has(node.type)) {
                        hasScopeNode = true;
                    }
                }
            });
            return !hasScopeNode;
        } else {
            return false;
        }
    }

    /**
     * Returns whether a node is a variable reassignment.
     * @param node The AST node.
     * @returns Whether.
     */
    private isVariableReassignment(node: Shift.Node): boolean {
        return (
            node.type == 'VariableDeclarator' &&
            node.binding.type == 'BindingIdentifier' &&
            node.init != null &&
            node.init.type == 'IdentifierExpression'
        );
    }

    /**
     * Returns whether a node is a function call.
     * @param node The AST node.
     */
    private isFunctionCall(node: Shift.Node): boolean {
        return node.type == 'CallExpression' && node.callee.type == 'IdentifierExpression';
    }
}
