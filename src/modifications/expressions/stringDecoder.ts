import Modification from '../../modification';
import * as Shift from 'shift-ast';
import { traverse } from '../../helpers/traverse';
import TraversalHelper from '../../helpers/traversalHelper';

/**
 * This transformation recovers strings which have obfuscated via various techniques.
 *
 * Reversed strings:
 * "dlroW olleH".split("").reverse().join("") -> "Hello World"
 *
 * Strings split into char codes:
 * String.fromCharCode(72,101,108,108,111,32,87,111,114,108,100) -> "Hello World"
 *
 * JS-Obfuscator specific XOR string encoding:
 * function _0x6f26a(_4,_5){_5=9;var _,_2,_3="";_2=_4.split(".");for(_=0;_<_2.length-1;_++){_3+=String.fromCharCode(_2[_]^_5);}return _3;}console['\x6c\x6f\x67'](_0x6f26a("65.108.101.101.102.41.94.102.123.101.109."));
 * ->
 * console["log"]("Hello World")
 */

interface StringEncodingFunctionProps {
    name: string;
    key: number;
}

export default class StringDecoder extends Modification {
    private encodingFunctionProps?: StringEncodingFunctionProps;

    /**
     * Creates a new modification.
     * @param ast The AST.
     */
    constructor(ast: Shift.Script) {
        super('Undo string operations', ast);
    }

    /**
     * Executes the modification.
     */
    execute(): void {
        this.findStringEncodingFunction();
        this.undoStringOperations();
    }

    /**
     * Looks for a JS-Obfuscator XOR string encoding function.
     */
    private findStringEncodingFunction() {
        const self = this;

        // only look at top level
        // TODO: once scope system has been improved, rework this
        for (const statement of this.ast.statements) {
            if (self.isXorStringEncodingFunction(statement)) {
                const name = statement.name.name;
                const key = statement.body.statements[0].expression.expression.value;
                this.encodingFunctionProps = { name, key };

                TraversalHelper.removeNode(this.ast, statement);
            }
        }
    }

    /**
     * Undoes various string operations.
     */
    private undoStringOperations(): void {
        const self = this;

        traverse(this.ast, {
            enter(node: Shift.Node, parent: Shift.Node) {
                if (self.isReversedString(node)) {
                    /**
                     * Handle reversed strings.
                     * "dlroW olleH".split("").reverse().join("") -> "Hello World"
                     */
                    const str = node.callee.object.callee.object.callee.object.value;
                    const reversedStr = new Shift.LiteralStringExpression({
                        value: str.split('').reverse().join('')
                    });
                    TraversalHelper.replaceNode(parent, node, reversedStr);
                } else if (self.isCharCodesString(node)) {
                    /**
                     * Handle strings split into char codes.
                     * String.fromCharCode(72,101,108,108,111,32,87,111,114,108,100) -> "Hello World"
                     */
                    const charCodes = node.arguments.map(e => {
                        const charCode = (e as Shift.LiteralNumericExpression).value;
                        if (typeof charCode !== 'number') {
                            throw new Error('Unexpected char code type');
                        }
                        return charCode;
                    });
                    const str = new Shift.LiteralStringExpression({
                        value: String.fromCharCode.apply(undefined, charCodes)
                    });
                    TraversalHelper.replaceNode(parent, node, str);
                } else if (
                    self.encodingFunctionProps != undefined &&
                    self.isStringEncodingFunctionCall(node)
                ) {
                    /**
                     * Handles strings obfuscated with JS-Obfuscator XOR string encoding.
                     */
                    const arg = node.arguments[0].value;
                    const decodedStr = arg
                        .split('.')
                        .slice(0, -1)
                        .map(c =>
                            String.fromCharCode(parseInt(c) ^ self.encodingFunctionProps!.key)
                        )
                        .join('');
                    const replacement = new Shift.LiteralStringExpression({ value: decodedStr });
                    TraversalHelper.replaceNode(parent, node, replacement);
                }
            }
        });
    }

