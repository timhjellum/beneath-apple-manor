const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')


const isProduction = process.env.NODE_ENV == 'production';


const stylesHandler = isProduction ? MiniCssExtractPlugin.loader : 'style-loader';

const config = {
	entry: './src/scripts.js',
	output: {
		path: path.resolve(__dirname, 'dist'),
		assetModuleFilename: 'images/[name][ext][query]',
	},
	devServer: {
		open: true,
		host: 'localhost',
		hot: true,
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: 'index.html',
		}),
	],
	module: {
		rules: [
			{
				test: /\.(js|jsx)$/i,
				loader: 'babel-loader',
				exclude: /node_modules/,
			},
			{
				test: /\.css$/i,
				use: [stylesHandler, 'css-loader', 'less-loader'],
			},
			{
				test: /\.less$/i,
				use: [stylesHandler, 'css-loader', 'less-loader'],
			},
			{
				test: /\.(woff2?|ttf|eot)(\?v=\w+)?$/,
				type: 'asset/resource',
				generator: {
                    filename: 'fonts/[name][ext][query]',
				}
			},
			{
				test: /\.(png|jpg|gif|ico|svg)(\?.*)?$/,
				type: 'asset/resource',
				generator: {
					filename: 'images/[name][ext][query]',
				}
			},

			{
				test: /\.(xml|json|webmanifest|txt)/,
				type: 'asset/resource',
				generator: {
					filename: './[name][ext][query]',
				}
			},

		],
	},
};

module.exports = () => {
	if (isProduction) {
		config.mode = 'production';
		config.plugins.push(new MiniCssExtractPlugin());
	} else {
		config.mode = 'development';
	}
	return config;
};
