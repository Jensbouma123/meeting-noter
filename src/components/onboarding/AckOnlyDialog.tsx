import { useState } from 'react';
import { Button, Modal } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { setAckAccepted } from '@/lib/onboarding/store';
import { AckStep } from './AckStep';

export function AckOnlyDialog() {
  const t = useT('onboarding');
  const [accepted, setAccepted] = useState(false);
  return (
    <Modal
      open
      onClose={() => {}}
      size="lg"
      title={t('ack.title')}
      footer={
        <div className="dialog-actions flex w-full justify-end">
          <Button variant="primary" size={{ base: 'md', md: 'sm' }} disabled={!accepted}
            onClick={() => setAckAccepted(true)} className="w-full sm:w-auto">
            {t('next')}
          </Button>
        </div>
      }
    >
      <AckStep checked={accepted} onChange={setAccepted} />
    </Modal>
  );
}
