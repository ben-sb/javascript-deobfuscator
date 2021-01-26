import { RefactorQueryAPI } from "shift-refactor/dist/src/refactor-session-chainable";

export default abstract class Modification {
    name: string;

    /**
     * Creates a new modification.
     * @param name The name of the modification.
     */
    constructor(name: string) {
        this.name = name;
    }

    /**
     * Executes the modification.
     * @param $script The AST.
     */
    abstract execute($script: RefactorQueryAPI): void;
}