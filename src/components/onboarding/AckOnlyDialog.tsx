import { useState } from 'react';
import { Button, Modal } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { isAckAccepted, isAutoCloseAccepted, setAckAccepted, setAutoCloseAccepted } from '@/lib/onboarding/store';
import { AckStep } from './AckStep';
import { AutoCloseStep } from './AutoCloseStep';

export function AckOnlyDialog() {
  const t = useT('onboarding');
  const [needAck] = useState(() => !isAckAccepted());
  const [needAutoClose] = useState(() => !isAutoCloseAccepted());
  const [ack, setAck] = useState(false);
  const [autoClose, setAutoClose] = useState(false);
  const ready = (!needAck || ack) && (!needAutoClose || autoClose);
  const confirm = () => {
    if (needAck) setAckAccepted(true);
    if (needAutoClose) setAutoCloseAccepted(true);
  };
  return (
    <Modal
      open
      onClose={() => {}}
      size="lg"
      title={t(needAck ? 'ack.title' : 'autoclose.title')}
      footer={
        <div className="dialog-actions flex w-full justify-end">
          <Button variant="primary" size={{ base: 'md', md: 'sm' }} disabled={!ready}
            onClick={confirm} className="w-full sm:w-auto">
            {t('next')}
          </Button>
        </div>
      }
    >
      <div className="flex w-full flex-col gap-4">
        {needAck && <AckStep checked={ack} onChange={setAck} />}
        {needAutoClose && <AutoCloseStep checked={autoClose} onChange={setAutoClose} />}
      </div>
    </Modal>
  );
}
