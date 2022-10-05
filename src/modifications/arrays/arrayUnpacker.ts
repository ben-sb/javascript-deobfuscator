import Modification from '../../modification';
import * as Shift from 'shift-ast';
import { traverse } from '../../helpers/traverse';
import Array from './array';
import Scope from './scope';
import TraversalHelper from '../../helpers/traversalHelper';

export default class ArrayUnpacker extends Modification {
    private readonly scopeTypes = new Set(['Block', 'FunctionBody']);
    private readonly shouldRemoveArrays: boolean;
    private readonly globalScope: Scope;
    private readonly arrayNodes: Set<Shift.Node>;

    /**
     * Creates a new modification.
     * @param ast The AST.
     * @param shouldRemoveArrays Whether the arrays should be removed.
     */
    constructor(ast: Shift.Script, removeArrays: boolean) {
        super('Unpack Arrays', ast);
        this.shouldRemoveArrays = removeArrays;
        this.globalScope = new Scope(this.ast);
        this.arrayNodes = new Set<Shift.Node>();
    }

    /**
     * Executes the modification.
     */
    execute(): void {
        while (this.findArrays()) {
            this.unpackArrays();
        }

        if (this.shouldRemoveArrays) {
            this.removeArrays(this.globalScope);
        }
    }

    /**
     * Finds all literal arrays and stores them in the according scope.
     * @returns Whether any new literal arrays were found.
     */
    private findArrays(): boolean {
        const self = this;
        let scope = this.globalScope;
        let foundArrays = false;

        traverse(this.ast, {
            enter(node: Shift.Node, parent: Shift.Node) {
                if (self.scopeTypes.has(node.type)) {
                    scope = new Scope(node, scope);
                } else if (self.isLiteralArrayDeclaration(node) && !self.arrayNodes.has(node)) {
                    const name = (node as any).binding.name;
                    const elements = (node as any).init.elements;

                    const array = new Array(node, parent, name, elements);
                    scope.addArray(array);

                    self.arrayNodes.add(node);
                    foundArrays = true;
                }
            },
            leave(node: Shift.Node) {
                if (node == scope.node && scope.parent) {
                    scope = scope.parent;
                }
            }
        });

        return foundArrays;
    }

    /**
     * Replaces all usages of literal arrays.
     */
    private unpackArrays(): void {
        const self = this;
        let scope = this.globalScope;

        traverse(this.ast, {
            enter(node: Shift.Node, parent: Shift.Node) {
                if (self.scopeTypes.has(node.type)) {
                    scope = scope.children.get(node) as Scope;
                } else if (self.isSimpleArrayAccess(node)) {
                    const name = (node as any).object.name;
                    const array = scope.findArray(name);

                    if (array) {
                        const index = (node as any).expression.value;
                        const replacement = array.elements[index];

                        if (replacement) {
                            array.replaceCount++;
                            TraversalHelper.replaceNode(parent, node, replacement);
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
     * Removes all the (suitable) arrays in a scope and its children.
     * @param scope The scope to remove arrays from.
     */
    private removeArrays(scope: Scope): void {
        for (const [_, array] of scope.arrays) {
            if (array.replaceCount > 0) {
                TraversalHelper.removeNode(array.parentNode, array.node);
            }
        }

        for (const [_, child] of scope.children) {
            this.removeArrays(child);
        }
    }

    /**
     * Returns whether a node is a literal array declaration.
     * @param node The AST node.
     */
    private isLiteralArrayDeclaration(node: Shift.Node): boolean {
        return (
            node.type == 'VariableDeclarator' &&
            node.binding.type == 'BindingIdentifier' &&
            node.init != null &&
            node.init.type == 'ArrayExpression' &&
            node.init.elements.find(e => e && !e.type.startsWith('Literal')) == undefined
        );
    }

    /**
     * Returns whether a node is accessing an index of an array.
     * @param node The AST node.
     */
    private isSimpleArrayAccess(node: Shift.Node): boolean {
        return (
            node.type == 'ComputedMemberExpression' &&
            node.object.type == 'IdentifierExpression' &&
            node.expression.type == 'LiteralNumericExpression'
        );
    }
}
