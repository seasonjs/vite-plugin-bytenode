import fs from "node:fs";
import vm from "node:vm";
import v8 from "node:v8";
import path from "node:path";
import {fork} from 'child_process';
import Module from "node:module";
import {renderByteCode, renderLoader} from "./renderChunk";

v8.setFlagsFromString('--no-lazy');
v8.setFlagsFromString('--no-flush-bytecode');

export const compileCode = function (code: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (typeof code !== 'string') {
      reject(new Error(`javascript code must be string. ${typeof code} was given.`));
    }
    const script = new vm.Script(code);
    resolve(script.createCachedData())
  })
};

const compileElectronCode = function (code: string) {
  return new Promise((resolve, reject) => {
    let data = Buffer.from([]);

    const electronPath = path.join(path.dirname(require.resolve('electron')), 'cli.js');
    if (!fs.existsSync(electronPath)) {
      throw new Error('Electron not installed');
    }
    const bytenodePath = path.join(__dirname, 'electron-compiler.js');

    const proc = fork(electronPath, [bytenodePath], {
      env: {ELECTRON_RUN_AS_NODE: '1'},
      stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    });

    if (proc.stdin) {
      proc.stdin.write(code);
      proc.stdin.end();
    }

    if (proc.stdout) {
      proc.stdout.on('data', (chunk) => {
        data = Buffer.concat([data, chunk]);
      });
      proc.stdout.on('error', (err) => {
        console.error(err);
      });
      proc.stdout.on('end', () => {
        resolve(data);
      });
    }

    if (proc.stderr) {
      proc.stderr.on('data', (chunk) => {
        console.error('Error: ', chunk.toString());
      });
      proc.stderr.on('error', (err) => {
        console.error('Error: ', err);
      });
    }

    proc.addListener('message', (message) => console.log(message));
    proc.addListener('error', err => console.error(err));

    proc.on('error', (err) => reject(err));
    proc.on('exit', () => {
      resolve(data);
    });
  });
};

export interface IByteNodeOptions {
  filename: string;
  output?: string;
  compileAsModule?: boolean;
  electron?: boolean;
  createLoader?: boolean;
  loaderFilename?: string;
  extname?: string;
  compress?: false,
}

export const compiler = async function (options: IByteNodeOptions) {
  let filename, compileAsModule, electron, createLoader, loaderFilename, extname, output;

  filename = options?.filename;
  compileAsModule = !!options?.compileAsModule;
  electron = options?.electron;
  createLoader = options?.createLoader ?? false
  loaderFilename = options?.loaderFilename ?? 'loader.js';
  extname = options?.extname ?? '.bin';
  output = options?.output ?? path.dirname(filename)

  if (typeof filename !== 'string') {
    throw new Error(`filename must be a string. ${typeof filename} was given.`);
  }


  const compiledFilename = path.basename(filename).slice(0, -path.extname(filename).length).concat(extname);
  if (typeof compiledFilename !== 'string') {
    throw new Error(`output must be a string. ${typeof compiledFilename} was given.`);
  }

  const javascriptCode = fs.readFileSync(filename, 'utf-8');

  let code = javascriptCode.replace(/^#!.*/, '');

  if (compileAsModule) {
    code = Module.wrap(code);
  }

  let bytecodeBuffer;

  if (electron) {
    bytecodeBuffer = await compileElectronCode(code);
  } else {
    bytecodeBuffer = await compileCode(code);
  }

  if (createLoader) {
    renderLoader(loaderFilename, compiledFilename, output, extname)
  }

  renderByteCode(output, compiledFilename, bytecodeBuffer)

  return compiledFilename;
};
