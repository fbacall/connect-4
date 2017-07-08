module.exports = {
    entry: __dirname + '/src/client/client.js',
    output: {
        path: __dirname + '/public/js',
        filename: 'app.bundle.js',
    },
    externals: {
        jquery: 'jQuery'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['env']
                    }
                }
            }
        ]
    }
};
