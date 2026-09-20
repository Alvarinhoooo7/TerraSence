import React, { useContext, useEffect, useRef } from 'react';
import { Modal, type ModalProps } from 'react-native';
import { ScreenGuide } from './ScreenGuide';
import { GuideContext } from './GuideContext';

function BackBridge({ handler, children }: React.PropsWithChildren<{ handler: React.RefObject<(() => boolean) | null> }>) {
  const context = useContext(GuideContext);
  useEffect(() => {
    handler.current = () => { if (!context?.active) return false; context.close(); return true; };
    return () => { handler.current = null; };
  }, [handler, context]);
  return <>{children}</>;
}

/** Android deriva Atrás a Modal.onRequestClose, no a BackHandler. */
export function GuideModal({ children, onRequestClose, ...props }: ModalProps) {
  const handler = useRef<(() => boolean) | null>(null);
  return <Modal {...props} onRequestClose={event => { if (!handler.current?.()) onRequestClose?.(event); }}>
    <ScreenGuide scope={String(props.visible)}><BackBridge handler={handler}>{children}</BackBridge></ScreenGuide>
  </Modal>;
}
