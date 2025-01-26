import { parseModule, parseScript } from 'shift-parser';
import * as Shift from 'shift-ast';
import { codeGen, FormattedCodeGen } from 'shift-codegen';
import Modification from './modification';
import ProxyRemover from './modifications/proxies/proxyRemover';
import ExpressionSimplifier from './modifications/expressions/expressionSimplifier';
import ArrayUnpacker from './modifications/arrays/arrayUnpacker';
import PropertySimplifier from './modifications/properties/propertySimplifier';
import CleanupHelper from './helpers/cleanupHelper';
import Config from './config';
import VariableRenamer from './modifications/renaming/variableRenamer';
import DeadBranchRemover from './modifications/branches/deadBranchRemover';
import StringDecoder from './modifications/expressions/stringDecoder';

const defaultConfig: Config = {
    verbose: false,
    isModule: false,
    arrays: {
        unpackArrays: true,
        removeArrays: true
    },
    proxyFunctions: {
        replaceProxyFunctions: true,
        removeProxyFunctions: true
    },
    expressions: {
        simplifyExpressions: true,
        removeDeadBranches: true,
        undoStringOperations: true
    },
    miscellaneous: {
        beautify: true,
        simplifyProperties: true,
        renameHexIdentifiers: false
    }
};

/**
 * Deobfuscates a given source script.
 * @param source The source script.
 * @param config The deobfuscation configuration (optional).
 * @returns The deobfuscated script.
 */
export function deobfuscate(source: string, parsedConfig?: Partial<Config>): string {
    const config = Object.assign({}, defaultConfig, parsedConfig);

    const ast = (config.isModule ? parseModule(source) : parseScript(source)) as Shift.Script;

    const modifications: Modification[] = [];

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

    if (config.expressions.removeDeadBranches) {
        modifications.push(new DeadBranchRemover(ast));
    }

    if (config.miscellaneous.simplifyProperties) {
        modifications.push(new PropertySimplifier(ast));
    }

    if (config.expressions.undoStringOperations) {
        modifications.push(new StringDecoder(ast));
    }

    if (config.miscellaneous.renameHexIdentifiers) {
        modifications.push(new VariableRenamer(ast));
    }

    for (const modification of modifications) {
        if (config.verbose) {
            console.log(
                `[${new Date().toISOString()}]: Executing ${modification.constructor.name}`
            );
        }
        modification.execute();
    }

    CleanupHelper.cleanup(ast);
    const output = config.miscellaneous.beautify
        ? codeGen(ast, new FormattedCodeGen())
        : codeGen(ast);

    return output;
}
