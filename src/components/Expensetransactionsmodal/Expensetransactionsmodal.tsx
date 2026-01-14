import { useState } from 'react';
import { useDeleteExpenseTransactionMutation } from '@/services/api';
import { Modal } from '@/components/Modal/Modal';
import styles from './Expensetransactionsmodal.module.scss';

interface ExpenseTransaction {
  id: string;
  amount: number;
  description: string | null;
  transaction_date: string;
  category_id: string;
}

interface ExpenseTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  categoryIcon: string;
  transactions: ExpenseTransaction[];
}

export const ExpenseTransactionsModal = ({
  isOpen,
  onClose,
  categoryName,
  categoryIcon,
  transactions,
}: ExpenseTransactionsModalProps) => {
  const [deleteTransaction] = useDeleteExpenseTransactionMutation();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const handleDelete = async (transactionId: string) => {
    setDeletingId(transactionId);
    try {
      await deleteTransaction(transactionId).unwrap();
      // Добавляем ID в список удалённых для локального обновления UI
      setDeletedIds((prev) => new Set([...prev, transactionId]));
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      alert('Ошибка при удалении транзакции');
    } finally {
      setDeletingId(null);
    }
  };

  // Фильтруем удалённые транзакции локально
  const visibleTransactions = transactions.filter((t) => !deletedIds.has(t.id));
  const totalAmount = visibleTransactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${categoryIcon} ${categoryName} - Транзакции`}
    >
      <div className={styles.container}>
        {visibleTransactions.length === 0 ? (
          <div className={styles.empty}>
            <p>Нет транзакций</p>
          </div>
        ) : (
          <>
            <div className={styles.transactionsList}>
              {visibleTransactions.map((transaction) => (
                <div key={transaction.id} className={styles.transactionItem}>
                  <div className={styles.transactionInfo}>
                    <div className={styles.transactionAmount}>
                      {transaction.amount.toLocaleString('ru-RU')} ₽
                    </div>
                    {transaction.description && (
                      <div className={styles.transactionDescription}>
                        {transaction.description}
                      </div>
                    )}
                    <div className={styles.transactionDate}>
                      {new Date(
                        transaction.transaction_date
                      ).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(transaction.id)}
                    disabled={deletingId === transaction.id}
                    className={styles.deleteBtn}
                    title="Удалить транзакцию"
                  >
                    {deletingId === transaction.id ? '⏳' : '🗑️'}
                  </button>
                </div>
              ))}
            </div>

            <div className={styles.footer}>
              <div className={styles.total}>
                <span className={styles.totalLabel}>Итого:</span>
                <span className={styles.totalAmount}>
                  {totalAmount.toLocaleString('ru-RU')} ₽
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
