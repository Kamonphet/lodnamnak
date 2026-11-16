// ONNX Runtime (wasm, single thread, no proxy worker) behind the OcrRunner
// interface. One thread keeps the CSP strict (no worker / SharedArrayBuffer).
import * as ort from 'onnxruntime-web/wasm';
import { buildCharset, readImage, type OcrOptions, type OcrResult, type OcrRunner, type RgbaImage } from './openthaiOcr';

/** wasm: URL of ort-wasm-simd-threaded.wasm, or its bytes (Node tests) */
export async function createOrtRunner(detModel: Uint8Array, recModel: Uint8Array, wasm?: string | Uint8Array): Promise<OcrRunner> {
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  if (typeof wasm === 'string') ort.env.wasm.wasmPaths = { wasm };
  else if (wasm) ort.env.wasm.wasmBinary = wasm;
  const opts: ort.InferenceSession.SessionOptions = { executionProviders: ['wasm'], graphOptimizationLevel: 'all' };
  const det = await ort.InferenceSession.create(detModel, opts);
  const rec = await ort.InferenceSession.create(recModel, opts);
  const run = async (s: ort.InferenceSession, x: Float32Array, dims: number[]) => {
    const input = new ort.Tensor('float32', x, dims);
    const out = await s.run({ [s.inputNames[0]]: input });
    const t = out[s.outputNames[0]];
    const data = t.data as Float32Array;
    const result = { data, dims: [...t.dims] };
    input.dispose();
    return result;
  };
  return {
    det: (x, h, w) => run(det, x, [1, 3, h, w]),
    rec: (x, n, w) => run(rec, x, [n, 3, 48, w]),
  };
}

export interface OpenThaiOcr {
  read(image: RgbaImage, options?: Partial<OcrOptions>): Promise<OcrResult>;
}

let engine: Promise<OpenThaiOcr> | null = null;

/** Models are served from our own origin (public/openthai-ocr). */
export function loadOpenThaiOcr(): Promise<OpenThaiOcr> {
  if (!engine) {
    engine = (async () => {
      const base = new URL('openthai-ocr/', document.baseURI);
      const bytes = async (name: string) => {
        const res = await fetch(new URL(name, base));
        if (!res.ok) throw new Error(`OCR model ${name}: HTTP ${res.status}`);
        return new Uint8Array(await res.arrayBuffer());
      };
      const [det, rec, dict] = await Promise.all([
        bytes('det.onnx'),
        bytes('rec.onnx'),
        fetch(new URL('rec_dict.txt', base)).then((r) => {
          if (!r.ok) throw new Error(`OCR dictionary: HTTP ${r.status}`);
          return r.text();
        }),
      ]);
      // the wasm engine is bundled by Vite as a same-origin asset
      const runner = await createOrtRunner(det, rec);
      const charset = buildCharset(dict);
      return { read: (image, options) => readImage(image, runner, charset, options) };
    })();
    engine.catch(() => {
      engine = null; // allow a retry after a network failure
    });
  }
  return engine;
}
