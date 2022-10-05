import * as Shift from 'shift-ast';

export default class Array {
    node: Shift.Node;
    parentNode: Shift.Node;
    name: string;
    elements: Shift.Expression[];
    replaceCount: number;

    /**
     * Creates a new array.
     * @param node The declaration node.
     * @param parentNode The parent node.
     * @param name The name of the array.
     * @param elements The elements in the array.
     */
    constructor(
        node: Shift.Node,
        parentNode: Shift.Node,
        name: string,
        elements: Shift.Expression[]
    ) {
        this.name = name;
        this.elements = elements;
        this.node = node;
        this.parentNode = parentNode;
        this.replaceCount = 0;
    }
}
