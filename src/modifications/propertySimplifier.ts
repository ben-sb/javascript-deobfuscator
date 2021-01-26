import { RefactorQueryAPI } from "shift-refactor/dist/src/refactor-session-chainable";
import Modification from "../modification";
import * as Shift from 'shift-ast';

export default class PropertySimplifier extends Modification {
    /**
     * Creates a new modification.
     */
    constructor() {
        super('Simplify Properties');
    }

    /**
     * Executes the modification.
     * @param $script The AST.
     */
    execute($script: RefactorQueryAPI): void {
        this.simplifyProperties($script);
    }

    /**
     * Simplifies computed member expressions to static member expressions.
     * @param $script The AST.
     */
    private simplifyProperties($script: RefactorQueryAPI): void {
        $script.replaceChildren('*[object.type=/.*Expression/][expression.type="LiteralStringExpression"]', c => {
            return new Shift.StaticMemberExpression({
                object: (c as any).object,
                property: (c as any).expression.value
            })
        });
    }
}