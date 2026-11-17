import { Modal } from '@jensbouma123/acciva-ui';
import type { OnboardingModalProps } from './types';

const HIDE_CLOSE_BUTTON = '[&_[data-dialog-close]]:hidden';

export function OnboardingModal({ closable, onClose, className, ...rest }: OnboardingModalProps) {
  return (
    <Modal
      {...rest}
      open
      onClose={closable && onClose ? onClose : () => {}}
      className={[className, closable ? '' : HIDE_CLOSE_BUTTON].filter(Boolean).join(' ')}
    />
  );
}
