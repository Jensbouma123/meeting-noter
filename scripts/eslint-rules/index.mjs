import noComments from "./no-comments.mjs";
import oneUnitPerFile from "./one-unit-per-file.mjs";
import typesInOwnFiles from "./types-in-own-files.mjs";

const plugin = {
  rules: {
    "no-comments": noComments,
    "one-unit-per-file": oneUnitPerFile,
    "types-in-own-files": typesInOwnFiles,
  },
};

export default plugin;
