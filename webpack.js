const path = require('path');

const clientConfig = {
    target: "node",
    node: {
        __dirname: false,
    },
    entry: './src/index.ts',
    mode: 'production',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {configFile: "tsconfig.json"}
                    }
                ],
                exclude: /node_modules/,
            },
            {
                test: /\.node$/,
                loader: "node-loader",
            },
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, './dist'),
        libraryTarget: "commonjs",
        // globalObject: "this"
    },
};

module.exports = [clientConfig];
