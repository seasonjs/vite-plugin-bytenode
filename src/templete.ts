import fs from "node:fs";
import vm from "node:vm";



const loaderTemplate = (extname: string) => `
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const Module = require('module');

const compileCode = function (code) {
  if (typeof code !== 'string') {
    throw new Error(\`javascript code must be string. \${typeof code} was given.\`);
  }
  const script = new vm.Script(code);
  return script.createCachedData()
};

const readSourceHash = function (byte) {
  if (!Buffer.isBuffer(byte)) {
    throw new Error('bytecodeBuffer must be a buffer object.');
  }

  return byte.subarray(8, 12).reduce((sum, number, power) => sum += number * Math.pow(256, power), 0);

};

const fixBytecode = function (byte) {
  if (!Buffer.isBuffer(byte)) {
    throw new Error('bytecodeBuffer must be a buffer object.');
  }

  const dummyBytecode = compileCode('"ಠ_ಠ"');
  const version = parseFloat(process.version.slice(1, 5));

  if (version >= 12 && version <= 20) {
    dummyBytecode.subarray(12, 16).copy(byte, 12);
  } else {
    dummyBytecode.subarray(12, 16).copy(byte, 12);
    dummyBytecode.subarray(16, 20).copy(byte, 16);
  }
};

const runBytecodeFile = function (filename) {
  if (typeof filename !== 'string') {
    throw new Error(\`filename must be a string. \${typeof filename} was given.\`);
  }

  const bytecodeBuffer = fs.readFileSync(filename);

  return runBytecode(bytecodeBuffer);
};
const runBytecode = function (bytecodeBuffer) {
  if (!Buffer.isBuffer(bytecodeBuffer)) {
    throw new Error('bytecodeBuffer must be a buffer object.');
  }

  fixBytecode(bytecodeBuffer);

  const length = readSourceHash(bytecodeBuffer);

  let dummyCode = '';

  if (length > 1) {
    dummyCode = '"' + '\\u200b'.repeat(length - 2) + '"'; // "\\u200b" Zero width space
  }

  const script = new vm.Script(dummyCode, {
    cachedData: bytecodeBuffer
  });

  if (script.cachedDataRejected) {
    throw new Error('Invalid or incompatible cached data (cachedDataRejected)');
  }

  return script.runInThisContext();
};

Module._extensions["${extname}"] = function (fileModule, filename) {
  const bytecodeBuffer = fs.readFileSync(filename);

  fixBytecode(bytecodeBuffer);

  const length = readSourceHash(bytecodeBuffer);

  let dummyCode = '';

  if (length > 1) {
    dummyCode = '"' + '\\u200b'.repeat(length - 2) + '"'; // "\\u200b" Zero width space
  }

  const script = new vm.Script(dummyCode, {
    filename: filename,
    lineOffset: 0,
    displayErrors: true,
    cachedData: bytecodeBuffer
  });

  if (script.cachedDataRejected) {
    throw new Error('Invalid or incompatible cached data (cachedDataRejected)');
  }

  /*
  This part is based on:
  https://github.com/zertosh/v8-compile-cache/blob/7182bd0e30ab6f6421365cee0a0c4a8679e9eb7c/v8-compile-cache.js#L158-L178
  */

  function require (id) {
    return fileModule.require(id);
  }
  require.resolve = function (request, options) {
    return Module._resolveFilename(request, fileModule, false, options);
  };
  
  if (process.mainModule) {
    require.main = process.mainModule;
  }

  require.extensions = Module._extensions;
  
  require.cache = Module._cache;

  const compiledWrapper = script.runInThisContext({
    filename: filename,
    lineOffset: 0,
    columnOffset: 0,
    displayErrors: true
  });

  const dirname = path.dirname(filename);

  const args = [fileModule.exports, require, fileModule, filename, dirname, process, global];

  return compiledWrapper.apply(fileModule.exports, args);
};
`
export default loaderTemplate;
