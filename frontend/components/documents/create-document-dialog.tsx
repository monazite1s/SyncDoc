'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { createDocumentSchema, type CreateDocumentFormData } from '@/lib/validations/document';

interface CreateDocumentDialogProps {
    trigger: React.ReactNode;
    onSubmit: (data: CreateDocumentFormData) => Promise<void>;
}

export function CreateDocumentDialog({ trigger, onSubmit }: CreateDocumentDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<CreateDocumentFormData>({
        resolver: zodResolver(createDocumentSchema),
        defaultValues: {
            title: '',
            description: '',
        },
    });

    const handleSubmit = async (data: CreateDocumentFormData) => {
        try {
            setIsSubmitting(true);
            await onSubmit(data);
            form.reset();
            setOpen(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>新建文档</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form
                        onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}
                        className="space-y-4"
                    >
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>标题</FormLabel>
                                    <FormControl>
                                        <Input placeholder="输入文档标题" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>描述 (可选)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="输入文档描述" rows={3} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                取消
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                创建
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
