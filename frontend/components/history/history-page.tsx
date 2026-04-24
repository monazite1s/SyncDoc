'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    AlertTriangle,
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Loader2,
    RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { versionsApi } from '@/lib/api/versions';
import { documentsApi } from '@/lib/api/documents';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { VersionTimeline } from './version-timeline';
import { VersionPreview } from './version-preview';
import { VersionType } from '@collab/types';
import type { DocumentVersionItem } from '@collab/types';
import { format, isToday, isYesterday } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface HistoryPageProps {
    paramsPromise: Promise<{ id: string }>;
}

type HistoryPageState =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready' };

interface VersionListState {
    items: Awaited<ReturnType<typeof versionsApi.list>>['data']['items'];
    page: number;
    total: number;
    hasMore: boolean;
}

function formatVersionLabel(item: DocumentVersionItem): string {
    const typeLabel =
        item.type === VersionType.MANUAL
            ? '手动保存'
            : item.type === VersionType.RESTORE
              ? '版本恢复'
              : '自动保存';
    const date = new Date(item.createdAt);
    let dateLabel: string;
    if (isToday(date)) {
        dateLabel = `今天 ${format(date, 'HH:mm')}`;
    } else if (isYesterday(date)) {
        dateLabel = `昨天 ${format(date, 'HH:mm')}`;
    } else {
        dateLabel = format(date, 'M月d日 HH:mm', { locale: zhCN });
    }
    const note = item.changeLog ? `"${item.changeLog}"` : null;
    return note ? `${typeLabel} · ${dateLabel} · ${note}` : `${typeLabel} · ${dateLabel}`;
}

