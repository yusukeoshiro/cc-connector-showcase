var path = require('path');
    var ExtractTextPlugin = require('sgmf-scripts')['extract-text-webpack-plugin'],
        glob = require('glob');

    module.exports = [{
        mode: 'none',
        name: 'scss',
        entry: {
            'default/css/style': glob.sync(__dirname + '/cartridge/scss/default/*.scss'),
            'en_US/css/style': glob.sync(__dirname + '/cartridge/scss/en_US/*.scss'),
            'fr_FR/css/style': glob.sync(__dirname + '/cartridge/scss/fr_FR/*.scss'),
            'it_IT/css/style': glob.sync(__dirname + '/cartridge/scss/it_IT/*.scss'),
            'ja_JP/css/style': glob.sync(__dirname + '/cartridge/scss/ja_JP/*.scss'),
            'zh_CN/css/style': glob.sync(__dirname + '/cartridge/scss/zh_CN/*.scss'),
        },
        output: {
            path: path.resolve('./cartridge/static/'),
            filename: '[name].css'
        },
        module: {
            rules: [{
                test: /\.scss$/,
                use: ExtractTextPlugin.extract({
                    use: [{
                        loader: 'css-loader',
                        options: {
                            url: false
                        }
                    }, {
                        loader: 'postcss-loader',
                        options: {
                            plugins: [
                                require('autoprefixer')()
                            ]
                        }
                    }, {
                        loader: 'sass-loader'
                    }]
                })
            }]
        },
        plugins: [
            new ExtractTextPlugin({ filename: '[name].css' })
        ]
    }];