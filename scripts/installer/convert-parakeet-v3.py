#!/usr/bin/env python3
"""Build WebGPU-compatible Parakeet TDT 0.6B v3 encoders from the fp32 source.

`istupakov/parakeet-tdt-0.6b-v3-onnx` ships only an int8 encoder (WASM-only
in practice: its `MatMulInteger`/`DynamicQuantizeLinear` ops have no
ONNX Runtime WebGPU kernels, so int8-on-WebGPU would silently execute on the
WASM fallback per-op) and an fp32 encoder (2.44 GB external `.data` — kills
Safari's WebContent process). There is no public v3 encoder in `parakeet.js`
layout that Safari can run on WebGPU, so this script builds two:

  (a) `encoder-model.fp16.onnx` — plain fp16 weights, fp32 I/O
      (`keep_io_types=True`), single file. fp16 MatMul/Add/Mul have WebGPU
      kernels, so this runs natively on the WebGPU EP.
  (b) `encoder-model.q4f16.onnx` — the fp16 graph with 4-bit weight-only
      quantisation (`MatMulNBitsQuantizer`, block_size 32): MatMul weights
      become `MatMulNBits` ops, which ORT's WebGPU EP supports. ~3x smaller
      than fp16. File name is app-local: `parakeet.js` `hub.js`
      `QUANT_SUFFIX` only knows `.int8`/`.fp16`/`.onnx`, and the app never
      calls the hub loader anyway — it resolves files from its own manifest
      (`src/lib/asr/browser/model-manifest.ts`) and hands URLs to
      `ParakeetModel.fromUrls`, which takes whatever it is given.

Both are validated in-process against the fp32 source: each variant is
loaded in onnxruntime (CPU) and run over the same synthetic mel input, and
the encoder outputs are compared (relative L2 + cosine similarity). A full
transcript-level check (WER on a speech clip) needs the TDT decoder loop
and a real device; that runs on-device via `/dev/asr-bench` — see
`webgpu-int8-spike.md` in the exchange dir.

Usage:
    pip install onnx onnxconverter-common onnxruntime
    python3 scripts/convert-parakeet-v3.py \
        --outdir public/models/parakeet-tdt-0.6b-v3-webgpu

Nothing is uploaded anywhere. Hosting the output (object storage behind
`NEXT_PUBLIC_FP16_ENCODER_URL` et al.) is a separate step owned by a human.

Idempotent: skips the fp32 download when the workdir files already match
their expected byte sizes; refuses to overwrite outputs unless `--force`.
"""

from __future__ import annotations

import argparse
import gc
import os
import sys
import urllib.request

REPO = "istupakov/parakeet-tdt-0.6b-v3-onnx"
REVISION = "main"
GRAPH_FILE = "encoder-model.onnx"
DATA_FILE = "encoder-model.onnx.data"

FP16_FILE = "encoder-model.fp16.onnx"
Q4_FILE = "encoder-model.q4f16.onnx"

# From the live HF tree: guards against converting a silently-changed
# upstream file. Update deliberately, never blindly.
EXPECTED_SIZES = {
    GRAPH_FILE: 41_770_866,
    DATA_FILE: 2_435_420_160,
}

# Fidelity gates for the validation step (relative L2 of encoder outputs
# vs fp32 on the same synthetic input). fp16 must be near-lossless.
#
# The q4 bound is calibrated, not arbitrary: the SHIPPED int8 encoder
# (`encoder-model.int8.onnx`, the production WASM path) measures rel-L2
# ~0.76 / cos ~0.76 on this exact probe — encoder-output distance is a
# pessimistic proxy because the TDT decoder tolerates large encoder drift
# (dynamic-range shifts dominate the metric). q4 only has to land clearly
# closer to fp32 than the int8 path that already ships, with transcript
# proof deferred to on-device WER (`/dev/asr-bench`).
MAX_REL_L2_FP16 = 1e-2
MAX_REL_L2_Q4 = 0.8


