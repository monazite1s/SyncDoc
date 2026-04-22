'use client';

import { useRef } from 'react';
import { cn } from '@/lib/utils';

interface ResizableTableHeaderProps {
    label: string;
    width: number;
    minWidth?: number;
    maxWidth?: number;
    onResize: (nextWidth: number) => void;
    className?: string;
}

export function ResizableTableHeader({
    label,
    width,
    minWidth = 120,
    maxWidth = 600,
    onResize,
    className,
}: ResizableTableHeaderProps) {
    const startXRef = useRef(0);
    const startWidthRef = useRef(width);

    const handleResizeStart = (event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        startXRef.current = event.clientX;
        startWidthRef.current = width;

        const handlePointerMove = (moveEvent: MouseEvent) => {
            const delta = moveEvent.clientX - startXRef.current;
            const nextWidth = Math.min(Math.max(startWidthRef.current + delta, minWidth), maxWidth);
            onResize(nextWidth);
        };

        const handlePointerUp = () => {
            window.removeEventListener('mousemove', handlePointerMove);
            window.removeEventListener('mouseup', handlePointerUp);
        };

        window.addEventListener('mousemove', handlePointerMove);
        window.addEventListener('mouseup', handlePointerUp);
    };

    return (
        <div className={cn('group relative flex items-center h-10 px-3', className)}>
            <span className="truncate text-xs font-medium text-muted-foreground">{label}</span>
            <div
                role="separator"
                aria-orientation="vertical"
                onMouseDown={handleResizeStart}
                className={cn(
                    'absolute right-0 top-0 h-full w-2 cursor-col-resize',
                    'after:absolute after:right-0 after:top-2 after:h-6 after:w-px after:bg-border',
                    'group-hover:after:bg-primary/60'
                )}
            />
        </div>
    );
}
