'use client';

import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DeleteDocumentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    documentTitle: string;
    onConfirm: () => Promise<void>;
}

export function DeleteDocumentDialog({
    open,
    onOpenChange,
    documentTitle,
    onConfirm,
}: DeleteDocumentDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleConfirm = async () => {
        try {
            setIsDeleting(true);
            await onConfirm();
            onOpenChange(false);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        <DialogTitle>确认删除</DialogTitle>
                    </div>
                    <DialogDescription className="pt-2">
                        确定要删除文档「{documentTitle}」吗？此操作无法撤销。
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isDeleting}
                    >
                        取消
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => void handleConfirm()}
                        disabled={isDeleting}
                    >
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        删除
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
