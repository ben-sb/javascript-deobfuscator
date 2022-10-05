import * as Shift from 'shift-ast';
import { traverse } from './traverse';
import TraversalHelper from './traversalHelper';

export default class CleanupHelper {
    /**
     * Cleans up any useless code.
     * @param ast The AST.
     */
    static cleanup(ast: Shift.Script): void {
        const self = this;

        traverse(ast, {
            enter(node: Shift.Node, parent: Shift.Node) {
                if (self.isEmptyVariableDeclarationStatement(node)) {
                    TraversalHelper.removeNode(parent, node);
                }
            }
        });
    }

    /**
     * Returns whether a node is a variable declaration statement with no
     * declarators.
     * @param node The AST node.
     */
    private static isEmptyVariableDeclarationStatement(node: Shift.Node): boolean {
        return (
            node.type == 'VariableDeclarationStatement' && node.declaration.declarators.length == 0
        );
    }
}
