import * as Shift from 'shift-ast';
import TraversalHelper from '../../helpers/traversalHelper';
import { traverse } from '../../helpers/traverse';
import Modification from '../../modification';

export default class DeadBranchRemover extends Modification {
    /**
     * Creates a new modification.
     * @param ast The AST.
     */
    constructor(ast: Shift.Script) {
        super('Dead Branch Remover', ast);
    }

    /**
     * Executes the modification.
     */
    execute(): void {
        this.removeBranches(this.ast);
    }

    /**
     * Removes dead branches within an AST node.
     * @param node The AST node.
     */
    private removeBranches(node: Shift.Node): void {
        const self = this;

        traverse(node, {
            enter(node: Shift.Node, parent: Shift.Node) {
                if (self.isFixedIfStatement(node) || self.isFixedConditional(node)) {
                    const branch = (node as any).test.value
                        ? (node as any).consequent
                        : (node as any).alternate;
                    const body = self.getBody(branch);

                    if (body) {
                        self.removeBranches(branch);
                        TraversalHelper.replaceNode(parent, node, body);
                    } else {
                        TraversalHelper.removeNode(parent, node);
                    }
                }
            }
        });
    }

    /**
     * Attempts to get the body from a node, otherwise just returns the
     * node itself.
     * @param node The AST node.
     * @returns The body of the node.
     */
    private getBody(node: Shift.Node): Shift.Node | Shift.Node[] {
        if (!node) {
            return node;
        }

        return node.type == 'BlockStatement' ? node.block.statements : node;
    }

    /**
     * Returns whether a node is an if statement containing a dead branch.
     * @param node The AST node.
     * @returns Whether.
     */
    private isFixedIfStatement(node: Shift.Node): boolean {
        return node.type == 'IfStatement' && node.test.type == 'LiteralBooleanExpression';
    }

    /**
     * Returns whether a node is a conditional expression containing a dead
     * branch.
     * @param node The AST node.
     * @returns Whether.
     */
    private isFixedConditional(node: Shift.Node): boolean {
        return node.type == 'ConditionalExpression' && node.test.type == 'LiteralBooleanExpression';
    }
}