    /**
     * Returns whether a node is an obfuscated reversed string.
     * @param node The AST node.
     * @returns Whether.
     */
    private isReversedString(node: Shift.Node): node is ReversedStringExpression {
        return (
            node.type === 'CallExpression' &&
            node.arguments.length === 1 &&
            node.arguments[0].type === 'LiteralStringExpression' &&
            node.arguments[0].value === '' &&
            node.callee.type === 'StaticMemberExpression' &&
            node.callee.property === 'join' &&
            node.callee.object.type === 'CallExpression' &&
            node.callee.object.arguments.length === 0 &&
            node.callee.object.callee.type === 'StaticMemberExpression' &&
            node.callee.object.callee.property === 'reverse' &&
            node.callee.object.callee.object.type === 'CallExpression' &&
            node.callee.object.callee.object.arguments.length === 1 &&
            node.callee.object.callee.object.arguments[0].type === 'LiteralStringExpression' &&
            node.callee.object.callee.object.arguments[0].value === '' &&
            node.callee.object.callee.object.callee.type === 'StaticMemberExpression' &&
            node.callee.object.callee.object.callee.property === 'split' &&
            node.callee.object.callee.object.callee.object.type === 'LiteralStringExpression'
        );
    }

    /**
     * Returns whether a node is a string broken down into char codes.
     * @param node The AST node.
     * @returns Whether.
     */
    private isCharCodesString(node: Shift.Node): node is CharCodesString {
        return (
            node.type === 'CallExpression' &&
            node.arguments.length > 0 &&
            node.arguments.every(e => e.type === 'LiteralNumericExpression') &&
            node.callee.type === 'StaticMemberExpression' &&
            node.callee.property === 'fromCharCode' &&
            node.callee.object.type === 'IdentifierExpression' &&
            node.callee.object.name === 'String'
        );
    }

    /**
     * Returns whether a node is the JS-Obfuscator XOR string encoding function.
     * @param node The AST node.
     * @returns Whether.
     */
    private isXorStringEncodingFunction(node: Shift.Node): node is StringEncodingFunction {
        return (
            node.type === 'FunctionDeclaration' &&
            node.params.items.length === 2 &&
            node.params.rest == undefined &&
            node.body.statements.length === 5 &&
            node.body.statements[0].type === 'ExpressionStatement' &&
            node.body.statements[0].expression.type === 'AssignmentExpression' &&
            node.body.statements[0].expression.binding.type === 'AssignmentTargetIdentifier' &&
            node.body.statements[0].expression.expression.type === 'LiteralNumericExpression' &&
            node.body.statements[1].type === 'VariableDeclarationStatement' &&
            node.body.statements[1].declaration.declarators.length === 3 &&
            node.body.statements[2].type === 'ExpressionStatement' &&
            node.body.statements[3].type === 'ForStatement' &&
            node.body.statements[3].init?.type === 'AssignmentExpression' &&
            node.body.statements[3].test?.type === 'BinaryExpression' &&
            node.body.statements[3].update?.type === 'UpdateExpression' &&
            node.body.statements[3].body.type === 'BlockStatement' &&
            node.body.statements[4].type === 'ReturnStatement' &&
            node.body.statements[4].expression?.type === 'IdentifierExpression'
        );
    }

    /**
     * Returns whether a node is a call of the string encoding function.
     * @param node The AST node.
     * @returns Whether.
     */
    private isStringEncodingFunctionCall(node: Shift.Node): node is StringEncodingFunctionCall {
        return (
            this.encodingFunctionProps != undefined &&
            node.type === 'CallExpression' &&
            node.callee.type === 'IdentifierExpression' &&
            node.callee.name === this.encodingFunctionProps.name &&
            node.arguments.length === 1 &&
            node.arguments[0].type === 'LiteralStringExpression' &&
            /^(\d{1,3}\.)+$/.test(node.arguments[0].value) // matches "65.108.101." etc
        );
    }
}

type ReversedStringExpression = Shift.CallExpression & {
    callee: Shift.StaticMemberExpression & {
        object: Shift.CallExpression & {
            callee: Shift.StaticMemberExpression & {
                object: Shift.CallExpression & {
                    callee: Shift.StaticMemberExpression & {
                        object: Shift.LiteralStringExpression;
                    };
                };
            };
        };
    };
};

type CharCodesString = Shift.CallExpression & { arguments: Shift.LiteralNumericExpression[] };

type StringEncodingFunction = Shift.FunctionDeclaration & {
    body: Shift.FunctionBody & {
        statements: [
            Shift.ExpressionStatement & {
                expression: Shift.AssignmentExpression & {
                    expression: Shift.LiteralNumericExpression;
                };
            }
        ];
    };
};

type StringEncodingFunctionCall = Shift.CallExpression & {
    arguments: [Shift.LiteralStringExpression];
};