export default function HistoryPage({ paramsPromise }: HistoryPageProps) {
    const router = useRouter();
    const { id: documentId } = use(paramsPromise);
    const [pageState, setPageState] = useState<HistoryPageState>({ status: 'loading' });
    const [documentTitle, setDocumentTitle] = useState<string>('历史版本');
    const [listState, setListState] = useState<VersionListState>({
        items: [],
        page: 1,
        total: 0,
        hasMore: false,
    });
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [typeFilter, setTypeFilter] = useState<VersionType | 'ALL'>('ALL');
    const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
    const [showDiff, setShowDiff] = useState(true);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState<
        Awaited<ReturnType<typeof versionsApi.get>>['data'] | null
    >(null);

    const filteredItems = useMemo(() => {
        if (typeFilter === 'ALL') return listState.items;
        return listState.items.filter((item) => item.type === typeFilter);
    }, [listState.items, typeFilter]);

    const restoreTargetVersion = selectedVersion;
    const selectedVersionIndex = useMemo(() => {
        if (!selectedVersion) return -1;
        return filteredItems.findIndex((item) => item.version === selectedVersion);
    }, [filteredItems, selectedVersion]);
    const selectedVersionCount = filteredItems.length;

    const restoreTargetMeta = useMemo(() => {
        if (!restoreTargetVersion) return null;
        return listState.items.find((item) => item.version === restoreTargetVersion) ?? null;
    }, [restoreTargetVersion, listState.items]);

    const fetchVersions = useCallback(
        async (page: number, append: boolean) => {
            const response = await versionsApi.list(documentId, page, 20);
            const { items, total, limit } = response.data;
            setListState((prev) => {
                const nextItems = append ? [...prev.items, ...items] : items;
                const dedupedMap = new Map(nextItems.map((item) => [item.version, item]));
                const deduped = Array.from(dedupedMap.values()).sort(
                    (a, b) => b.version - a.version
                );
                return { items: deduped, page, total, hasMore: page * limit < total };
            });
            return items;
        },
        [documentId]
    );

    useEffect(() => {
        let cancelled = false;

        async function loadInitialData() {
            try {
                const [versionsRes, docRes] = await Promise.all([
                    versionsApi.list(documentId, 1, 20),
                    documentsApi.getById(documentId).catch(() => null),
                ]);
                if (cancelled) return;

                if (docRes?.data?.title) {
                    setDocumentTitle(docRes.data.title);
                }

                const { items, total, limit } = versionsRes.data;
                setListState({ items, page: 1, total, hasMore: limit < total });
                const defaultVersion = items[0]?.version ?? null;
                setSelectedVersion(defaultVersion);
                setPageState({ status: 'ready' });
            } catch (error) {
                if (cancelled) return;
                const message = error instanceof Error ? error.message : '加载历史版本失败';
                setPageState({ status: 'error', message });
                toast.error(message);
            }
        }

        void loadInitialData();

        return () => {
            cancelled = true;
        };
    }, [documentId]);

    useEffect(() => {
        let cancelled = false;
        async function loadSelectedData() {
            setSelectedDetail(null);

            if (!selectedVersion) return;

            try {
                setIsPreviewLoading(true);
                const response = await versionsApi.get(documentId, selectedVersion);
                if (!cancelled) setSelectedDetail(response.data);
            } catch (error) {
                if (!cancelled) {
                    const message = error instanceof Error ? error.message : '加载版本内容失败';
                    toast.error(message);
                }
            } finally {
                if (!cancelled) {
                    setIsPreviewLoading(false);
                }
            }
        }
        void loadSelectedData();
        return () => {
            cancelled = true;
        };
    }, [documentId, selectedVersion]);

    const handleSelectVersion = (version: number) => {
        setSelectedVersion((prev) => (prev === version ? null : version));
    };

    const handleLoadMore = async () => {
        if (!listState.hasMore || isLoadingMore) return;
        try {
            setIsLoadingMore(true);
            await fetchVersions(listState.page + 1, true);
        } catch (error) {
            const message = error instanceof Error ? error.message : '加载更多失败';
            toast.error(message);
        } finally {
            setIsLoadingMore(false);
        }
    };

    const handleSelectPrev = () => {
        if (selectedVersionIndex <= 0) return;
        const next = filteredItems[selectedVersionIndex - 1];
        if (next) {
            setSelectedVersion(next.version);
        }
    };

    const handleSelectNext = () => {
        if (selectedVersionIndex < 0 || selectedVersionIndex >= filteredItems.length - 1) return;
        const next = filteredItems[selectedVersionIndex + 1];
        if (next) {
            setSelectedVersion(next.version);
        }
    };

    const handleRestore = async () => {
        if (!restoreTargetVersion) return;
        setRestoreConfirmOpen(false);

        try {
            setIsRestoring(true);
            await versionsApi.restore(documentId, restoreTargetVersion);
            toast.success('已成功恢复至历史版本，建议刷新编辑器以同步最新内容');
            await fetchVersions(1, false);
            setSelectedVersion(restoreTargetVersion);
        } catch (error) {
            const message = error instanceof Error ? error.message : '恢复版本失败';
            toast.error(message);
        } finally {
            setIsRestoring(false);
        }
    };

    if (pageState.status === 'loading') {
        return null;
    }

    if (pageState.status === 'error') {
        return (
            <div className="h-screen flex flex-col items-center justify-center gap-4 text-center p-8 bg-background">
                <p className="text-lg font-medium">加载失败</p>
                <p className="text-sm text-muted-foreground">{pageState.message}</p>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => router.push('/documents')}>
                        返回文档列表
                    </Button>
                    <Button onClick={() => void window.location.reload()}>重试</Button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="h-screen flex bg-background">
                <div className="flex-1 min-w-0 flex flex-col">
                    <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 flex-shrink-0"
                                onClick={() => router.push(`/documents/${documentId}`)}
                                title="返回查看页"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div className="min-w-0">
                                <h1 className="text-sm font-semibold truncate">{documentTitle}</h1>
                                <p className="text-xs text-muted-foreground">历史版本</p>
                            </div>
                        </div>
                        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                            <span>
                                编辑记录 {selectedVersionIndex >= 0 ? selectedVersionIndex + 1 : 0}/
                                {selectedVersionCount}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2"
                                onClick={handleSelectPrev}
                                disabled={selectedVersionIndex <= 0}
                            >
                                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                                上一项
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2"
                                onClick={handleSelectNext}
                                disabled={
                                    selectedVersionIndex < 0 ||
                                    selectedVersionIndex >= filteredItems.length - 1
                                }
                            >
                                下一项
                                <ChevronRight className="h-3.5 w-3.5 ml-1" />
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant={showDiff ? 'default' : 'outline'}
                                onClick={() => setShowDiff((prev) => !prev)}
                                disabled={!selectedVersion}
                            >
                                {showDiff ? '显示更改' : '仅看内容'}
                            </Button>
                            <Button
                                size="sm"
                                disabled={!restoreTargetVersion || isRestoring}
                                onClick={() => setRestoreConfirmOpen(true)}
                            >
                                {isRestoring ? (
                                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                ) : (
                                    <RotateCcw className="h-4 w-4 mr-1.5" />
                                )}
                                恢复此版本
                            </Button>
                        </div>
                    </div>

                    <VersionPreview
                        detail={selectedDetail}
                        isLoading={isPreviewLoading}
                        activeVersion={selectedVersion}
                        showDiff={showDiff}
                    />
                </div>
                <VersionTimeline
                    versions={filteredItems}
                    selectedVersion={selectedVersion}
                    total={listState.total}
                    totalLoaded={listState.items.length}
                    hasMore={listState.hasMore}
                    isLoadingMore={isLoadingMore}
                    typeFilter={typeFilter}
                    onTypeFilterChange={setTypeFilter}
                    onSelectVersion={handleSelectVersion}
                    onLoadMore={() => void handleLoadMore()}
                />
            </div>

            {/* 恢复版本确认弹窗 */}
            <Dialog open={restoreConfirmOpen} onOpenChange={setRestoreConfirmOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            确认恢复版本
                        </DialogTitle>
                        <DialogDescription asChild>
                            <div className="space-y-2 text-sm">
                                <p>此操作将把文档当前内容恢复至所选历史版本：</p>
                                {restoreTargetMeta && (
                                    <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-foreground">
                                        {formatVersionLabel(restoreTargetMeta)}
                                    </div>
                                )}
                                <p className="text-muted-foreground">
                                    系统会自动创建一条「版本恢复」记录，原有编辑历史不会丢失。
                                    <strong className="text-foreground">
                                        {' '}
                                        如有其他协作者正在编辑，他们将看到内容变化。
                                    </strong>
                                </p>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setRestoreConfirmOpen(false)}
                            disabled={isRestoring}
                        >
                            取消
                        </Button>
                        <Button onClick={() => void handleRestore()} disabled={isRestoring}>
                            {isRestoring && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            确认恢复
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
