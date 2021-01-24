import { RefactorQueryAPI } from "shift-refactor/dist/src/refactor-session-chainable";

export default abstract class Modification {
    name: string;
    options: Map<string, any>;

    /**
     * Creates a new modification.
     * @param name The name of the modification.
     * @param options The options map for the modification.
     */
    constructor(name: string, options: Map<string, any>) {
        this.name = name;
        this.options = options;
    }

    /**
     * Executes the modification.
     * @param $script The AST.
     */
    abstract execute($script: RefactorQueryAPI): void;
}