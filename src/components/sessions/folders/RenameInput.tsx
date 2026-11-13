import { useState } from 'react';
import { Input } from '@jensbouma123/acciva-ui';
import type { RenameInputProps } from './types';

export function RenameInput({ initial, label, onDone, onCancel }: RenameInputProps) {
  const [value, setValue] = useState(initial);
  return (
    <div className="min-w-0 flex-1 py-0.5">
      <Input
        size="sm"
        value={value}
        autoFocus
        maxLength={200}
        aria-label={label}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => onDone(value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onDone(value);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
        }}
      />
    </div>
  );
}
