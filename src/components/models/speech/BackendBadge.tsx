import { Cpu, Zap } from 'lucide-react';
import { Badge, Tooltip } from '@jensbouma123/acciva-ui';
import type { AsrBackend } from '@/lib/asr/browser';
import { useT } from '@/lib/i18n/useT';

export function BackendBadge({ backend }: { backend: AsrBackend }) {
  const t = useT('models');
  const webgpu = backend === 'webgpu';
  const Icon = webgpu ? Zap : Cpu;
  return (
    <Tooltip content={t(webgpu ? 'tooltip.gpu' : 'tooltip.cpu')}>
      <Badge variant="neutral" size="sm">
        <Icon className="size-3" aria-hidden="true" />
        {webgpu ? 'GPU' : 'CPU'}
      </Badge>
    </Tooltip>
  );
}
