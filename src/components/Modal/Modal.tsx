import { ReactNode, useEffect } from 'react';
import styles from './Modal.module.scss';

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  title?: string;
  isOpen: boolean;
}

export const Modal = ({ children, onClose, title, isOpen }: ModalProps) => {
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
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          <button onClick={onClose} className={styles.closeButton}>
            ✕
          </button>
        </div>
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
};
