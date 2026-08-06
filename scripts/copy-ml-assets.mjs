import { cpSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const onnxSrc = resolve(root, 'node_modules/onnxruntime-web/dist');
const onnxDest = resolve(root, 'public/onnx');
const transformersSrc = resolve(root, 'node_modules/@huggingface/transformers/dist/transformers.web.min.js');
const transformersDest = resolve(root, 'public/transformers.web.min.js');

if (!existsSync(onnxSrc) || !existsSync(transformersSrc)) {
  console.warn('[copy-ml-assets] dependencies missing, skipping. Run `npm install` first.');
  process.exit(0);
}

const keepOnnxFile = (source) => statSync(source).isDirectory() || source.endsWith('.wasm');

cpSync(onnxSrc, onnxDest, { recursive: true, filter: keepOnnxFile });
cpSync(transformersSrc, transformersDest);
console.log('[copy-ml-assets] copied ONNX runtime and transformers.js browser assets to public/');
