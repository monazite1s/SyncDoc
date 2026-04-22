'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, GitCompare, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { versionsApi } from '@/lib/api/versions';
import { Button } from '@/components/ui/button';
import { VersionTimeline } from './version-timeline';
import { VersionPreview } from './version-preview';
import { VersionDiffViewer } from './version-diff-viewer';

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

export default function HistoryPage({ paramsPromise }: HistoryPageProps) {
    const router = useRouter();
    const { id: documentId } = use(paramsPromise);
    const [pageState, setPageState] = useState<HistoryPageState>({ status: 'loading' });
    const [listState, setListState] = useState<VersionListState>({
        items: [],
        page: 1,
        total: 0,
        hasMore: false,
    });
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [selectedVersions, setSelectedVersions] = useState<number[]>([]);
    const [isComparing, setIsComparing] = useState(false);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState<
        Awaited<ReturnType<typeof versionsApi.get>>['data'] | null
    >(null);
    const [diffResult, setDiffResult] = useState<
        Awaited<ReturnType<typeof versionsApi.diff>>['data'] | null
    >(null);

    const selectedVersionSet = useMemo(() => new Set(selectedVersions), [selectedVersions]);
    const activeVersion = selectedVersions.length === 1 ? selectedVersions[0] : null;
    const hasTwoSelected = selectedVersions.length === 2;
    const restoreTargetVersion = useMemo(() => {
        if (selectedVersions.length === 0) return null;
        return Math.max(...selectedVersions);
    }, [selectedVersions]);

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
                return {
                    items: deduped,
                    page,
                    total,
                    hasMore: page * limit < total,
                };
            });
            return items;
        },
        [documentId]
    );

    useEffect(() => {
        let cancelled = false;

        async function loadInitialData() {
            try {
                const response = await versionsApi.list(documentId, 1, 20);
                if (cancelled) return;

                const { items, total, limit } = response.data;
                setListState({
                    items,
                    page: 1,
                    total,
                    hasMore: limit < total,
                });
                const defaultVersion = items[0]?.version ?? null;
                setSelectedVersions(defaultVersion ? [defaultVersion] : []);
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
            setDiffResult(null);

            if (selectedVersions.length === 0) {
                return;
            }

            try {
                setIsPreviewLoading(true);
                if (selectedVersions.length === 1) {
                    const response = await versionsApi.get(documentId, selectedVersions[0]);
                    if (!cancelled) {
                        setSelectedDetail(response.data);
                    }
                    return;
                }

                if (selectedVersions.length === 2) {
                    const [v1, v2] = [...selectedVersions].sort((a, b) => a - b);
                    setIsComparing(true);
                    const response = await versionsApi.diff(documentId, {
                        fromVersion: v1,
                        toVersion: v2,
                    });
                    if (!cancelled) {
                        setDiffResult(response.data);
                    }
                }
            } catch (error) {
                if (!cancelled) {
                    const message = error instanceof Error ? error.message : '加载版本内容失败';
                    toast.error(message);
                }
            } finally {
                if (!cancelled) {
                    setIsPreviewLoading(false);
                    setIsComparing(false);
                }
            }
        }
        void loadSelectedData();
        return () => {
            cancelled = true;
        };
    }, [documentId, selectedVersions]);

    const handleToggleVersion = (version: number) => {
        setSelectedVersions((prev) => {
            if (prev.includes(version)) {
                return prev.filter((item) => item !== version);
            }
            if (prev.length >= 2) {
                return [prev[1], version];
            }
            return [...prev, version];
        });
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

    const handleRestore = async () => {
        if (!restoreTargetVersion) return;
        const confirmed = window.confirm(
            `确认恢复到版本 v${restoreTargetVersion} 吗？系统会创建新的恢复快照。`
        );
        if (!confirmed) return;

        try {
            setIsRestoring(true);
            const response = await versionsApi.restore(documentId, restoreTargetVersion);
            toast.success(`已恢复到 v${restoreTargetVersion}`);
            await fetchVersions(1, false);
            setSelectedVersions([response.data.version]);
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
        <div className="h-screen flex bg-background">
            <VersionTimeline
                versions={listState.items}
                selectedVersions={selectedVersionSet}
                total={listState.total}
                hasMore={listState.hasMore}
                isLoadingMore={isLoadingMore}
                onToggleVersion={handleToggleVersion}
                onLoadMore={() => void handleLoadMore()}
            />
            <div className="flex-1 min-w-0 flex flex-col">
                <div className="px-6 py-4 border-b border-border bg-card flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => router.push(`/documents/${documentId}`)}
                            title="返回查看页"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-lg font-semibold">历史版本</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={selectedVersions.length !== 1}
                            onClick={() => {
                                if (activeVersion) {
                                    setSelectedVersions([activeVersion]);
                                }
                            }}
                        >
                            <Eye className="h-4 w-4 mr-1.5" />
                            单版本预览
                        </Button>
                        <Button variant="outline" size="sm" disabled={!hasTwoSelected}>
                            <GitCompare className="h-4 w-4 mr-1.5" />
                            对比模式
                        </Button>
                        <Button
                            size="sm"
                            disabled={!restoreTargetVersion || isRestoring}
                            onClick={() => void handleRestore()}
                        >
                            {isRestoring ? (
                                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                            ) : (
                                <RotateCcw className="h-4 w-4 mr-1.5" />
                            )}
                            恢复
                        </Button>
                    </div>
                </div>

                {hasTwoSelected ? (
                    <VersionDiffViewer
                        diffResult={diffResult}
                        isLoading={isPreviewLoading || isComparing}
                        selectedVersions={selectedVersions}
                    />
                ) : (
                    <VersionPreview
                        detail={selectedDetail}
                        isLoading={isPreviewLoading}
                        activeVersion={activeVersion}
                    />
                )}
            </div>
        </div>
    );
}
