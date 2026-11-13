import path from 'node:path';
import { sandbox, writeExecutable } from './sandbox';

export function fakeMac({ version = '15.1', arm64 = '1' } = {}) {
  writeExecutable(path.join(sandbox.shims, 'sw_vers'), `#!/bin/sh\necho ${version}\n`);
  writeExecutable(path.join(sandbox.shims, 'sysctl'), `#!/bin/sh\ncase "$*" in *hw.memsize*) echo 17179869184 ;; *) echo ${arm64} ;; esac\n`);
}
