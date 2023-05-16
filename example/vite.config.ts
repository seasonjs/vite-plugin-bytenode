import {defineConfig} from "vite";
import {join, resolve} from "node:path"
import bytenode from '../src/index'

export default defineConfig(() => {
  const entry = join(__dirname, 'dist/index.umd.js')
  return {
    plugins: [bytenode({
      filename: 'dist/index.umd.js',
      createLoader: true,
    })],
    build: {
      lib: {
        // Could also be a dictionary or array of multiple entry points
        entry: resolve(__dirname, 'index.js'),
        name: 'example',
        // the proper extensions will be added
        fileName: 'index',
      },
    },
  }
})
