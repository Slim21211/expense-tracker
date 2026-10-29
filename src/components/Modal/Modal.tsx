import { ReactNode, useEffect, useRef } from 'react';
import { Icon } from '@/components/Icon/Icon';
import styles from './Modal.module.scss';

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  title?: string;
  isOpen: boolean;
}

export const Modal = ({ children, onClose, title, isOpen }: ModalProps) => {
  const backdropRef = useRef<HTMLDivElement>(null);

  // Экранная клавиатура на iOS не уменьшает окно, а перекрывает его:
  // подгоняем подложку под видимую часть экрана, чтобы шторка стояла над клавиатурой
  useEffect(() => {
    const viewport = window.visualViewport;
    const backdrop = backdropRef.current;
    if (!viewport || !backdrop) return;

    const fit = () => {
      backdrop.style.top = `${viewport.offsetTop}px`;
      backdrop.style.height = `${viewport.height}px`;
    };
    fit();
    viewport.addEventListener('resize', fit);
    viewport.addEventListener('scroll', fit);
    return () => {
      viewport.removeEventListener('resize', fit);
      viewport.removeEventListener('scroll', fit);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div ref={backdropRef} className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Закрыть"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
};
