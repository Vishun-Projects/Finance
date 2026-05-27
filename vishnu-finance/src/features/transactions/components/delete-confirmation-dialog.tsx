'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeleteConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
  count: number;
  filters?: {
    bankCode?: string;
    transactionType?: string;
    startDate?: string;
    endDate?: string;
  };
  actionType?: 'delete' | 'restore';
}

export default function DeleteConfirmationDialog({
  open,
  onClose,
  onConfirm,
  deleting,
  count,
  filters,
  actionType = 'delete',
}: DeleteConfirmationDialogProps) {
  const hasFilters = filters && Object.values(filters).some(v => v);
  const isRestore = actionType === 'restore';

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isRestore ? 'Confirm Restore' : 'Confirm Deletion'}</AlertDialogTitle>
          <AlertDialogDescription>
            {isRestore ? (
              <>
                You are about to restore <strong>{count}</strong> transaction(s). 
                Restored transactions will be visible again in your income, expenses, dashboard, and health pages.
              </>
            ) : (
              <>
                You are about to delete <strong>{count}</strong> transaction(s). 
                This will mark them as deleted (soft delete). Deleted transactions can be restored later from the manage transactions page.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {hasFilters && (
          <div className="p-3 bg-muted rounded-md space-y-1 text-sm">
            <p className="font-semibold">Applied filters:</p>
            {filters.bankCode && (
              <p>Bank: {filters.bankCode}</p>
            )}
            {filters.transactionType && (
              <p>Type: {filters.transactionType}</p>
            )}
            {filters.startDate && (
              <p>Start Date: {new Date(filters.startDate).toLocaleDateString()}</p>
            )}
            {filters.endDate && (
              <p>End Date: {new Date(filters.endDate).toLocaleDateString()}</p>
            )}
          </div>
        )}
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={deleting}
            className={isRestore 
              ? "bg-primary text-primary-foreground hover:bg-primary/90" 
              : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            }
          >
            {deleting 
              ? (isRestore ? 'Restoring...' : 'Deleting...') 
              : (isRestore ? 'Confirm Restore' : 'Confirm Delete')
            }
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

