import path from 'node:path';

const fail = () => { const error = new Error('FIDELITY_SOURCE_REPAIR_SHAPE_CHANGED'); error.code = error.message; throw error; };
const replaceOnce = (source, original, replacement) => {
  if (!source.includes(original) || source.indexOf(original) !== source.lastIndexOf(original)) fail();
  return source.replace(original, replacement);
};

// These are isolated prototype fixes for observed source defects. The private
// source files stay read-only. Exact anchors reject a changed source contract.
export function applyFeedbackSourceRepairs({ sourceRoot, filename, source }) {
  const relative = path.relative(sourceRoot, filename).replaceAll('\\', '/').toLowerCase();
  const repairs = [];
  const targeted = ['src/pages/workorder/myworkorder/components/batchreplymodal.tsx', 'src/pages/workorder/workorderlist/index.tsx', 'src/pages/workorder/myworkorder/components/processworkordermodal/index.tsx', 'src/pages/workorder/myworkorder/components/processworkordermodal/useprocessworkorderchat.ts'].includes(relative);
  const crlf = source.includes('\r\n');
  if (targeted && crlf) source = source.replaceAll('\r\n', '\n');
  if (relative === 'src/pages/workorder/myworkorder/components/batchreplymodal.tsx') {
    source = replaceOnce(source, '{ required: true, message: "请输入回复内容" }', '{ required: true, whitespace: true, message: "请输入回复内容" }');
    repairs.push('batch-reply-whitespace-validation');
    source = replaceOnce(source, 'const values = await form.validateFields();', 'let values;\n        try {\n            values = await form.validateFields();\n        } catch {\n            return;\n        }');
    repairs.push('batch-reply-validation-rejection');
  } else if (relative === 'src/pages/workorder/workorderlist/index.tsx') {
    const start = source.indexOf('const handleBatchReplySubmit = async (content: string) => {');
    const end = source.indexOf('const activeRelatedRecord = useMemo(', start + 1);
    if (start < 0 || end < 0) fail();
    const original = source.slice(start, end);
    const changed = replaceOnce(original, '} finally {\n            setBatchReplyLoading(false);', '} catch {\n            message.error("批量回复发送失败，请重试");\n        } finally {\n            setBatchReplyLoading(false);');
    source = source.slice(0, start) + changed + source.slice(end);
    repairs.push('batch-reply-error-feedback');
  } else if (relative === 'src/pages/workorder/myworkorder/components/processworkordermodal/index.tsx') {
    const start = source.indexOf('const openImageAuditPage = React.useCallback(');
    const end = source.indexOf('const handleOpenChatImageAudit = React.useCallback(', start + 1);
    if (start < 0 || end < 0) fail();
    const original = source.slice(start, end);
    if (!original.includes('openTabPage(') || original.includes('onCancel(')) fail();
    const changed = replaceOnce(original, '        },\n        []', '            onCancel();\n        },\n        [onCancel]');
    source = source.slice(0, start) + changed + source.slice(end);
    repairs.push('image-audit-close-source-drawer');
  } else if (relative === 'src/pages/workorder/myworkorder/components/processworkordermodal/useprocessworkorderchat.ts') {
    source = replaceOnce(source, '    const loadingMoreRef = useRef(false);', '    const historyRequestVersionRef = useRef(0);\n    const historyPaginationRef = useRef({ version: 0, page: 0, loaded: 0, hasMore: false, pending: false });\n    const loadingMoreRef = useRef(false);');
    const start = source.indexOf('const loadChatHistory = useCallback(');
    const end = source.indexOf('\n    useEffect(() => {', start + 1);
    if (start < 0 || end < 0 || source.indexOf('const loadChatHistory = useCallback(', start + 1) >= 0) fail();
    let changed = source.slice(start, end);
    // A refresh invalidates earlier appends. Closing or changing the record
    // also invalidates requests through the existing visibility lifecycle. The
    // immediate cursor/claim blocks queued scrolls before React commits pageNum.
    // Failed pages retain the cursor so the same page can be retried normally.
    changed = replaceOnce(changed, '            if (!workOrderId) return;', '            if (!workOrderId) return;\n            const requestVersion = append ? historyRequestVersionRef.current : ++historyRequestVersionRef.current;\n            if (!append) {\n                setLoadingMore(false);\n                loadingMoreRef.current = false;\n                historyPaginationRef.current = { version: requestVersion, page: 0, loaded: 0, hasMore: false, pending: false };\n            }\n            const pagination = historyPaginationRef.current;\n            if (append && (pagination.version !== requestVersion || pagination.pending || !pagination.hasMore || page !== pagination.page + 1)) {\n                loadingMoreRef.current = pagination.version === requestVersion && pagination.pending;\n                return;\n            }\n            pagination.pending = true;');
    changed = replaceOnce(changed, '                const rows = res.rows || [];', '                if (requestVersion !== historyRequestVersionRef.current) return;\n                const rows = res.rows || [];\n                pagination.page = page;\n                pagination.loaded = append ? pagination.loaded + rows.length : rows.length;\n                pagination.hasMore = pagination.loaded < (res.total ?? 0);');
    changed = replaceOnce(changed, '                setMessages((prev) => (append ? [...rows, ...prev] : rows));', '                setMessages((prev) => (append ? [...rows, ...prev] : rows));\n                setPageNum(page);');
    changed = replaceOnce(changed, '            } catch {\n                if (!append) setMessages([]);', '            } catch {\n                if (requestVersion !== historyRequestVersionRef.current) return;\n                if (!append) setMessages([]);');
    changed = replaceOnce(changed, '                setLoadingState(false);\n                loadingMoreRef.current = false;', '                if (requestVersion === historyRequestVersionRef.current) {\n                    pagination.pending = false;\n                    setLoadingState(false);\n                    loadingMoreRef.current = false;\n                }');
    source = source.slice(0, start) + changed + source.slice(end);
    const lifecycle = '    useEffect(() => {\n        if (visible && workOrderId) {\n            setPageNum(1);\n            loadingMoreRef.current = false;\n            hasScrolledToBottomRef.current = false;\n            scrollBeforePrependRef.current = null;\n            loadChatHistory(1, false);\n        }\n    }, [visible, workOrderId, loadChatHistory]);';
    source = replaceOnce(source, lifecycle, lifecycle.replace('        if (visible && workOrderId)', '        historyRequestVersionRef.current += 1;\n        if (visible && workOrderId)').replace('        }\n    },', '        }\n        return () => { historyRequestVersionRef.current += 1; };\n    },'));
    source = replaceOnce(source, '            setPageNum(nextPage);\n            loadChatHistory(nextPage, true);', '            loadChatHistory(nextPage, true);');
    repairs.push('detail-chat-history-pagination');
  }
  return { source: targeted && crlf ? source.replaceAll('\n', '\r\n') : source, repairs };
}
