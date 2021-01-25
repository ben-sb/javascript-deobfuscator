import { traverse } from 'shift-traverser';
import * as Shift from 'shift-ast';

export default class TraversalHelper {

    /**
     * Replaces a node within a given section of the AST.
     * @param root The root node.
     * @param node The node to replace.
     * @param replacement The replacement node.
     */
    static replaceNode(root: Shift.Node, node: Shift.Node, replacement: Shift.Node | null): void {
        let replaced = false;

        traverse(root, {
            enter(n: Shift.Node, parent: Shift.Node) {
                if (n == node) {
                    for (let prop of Object.getOwnPropertyNames(parent)) {
                        let value = (parent as any)[prop];
                        if (value == n) {
                            (parent as any)[prop] = replacement;
                            replaced = true;
                        } else if (Array.isArray(value)) {
                            let array = value as Array<any>;
                            let index = array.indexOf(node);
                            if (index != -1) {
                                if (replacement) {
                                array[index] = replacement;
                                } else {
                                    array.splice(index, 1);
                                }
                                replaced = true;
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