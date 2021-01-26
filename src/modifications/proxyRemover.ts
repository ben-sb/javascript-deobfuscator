import { RefactorQueryAPI } from "shift-refactor/dist/src/refactor-session-chainable";
import Modification from "../modification";
import * as Shift from 'shift-ast';
import ScopeAnalyzer from "../scope/scopeAnalyzer";
import Scope from "../scope/scope";
import Variable, { VariableUse } from "../scope/variable";
import TraversalHelper from "../helpers/traversalHelper";

export default class ProxyRemover extends Modification {
    removeProxyFunctions: boolean;

    /**
     * Creates a new modification.
     */
    constructor(removeProxyFunctions: boolean) {
        super('Remove Proxy Functions');
        this.removeProxyFunctions = removeProxyFunctions;
    }

    /**
     * Executes the modification.
     * @param $script The AST.
     */
    execute($script: RefactorQueryAPI) {
        let scope = ScopeAnalyzer.analyze($script.raw());
        this.removeInScope(scope);
    }

    /**
     * Searches for and removes proxy functions in a given scope.
     * @param scope The scope.
     */
    private removeInScope(scope: Scope): void {
        scope.variables.forEach((v: Variable) => {
            if (v.declarations.length == 0) {
                return;
            }
            let declaration = v.declarations[0];

            if (declaration.parentNode.type == 'VariableDeclarator' && declaration.parentNode.init && declaration.parentNode.init.type == 'FunctionExpression') {
                if (this.isProxyFunction(declaration.parentNode.init as Shift.Node)) {
                    this.removeProxyFunction(scope, declaration, v.references);
                }
            } else if (declaration.node.type == 'FunctionDeclaration' && this.isProxyFunction(declaration.node)) {
                this.removeProxyFunction(scope, declaration, v.references);
            }
        });

        scope.children.forEach(s => this.removeInScope(s));
    }

    /**
     * Replaces all references to and removes a  proxy function.
     * @param scope The scope.
     * @param declaration The proxy function declaration.
     * @param references The references to the proxy function.
     */
    private removeProxyFunction(scope: Scope, declaration: VariableUse, references: VariableUse[]): void {
        let func = declaration.node.type == 'FunctionDeclaration'
            ? declaration.node
            : (declaration.parentNode as any).init;
        references.forEach((r: VariableUse) => {
            if (r.parentNode.type == 'CallExpression') {
                let call = r.parentNode as Shift.CallExpression;
                let expression = (func as any).body.statements[0].expression as Shift.Expression;

                if (expression.type == 'CallExpression') {
                    let args = call.arguments;
                    args.forEach((a, i) => {
                        let param = func.params.items[i];
                        args.forEach((ar, ind) => {
                            args[ind] = this.replaceInArgument(ar, (param as Shift.BindingIdentifier).name, a) as any;
                        })
                    });
                    expression = new Shift.CallExpression({
                        callee: expression.callee,
                        arguments: args
                    });
                } else {
                    call.arguments.forEach((a, i) => {
                        let param = func.params.items[i];
                        expression = this.replaceInArgument(expression, (param as any).name, a) as Shift.BinaryExpression;
                    });
                }

                TraversalHelper.replaceNode(scope.node, r.parentNode, expression);
            }
        });

        if (this.removeProxyFunctions) {
            if (func.type == 'FunctionExpression') {
                TraversalHelper.removeNode(scope.node, declaration.parentNode);
            } else {
                TraversalHelper.removeNode(scope.node, func);
            }
        }
    }

    /**
     * Replaces identifiers within an argument node.
     * @param node The argument node.
     * @param value The identifier name to replace.
     * @param replacement The replacement node
     */
    private replaceInArgument(node: Shift.Node, value: string, replacement: Shift.Node): Shift.Node {
        switch (node.type) {
            case 'IdentifierExpression':
                if (node.name == value) {
                    return replacement;
                }
                break;
    
            case 'BinaryExpression':
                return new Shift.BinaryExpression({
                    left: this.replaceInArgument(node.left, value, replacement) as Shift.Expression,
                    operator: node.operator,
                    right: this.replaceInArgument(node.right, value, replacement) as Shift.Expression
                });

            case 'ComputedMemberExpression':
                return new Shift.ComputedMemberExpression({
                    object: this.replaceInArgument(node.object, value, replacement) as Shift.Expression,
                    expression: this.replaceInArgument(node.expression, value, replacement) as Shift.Expression
                })
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
            return type == 'CallExpression' || type == 'BinaryExpression' || type == 'ComputedMemberExpression';
        }
        return false;
    }
}