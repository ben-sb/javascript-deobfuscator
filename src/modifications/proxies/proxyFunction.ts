import * as Shift from 'shift-ast';
import parseScript from 'shift-parser';
import codegen from 'shift-codegen';
import { traverse } from 'shift-traverser';
import TraversalHelper from '../../helpers/traversalHelper';

export default class ProxyFunction {
    node: Shift.Node;
    parentNode: Shift.Node;
    name: string;
    params: Shift.BindingIdentifier[];
    expression: Shift.Expression;

    /**
     * Creates a new proxy function.
     * @param node The function node.
     * @param parentNode The parent node.
     * @param name The name of the proxy function.
     * @param params The parameters of the proxy function.
     * @param expression The expression returned by the proxy function.
     */
    constructor(node: Shift.Node, parentNode: Shift.Node, name: string, params: Shift.BindingIdentifier[], expression: Shift.Expression) {
        this.node = node;
        this.parentNode = parentNode;
        this.name = name;
        this.params = params;
        this.expression = expression;
    }

    /**
     * Returns the replacement for a call of the proxy function.
     * @param args The arguments of the proxy function call.
     */
    getReplacement(args: Shift.Expression[]): Shift.Expression {
        let expression = this.duplicateExpression(this.expression);
        const paramUsages = this.findParameterUsages(expression);

        for (const [index, usages] of paramUsages) {
            const arg = args[index];
            if (arg) {
                for (const usage of usages) {
                    if (!usage.parentNode) {
                        expression = arg;
                    } else {
                        TraversalHelper.replaceNode(usage.parentNode, usage.node, arg);
                    }
                }
            }
        }

        return expression;
    }

    /**
     * Finds all usages of the proxy function's parameters within a given
     * expression.
     * @param expression The expression node.
     */
    private findParameterUsages(expression: Shift.Expression): Map<number, ParamUsage[]> {
        const params = this.params.map(p => p.name);
        const paramUsages = new Map<number, ParamUsage[]>();

        traverse(expression, {
            enter(node: Shift.Node, parent: Shift.Node) {
                if (node.type == 'IdentifierExpression' || node.type == 'AssignmentTargetIdentifier') {
                    const name = node.name;
                    const index = params.indexOf(name);

                    if (index != -1) {
                        const usage = new ParamUsage(node, parent);
                        let usages: ParamUsage[];

                        if (paramUsages.has(index)) {
                            usages = paramUsages.get(index) as ParamUsage[];
                        } else {
                            usages = [];
                            paramUsages.set(index, usages);
                        }
                        usages.push(usage);
                    }
                }
            }
        });

        return paramUsages;
    }

    /**
     * Returns a copy of an expression.
     * @param node The expression node.
     */
    private duplicateExpression(expression: Shift.Expression): Shift.Expression {
        const code = codegen(expression);
        const ast = parseScript(code);
        return ast.statements[0].expression;
    }
}

class ParamUsage {
    node: Shift.IdentifierExpression | Shift.AssignmentTargetIdentifier;
    parentNode: Shift.Node;

    constructor(node: Shift.IdentifierExpression | Shift.AssignmentTargetIdentifier, parentNode: Shift.Node) {
        this.node = node;
        this.parentNode = parentNode;
    }
}
