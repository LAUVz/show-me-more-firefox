const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    'background/background': './background/background.ts',
    'content/content': './content/content.ts',
    'popup/popup': './popup/popup.ts',
    'gallery/gallery': './gallery/gallery.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
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
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: '.' },
        { from: 'icons', to: 'icons' },
        { from: 'popup/popup.html', to: 'popup' },
        { from: 'popup/popup.css', to: 'popup' },
        { from: 'gallery/gallery.html', to: 'gallery' },
        { from: 'gallery/gallery.css', to: 'gallery' },
        { from: 'gallery/toast.css', to: 'gallery' },
        { from: 'about/about.html', to: 'about' },
        { from: 'about/about.css', to: 'about' },
        { from: 'content/content.css', to: 'content' }
      ]
    })
  ]
};
