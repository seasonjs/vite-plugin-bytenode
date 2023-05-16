import type {PluginOption} from "vite";
import {compiler, IByteNodeOptions} from "./compiler";


export interface IByteNodePluginOptions extends IByteNodeOptions {
  // which third packages you external
  renderPackage?: string[]
}


export default function ByteNodePlugin(options: IByteNodePluginOptions): PluginOption {
  return {
    name: 'vite-plugin-bytenode',
    apply: "build",
    async closeBundle() {
      await compiler(options)
    },
  }
}

