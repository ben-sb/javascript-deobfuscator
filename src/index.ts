import {refactor} from 'shift-refactor';
import {js as beautify} from 'js-beautify';
import Modification from './modification';
import ProxyRemover from './modifications/proxyRemover';
import ExpressionSimplifier from './modifications/expressionSimplifier';
import ArrayUnpacker from './modifications/arrayUnpacker';
import PropertySimplifier from './modifications/propertySimplifier';
import CleanupHelper from './helpers/cleanupHelper';
import Config from './config';

export function deobfuscate(source: string, config: Config): string {
    const $script = refactor(source);

    let modifications: Modification[] = [];

    if (config.proxyFunctions.replaceProxyFunctions) {
        modifications.push(new ProxyRemover(config.proxyFunctions.removeProxyFunctions));
    }

    if (config.expressions.simplifyExpressions) {
        modifications.push(new ExpressionSimplifier());
    }

    if (config.arrays.unpackArrays) {
        modifications.push(new ArrayUnpacker(config.arrays.removeArrays));
    }

    // simplify any expressions that were revealed by the array unpacking
    if (config.expressions.simplifyExpressions) {
        modifications.push(new ExpressionSimplifier());
    }

    if (config.miscellaneous.simplifyProperties) {
        modifications.push(new PropertySimplifier());
    }

    modifications.forEach(m => m.execute($script));


    CleanupHelper.cleanup($script);
    let output = $script.codegen().toString();
    
    if (config.miscellaneous.beautify) {
        output = beautify(output);
    }

    return output;
}