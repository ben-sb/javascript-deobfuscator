#!/usr/bin/env node

import { deobfuscate } from './index';
import fs from 'fs';
import { Command } from 'commander';

const program = new Command();
program
    .description('Deobfuscate a javascript file')
    .option('-i, --input [input_file]', 'The input file to deobfuscate', 'input/source.js')
    .option('-o, --output [output_file]', 'The deobfuscated output file', 'output/output.js');

program.parse(process.argv);
const options = program.opts();

// check if the input file exists
if (!fs.existsSync(options.input)) {
    console.error(`The input file ${options.input} does not exist`);
    process.exit(1);
}

const source = fs.readFileSync(options.input).toString();
const config = {
    verbose: true,
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
        removeDeadBranches: true
    },
    miscellaneous: {
        beautify: true,
        simplifyProperties: true,
        renameHexIdentifiers: true
    }
};

const output = deobfuscate(source, config);
fs.writeFileSync(options.output, output);
console.info(`The output file ${options.output} has been created`);
