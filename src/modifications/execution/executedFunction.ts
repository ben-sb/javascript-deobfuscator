import * as Shift from 'shift-ast';
import { v4 as uuid } from 'uuid';
import { traverse } from '../../helpers/traverse';
import { codeGen } from 'shift-codegen';
import TraversalHelper from '../../helpers/traversalHelper';

export default class ExecutedFunction {
    func: FunctionType;
    parent: Shift.Node;
    name?: string;
    failedReplacement: boolean;
    private id: string;
    private didError: boolean;

    /**
     * Creates a new executed function.
     * @param func The function node.
     * @param parent The parent node.
     * @param name The name of the function (optional).
     */
    constructor(func: FunctionType, parent: Shift.Node, name?: string) {
        this.func = func;
        this.parent = parent;
        this.name = name;
        this.failedReplacement = false;
        this.id = uuid().replace(/-/g, '_');
        this.didError = false;

        this.evaluate();
    }

    /**
     * Attempts to evaluate the function.
     */
    private evaluate(): void {
        const body =
            this.func.body.type == 'FunctionBody'
                ? new Shift.FunctionBody({
                      directives: [],
                      statements: this.func.body.statements
                  })
                : new Shift.FunctionBody({
                      directives: [],
                      statements: [
                          new Shift.ReturnStatement({
                              expression: this.func.body
                          })
                      ]
                  });

        const func = new Shift.FunctionDeclaration({
            isAsync: false,
            isGenerator: false,
            name: new Shift.BindingIdentifier({
                name: `EXECUTED_FUNCTION_${this.id}`
            }),
            params: this.func.params,
            body: body
        });

        this.replaceSelfReferences(func);

        try {
            const code = codeGen(func);
            eval.call(this, code);
        } catch (err) {
            this.didError = true;
        }
    }

    /**
     * Attempts to get the result of a call expression of the executed
     * function.
     * @param args The arguments of the call.
     * @returns The result of the call.
     */
    getCall(args: (Shift.Expression | Shift.SpreadElement)[]): any {
        if (this.didError) {
            return null;
        }

        try {
            const callExpression = new Shift.CallExpression({
                callee: new Shift.IdentifierExpression({
                    name: `EXECUTED_FUNCTION_${this.id}`
                }),
                arguments: args
            });

            const code = codeGen(callExpression);
            return eval.call(this, code);
        } catch (err) {
            return null;
        }
    }

    /**
     * Removes the executed function.
     */
    remove(): void {
        if (!this.failedReplacement && !this.didError) {
            TraversalHelper.removeNode(this.parent, this.func);
        }
    }

    /**
     * Replaces references to the function itself within a given node.
     * @param node The AST node.
     */
    private replaceSelfReferences(node: Shift.Node): void {
        if (!this.name) {
            return;
        }
        const self = this;

        traverse(node, {
            enter(node: Shift.Node, parent: Shift.Node) {
                if (
                    (node.type == 'IdentifierExpression' || node.type == 'AssignmentTargetIdentifier') &&
                    node.name == self.name
                ) {
                    node.name = `EXECUTED_FUNCTION_${self.id}`;
                }
            }
        });
    }
}

export type FunctionType = Shift.FunctionDeclaration | Shift.FunctionExpression | Shift.ArrowExpression;
