import * as Shift from 'shift-ast';

export default class Variable {
    name: string;
    declarations: VariableUse[];
    references: VariableUse[];

    /**
     * Creates a new variable.
     * @param name The name of the variable.
     */
    constructor(name: string) {
        this.name = name;
        this.declarations = [];
        this.references = [];
    }

    /**
     * Adds a declaration of the variable.
     * @param node The declaration node.
     * @param parent The parent of the declaration node.
     */
    addDeclaration(node: Shift.Node, parent: Shift.Node) {
        this.declarations.push(new VariableUse(node, parent));
    }

    /**
     * Adds a reference to the variable.
     * @param node The reference node.
     * @param parent The parent of the reference node.
     */
    addReference(node: Shift.Node, parent: Shift.Node) {
        this.references.push(new VariableUse(node, parent));
    }
}

export class VariableUse {
    node: Shift.Node;
    parentNode: Shift.Node;

    constructor(node: Shift.Node, parentNode: Shift.Node) {
        this.node = node;
        this.parentNode = parentNode;
    }
}