import parseScript from 'shift-parser';
import * as Shift from 'shift-ast';
import codegen, { FormattedCodeGen } from 'shift-codegen';
import Modification from './modification';
import ProxyRemover from './modifications/proxies/proxyRemover';
import ExpressionSimplifier from './modifications/expressions/expressionSimplifier';
import ArrayUnpacker from './modifications/arrays/arrayUnpacker';
import PropertySimplifier from './modifications/properties/propertySimplifier';
import CleanupHelper from './helpers/cleanupHelper';
import Config from './config';
import VariableRenamer from './modifications/renaming/variableRenamer';
import FunctionExecutor from './modifications/execution/functionExecutor';

export function deobfuscate(source: string, config: Config): string {
    const ast = parseScript(source) as Shift.Script;
    const modifications: Modification[] = [];

    // function execution should always be checked for
    modifications.push(new FunctionExecutor(ast));

    if (config.proxyFunctions.replaceProxyFunctions) {
        modifications.push(new ProxyRemover(ast, config.proxyFunctions.removeProxyFunctions));
    }

    if (config.expressions.simplifyExpressions) {
        modifications.push(new ExpressionSimplifier(ast));
    }

    if (config.arrays.unpackArrays) {
        modifications.push(new ArrayUnpacker(ast, config.arrays.removeArrays));
    }

    // simplify any expressions that were revealed by the array unpacking
    if (config.expressions.simplifyExpressions) {
        modifications.push(new ExpressionSimplifier(ast));
    }

    if (config.miscellaneous.simplifyProperties) {
        modifications.push(new PropertySimplifier(ast));
    }

    if (config.miscellaneous.renameHexIdentifiers) {
        modifications.push(new VariableRenamer(ast));
    }

    modifications.forEach(m => m.execute());

    CleanupHelper.cleanup(ast);
    const output = config.miscellaneous.beautify
        ? codegen(ast, new FormattedCodeGen())
        : codegen(ast);

    return output;
}