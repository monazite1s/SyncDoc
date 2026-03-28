import { describe, it, expect, beforeEach } from 'vitest';
import { useDocumentStore } from '@/stores/document.store';
import type { Document } from '@/types';

// mock 文档数据
const mockDocument: Document = {
  id: 'doc-1',
  title: '测试文档',
  description: '这是一个测试文档',
  isPublic: false,
  status: 'DRAFT',
  authorId: 'user-1',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const mockDocument2: Document = {
  ...mockDocument,
  id: 'doc-2',
  title: '测试文档 2',
};

describe('useDocumentStore', () => {
  beforeEach(() => {
    useDocumentStore.setState({
      documents: [],
      currentDocument: null,
      isLoading: false,
    });
  });

  it('初始状态应为空', () => {
    const state = useDocumentStore.getState();
    expect(state.documents).toEqual([]);
    expect(state.currentDocument).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it('setDocuments 应设置文档列表', () => {
    useDocumentStore.getState().setDocuments([mockDocument, mockDocument2]);
    const state = useDocumentStore.getState();
    expect(state.documents).toHaveLength(2);
    expect(state.documents[0].id).toBe('doc-1');
  });

  it('addDocument 应添加新文档到列表', () => {
    useDocumentStore.getState().setDocuments([mockDocument]);
    useDocumentStore.getState().addDocument(mockDocument2);
    const state = useDocumentStore.getState();
    expect(state.documents).toHaveLength(2);
    expect(state.documents[1].id).toBe('doc-2');
  });

  it('updateDocument 应更新指定文档', () => {
    useDocumentStore.getState().setDocuments([mockDocument]);
    useDocumentStore.getState().updateDocument('doc-1', { title: '更新后的标题' });
    const state = useDocumentStore.getState();
    expect(state.documents[0].title).toBe('更新后的标题');
  });

  it('updateDocument 同时更新 currentDocument（如果匹配）', () => {
    useDocumentStore.getState().setDocuments([mockDocument]);
    useDocumentStore.getState().setCurrentDocument(mockDocument);
    useDocumentStore.getState().updateDocument('doc-1', { title: '更新后的标题' });
    const state = useDocumentStore.getState();
    expect(state.currentDocument?.title).toBe('更新后的标题');
  });

  it('removeDocument 应移除指定文档', () => {
    useDocumentStore.getState().setDocuments([mockDocument, mockDocument2]);
    useDocumentStore.getState().removeDocument('doc-1');
    const state = useDocumentStore.getState();
    expect(state.documents).toHaveLength(1);
    expect(state.documents[0].id).toBe('doc-2');
  });

  it('removeDocument 如果移除的是当前文档，应清空 currentDocument', () => {
    useDocumentStore.getState().setDocuments([mockDocument]);
    useDocumentStore.getState().setCurrentDocument(mockDocument);
    useDocumentStore.getState().removeDocument('doc-1');
    const state = useDocumentStore.getState();
    expect(state.currentDocument).toBeNull();
  });

  it('setIsLoading 应设置加载状态', () => {
    useDocumentStore.getState().setIsLoading(true);
    expect(useDocumentStore.getState().isLoading).toBe(true);
  });
});
