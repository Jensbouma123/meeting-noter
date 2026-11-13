import noComments from "./no-comments.mjs";
import oneUnitPerFile from "./one-unit-per-file.mjs";
import typesInOwnFiles from "./types-in-own-files.mjs";

export default {
  rules: {
    "no-comments": noComments,
    "one-unit-per-file": oneUnitPerFile,
    "types-in-own-files": typesInOwnFiles,
  },
};
