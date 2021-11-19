const path = require('path');

const clientConfig = {
    target: "node",
    node: {
        __dirname: false,
    },
    entry: './dist/index.js',
    mode: 'production',
    // module: {
    //     rules: [
    //         {
    //             test: /\.tsx?$/,
    //             use: [
    //                 {
    //                     loader: 'ts-loader',
    //                     options: {configFile: "tsconfig.json"}
    //                 }
    //             ],
    //             exclude: /node_modules/,
    //         },
    //         {
    //             test: /\.node$/,
    //             loader: "node-loader",
    //         },
    //     ]
    // },
    resolve: {
        extensions: ['.tsx', '.ts', '.js','.json']
    },
    output: {
        filename: 'index.bundle.js',
        path: path.resolve(__dirname, './dist'),
        libraryTarget: "commonjs",
        // globalObject: "this"
    },
    externals: [
        'mongodb-client-encryption',
        'bson-ext',
        'kerberos',
        'snappy',
        'snappy/package.json',
        'aws4',
        'electron',
        'web3.storage'
    ]
};

module.exports = [clientConfig];
