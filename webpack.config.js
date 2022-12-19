const { join } = require('path')

// const include = join(__dirname, 'src');

const config = {
  entry: './src/index',
  output: {
    path: join(__dirname, 'dist'),
    libraryTarget: 'commonjs2',
    library: 'babel-plugin-codemod-lazy-action-creator',
  },
  devtool: 'source-map',
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'],
              plugins: [['@babel/plugin-proposal-class-properties']],
            },
          },
        ],
      },
    ],
  },
}

module.exports = config
