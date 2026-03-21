import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AnimatePresence } from 'framer-motion';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import {
  Bot,
  FileText,
  ImageDown,
  Loader2,
  LogIn,
  Maximize,
  RefreshCcw,
  Save,
  Sparkles,
  Wand2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { toast } from 'sonner';
import CustomNode from '../components/mindmap/CustomNode';
import CustomEdge from '../components/mindmap/CustomEdge';
import {
  DEFAULT_THEME,
  MOBILE_BREAKPOINT,
  buildChildrenLookup,
  buildStarterMap,
  createBaseEdge,
  createBaseNode,
  flattenTreeToGraph,
  getLayoutedElements,
  normalizeHierarchyPayload,
  serializeEdge,
  serializeNode,
} from '../components/mindmap/mindMapUtils';
import { mindMapService } from '../services/mindMapService';

const AUTOSAVE_DELAY_MS = 1200;
const NODE_TYPES = { mindMapNode: CustomNode };
const EDGE_TYPES = { mindMapEdge: CustomEdge };

const useResponsiveLayout = () => {
  const getMatches = () =>
    typeof window !== 'undefined'
      ? window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches
      : false;

  const [isMobile, setIsMobile] = useState(getMatches);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const updateMatches = (event) => setIsMobile(event.matches);

    mediaQuery.addEventListener('change', updateMatches);
    return () => mediaQuery.removeEventListener('change', updateMatches);
  }, []);

  return {
    isMobile,
    layoutDirection: isMobile ? 'TB' : 'LR',
  };
};

