import type { ReactElement, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ConfirmationDialogProps {
  trigger: ReactElement;
  icon?: ReactNode;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmationDialog({
  trigger,
  icon,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
  onConfirm,
}: ConfirmationDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent className="p-0 gap-0 overflow-hidden border-border/40 shadow-xl shadow-foreground/5 sm:max-w-[425px]">
        <div className="bg-background p-6">
          <AlertDialogHeader className="sm:text-left space-y-0 text-left">
            <AlertDialogTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground mb-1.5">
              {icon}
              {title}
            </AlertDialogTitle>
            {description && (
              <AlertDialogDescription className="text-muted-foreground">
                {description}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
        </div>
        <div className="bg-secondary/40 px-6 py-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end border-t border-border/40">
          <AlertDialogCancel 
            className="cursor-pointer rounded-full bg-background hover:bg-muted border-border/50 text-foreground m-0" 
            disabled={loading}
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction 
            className={cn(
              "cursor-pointer rounded-full m-0",
              variant === 'destructive' 
                ? "bg-destructive/15 text-destructive hover:bg-destructive/25 hover:text-destructive border-transparent shadow-none" 
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={loading}
          >
            {loading ? '...' : confirmText}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
