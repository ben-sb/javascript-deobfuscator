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
 */

export default class StringDecoder extends Modification {
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
        this.undoStringOperations();
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
