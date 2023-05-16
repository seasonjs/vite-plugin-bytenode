import fs from "node:fs";
import loaderTemplate from "./templete";
import path from "node:path";

export const renderLoader = (renderName: string, compiledFilename: string, output: string, extname: string) => {
  const loaderCode = loaderTemplate(extname)
  fs.writeFileSync(path.join(output, renderName), loaderCode);
}

export const renderByteCode = (output: string, fileName: string, byte: Buffer) => {
  fs.writeFileSync(path.join(output, fileName), byte);
}