const MindMapCanvas = ({ user }) => {
  const wrapperRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const hasHydratedRef = useRef(false);
  const hydratedUsernameRef = useRef('');
  const skipNextAutosaveRef = useRef(true);
  const reactFlowInstance = useReactFlow();
  const { isMobile, layoutDirection } = useResponsiveLayout();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [mapId, setMapId] = useState('');
  const [mapTitle, setMapTitle] = useState('Mind Map của bạn');
  const [topic, setTopic] = useState('Whalio Mind Map');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAiPromptOpen, setIsAiPromptOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState('');
  const [editingValue, setEditingValue] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [isExpandingNode, setIsExpandingNode] = useState(false);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const fitCanvas = useCallback(
    (duration = 520) => {
      requestAnimationFrame(() => {
        reactFlowInstance.fitView({
          padding: isMobile ? 0.14 : 0.22,
          duration,
          maxZoom: isMobile ? 1.05 : 1.2,
        });
      });
    },
    [isMobile, reactFlowInstance]
  );

  const clearNodeAnimation = useCallback(
    (nodeId) => {
      if (typeof window === 'undefined') return;
      window.setTimeout(() => {
        setNodes((currentNodes) =>
          currentNodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    isNew: false,
                  },
                }
              : node
          )
        );
      }, 520);
    },
    [setNodes]
  );

  const applyHydratedGraph = useCallback(
    (nextNodes, nextEdges, options = {}) => {
      const shouldFit = Boolean(options.shouldFit);
      const graph = getLayoutedElements(nextNodes, nextEdges, { layoutDirection });
      setNodes(graph.nodes);
      setEdges(graph.edges);
      if (shouldFit) fitCanvas(options.duration || 520);
    },
    [fitCanvas, layoutDirection, setEdges, setNodes]
  );

  const resetToStarter = useCallback(() => {
    const starter = buildStarterMap(layoutDirection);
    skipNextAutosaveRef.current = true;
    setMapId('');
    setMapTitle(starter.title);
    setTopic(starter.topic);
    setNodes(starter.nodes);
    setEdges(starter.edges);
    fitCanvas(480);
  }, [fitCanvas, layoutDirection, setEdges, setNodes]);

  useEffect(() => {
    let isMounted = true;
    const activeUsername = String(user?.username || '');

    if (hasHydratedRef.current && hydratedUsernameRef.current === activeUsername) {
      return () => {
        isMounted = false;
      };
    }

    const loadCurrentMap = async () => {
      if (!activeUsername) {
        resetToStarter();
        hydratedUsernameRef.current = '';
        hasHydratedRef.current = true;
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const response = await mindMapService.getCurrentMap();
      if (!isMounted) return;

      if (!response?.success || !response?.mindMap) {
        resetToStarter();
        hydratedUsernameRef.current = activeUsername;
        setIsLoading(false);
        hasHydratedRef.current = true;
        return;
      }

      const rawNodes = Array.isArray(response.mindMap.nodes) ? response.mindMap.nodes.map(serializeNode) : [];
      const rawEdges = Array.isArray(response.mindMap.edges) ? response.mindMap.edges.map(serializeEdge) : [];
      const fallback = rawNodes.length > 0 ? { nodes: rawNodes, edges: rawEdges } : buildStarterMap(layoutDirection);
      const graph = getLayoutedElements(fallback.nodes, fallback.edges, { layoutDirection });

      skipNextAutosaveRef.current = true;
      setMapId(String(response.mindMap.id || response.mindMap._id || ''));
      setMapTitle(String(response.mindMap.title || 'Mind Map của bạn'));
      setTopic(String(response.mindMap.topic || 'Whalio Mind Map'));
      setNodes(graph.nodes);
      setEdges(graph.edges);
      hydratedUsernameRef.current = activeUsername;
      setIsLoading(false);
      hasHydratedRef.current = true;
      fitCanvas(560);
    };

    loadCurrentMap();
    return () => {
      isMounted = false;
    };
  }, [fitCanvas, layoutDirection, resetToStarter, setEdges, setNodes, user?.username]);

  useEffect(() => {
    if (!hasHydratedRef.current || isLoading || !nodes.length) return;
    const relayouted = getLayoutedElements(nodes, edges, { layoutDirection });
    skipNextAutosaveRef.current = true;
    setNodes(relayouted.nodes);
    setEdges(relayouted.edges);
    fitCanvas(420);
  }, [fitCanvas, layoutDirection]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hasHydratedRef.current || !user?.username) return undefined;

    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return undefined;
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      const payload = {
        title: mapTitle,
        topic,
        theme: DEFAULT_THEME,
        nodes: nodes.map(serializeNode),
        edges: edges.map(serializeEdge),
        viewport: reactFlowInstance.getViewport(),
      };

      setIsSaving(true);
      const response = mapId
        ? await mindMapService.updateMap(mapId, payload)
        : await mindMapService.createMap(payload);

      if (response?.success && response?.mindMap?.id && !mapId) {
        setMapId(String(response.mindMap.id));
      }

      if (!response?.success) {
        toast.error(response?.message || 'Không thể lưu sơ đồ tư duy');
      }
      setIsSaving(false);
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [edges, mapId, mapTitle, nodes, reactFlowInstance, topic, user?.username]);

  const handleDeleteBranch = useCallback(
    (nodeId) => {
      if (!nodeId || nodeId === 'root') return;

      const childrenLookup = buildChildrenLookup(edges);
      const nodesToDelete = new Set([nodeId]);
      const stack = [nodeId];

      while (stack.length) {
        const currentId = stack.pop();
        (childrenLookup[currentId] || []).forEach((childId) => {
          if (!nodesToDelete.has(childId)) {
            nodesToDelete.add(childId);
            stack.push(childId);
          }
        });
      }

      const nextNodes = nodes.filter((node) => !nodesToDelete.has(node.id));
      const nextEdges = edges.filter(
        (edge) => !nodesToDelete.has(edge.source) && !nodesToDelete.has(edge.target)
      );

      applyHydratedGraph(nextNodes, nextEdges, { shouldFit: true, duration: 380 });
      closeContextMenu();
      toast.success('Đã xóa nhánh khỏi sơ đồ');
    },
    [applyHydratedGraph, closeContextMenu, edges, nodes]
  );

  const handleQuickAdd = useCallback(
    (parentId, preferredDirection = 'right') => {
      const parentNode = nodes.find((node) => node.id === parentId);
      if (!parentNode) return;

      const siblingCount = edges.filter((edge) => edge.source === parentId).length;
      const childId = `node-${Date.now()}`;
      const childDepth = Number(parentNode.data?.depth || 0) + 1;
      const childLabel = parentId === 'root' ? 'Ý chính mới' : 'Ý con mới';
      const childBranchIndex =
        parentId === 'root' ? siblingCount : Number(parentNode.data?.branchIndex || 0);
      const childDirection =
        layoutDirection === 'TB'
          ? 'down'
          : parentId === 'root'
            ? preferredDirection
            : parentNode.data?.direction || 'right';

      const nextNodes = [
        ...nodes,
        createBaseNode({
          id: childId,
          label: childLabel,
          x: parentNode.position.x + (layoutDirection === 'TB' ? 0 : childDirection === 'left' ? -260 : 260),
          y: parentNode.position.y + (layoutDirection === 'TB' ? 140 : (siblingCount - 1) * 72),
          depth: childDepth,
          branchIndex: childBranchIndex,
          theme: DEFAULT_THEME,
          direction: childDirection,
          parentId,
          layoutDirection,
          isNew: true,
        }),
      ];

      const nextEdges = [
        ...edges,
        createBaseEdge({
          id: `edge-${parentId}-${childId}`,
          source: parentId,
          target: childId,
          branchIndex: childBranchIndex,
          depth: childDepth,
          sourceSide: layoutDirection === 'TB' ? 'bottom' : childDirection === 'left' ? 'left' : 'right',
          targetSide: layoutDirection === 'TB' ? 'top' : childDirection === 'left' ? 'right' : 'left',
          layoutDirection,
        }),
      ];

      applyHydratedGraph(nextNodes, nextEdges, { shouldFit: true, duration: 560 });
      setEditingNodeId(childId);
      setEditingValue(childLabel);
      clearNodeAnimation(childId);
    },
    [applyHydratedGraph, clearNodeAnimation, edges, layoutDirection, nodes]
  );

  const hydratedNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onEdit: (id) => {
            const target = nodes.find((item) => item.id === id);
            setEditingNodeId(id);
            setEditingValue(String(target?.data?.label || ''));
          },
          onDeleteBranch: (id) => handleDeleteBranch(id),
          onQuickAdd: (id, direction) => handleQuickAdd(id, direction),
        },
      })),
    [handleDeleteBranch, handleQuickAdd, nodes]
  );

  const handleNodeEditSubmit = useCallback(() => {
    if (!editingNodeId) return;
    const nextLabel = editingValue.trim();
    if (!nextLabel) {
      toast.error('Tên node không được để trống');
      return;
    }

    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === editingNodeId
          ? {
              ...node,
              data: {
                ...node.data,
                label: nextLabel,
              },
            }
          : node
      )
    );
    setEditingNodeId('');
    setEditingValue('');
  }, [editingNodeId, editingValue, setNodes]);

  const handleGenerateByAi = useCallback(async () => {
    const trimmedPrompt = aiPrompt.trim();
    if (!trimmedPrompt) {
      toast.error('Nhập chủ đề để Whalio AI tạo sơ đồ');
      return;
    }

    setIsGenerating(true);
    const response = await mindMapService.generateFromTopic(trimmedPrompt);
    setIsGenerating(false);

    if (!response?.success) {
      toast.error(response?.message || 'Whalio AI chưa tạo được sơ đồ');
      return;
    }

    const tree = normalizeHierarchyPayload(response.mindMap, trimmedPrompt);
    if (!tree) {
      toast.error('AI trả về dữ liệu chưa hợp lệ');
      return;
    }

    const nextGraph = flattenTreeToGraph(tree, { layoutDirection });
    setNodes(nextGraph.nodes);
    setEdges(nextGraph.edges);
    setTopic(trimmedPrompt);
    setMapTitle(trimmedPrompt);
    setAiPrompt(trimmedPrompt);
    setIsAiPromptOpen(false);
    fitCanvas(620);
    toast.success(`Whalio AI đã dựng sơ đồ cho "${trimmedPrompt}"`);
  }, [aiPrompt, fitCanvas, layoutDirection, setEdges, setNodes]);

  const handleAutoLayout = useCallback(() => {
    applyHydratedGraph(nodes, edges, { shouldFit: true, duration: 480 });
    toast.success(isMobile ? 'Đã sắp xếp lại sơ đồ dọc cho mobile' : 'Đã sắp xếp lại sơ đồ ngang');
  }, [applyHydratedGraph, edges, isMobile, nodes]);

  const handleExpandNode = useCallback(async () => {
    if (!contextMenu?.node) return;

    setIsExpandingNode(true);
    const response = await mindMapService.expandNode({
      topic: mapTitle || topic,
      nodeLabel: contextMenu.node.data?.label || '',
      path: contextMenu.node.data?.label || '',
    });
    setIsExpandingNode(false);
    closeContextMenu();

    if (!response?.success) {
      toast.error(response?.message || 'Whalio AI chưa khai triển được ý này');
      return;
    }

    const rawChildren = Array.isArray(response.children)
      ? response.children
      : Array.isArray(response?.mindMap?.children)
        ? response.mindMap.children
        : [];

    if (!rawChildren.length) {
      toast.error('AI chưa trả về node con hợp lệ');
      return;
    }

    let nextNodes = [...nodes];
    let nextEdges = [...edges];

    rawChildren.slice(0, 4).forEach((child, index) => {
      const label = String(child?.label || child?.title || child?.name || child || '').trim();
      if (!label) return;

      const childId = `node-${Date.now()}-${index}`;
      const parentDepth = Number(contextMenu.node.data?.depth || 0);
      const branchIndex =
        contextMenu.node.id === 'root'
          ? edges.filter((edge) => edge.source === 'root').length + index
          : Number(contextMenu.node.data?.branchIndex || 0);
      const direction =
        layoutDirection === 'TB'
          ? 'down'
          : contextMenu.node.id === 'root'
            ? index % 2 === 0
              ? 'right'
              : 'left'
            : contextMenu.node.data?.direction || 'right';
      const depth = parentDepth + 1;

      nextNodes.push(
        createBaseNode({
          id: childId,
          label,
          x: contextMenu.node.position.x + (layoutDirection === 'TB' ? 0 : direction === 'left' ? -250 : 250),
          y: contextMenu.node.position.y + (layoutDirection === 'TB' ? 140 : (index - 1.5) * 88),
          depth,
          branchIndex,
          theme: DEFAULT_THEME,
          direction,
          parentId: contextMenu.node.id,
          layoutDirection,
          isNew: true,
        })
      );

      nextEdges.push(
        createBaseEdge({
          id: `edge-${contextMenu.node.id}-${childId}`,
          source: contextMenu.node.id,
          target: childId,
          branchIndex,
          depth,
          sourceSide: layoutDirection === 'TB' ? 'bottom' : direction === 'left' ? 'left' : 'right',
          targetSide: layoutDirection === 'TB' ? 'top' : direction === 'left' ? 'right' : 'left',
          layoutDirection,
        })
      );

      clearNodeAnimation(childId);
    });

    applyHydratedGraph(nextNodes, nextEdges, { shouldFit: true, duration: 620 });
    toast.success('Whalio AI đã khai triển thêm ý mới');
  }, [
    applyHydratedGraph,
    clearNodeAnimation,
    closeContextMenu,
    contextMenu,
    edges,
    layoutDirection,
    mapTitle,
    nodes,
    topic,
  ]);

  const handleExportPng = useCallback(async () => {
    if (!wrapperRef.current) return;
    try {
      const dataUrl = await toPng(wrapperRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#f8fafc',
      });
      const link = document.createElement('a');
      link.download = `${mapTitle || 'whalio-mind-map'}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Đã xuất PNG');
    } catch (error) {
      console.error('Export PNG error:', error);
      toast.error('Không thể xuất PNG');
    }
  }, [mapTitle]);

  const handleExportPdf = useCallback(async () => {
    if (!wrapperRef.current) return;
    try {
      const dataUrl = await toPng(wrapperRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#f8fafc',
      });
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: 'a4',
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(dataUrl, 'PNG', 18, 18, pageWidth - 36, pageHeight - 36, undefined, 'FAST');
      pdf.save(`${mapTitle || 'whalio-mind-map'}.pdf`);
      toast.success('Đã xuất PDF');
    } catch (error) {
      console.error('Export PDF error:', error);
      toast.error('Không thể xuất PDF');
    }
  }, [mapTitle]);

  const handleConnect = useCallback(
    (params) => {
      const sourceNode = nodes.find((node) => node.id === params.source);
      const targetNode = nodes.find((node) => node.id === params.target);
      const direction =
        layoutDirection === 'TB'
          ? 'down'
          : targetNode?.data?.direction || sourceNode?.data?.direction || 'right';
      const branchIndex = Number(targetNode?.data?.branchIndex ?? sourceNode?.data?.branchIndex ?? 0);

      setEdges((currentEdges) =>
        addEdge(
          createBaseEdge({
            id: `edge-${params.source}-${params.target}-${Date.now()}`,
            source: params.source,
            target: params.target,
            branchIndex,
            depth: Number(targetNode?.data?.depth || 1),
            sourceSide: layoutDirection === 'TB' ? 'bottom' : direction === 'left' ? 'left' : 'right',
            targetSide: layoutDirection === 'TB' ? 'top' : direction === 'left' ? 'right' : 'left',
            layoutDirection,
          }),
          currentEdges
        )
      );
    },
    [layoutDirection, nodes, setEdges]
  );

  if (!user?.username) {
    return (
      <div className="relative min-h-[calc(100vh-7rem)] overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.22)]">
        <div className="relative mx-auto flex max-w-2xl flex-col items-center justify-center gap-5 py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-blue-600 shadow-lg shadow-blue-100">
            <LogIn size={34} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Sơ đồ tư duy cần tài khoản để lưu lại</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Đăng nhập để tạo mind map bằng Whalio AI, tự động lưu vào MongoDB và mở lại lần sau.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-7rem)]">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-blue-500">Whalio Mind Map</p>
          <input
            value={mapTitle}
            onChange={(event) => setMapTitle(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-transparent bg-transparent px-0 text-2xl font-black tracking-tight text-slate-900 outline-none placeholder:text-slate-400 sm:text-3xl md:max-w-xl"
            placeholder="Đặt tên sơ đồ..."
          />
          <p className="mt-2 text-sm text-slate-500">
            Desktop hiển thị ngang, mobile tự chuyển dọc; double-click để sửa nhanh và hover nhánh chính để thêm nhánh.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur">
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isSaving ? 'Đang lưu MongoDB...' : 'Tự động lưu'}
        </div>
      </div>

      <div
        ref={wrapperRef}
        className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(248,250,252,0.98))] shadow-[0_36px_120px_-56px_rgba(15,23,42,0.3)]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.07),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.05),transparent_34%)]" />

        {isLoading ? (
          <div className="relative flex min-h-[72vh] items-center justify-center">
            <div className="flex items-center gap-3 rounded-full border border-white/80 bg-white/85 px-5 py-3 text-sm font-semibold text-slate-600 shadow-lg backdrop-blur">
              <Loader2 size={18} className="animate-spin" />
              Đang mở sơ đồ tư duy...
            </div>
          </div>
        ) : (
          <div className="relative h-[72vh] min-h-[540px] sm:min-h-[640px]">
            <ReactFlow
              nodes={hydratedNodes}
              edges={edges}
              nodeTypes={NODE_TYPES}
              edgeTypes={EDGE_TYPES}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={handleConnect}
              onPaneClick={closeContextMenu}
              onNodeContextMenu={(event, node) => {
                event.preventDefault();
                setContextMenu({
                  node,
                  x: event.clientX,
                  y: event.clientY,
                });
              }}
              fitView
              fitViewOptions={{ padding: isMobile ? 0.14 : 0.22 }}
              minZoom={0.2}
              maxZoom={2.2}
              zoomOnPinch
              zoomOnScroll
              panOnDrag
              zoomOnDoubleClick={false}
              preventScrolling={false}
              proOptions={{ hideAttribution: true }}
              defaultEdgeOptions={{ type: 'mindMapEdge' }}
              className="mind-map-flow"
            >
              <Background
                variant={BackgroundVariant.Dots}
                color="rgba(148,163,184,0.18)"
                gap={22}
                size={1.3}
              />
            </ReactFlow>

            <div className="absolute right-4 top-4 z-20 flex flex-col items-end gap-3 sm:right-6 sm:top-6">
              <button
                type="button"
                onClick={() => setIsAiPromptOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-[0_20px_50px_-20px_rgba(37,99,235,0.78)] transition-transform hover:-translate-y-0.5 hover:bg-blue-700"
              >
                <Sparkles size={16} />
                {isMobile ? 'AI' : 'Tạo sơ đồ bằng Whalio AI'}
              </button>

              <AnimatePresence>
                {isAiPromptOpen && (
                  <div className="w-[min(92vw,420px)] rounded-[1.6rem] border border-white/80 bg-white/84 p-4 shadow-2xl backdrop-blur-xl">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                        <Bot size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-black text-slate-900">Whalio AI Generator</p>
                        <p className="mt-1 text-xs leading-6 text-slate-500">
                          Nhập chủ đề như "Kiến trúc máy tính", "Đệ quy", hay "OOP trong Java".
                        </p>
                      </div>
                    </div>
                    <textarea
                      value={aiPrompt}
                      onChange={(event) => setAiPrompt(event.target.value)}
                      placeholder="Ví dụ: Kiến trúc máy tính"
                      className="mt-4 h-28 w-full rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-300"
                    />
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAiPromptOpen(false)}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                      >
                        Đóng
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateByAi}
                        disabled={isGenerating}
                        className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-70"
                      >
                        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                        {isGenerating ? 'Đang tạo...' : 'Tạo sơ đồ'}
                      </button>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {editingNodeId && (
              <div className="absolute left-1/2 top-4 z-30 w-[min(92vw,420px)] -translate-x-1/2 rounded-[1.4rem] border border-white/80 bg-white/88 p-4 shadow-2xl backdrop-blur-xl sm:top-6">
                <p className="text-sm font-black text-slate-900">Chỉnh sửa node</p>
                <input
                  autoFocus
                  value={editingValue}
                  onChange={(event) => setEditingValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleNodeEditSubmit();
                    if (event.key === 'Escape') {
                      setEditingNodeId('');
                      setEditingValue('');
                    }
                  }}
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm outline-none focus:border-blue-300"
                />
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingNodeId('');
                      setEditingValue('');
                    }}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleNodeEditSubmit}
                    className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white"
                  >
                    Lưu
                  </button>
                </div>
              </div>
            )}

            {contextMenu && (
              <div
                className="fixed z-[120] w-72 rounded-[1.4rem] border border-white/80 bg-white/92 p-3 shadow-2xl backdrop-blur-xl"
                style={{ left: contextMenu.x, top: contextMenu.y }}
              >
                <p className="px-2 text-xs font-black uppercase tracking-[0.24em] text-blue-500">Whalio AI</p>
                <p className="px-2 pt-2 text-sm font-bold text-slate-900">{contextMenu.node.data?.label}</p>
                <button
                  type="button"
                  onClick={handleExpandNode}
                  disabled={isExpandingNode}
                  className="mt-3 flex w-full items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-left text-sm font-bold text-white disabled:opacity-70"
                >
                  {isExpandingNode ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Whalio ơi, khai triển ý này đi
                </button>
              </div>
            )}

            <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-3 sm:px-4 sm:pb-4">
              <div className="flex w-full max-w-5xl flex-wrap items-center justify-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-3 shadow-xl backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => reactFlowInstance.zoomIn({ duration: 180 })}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  <ZoomIn size={16} />
                  {!isMobile && 'Zoom +'}
                </button>
                <button
                  type="button"
                  onClick={() => reactFlowInstance.zoomOut({ duration: 180 })}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  <ZoomOut size={16} />
                  {!isMobile && 'Zoom -'}
                </button>
                <button
                  type="button"
                  onClick={handleAutoLayout}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  <RefreshCcw size={16} />
                  Auto Layout
                </button>
                <button
                  type="button"
                  onClick={() => fitCanvas(420)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  <Maximize size={16} />
                  Fit View
                </button>
                <button
                  type="button"
                  onClick={handleExportPng}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  <ImageDown size={16} />
                  {!isMobile && 'PNG'}
                </button>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  <FileText size={16} />
                  {!isMobile && 'PDF'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MindMap = ({ user }) => (
  <ReactFlowProvider>
    <MindMapCanvas user={user} />
  </ReactFlowProvider>
);

export default MindMap;
