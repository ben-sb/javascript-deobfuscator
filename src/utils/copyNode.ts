import * as Shift from 'shift-ast';

/**
 * Returns a copy of an expression. This only works for the node types that
 * it's used for currently, should add more.
 * @param n AST expression node.
 */
export function copyExpression(n: Shift.Expression): Shift.Expression | null {
    switch (n.type) {
        case 'IdentifierExpression':
            return new Shift.IdentifierExpression({
                name: n.name
            });
        case 'LiteralStringExpression':
            return new Shift.LiteralStringExpression({
                value: n.value
            });
        case 'LiteralNumericExpression':
            return new Shift.LiteralNumericExpression({
                value: n.value
            });
        case 'LiteralBooleanExpression':
            return new Shift.LiteralBooleanExpression({
                value: n.value
            });
        case 'LiteralNullExpression':
            return new Shift.LiteralNullExpression();
        case 'LiteralInfinityExpression':
            return new Shift.LiteralInfinityExpression();

        case 'BinaryExpression':
            return new Shift.BinaryExpression({
                left: copyExpression(n.left) as Shift.Expression,
                operator: n.operator,
                right: copyExpression(n.right) as Shift.Expression
            });
            
        case 'CallExpression':
            return new Shift.CallExpression({
                callee: copyExpression(n.callee as Shift.Expression) as Shift.Expression,
                arguments: n.arguments.map(a => copyExpression(a as Shift.Expression) as Shift.Expression)
            });

        default:
            return null;
    }
}