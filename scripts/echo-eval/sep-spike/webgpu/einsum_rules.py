"""Einsum -> Unsqueeze/Mul/Transpose/Reshape/MatMul rewrites for the MossFormer2 graph.

ORT-web's WebGPU EP fails to create the compute pipeline for these Einsum nodes in
Safari, so every Einsum is replaced by ops the EP runs natively. Each rule gets the
node's input shapes from a CPU probe run (ranks are static; batch/group dims are not).
"""

import numpy as np
from onnx import helper, numpy_helper


class Builder:
    """Emits replacement nodes and int64 initializers with names unique to one Einsum."""

    def __init__(self, node, initializers):
        self.base = node.name or node.output[0]
        self.out = node.output[0]
        self.nodes = []
        self.initializers = initializers
        self.count = 0

    def _name(self, tag):
        self.count += 1
        return f"{self.base}/rw_{tag}_{self.count}"

    def const(self, values):
        name = self._name("const")
        self.initializers.append(numpy_helper.from_array(np.array(values, dtype=np.int64), name))
        return name

    def op(self, op_type, inputs, final=False, **attrs):
        name = self._name(op_type.lower())
        output = self.out if final else f"{name}_output"
        self.nodes.append(helper.make_node(op_type, inputs, [output], name=name, **attrs))
        return output

    def unsqueeze(self, x, axis):
        return self.op("Unsqueeze", [x, self.const([axis])])


def _outer(b, x, y, _shapes):
    """i,j->ij"""
    b.op("Mul", [b.unsqueeze(x, 1), b.unsqueeze(y, 0)], final=True)


def _scale_heads(b, x, y, _shapes):
    """...d,hd->...hd: x[..., 1, d] * y[h, d]"""
    b.op("Mul", [b.unsqueeze(x, -2), y], final=True)


def _outer_last(b, x, y, _shapes):
    """...,f->...f: x[..., 1] * y[f]"""
    b.op("Mul", [b.unsqueeze(x, -1), y], final=True)


def _qk(b, x, y, shapes):
    """...id,...jd->...ij: x @ y^T"""
    rank = len(shapes[1])
    perm = list(range(rank - 2)) + [rank - 1, rank - 2]
    b.op("MatMul", [x, b.op("Transpose", [y], perm=perm)], final=True)


def _av(b, x, y, _shapes):
    """...ij,...jd->...id: x @ y"""
    b.op("MatMul", [x, y], final=True)


def _kv_sum(b, x, y, shapes):
    """bgnd,bgne->bde: x[b, gn, d]^T @ y[b, gn, e]"""
    d, e = shapes[0][3], shapes[1][3]
    xt = b.op("Transpose", [b.op("Reshape", [x, b.const([0, -1, d])])], perm=[0, 2, 1])
    b.op("MatMul", [xt, b.op("Reshape", [y, b.const([0, -1, e])])], final=True)


def _q_kv(b, x, y, _shapes):
    """bgnd,bde->bgne: x[b, g, n, d] @ y[b, 1, d, e]"""
    b.op("MatMul", [x, b.unsqueeze(y, 1)], final=True)


RULES = {
    "i,j->ij": (_outer, (1, 1)),
    "...d,hd->...hd": (_scale_heads, (None, 2)),
    "...,f->...f": (_outer_last, (None, 1)),
    "...id,...jd->...ij": (_qk, (None, None)),
    "...ij,...jd->...id": (_av, (None, None)),
    "bgnd,bgne->bde": (_kv_sum, (4, 4)),
    "bgnd,bde->bgne": (_q_kv, (4, 3)),
}


def equation_of(node):
    raw = next(a.s.decode() for a in node.attribute if a.name == "equation")
    return raw.replace(" ", "")


def rewrite_einsum(node, shapes, initializers):
    """Returns the nodes replacing one Einsum; raises on an equation or rank it cannot map."""
    eq = equation_of(node)
    if eq not in RULES:
        raise ValueError(f"{node.name}: no rewrite for Einsum '{eq}'")
    rule, ranks = RULES[eq]
    for want, shape in zip(ranks, shapes):
        if want is not None and len(shape) != want:
            raise ValueError(f"{node.name}: '{eq}' expects rank {want}, probe saw {shape}")
    b = Builder(node, initializers)
    rule(b, node.input[0], node.input[1], shapes)
    return b.nodes


def rewrite_prelu(node, initializers):
    """PRelu(x, s) = Where(x < 0, x * s, x): exact, and every op has a WebGPU kernel."""
    b = Builder(node, initializers)
    x, slope = node.input
    zero = b.op("Cast", [b.const(0)], to=1)
    neg = b.op("Less", [x, zero])
    b.op("Where", [neg, b.op("Mul", [x, slope]), x], final=True)
    return b.nodes
