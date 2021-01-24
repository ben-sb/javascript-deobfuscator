import { RefactorQueryAPI } from "shift-refactor/dist/src/refactor-session-chainable";
import Modification from "../modification";
import * as Shift from 'shift-ast';

export default class ExpressionSimplifier extends Modification {
    /**
     * Creates a new modification.
     * @param options The options map.
     */
    constructor(options: Map<string, any>) {
        super('Simplify Expressions', options);
    }

    /**
     * Executes the modification.
     * @param $script The AST.
     */
    execute($script: RefactorQueryAPI): void {
        this.simplifyExpressions($script);
    }

    /**
     * Simplifies numeric or string binary expressions into single strings or numbers.
     * @param $script The AST.
     */
    private simplifyExpressions($script: RefactorQueryAPI) {
        let replaced = true;

        while (replaced) {
            let replaceCount = 0;
            $script('BinaryExpression')
                .replace(node => {
                    let b = node as Shift.BinaryExpression;

                    let leftValue = this.getExpressionValue(b.left),
                        rightValue = this.getExpressionValue(b.right);

                    if (leftValue != null && rightValue != null) {
                        var value = eval(`${leftValue} ${b.operator} ${rightValue}`);
                        replaceCount++;
                        if (value != undefined) {
                            replaceCount++;
                            return typeof value == 'string' ? new Shift.LiteralStringExpression({
                                value: value
                            }) : new Shift.LiteralNumericExpression({
                                value: value
                            });
                        } else {
                            return b;
                        }
                    }
                    return b;
                });
            replaced = replaceCount > 0;
        }
    }

    /**
     * Returns the value of an expression as a string to be evaluated, null
     * if not able to get the value via evaluation.
     * @param node The expression node to get the value of.
     */
    private getExpressionValue(node: Shift.Node): string | null {
        switch (node.type) {
            case 'LiteralNumericExpression':
                return node.value.toString();
    
            case 'LiteralStringExpression':
                return `"${node.value}"`;
    
            case 'UnaryExpression':
                var operandValue = this.getExpressionValue(node.operand);
                return operandValue != null
                    ? node.operator + operandValue
                    : null;
    
            default:
                return null;
        }
    }
}