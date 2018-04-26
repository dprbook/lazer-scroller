const path = require('path');
const ConcatPlugin = require('webpack-concat-plugin');

module.exports = {
    mode: 'development',
    entry: './src/index.js',
    output: {
        filename: '[name]',
        path: path.resolve(__dirname, 'dist'),
    },
    plugins: [
        new ConcatPlugin({
            // for more option look at uglifyjs
            uglify: false,
            name: 'result',
            fileName: 'lazer-scroller.js',
            filesToConcat: ['./src/**'],
            attributes: {
                async: true
            }
        })
    ]
};
