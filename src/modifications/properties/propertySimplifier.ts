import Modification from '../../modification';
import * as Shift from 'shift-ast';
import isValid from 'shift-validator';
import { traverse } from '../../helpers/traverse';
import TraversalHelper from '../../helpers/traversalHelper';

export default class PropertySimplifier extends Modification {
    /**
     * Creates a new modification.
     * @param ast The AST.
     */
    constructor(ast: Shift.Script) {
        super('Simplify Properties', ast);
    }

    /**
     * Executes the modification.
     */
    execute(): void {
        this.simplifyComputedMembers(this.ast);
    }

    /**
     * Simplifies all computed members to static members within a given node.
     * @param node The AST node.
     */
    private simplifyComputedMembers(node: Shift.Node): void {
        const self = this;

        traverse(node, {
            enter(node: Shift.Node, parent: Shift.Node) {
                if (self.isStringComputedMember(node)) {
                    const replacement = new Shift.StaticMemberExpression({
                        object: (node as any).object,
                        property: (node as any).expression.value
                    });
                    self.simplifyComputedMembers(replacement);

                    if (isValid(replacement)) {
                        TraversalHelper.replaceNode(parent, node, replacement);
                    }
                }
            }
        });
    }

    /**
     * Returns whether a node is a computed member expression with a string property
     * and should be converted to a static member expression.
     * @param node The AST node.
     */
    private isStringComputedMember(node: Shift.Node): boolean {
        return (
            (node as any).object &&
            /.*Expression/.test((node as any).object.type) &&
            (node as any).expression != null &&
            (node as any).expression.type == 'LiteralStringExpression'
        );
    }
}
