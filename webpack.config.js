const path = require('path');

module.exports = {
    entry: './src/index.ts',
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'web'),
        library: 'deobfuscator'
    }
};
