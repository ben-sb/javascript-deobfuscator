import { traverse } from './traverse';
import * as Shift from 'shift-ast';

export default class TraversalHelper {

    /**
     * Replaces a node within a given section of the AST.
     * @param root The root node.
     * @param node The node to replace.
     * @param replacement The replacement node.
     */
    static replaceNode(root: Shift.Node, node: Shift.Node, replacement: Shift.Node | null): void {
        traverse(root, {
            enter(n: Shift.Node, parent: Shift.Node) {
                if (n == node) {
                    for (const prop of Object.getOwnPropertyNames(parent)) {
                        const value = (parent as any)[prop];
                        if (value == n) {
                            (parent as any)[prop] = replacement;
                        } else if (Array.isArray(value)) {
                            const array = value as Array<any>;
                            const index = array.indexOf(node);
                            if (index != -1) {
                                if (replacement) {
                                    array[index] = replacement;
                                } else {
                                    array.splice(index, 1);
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Removes a node within the given section of the AST.
     * @param root The root node.
     * @param node The node to remove.
     */
    static removeNode(root: Shift.Node, node: Shift.Node): void {
        this.replaceNode(root, node, null);
    }
}