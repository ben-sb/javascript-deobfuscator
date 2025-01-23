import Modification from '../../modification';
import * as Shift from 'shift-ast';
import { traverse } from '../../helpers/traverse';
import TraversalHelper from '../../helpers/traversalHelper';

/**
 * This transformation recovers strings which have obfuscated via reversing them.
 *
 * Example: "!dlroW olleH".split("").reverse().join("") -> "Hello World!"
 */

export default class StringReverser extends Modification {
    /**
     * Creates a new modification.
     * @param ast The AST.
     */
    constructor(ast: Shift.Script) {
        super('Recover reversed strings', ast);
    }

    /**
     * Executes the modification.
     */
    execute(): void {
        this.recoverReversedStrings();
    }

    /**
     * Recovers reversed strings.
     */
    private recoverReversedStrings(): void {
        const self = this;

        traverse(this.ast, {
            enter(node: Shift.Node, parent: Shift.Node) {
                if (self.isReversedString(node)) {
                    const str = node.callee.object.callee.object.callee.object.value;
                    const reversedStr = new Shift.LiteralStringExpression({
                        value: str.split('').reverse().join('')
                    });
                    TraversalHelper.replaceNode(parent, node, reversedStr);
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