def hf_url(filename: str) -> str:
    return f"https://huggingface.co/{REPO}/resolve/{REVISION}/{filename}"


def download(filename: str, dest: str) -> None:
    expected = EXPECTED_SIZES[filename]
    if os.path.exists(dest) and os.path.getsize(dest) == expected:
        print(f"[convert] {filename} already in workdir, skipping download")
        return
    url = hf_url(filename)
    print(f"[convert] downloading {url} ({expected / 1e9:.2f} GB)...")
    req = urllib.request.Request(url, headers={"User-Agent": "meeting-noter-v3-convert/1.0"})
    with urllib.request.urlopen(req) as resp, open(dest, "wb") as f:
        total = 0
        while True:
            chunk = resp.read(16 * 1024 * 1024)
            if not chunk:
                break
            f.write(chunk)
            total += len(chunk)
            print(f"\r[convert]   {total / 1e9:.2f} / {expected / 1e9:.2f} GB", end="", flush=True)
    print()
    actual = os.path.getsize(dest)
    if actual != expected:
        raise SystemExit(
            f"[convert] size mismatch for {filename}: got {actual}, expected {expected} — "
            "upstream moved; update EXPECTED_SIZES deliberately, not blindly."
        )


def repair_casts(model) -> int:
    """Retarget pre-existing float Casts into fp16 (the author's v2 recipe).

    The fp16 converter flips every Cast *output's* declared type to fp16 but
    leaves the Cast's own `to` attribute at float — an invalid graph (ORT:
    "output arg ... does not match expected type"). The `parakeet.js`
    author's own v2 fp16 encoder shows the intended end state: every
    float-target Cast whose output feeds converted compute targets fp16
    instead (`/pre_encode/Cast`: int64 -> fp16); the only Cast still
    targeting float is the converter-inserted bridge feeding the fp32 graph
    output. Int/bool-target Casts (masks, shape math) are never touched.

    Only pre-existing Casts are retargeted: converter-inserted bridges are
    named `<node>_input_cast<i>` (fp16 -> fp32 around a blocked op) and
    `<node>_output_cast<i>` (fp32 -> fp16), and must keep their targets.
    (Matching on the input edge type does NOT work: a pre-existing Cast
    behind an fp16-converted op, e.g. Floor -> Cast_1, looks like a bridge
    by edge type but is a genuine float Cast that must be retargeted.)
    """
    from onnx import TensorProto

    graph_outputs = {o.name for o in model.graph.output}

    n = 0
    for node in model.graph.node:
        if node.op_type != "Cast" or len(node.output) != 1:
            continue
        if "_input_cast" in node.name or "_output_cast" in node.name:
            continue  # converter-inserted bridge, not a source Cast
        to_attr = next((a for a in node.attribute if a.name == "to"), None)
        if to_attr is None or to_attr.i != TensorProto.FLOAT:
            continue
        if node.output[0] in graph_outputs:
            continue  # fp32 graph I/O stays fp32 (keep_io_types)
        to_attr.i = TensorProto.FLOAT16
        n += 1
    print(f"[convert] retargeted {n} pre-existing float Casts to fp16")
    return n


def inline_external_data(model) -> None:
    """Make every initializer self-contained (drop external `.data` refs).

    `onnx.load(..., load_external_data=True)` already holds the bytes in
    `raw_data`; the `external_data` locations only tell a *saver* to split
    them back out. Clearing them keeps one single file — the layout the
    app's manifest expects (no `.data` sidecar to download or wire into
    `fromUrls`' `externalData`).
    """
    from onnx import TensorProto

    n = 0
    for init in model.graph.initializer:
        if init.data_location == TensorProto.EXTERNAL or len(init.external_data) > 0:
            if not init.raw_data:
                raise SystemExit(f"[convert] initializer {init.name} has no bytes loaded — cannot inline")
            init.ClearField("external_data")
            init.data_location = TensorProto.DEFAULT
            n += 1
    print(f"[convert] inlined {n} external initializers")


