"""Rewrite MossFormer2's Einsum and PRelu nodes so ORT-web's WebGPU EP can run the graph.

usage: python rewrite_model.py IN.onnx OUT.onnx
Writes OUT.onnx plus OUT.onnx.sha256 (the sidecar the app's revision pin reads).
"""

import hashlib
import sys

import numpy as np
import onnx
import onnxruntime as ort

from einsum_rules import rewrite_einsum, rewrite_prelu

PROBE_SAMPLES = 2048 * 20 + 8


def probe_shapes(model, names):
    """Runs the model once on CPU and returns the runtime shape of every named tensor."""
    probe = onnx.ModelProto()
    probe.CopyFrom(model)
    inits = {i.name: tuple(i.dims) for i in probe.graph.initializer}
    wanted = [n for n in sorted(names) if n not in inits]
    for name in wanted:
        probe.graph.output.append(onnx.helper.make_empty_tensor_value_info(name))
    opts = ort.SessionOptions()
    opts.log_severity_level = 3
    sess = ort.InferenceSession(probe.SerializeToString(), opts, providers=["CPUExecutionProvider"])
    mix = (np.sin(np.arange(PROBE_SAMPLES) / 7) * 0.1).astype(np.float32)[None]
    outs = sess.run(wanted, {"mix": mix})
    return {**inits, **{n: v.shape for n, v in zip(wanted, outs)}}


def rewrite(model):
    graph = model.graph
    einsums = [n for n in graph.node if n.op_type == "Einsum"]
    shapes = probe_shapes(model, {i for n in einsums for i in n.input})
    new_inits = []
    nodes = []
    counts = {"Einsum": 0, "PRelu": 0}
    for node in graph.node:
        if node.op_type == "Einsum":
            nodes.extend(rewrite_einsum(node, [shapes[i] for i in node.input], new_inits))
        elif node.op_type == "PRelu":
            nodes.extend(rewrite_prelu(node, new_inits))
        else:
            nodes.append(node)
            continue
        counts[node.op_type] += 1
    del graph.node[:]
    graph.node.extend(nodes)
    graph.initializer.extend(new_inits)
    onnx.checker.check_model(model)
    return counts


def main(src, dst):
    model = onnx.load(src)
    counts = rewrite(model)
    left = sorted({n.op_type for n in model.graph.node} & {"Einsum", "PRelu"})
    if left:
        raise SystemExit(f"still present after rewrite: {left}")
    onnx.save(model, dst)
    with open(dst, "rb") as f:
        digest = hashlib.sha256(f.read()).hexdigest()
    with open(f"{dst}.sha256", "w") as f:
        f.write(f"{digest}\n")
    print(f"rewrote {counts}; wrote {dst} sha256={digest}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
