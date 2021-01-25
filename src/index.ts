import {refactor} from 'shift-refactor';
import fs from 'fs';
import {js as beautify} from 'js-beautify';
import Modification from './modification';
import ProxyRemover from './modifications/proxyRemover';
import ExpressionSimplifier from './modifications/expressionSimplifier';
import ArrayUnpacker from './modifications/arrayUnpacker';
import PropertySimplifier from './modifications/propertySimplifier';

const source = fs.readFileSync('input/source.js').toString();
const $script = refactor(source);


let modifications: Modification[] = [];

/*const proxyRemoverOptions = new Map<string, any>();
modifications.push(new ProxyRemover(proxyRemoverOptions));*/

const expressionSimplifierOptions = new Map<string, any>();
modifications.push(new ExpressionSimplifier(expressionSimplifierOptions));

/*const arrayUnpackerOptions = new Map<string, any>();
arrayUnpackerOptions.set('Remove Arrays', true);
modifications.push(new ArrayUnpacker(arrayUnpackerOptions));

// simplify any expressions that were revealed by the array unpacking
modifications.push(new ExpressionSimplifier(expressionSimplifierOptions));

const propertySimplifierOptions = new Map<string, any>();
modifications.push(new PropertySimplifier(propertySimplifierOptions));*/

modifications.forEach(m => m.execute($script));


fs.writeFileSync('output/output.js', beautify($script.codegen().toString()));