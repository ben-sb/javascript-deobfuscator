import { RefactorQueryAPI } from "shift-refactor/dist/src/refactor-session-chainable";
import Modification from "../modification";
import * as Shift from 'shift-ast';

export default class ArrayUnpacker extends Modification {
    removeArrays: boolean;

    /**
     * Creates a new modification.
     * @param options The options map.
     */
    constructor(options: Map<string, boolean>) {
        super('Unpack Arrays', options);
        this.removeArrays = this.options.get('Remove Arrays') as boolean;
    }

    /**
     * Executes the modification.
     * @param $script The AST.
     */
    execute($script: RefactorQueryAPI): void {
        this.unpackArrays($script);
    }

    /**
     * Finds all literal arrays and replaces all usages of them. Optionally
     * removes the declarations of the arrays.
     * @param $script The AST.
     */
    private unpackArrays($script: RefactorQueryAPI): void {
        let arrayMap = new Map<string, Shift.ArrayExpression>();
        let arrays = $script('VariableDeclarator[binding.type="BindingIdentifier"][init.type="ArrayExpression"]')
            .filter(this.isLiteralArray)
            .forEach(d => {
                arrayMap.set(d.binding.name, d.init);
            });

        let arrayUsages = new Map<string, Shift.Node[]>();
        $script('ComputedMemberExpression[object.type="IdentifierExpression"][expression.type="LiteralNumericExpression"]')
            .filter(c => arrayMap.has(c.object.name))
            .replace((c: any) => {
                let replacement = (arrayMap.get(c.object.name) as any).elements[c.expression.value];
                if (replacement) {
                    if (!arrayUsages.get(c.object.name)) {
                        arrayUsages.set(c.object.name, []);
                    }
                    (arrayUsages.get(c.object.name) as Shift.Node[]).push(c);
                }
                return replacement ? replacement : c;
            });

        if (this.removeArrays) {

            // detect any usages of arrays (other than the ones we have already seen)
            // and don't remove these arrays
            let arraysToRemove = Array.from(arrayMap.keys());
            $script('IdentifierExpression').forEach(i => {
                let usages = arrayUsages.get(i.name);
                if (usages) {
                    for (let usage of usages) {
                        if ((usage as Shift.ComputedMemberExpression).object == i) {
                            return;
                        }
                    }
                }
                let index = arraysToRemove.indexOf(i.name);
                if (index != -1) {
                    arraysToRemove.splice(index, 1);
                }
            })

            arrays
                .filter(d => arraysToRemove.includes((d as any).binding.name))
                .delete();
        }
    }

    /**
     * Returns whether an array is simple (contains only literals).
     * @param node The ArrayExpression node.
     */
    private isLiteralArray(node: Shift.Node): boolean {
        let arrayExpression = (node as Shift.VariableDeclarator).init as Shift.ArrayExpression;
        for (let element of arrayExpression.elements) {
            if (!element?.type.startsWith('Literal') && element?.type != 'BinaryExpression' && element?.type != 'UnaryExpression') {
                return false;
            }
        }
        return true;
    }
}