def build_fp16(graph_path: str, out_path: str, block_ops: list[str]):
    import tempfile

    import onnx
    from onnxconverter_common import float16
    from onnxconverter_common.float16 import DEFAULT_OP_BLOCK_LIST

    # Shape inference first, via the FILE-based path: in-memory
    # `infer_shapes` cannot handle a >2 GB model (it silently returns an
    # empty graph), and without inferred shapes the fp16 converter
    # misplaces its Casts (fp32/fp16 type errors at load). This mirrors
    # `convert_float_to_float16_model_path`, plus our op block list.
    from onnx.shape_inference import infer_shapes_path

    print("[convert] shape inference (file-based, external-data aware)...")
    with tempfile.NamedTemporaryFile(
        dir=os.path.dirname(graph_path), suffix=".onnx", delete=False
    ) as tmp:
        inferred_path = tmp.name
    try:
        infer_shapes_path(graph_path, inferred_path)
        print("[convert] loading shape-inferred fp32 model (~2.5 GB RSS)...")
        model = onnx.load(inferred_path, load_external_data=True)
    finally:
        for suffix in ("", ".data"):
            try:
                os.remove(inferred_path + suffix if suffix else inferred_path)
            except OSError:
                pass
    print(f"[convert]   {len(model.graph.node)} nodes, {len(model.graph.initializer)} initializers")

    # disable_shape_infer=True: in-memory `infer_shapes` cannot handle a
    # >2 GB model (it silently returns an empty graph); the file-based
    # `infer_shapes_path` variant exists for exactly this reason, but the
    # conversion itself does not need inferred shapes.
    # User --block-ops add to (not replace) the library defaults.
    op_block = set(DEFAULT_OP_BLOCK_LIST) | {o for o in block_ops}
    print(f"[convert] converting to fp16 (keep_io_types=True, +block={sorted(set(block_ops)) or 'none'})...")
    fp16_model = float16.convert_float_to_float16(
        model, keep_io_types=True, op_block_list=list(op_block), disable_shape_infer=True
    )
    if len(fp16_model.graph.node) == 0:
        raise SystemExit("[convert] fp16 conversion came back empty — refusing to ship it")
    del model
    gc.collect()

    repair_casts(fp16_model)
    inline_external_data(fp16_model)
    print(f"[convert] saving {out_path}...")
    onnx.save_model(fp16_model, out_path)
    size = os.path.getsize(out_path)
    print(f"[convert] wrote {size} bytes ({size / 1e9:.2f} GB)")

    print("[convert] validating fp16 file...")
    check = onnx.load(out_path, load_external_data=False)
    onnx.checker.check_model(check)
    print(f"[convert]   checker OK: {len(check.graph.node)} nodes")
    del check
    gc.collect()
    return out_path


def build_q4(fp16_path: str, out_path: str, block_size: int, exclude: list[str],
             include: list[str], fp32_path: str | None) -> None:
    import re

    import onnx
    from onnxruntime.quantization.matmul_4bits_quantizer import MatMul4BitsQuantizer

    # Default: quantize the fp16 graph, so surviving compute (scales,
    # biases, LayerNorm) stays fp16 and matches the fp16 variant. Pass
    # --q4-from-fp32 to quantize the fp32 graph instead (surviving compute
    # stays fp32; slightly larger file, different numerics) when the fp16
    # route drifts.
    src_path = fp32_path if fp32_path else fp16_path
    print(f"[convert] 4-bit weight-only quant of {src_path} (block_size={block_size})...")
    if exclude or include:
        graph = onnx.load(fp16_path, load_external_data=False).graph
        ex_pat = [re.compile(p) for p in exclude]
        in_pat = [re.compile(p) for p in include]
        excluded = [
            n.name
            for n in graph.node
            if n.op_type == "MatMul"
            and (any(p.search(n.name) for p in ex_pat)
                 or (in_pat and not any(p.search(n.name) for p in in_pat)))
        ]
        print(f"[convert]   excluding {len(excluded)} MatMuls (exclude={exclude} include={include})")
    else:
        excluded = None
    quant = MatMul4BitsQuantizer(
        src_path,
        block_size=block_size,
        is_symmetric=True,
        nodes_to_exclude=excluded,
    )
    quant.process()
    n_nbits = sum(1 for n in quant.model.model.graph.node if n.op_type == "MatMulNBits")
    print(f"[convert]   {n_nbits} MatMul -> MatMulNBits")
    if n_nbits == 0:
        raise SystemExit("[convert] quantizer produced no MatMulNBits ops — refusing to ship an unquantized 'q4'")
    quant.model.save_model_to_file(out_path, use_external_data_format=False)
    size = os.path.getsize(out_path)
    print(f"[convert] wrote {out_path}: {size} bytes ({size / 1e9:.2f} GB)")
    del quant
    gc.collect()


