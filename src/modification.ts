import * as Shift from 'shift-ast';

export default abstract class Modification {
    name: string;
    ast: Shift.Script | Shift.Module;

    /**
     * Creates a new modification.
     * @param name The name of the modification.
     * @param ast The AST.
     */
    constructor(name: string, ast: Shift.Script | Shift.Module) {
        this.name = name;
        this.ast = ast;
    }

    /**
     * Executes the modification.
     */
    abstract execute(): void;
}
