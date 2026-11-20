# MossFormer2 WebGPU rewrite

The published `mossformer2_ss_16k.onnx` has 289 Einsum nodes (equations with spaces and
`...`). ORT-web 1.24's WebGPU EP fails `createComputePipeline` on them in Safari
(first hit: `qk_offset_scale/Einsum`, `... d, h d -> ... h d`), so separation never ran.

`rewrite_model.py` replaces every Einsum with Unsqueeze/Mul/Transpose/Reshape/MatMul and
every PRelu (73) with Less/Mul/Where. `verify_rewrite.py` checks parity on ORT CPU.

```sh
uv venv venv && uv pip install -p venv/bin/python onnx onnxruntime numpy
M="$HOME/Library/Application Support/OrchestratorAI/exchange/echo-eval"
venv/bin/python rewrite_model.py "$M/sep-model/mossformer2_ss_16k.onnx" "$M/sep-model/mossformer2_ss_16k.webgpu.onnx"
venv/bin/python verify_rewrite.py "$M/sep-model/mossformer2_ss_16k.onnx" "$M/sep-model/mossformer2_ss_16k.webgpu.onnx" "$M/corpus"
```

The app loads the rewrite (never committed) from `NEXT_PUBLIC_MOSSFORMER2_URL`, default
`/models/mossformer2-ss-16k/mossformer2_ss_16k.webgpu.onnx` (gitignored `public/models/`):

```sh
mkdir -p public/models/mossformer2-ss-16k
cp "$M/sep-model/mossformer2_ss_16k.webgpu.onnx"* public/models/mossformer2-ss-16k/
```
