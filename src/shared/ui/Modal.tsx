import type { ComponentChildren } from 'preact';
import s from './ui.module.css';

interface ModalProps {
  children: ComponentChildren;
  onClose?: () => void;
}

export function Modal({ children, onClose }: ModalProps) {
  return (
    <div class={s.overlay} onClick={onClose}>
      <div class={s.modal} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
