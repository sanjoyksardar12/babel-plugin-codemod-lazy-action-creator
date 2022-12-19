// const { babel } = require('@babel/core');
import { expect } from 'chai'

const babel = require('@babel/core')

const path = require('path')
// const plugin = require('../index');

// const babelConfig = { presets: ['@babel/preset-react'], plugins: [plugin] };

describe('map Dispatch to props', () => {
  fit('MapDispatchToProps as fuction', () => {
    console.log(path.resolve(__dirname, '../test-data/asObject.js'))
    const { code } = babel.transformFileSync(
      path.resolve(__dirname, '../test-data/asFunction.js'),
      require('../.babelrc.js')
    )
  })
})
