import type { Transaction } from "@/api/types";
import { Button } from "@/ui/button";

type TransactionRowActionsProps = {
  transaction: Transaction;
  restoringId: string | null;
  onEdit: (transaction: Transaction) => void;
  onArchive: (transaction: Transaction) => void;
  onRestore: (transactionId: string) => void;
};

export default function TransactionRowActions({
  transaction,
  restoringId,
  onEdit,
  onArchive,
  onRestore
}: TransactionRowActionsProps) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => onEdit(transaction)}>
        Edit
      </Button>
      {transaction.archived_at ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={restoringId === transaction.id}
          onClick={() => onRestore(transaction.id)}
        >
          {restoringId === transaction.id ? "Restoring..." : "Restore"}
        </Button>
      ) : (
        <Button type="button" size="sm" onClick={() => onArchive(transaction)}>
          Archive
        </Button>
      )}
    </div>
  );
}
