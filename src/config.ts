export default interface Config {
    verbose: boolean;
    isModule: boolean;
    arrays: ArraysConfig;
    proxyFunctions: ProxyFunctionsConfig;
    expressions: ExpressionsConfig;
    miscellaneous: MiscellaneousConfig;
}

interface ArraysConfig {
    unpackArrays: boolean;
    removeArrays: boolean;
}

interface ProxyFunctionsConfig {
    replaceProxyFunctions: boolean;
    removeProxyFunctions: boolean;
}

interface ExpressionsConfig {
    simplifyExpressions: boolean;
    removeDeadBranches: boolean;
    undoStringOperations: boolean;
}

interface MiscellaneousConfig {
    beautify: boolean;
    simplifyProperties: boolean;
    renameHexIdentifiers: boolean;
}
