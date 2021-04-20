import Modification from "../../modification";
import * as Shift from 'shift-ast';
import { traverse } from 'shift-traverser';
import TraversalHelper from "../../helpers/traversalHelper";

export default class ExpressionSimplifier extends Modification {
    private readonly types = ['BinaryExpression', 'UnaryExpression'];
    
    /**
     * Creates a new modification.
     * @param ast The AST.
     */
    constructor(ast: Shift.Script) {
        super('Simplify Expressions', ast);
    }

    /**
     * Executes the modification.
     */
    execute(): void {
        this.simplifyExpressions();
    }

    /**
     * Simplifies all binary and unary expressions.
     */
    private simplifyExpressions(): void {
        const self = this;

        traverse(this.ast, {
            enter(node: Shift.Node, parent: Shift.Node) {
                if (self.types.includes(node.type)) {
                    const replacement = self.simplifyExpression(node as Shift.Expression);

                    if (replacement != node) {
                        TraversalHelper.replaceNode(parent, node, replacement);
                    }
                }
            }
        });
    }

    /**
     * Attempts to simplify an expression node.
     * @param expression The expression node.
     */
    private simplifyExpression(expression: Shift.Expression): Shift.Expression {
        switch (expression.type) {
            case 'BinaryExpression':
                return this.simplifyBinaryExpression(expression);

            case 'UnaryExpression':
                return this.simplifyUnaryExpression(expression);

            default:
                return expression;
        }
    }

    /**
     * Attempts to simplify a binary expression node.
     * @param expression The binary expression node.
     */
    private simplifyBinaryExpression(expression: Shift.BinaryExpression): Shift.Expression {
        const left = this.simplifyExpression(expression.left);
        const right = this.simplifyExpression(expression.right);

        const leftValue = this.getExpressionValueAsString(left);
        const rightValue = this.getExpressionValueAsString(right);

        if (leftValue != null && rightValue != null) {
            const code = `${leftValue} ${expression.operator} ${rightValue}`;
            const simplified = this.evalCodeToExpression(code);
            return simplified != null
                ? simplified
                : expression;
        } else {
            return expression;
        }
    }

    /**
     * Attempts to simplify a unary expression node.
     * @param expression The unary expression node.
     */
    private simplifyUnaryExpression(expression: Shift.UnaryExpression): Shift.Expression {
        expression.operand = this.simplifyExpression(expression.operand);
        const code = this.getExpressionValueAsString(expression);

        if (code != null) {
            const simplified = this.evalCodeToExpression(code);
            return simplified != null
                ? simplified
                : expression;
        } else {
            return expression;
        }
    }

    /**
     * Returns the value of a node as a string, null if not possible.
     * @param expression The expression node.
     */
    private getExpressionValueAsString(expression: Shift.Expression): string | null {
        switch (expression.type) {
            case 'LiteralStringExpression':
                return `"${expression.value}"`;

            case 'LiteralNumericExpression':
                return expression.value.toString();

            case 'UnaryExpression':
                const operand = this.getExpressionValueAsString(expression.operand);
                return operand != null
                    ? expression.operator + operand
                    : null;

            default:
                return null;
        }
    }

    /**
     * Evaluates a given piece of code and converts the result to an
     * expression node if possible.
     * @param code The code to be evaluated.
     */
    private evalCodeToExpression(code: string): Shift.Expression | null {
        let value;
        try {
            value = eval(code);
        } catch {
            return null;
        }

        switch (typeof value) {
            case 'string':
                return new Shift.LiteralStringExpression({
                    value: value
                });

            case 'number':
                return new Shift.LiteralNumericExpression({
                    value: value
                });

            case 'boolean':
                return new Shift.LiteralBooleanExpression({
                    value: value
                });

            default:
                return null;
        }
    }
}