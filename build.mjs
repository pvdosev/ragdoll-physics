#!/usr/bin/env node
import path from 'node:path';
import fs from 'node:fs';
import * as esbuild from 'esbuild';
import { glsl } from "esbuild-plugin-glsl";
import { wasmLoader as wasm } from "esbuild-plugin-wasm";

const args = new Set(process.argv.slice(2));
if (args.has("-h") || args.has("--help")) {
  console.log(`USAGE: ./build.mjs [-w]
A small build script for this project!

  -w, --watch          Instead of building once, invoke the esbuild file watcher.
  -h, --help           Show this and exit`);
  process.exit();
}

const esbuildContext = await esbuild.context({
  entryPoints: ['index.js'],
  bundle: true,
  sourcemap: true,
  format: 'esm',
  outfile: 'www/index.js',
  plugins: [wasm(), glsl()],
});
esbuildContext.rebuild();

if (args.has("-w") || args.has("--watch")) {
  await esbuildContext.watch();
  console.log("Watching <0> <0>");
}
