import path from 'node:path';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { repoRoot } from './repo-root.mjs';

register(
  `data:text/javascript,${encodeURIComponent(`
    import fs from 'node:fs';
    import { fileURLToPath, pathToFileURL } from 'node:url';
    const src = ${JSON.stringify(pathToFileURL(path.join(repoRoot, 'src/')).href)};
    export async function resolve(spec, ctx, next) {
      let s = spec.startsWith('@/') ? src + spec.slice(2) : spec;
      if ((s.startsWith('.') || s.startsWith('file:')) && !/\\.[cm]?[jt]s$/.test(s)) {
        const url = new URL(s, ctx.parentURL);
        if (fs.existsSync(fileURLToPath(url) + '.ts')) s = url.href + '.ts';
      }
      return next(s, ctx);
    }
  `)}`,
);
