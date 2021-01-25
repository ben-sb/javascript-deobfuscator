import { RefactorQueryAPI } from "shift-refactor/dist/src/refactor-session-chainable";

export default class CleanupHelper {

    /**
     * Cleans up any useless code.
     * @param $script The AST.
     */
    static cleanup($script: RefactorQueryAPI): void {
        $script('VariableDeclaration[declarators.length=0]')
            .parents()
            .delete();
    }
}