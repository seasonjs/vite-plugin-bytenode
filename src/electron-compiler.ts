#!/usr/bin/env node

import {compileCode} from "./compiler";

let script = '';

process.stdin.setEncoding('utf-8');

process.stdin.on('readable', () => {
  const data = process.stdin.read();
  if (data !== null) {
    script += data;
  }
});

process.stdin.on('end', async () => {
  try {
    const buff = await compileCode(script)
    process.stdout.write(buff);
  } catch (error) {
    console.error(error);
  }
});
