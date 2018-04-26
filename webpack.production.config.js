const path = require('path');
const ConcatPlugin = require('webpack-concat-plugin');

module.exports = {
    mode: 'production',
    entry: './src/index.js',
    output: {
        filename: '[name]',
        path: path.resolve(__dirname, 'dist'),
    },
    plugins: [
        new ConcatPlugin({
            // for more option look at uglifyjs
            uglify: {
                mangle: true,
                compress: {
                    sequences: true,
                    dead_code: true,
                    conditionals: true,
                    booleans: true,
                    unused: true,
                    if_return: true,
                    join_vars: true,
                    passes: 2
                }
            },
            name: 'result',
            fileName: 'lazer-scroller.js',
            filesToConcat: ['./src/**'],
            attributes: {
                async: true
            }
        })
    ]
};