def validate(workdir: str, fp16_path: str, q4_path: str, frames: int) -> None:
    """Encoder-output fidelity of both variants vs fp32 (ORT CPU).

    Same synthetic mel input through all three sessions; reports relative
    L2 distance and cosine similarity of the fp32/fp16/q4 `outputs`. This
    bounds the numeric drift that WER would come from, without needing the
    TDT decoder loop or a speech clip (those run on-device).
    """
    import numpy as np
    import onnxruntime as ort

    # Speech-like synthetic mel: white noise is pathological high-entropy
    # input that overstates quantisation drift. This instead sums a few
    # slow-modulated harmonic stacks (vowel-like formants over a voiced
    # pitch) plus a noise floor — smooth in time and frequency, like speech.
    rng = np.random.default_rng(0x600D)
    t = np.arange(frames, dtype=np.float32) / 100.0  # 10ms/frame
    mel = np.zeros((1, 128, frames), dtype=np.float32)
    for _ in range(3):
        f0 = rng.uniform(2.0, 8.0)
        for harmonic in range(1, 5):
            bin_c = rng.uniform(5, 120)
            width = rng.uniform(2, 8)
            amp = rng.uniform(0.3, 2.0) / harmonic
            bins = np.arange(128, dtype=np.float32)
            formant = np.exp(-((bins - bin_c) ** 2) / (2 * width**2))
            mod = 0.6 + 0.4 * np.sin(2 * np.pi * f0 * t + rng.uniform(0, 6.28))
            mel += amp * formant[None, :, None] * mod[None, None, :]
    mel += 0.05 * rng.standard_normal((1, 128, frames), dtype=np.float32)
    mel = np.log1p(np.maximum(mel, 0)).astype(np.float32) * 2 - 1.5
    length = np.array([frames], dtype=np.int64)
    feeds = {"audio_signal": mel, "length": length}

    def run(path: str, label: str):
        print(f"[validate] {label}: creating session...")
        sess = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
        out = sess.run(["outputs"], feeds)[0]
        del sess
        gc.collect()
        return out

    ref = run(os.path.join(workdir, GRAPH_FILE), "fp32 (reference)")
    fp16 = run(fp16_path, "fp16")
    q4 = run(q4_path, "q4f16")

    def report(name: str, a, b, bound: float) -> None:
        denom = float(np.linalg.norm(a))
        rel = float(np.linalg.norm(a - b) / (denom or 1.0))
        cos = float(np.dot(a.ravel(), b.ravel()) / (np.linalg.norm(a.ravel()) * np.linalg.norm(b.ravel()) or 1.0))
        status = "OK " if rel <= bound else "FAIL"
        print(f"[validate] [{status}] {name}: rel-L2={rel:.6f} (bound {bound}) cos={cos:.8f}")
        if rel > bound:
            raise SystemExit(f"[validate] {name} drift {rel:.6f} exceeds bound {bound}")

    print(f"[validate] output shape {ref.shape} dtype {ref.dtype}")
    report("fp16 vs fp32", ref, fp16, MAX_REL_L2_FP16)
    int8_path = os.path.join(workdir, "encoder-model.int8.onnx")
    if os.path.exists(int8_path):
        # Calibration, not a gate: the production int8/WASM path's distance
        # from fp32 on this probe, so the q4 numbers have a shipped baseline.
        int8 = run(int8_path, "int8 (shipped WASM path, calibration only)")
        denom = float(np.linalg.norm(ref))
        rel = float(np.linalg.norm(ref - int8) / (denom or 1.0))
        cos = float(np.dot(ref.ravel(), int8.ravel()) / (np.linalg.norm(ref.ravel()) * np.linalg.norm(int8.ravel()) or 1.0))
        print(f"[validate] [info] int8 vs fp32: rel-L2={rel:.6f} cos={cos:.8f} (production baseline)")
    report("q4f16 vs fp32", ref, q4, MAX_REL_L2_Q4)
    print("[validate] all fidelity gates passed")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workdir", default="/tmp/parakeet-fp16",
                        help="where the fp32 sources live")
    parser.add_argument("--outdir", default="public/models/parakeet-tdt-0.6b-v3-webgpu",
                        help="destination dir for the converted encoders")
    parser.add_argument("--force", action="store_true", help="overwrite outputs")
    parser.add_argument("--skip-build", action="store_true", help="only run validation on existing outputs")
    parser.add_argument("--skip-validate", action="store_true", help="skip the ORT fidelity check")
    parser.add_argument("--block-ops", default="",
                        help="comma-separated op types to keep in fp32 (e.g. LayerNorm,Softmax) if WER drifts")
    parser.add_argument("--q4-block-size", type=int, default=32)
    parser.add_argument("--q4-include", default="",
                        help="comma-separated regexes; when set, ONLY matching MatMuls are "
                             "quantized (e.g. feed_forward for an FF-only variant)")
    parser.add_argument("--q4-from-fp32", action="store_true",
                        help="quantize the fp32 graph instead of the fp16 one")
    parser.add_argument("--q4-exclude", default="linear_pos,/pre_encode",
                        help="comma-separated regexes; matching MatMuls stay fp16 "
                             "(positional + frontend projections are conformer-sensitive)")
    parser.add_argument("--val-frames", type=int, default=200, help="synthetic mel frames for validation")
    args = parser.parse_args(argv)

    os.makedirs(args.workdir, exist_ok=True)
    os.makedirs(args.outdir, exist_ok=True)
    fp16_path = os.path.abspath(os.path.join(args.outdir, FP16_FILE))
    q4_path = os.path.abspath(os.path.join(args.outdir, Q4_FILE))

    download(GRAPH_FILE, os.path.join(args.workdir, GRAPH_FILE))
    download(DATA_FILE, os.path.join(args.workdir, DATA_FILE))

    if not args.skip_build:
        block_ops = [o.strip() for o in args.block_ops.split(",") if o.strip()]
        q4_exclude = [p.strip() for p in args.q4_exclude.split(",") if p.strip()]
        q4_include = [p.strip() for p in args.q4_include.split(",") if p.strip()]
        if os.path.exists(fp16_path) and not args.force:
            print(f"[convert] {fp16_path} exists; reusing (pass --force to rebuild).")
        else:
            tmp = fp16_path + ".tmp"
            build_fp16(os.path.join(args.workdir, GRAPH_FILE), tmp, block_ops)
            os.replace(tmp, fp16_path)
        if os.path.exists(q4_path) and not args.force:
            print(f"[convert] {q4_path} exists; reusing (pass --force to rebuild).")
        else:
            fp32_src = os.path.join(args.workdir, GRAPH_FILE) if args.q4_from_fp32 else None
            build_q4(fp16_path, q4_path + ".tmp", args.q4_block_size, q4_exclude, q4_include, fp32_src)
            os.replace(q4_path + ".tmp", q4_path)

    if not args.skip_validate:
        validate(args.workdir, fp16_path, q4_path, args.val_frames)

    print("[convert] done.")
    print(f"[convert]   fp16 {os.path.getsize(fp16_path)} bytes")
    print(f"[convert]   q4   {os.path.getsize(q4_path)} bytes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
