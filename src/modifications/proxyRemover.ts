import { RefactorQueryAPI } from "shift-refactor/dist/src/refactor-session-chainable";
import Modification from "../modification";
import * as Shift from 'shift-ast';
import { copyExpression } from "../utils/copyNode";

export default class ProxyRemover extends Modification {
    /**
     * Creates a new modification.
     * @param options The options map.
     */
    constructor(options: Map<string, any>) {
        super('Remove Proxy Functions', options);
    }

    /**
     * Executes the modification.
     * @param $script The AST.
     */
    execute($script: RefactorQueryAPI) {
        while (this.removeProxyFunctions($script)) {}
    }

    /**
     * Detects and removes proxy functions, returns whether any replacements were made.
     * @param $script The AST.
     */
    private removeProxyFunctions($script: RefactorQueryAPI): boolean {
        let proxyFunctions = new Map<string, Shift.Node>();
        let proxyFunctionExpressions = $script('VariableDeclarator[init.type="FunctionExpression"]')
            .filter(d => this.isProxyFunction(d.init))
            .forEach(d => proxyFunctions.set(d.binding.name, d.init));

        let proxyFunctionDeclarations = $script('FunctionDeclaration')
            .filter(f => this.isProxyFunction(f))
            .forEach(f => proxyFunctions.set(f.name.name, f));

        let result = $script('CallExpression[callee.type="IdentifierExpression"]')
            .filter(c => proxyFunctions.has(c.callee.name))
            .replace(c => {
                let call = c as Shift.CallExpression;
                let func = proxyFunctions.get((call.callee as any).name) as Shift.FunctionDeclaration | Shift.FunctionExpression;
                let expression = copyExpression((func as any).body.statements[0].expression as Shift.CallExpression | Shift.BinaryExpression) as Shift.Expression;

                if (expression.type == 'CallExpression') {
                    let callExpression = expression as Shift.CallExpression;
                    call.arguments.forEach((a, i) => {
                        let param = func.params.items[i];
                        callExpression.arguments.forEach((ar, ind) => {
                            callExpression.arguments[ind] = this.replaceArgument(ar, (param as Shift.BindingIdentifier).name, a) as any;
                        })
                    });
                } else {
                    call.arguments.forEach((a, i) => {
                        let param = func.params.items[i];
                        expression = this.replaceArgument(expression, (param as any).name, a) as Shift.BinaryExpression;
                    })
                }

                return expression;
            });
        
        if (result.session.nodes.length == 0) {
            proxyFunctionExpressions.delete();
            proxyFunctionDeclarations.delete();
        }

        return result.session.nodes.length > 0;
    }

    /**
     * Replaces identifiers within an argument node.
     * @param node The argument node.
     * @param value The identifier name to replace.
     * @param replacement The replacement node
     */
    private replaceArgument(node: Shift.Node, value: string, replacement: Shift.Node): Shift.Node {
        switch (node.type) {
            case 'IdentifierExpression':
                if (node.name == value) {
                    return replacement;
                }
                break;
    
            case 'BinaryExpression':
                return new Shift.BinaryExpression({
                    left: this.replaceArgument(node.left, value, replacement) as Shift.Expression,
                    operator: node.operator,
                    right: this.replaceArgument(node.right, value, replacement) as Shift.Expression
                });
        }
    
        return node;
    }

    /**
     * Returns whether a function is a proxy function.
     * @param node The function declaration or expression node.
     */
    private isProxyFunction(node: Shift.Node): boolean {
        let func = node as Shift.FunctionDeclaration | Shift.FunctionExpression;
        if (func.body.statements.length == 1 && func.body.statements[0].type == 'ReturnStatement') {
            let type = (func.body.statements[0].expression as any).type;
            return type == 'CallExpression' || type == 'BinaryExpression';
        }
        return false;
    }
}