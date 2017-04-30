import typescript from 'rollup-plugin-typescript';

export default {
  entry: './src/index.ts',
  format: 'umd',
  dest: './dist/index.js',
  exports: 'named',
  moduleName: 'StatefulSelector',
  plugins: [
    typescript()
  ]
}