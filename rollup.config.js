import path from 'path'
import pluginTypescript from 'rollup-plugin-ts'
import { terser as pluginTerser } from 'rollup-plugin-terser'
import pkg from './package.json'

const external = Object.keys(pkg.dependencies || {})

const targetDir = 'dist'

const plugins = [
  pluginTypescript({
    tsconfig: conf => ({ ...conf, declarationDir: 'dist' })
  })
]

if (process.env.BUILD === 'production') {
  plugins.push(
    pluginTerser({
      output: { comments: false },
      toplevel: true
    })
  )
}

export default [
  {
    input: 'lib/index.ts',
    external,
    output: {
      file: path.join(targetDir, 'index.js'),
      format: 'es',
      name: 'index',
      sourcemap: true
    },
    plugins
  }
]
