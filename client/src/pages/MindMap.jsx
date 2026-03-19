import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addEdge,
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { AnimatePresence, motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import {
  Bot,
  Download,
  FileText,
  ImageDown,
  Loader2,
  Sparkles,
  Wand2,
  Plus,
  RefreshCcw,
  Save,
  LogIn,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { mindMapService } from '../services/mindMapService';

const MotionDiv = motion.div;
const NODE_WIDTH = 220;
const NODE_HEIGHT = 68;
const ROOT_X = 0;
const ROOT_Y = 0;
const AUTOSAVE_DELAY_MS = 1200;

const THEMES = {
  rainbow: {
    id: 'rainbow',
    label: 'Rainbow',
    canvasClass:
      'from-sky-100/90 via-cyan-50 to-indigo-100/80 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950',
    edgePalette: ['#2563eb', '#f97316'],
    branchPalette: [
      { border: '#3b82f6', shadow: 'rgba(59,130,246,0.22)', chip: 'rgba(219,234,254,0.95)' },
      { border: '#fb923c', shadow: 'rgba(249,115,22,0.2)', chip: 'rgba(255,237,213,0.95)' },
    ],
  },
  minimal: {
    id: 'minimal',
    label: 'Minimal',
    canvasClass:
      'from-slate-100/95 via-white to-slate-100/90 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950',
    edgePalette: ['#334155', '#9a3412'],
    branchPalette: [
      { border: '#475569', shadow: 'rgba(71,85,105,0.16)', chip: 'rgba(241,245,249,0.96)' },
      { border: '#c2410c', shadow: 'rgba(194,65,12,0.16)', chip: 'rgba(255,237,213,0.96)' },
    ],
  },
  ocean: {
    id: 'ocean',
    label: 'Ocean Blue',
    canvasClass:
      'from-cyan-100/80 via-blue-50 to-sky-100/80 dark:from-slate-950 dark:via-sky-950/40 dark:to-slate-950',
    edgePalette: ['#2563eb', '#f97316'],
    branchPalette: [
      { border: '#2563eb', shadow: 'rgba(37,99,235,0.22)', chip: 'rgba(219,234,254,0.96)' },
      { border: '#f97316', shadow: 'rgba(249,115,22,0.2)', chip: 'rgba(255,237,213,0.96)' },
    ],
  },
};

const getThemeConfig = (themeId) => THEMES[themeId] || THEMES.ocean;

const createBaseNode = ({
  id,
  label,
  x,
  y,
  depth = 0,
  colorIndex = 0,
  theme = 'ocean',
  direction = 'right',
  parentId = null,
}) => ({
  id,
  type: 'mindMapNode',
  position: { x, y },
  data: {
    label,
    depth,
    colorIndex,
    theme,
    direction,
    parentId,
  },
  draggable: true,
});

const createBaseEdge = ({
  id,
  source,
  target,
  color,
  depth = 1,
  sourceSide = 'right',
  targetSide = 'left',
}) => ({
  id,
  source,
  target,
  type: 'bezier',
  sourceHandle: sourceSide,
  targetHandle: targetSide,
  animated: false,
  style: {
    stroke: color,
    strokeWidth: depth <= 1 ? 3.4 : depth === 2 ? 2.4 : 1.6,
    strokeLinecap: 'round',
    strokeOpacity: depth <= 1 ? 0.95 : depth === 2 ? 0.8 : 0.62,
  },
});

const buildStarterMap = (theme = 'ocean') => {
  const themeConfig = getThemeConfig(theme);
  return {
    title: 'Mind Map của bạn',
    topic: 'Whalio Mind Map',
    theme,
    nodes: [
      createBaseNode({
        id: 'root',
        label: 'Whalio Mind Map',
        x: ROOT_X,
        y: ROOT_Y,
        depth: 0,
        colorIndex: 0,
        theme,
      }),
      createBaseNode({
        id: 'starter-1',
        label: 'Ý chính bên phải',
        x: 280,
        y: -90,
        depth: 1,
        colorIndex: 0,
        theme,
        direction: 'right',
        parentId: 'root',
      }),
      createBaseNode({
        id: 'starter-2',
        label: 'Ý chính bên trái',
        x: -280,
        y: 90,
        depth: 1,
        colorIndex: 1,
        theme,
        direction: 'left',
        parentId: 'root',
      }),
    ],
    edges: [
      createBaseEdge({
        id: 'edge-root-starter-1',
        source: 'root',
        target: 'starter-1',
        color: themeConfig.edgePalette[1],
        depth: 1,
        sourceSide: 'right',
        targetSide: 'left',
      }),
      createBaseEdge({
        id: 'edge-root-starter-2',
        source: 'root',
        target: 'starter-2',
        color: themeConfig.edgePalette[0],
        depth: 1,
        sourceSide: 'left',
        targetSide: 'right',
      }),
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
};

const buildNodeLookup = (nodes) =>
  (Array.isArray(nodes) ? nodes : []).reduce((acc, node) => {
    acc[node.id] = node;
    return acc;
  }, {});

const buildChildrenLookup = (edges) => {
  const lookup = {};
  (Array.isArray(edges) ? edges : []).forEach((edge) => {
    if (!lookup[edge.source]) lookup[edge.source] = [];
    lookup[edge.source].push(edge.target);
  });
  return lookup;
};

const getBranchToneIndex = (node, fallback = 0) => {
  const direction = node?.data?.direction === 'left' ? 'left' : 'right';
  if (Number(node?.data?.depth || 0) <= 1) {
    return direction === 'left' ? 0 : 1;
  }
  return Number.isFinite(Number(node?.data?.colorIndex)) ? Number(node.data.colorIndex) : fallback;
};

const applyThemeToGraph = (nodes, edges, theme) => {
  const themeConfig = getThemeConfig(theme);
  const nodeLookup = buildNodeLookup(nodes);

  const nextNodes = (nodes || []).map((node) => ({
    ...node,
    data: {
      ...node.data,
      theme,
      colorIndex:
        typeof node.data?.colorIndex === 'number'
          ? node.data.colorIndex
          : Math.max(0, Number(node.data?.depth || 0) - 1),
    },
  }));

  const nextEdges = (edges || []).map((edge) => {
    const targetNode = nodeLookup[edge.target];
    const branchToneIndex = Math.abs(getBranchToneIndex(targetNode, 0)) % themeConfig.edgePalette.length;
    const color = themeConfig.edgePalette[branchToneIndex];
    const targetDepth = Math.max(1, Number(targetNode?.data?.depth || 1));

    const targetDirection = targetNode?.data?.direction === 'left' ? 'left' : 'right';

    return {
      ...edge,
      type: 'bezier',
      sourceHandle: targetDirection === 'left' ? 'left' : 'right',
      targetHandle: targetDirection === 'left' ? 'right' : 'left',
      style: {
        ...(edge.style || {}),
        stroke: color,
        strokeWidth: targetDepth <= 1 ? 3.4 : targetDepth === 2 ? 2.4 : 1.6,
        strokeLinecap: 'round',
        strokeOpacity: targetDepth <= 1 ? 0.95 : targetDepth === 2 ? 0.8 : 0.62,
      },
    };
  });

  return { nodes: nextNodes, edges: nextEdges };
};

const layoutBranch = ({ rootId, nodes, edges, direction }) => {
  if (!nodes.length) return [];

  const graph = new dagre.graphlib.Graph();
  graph.setGraph({
    rankdir: direction === 'left' ? 'RL' : 'LR',
    ranksep: 90,
    nodesep: 32,
    marginx: 0,
    marginy: 0,
  });
  graph.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    if (nodes.some((node) => node.id === edge.source) && nodes.some((node) => node.id === edge.target)) {
      graph.setEdge(edge.source, edge.target);
    }
  });

  dagre.layout(graph);

  const rootGraphNode = graph.node(rootId);
  const rootOffsetX = rootGraphNode ? rootGraphNode.x : 0;
  const rootOffsetY = rootGraphNode ? rootGraphNode.y : 0;

  return nodes.map((node) => {
    const graphNode = graph.node(node.id);
    if (!graphNode) return node;

    if (node.id === rootId) {
      return {
        ...node,
        position: { x: ROOT_X, y: ROOT_Y },
      };
    }

    return {
      ...node,
      position: {
        x: ROOT_X + (graphNode.x - rootOffsetX),
        y: ROOT_Y + (graphNode.y - rootOffsetY),
      },
    };
  });
};

const getLayoutedElements = (nodes, edges, theme) => {
  const nodeLookup = buildNodeLookup(nodes);
  const childrenLookup = buildChildrenLookup(edges);
  const root = (nodes || []).find((node) => node.id === 'root') || nodes?.[0];
  if (!root) return applyThemeToGraph(nodes || [], edges || [], theme);

  const rootChildren = childrenLookup[root.id] || [];
  const directionAssignments = {};

  rootChildren.forEach((childId, index) => {
    const preferredDirection = nodeLookup[childId]?.data?.direction;
    const direction = preferredDirection || (index % 2 === 0 ? 'right' : 'left');
    const stack = [childId];

    while (stack.length) {
      const currentId = stack.pop();
      directionAssignments[currentId] = direction;
      (childrenLookup[currentId] || []).forEach((nextId) => stack.push(nextId));
    }
  });

  const enrichedNodes = (nodes || []).map((node) => {
    const depth = node.id === root.id ? 0 : Number(node.data?.depth || 1);
    const direction = node.id === root.id ? 'right' : directionAssignments[node.id] || node.data?.direction || 'right';
    return {
      ...node,
      data: {
        ...node.data,
        depth,
        direction,
        theme,
        colorIndex:
          node.id === root.id
            ? 0
            : depth === 1
              ? direction === 'left' ? 0 : 1
              : typeof node.data?.colorIndex === 'number'
                ? node.data.colorIndex
                : direction === 'left' ? 0 : 1,
      },
    };
  });

  const rightIds = new Set([root.id, ...Object.entries(directionAssignments).filter(([, dir]) => dir === 'right').map(([id]) => id)]);
  const leftIds = new Set([root.id, ...Object.entries(directionAssignments).filter(([, dir]) => dir === 'left').map(([id]) => id)]);

  const rightNodes = enrichedNodes.filter((node) => rightIds.has(node.id));
  const leftNodes = enrichedNodes.filter((node) => leftIds.has(node.id));

  const rightLayout = layoutBranch({ rootId: root.id, nodes: rightNodes, edges, direction: 'right' });
  const leftLayout = layoutBranch({ rootId: root.id, nodes: leftNodes, edges, direction: 'left' });
  const positionedMap = {};
  [...rightLayout, ...leftLayout].forEach((node) => {
    positionedMap[node.id] = node.position;
  });

  const themedGraph = applyThemeToGraph(
    enrichedNodes.map((node) => ({
      ...node,
      position: positionedMap[node.id] || node.position,
    })),
    edges || [],
    theme
  );

  return themedGraph;
};

const normalizeTreeNode = (rawNode, fallbackLabel = 'Chủ đề', depth = 0, maxDepth = 5) => {
  if (depth > maxDepth) return null;

  const rawLabel =
    typeof rawNode === 'string'
      ? rawNode
      : rawNode?.label || rawNode?.title || rawNode?.name || rawNode?.topic || rawNode?.text || fallbackLabel;

  const label = String(rawLabel || fallbackLabel).trim().slice(0, 120) || fallbackLabel;

  const rawChildren = Array.isArray(rawNode?.children)
    ? rawNode.children
    : Array.isArray(rawNode?.items)
      ? rawNode.items
      : Array.isArray(rawNode?.nodes)
        ? rawNode.nodes
        : [];

  return {
    label,
    children: rawChildren
      .map((child) => normalizeTreeNode(child, 'Ý phụ', depth + 1, maxDepth))
      .filter(Boolean),
  };
};

const normalizeHierarchyPayload = (payload, fallbackTopic = 'Mind Map') => {
  const rootCandidate = payload?.mindMap || payload?.tree || payload?.data || payload?.root || payload;
  return normalizeTreeNode(rootCandidate, fallbackTopic);
};

const flattenTreeToGraph = (tree, theme = 'ocean') => {
  let sequence = 0;
  const nodes = [];
  const edges = [];
  const themeConfig = getThemeConfig(theme);

  const walk = (node, parentId = null, depth = 0, direction = 'right', colorIndex = 0) => {
    const id = parentId === null ? 'root' : `node-${sequence += 1}`;
    const currentDirection = parentId === null ? 'right' : direction;

    nodes.push(
      createBaseNode({
        id,
        label: node.label,
        x: parentId === null ? ROOT_X : ROOT_X + (direction === 'left' ? -260 : 260),
        y: parentId === null ? ROOT_Y : ROOT_Y + sequence * 36,
        depth,
        colorIndex,
        theme,
        direction: currentDirection,
        parentId,
      })
    );

    if (parentId) {
      const color = themeConfig.edgePalette[colorIndex % themeConfig.edgePalette.length];
      edges.push(
        createBaseEdge({
          id: `edge-${parentId}-${id}`,
          source: parentId,
          target: id,
          color,
          depth,
          sourceSide: currentDirection === 'left' ? 'left' : 'right',
          targetSide: currentDirection === 'left' ? 'right' : 'left',
        })
      );
    }

    node.children.forEach((child, index) => {
      const childDirection =
        depth === 0 ? (index % 2 === 0 ? 'right' : 'left') : currentDirection;
      walk(child, id, depth + 1, childDirection, depth === 0 ? index : colorIndex);
    });
  };

  walk(tree);
  return getLayoutedElements(nodes, edges, theme);
};

const serializeNode = (node) => ({
  id: String(node.id),
  type: String(node.type || 'mindMapNode'),
  position: {
    x: Number(node.position?.x || 0),
    y: Number(node.position?.y || 0),
  },
  data: {
    label: String(node.data?.label || ''),
    depth: Number(node.data?.depth || 0),
    colorIndex: Number(node.data?.colorIndex || 0),
    theme: String(node.data?.theme || 'ocean'),
    direction: String(node.data?.direction || 'right'),
    parentId: node.data?.parentId ? String(node.data.parentId) : null,
  },
});

const serializeEdge = (edge) => ({
  id: String(edge.id),
  source: String(edge.source),
  target: String(edge.target),
  type: String(edge.type || 'bezier'),
});

const MindMapNode = memo(({ id, data, selected }) => {
  const [isHovered, setIsHovered] = useState(false);
  const themeConfig = getThemeConfig(data.theme);
  const depth = Number(data.depth || 0);
  const isRoot = depth === 0;
  const branchToneIndex = Math.abs(getBranchToneIndex({ data }, 0)) % themeConfig.branchPalette.length;
  const paletteEntry =
    isRoot
      ? { border: '#2563eb', shadow: 'rgba(37,99,235,0.28)', chip: 'rgba(219,234,254,0.98)' }
      : themeConfig.branchPalette[branchToneIndex];
  const isPrimaryBranch = depth === 1;
  const isSecondaryBranch = depth >= 2;

  const containerClassName = isRoot
    ? 'min-w-[280px] rounded-full px-10 py-6'
    : isPrimaryBranch
      ? 'min-w-[220px] rounded-[24px] px-7 py-4'
      : 'min-w-[170px] rounded-[18px] px-5 py-3';

  const labelClassName = isRoot
    ? 'font-["Plus_Jakarta_Sans"] text-[1.55rem] font-extrabold leading-tight text-white'
    : isPrimaryBranch
      ? 'font-["Plus_Jakarta_Sans"] text-base font-semibold leading-6 text-slate-800'
      : 'font-["Plus_Jakarta_Sans"] text-sm font-medium leading-5 text-slate-700';

  const containerStyle = isRoot
    ? {
        background: 'linear-gradient(135deg, rgb(37 99 235) 0%, rgb(79 70 229) 100%)',
        borderColor: 'rgba(255,255,255,0.16)',
        boxShadow: selected
          ? '0 0 0 12px rgba(59,130,246,0.16), 0 20px 40px -18px rgba(59,130,246,0.35)'
          : '0 20px 40px -18px rgba(59,130,246,0.35)',
      }
    : isPrimaryBranch
      ? {
          background: 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(10px)',
          borderColor: paletteEntry.border,
          borderWidth: '1.5px',
          boxShadow: selected
            ? `0 0 0 8px ${paletteEntry.shadow.replace(/0\.\d+\)/, '0.16)')}, 0 16px 38px -24px ${paletteEntry.shadow}`
            : '0 1px 2px rgba(15,23,42,0.06)',
        }
      : {
          background: 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(8px)',
          borderColor: '#e2e8f0',
          borderWidth: '1px',
          boxShadow: selected
            ? `0 0 0 8px ${paletteEntry.shadow.replace(/0\.\d+\)/, '0.12)')}, 0 1px 2px rgba(15,23,42,0.05)`
            : '0 1px 2px rgba(15,23,42,0.05)',
        };

  return (
    <>
      <Handle
        type="target"
        id="left"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-0 !bg-transparent !opacity-0"
      />
      <Handle
        type="target"
        id="right"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-0 !bg-transparent !opacity-0"
      />
      <MotionDiv
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onDoubleClick={(event) => {
          event.stopPropagation();
          data.onEdit?.(id);
        }}
        className={`group relative text-left backdrop-blur-xl transition-all duration-200 ${containerClassName}`}
        style={containerStyle}
      >
        {!isSecondaryBranch && (
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(135deg,rgba(255,255,255,0.32),rgba(255,255,255,0.04))]" />
        )}
        <div className="relative flex items-center justify-between gap-4">
          <p className={labelClassName}>{data.label}</p>
        </div>
        <AnimatePresence>
          {isHovered && (
            <MotionDiv
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.18 }}
              className={`pointer-events-none absolute -right-3 ${isRoot ? 'top-1/2 -translate-y-1/2' : '-top-3'}`}
            >
              <div className="pointer-events-auto flex items-center gap-2">
                {!isRoot && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      data.onDeleteBranch?.(id);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/25"
                    aria-label="Xóa nhánh"
                  >
                    <X size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    data.onQuickAdd?.(id, data.direction === 'left' ? 'left' : 'right');
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-white/95 text-blue-600 shadow-lg shadow-blue-500/15"
                  aria-label="Thêm node con"
                >
                  <Plus size={14} />
                </button>
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>
      </MotionDiv>
      <Handle
        type="source"
        id="left"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-0 !bg-transparent !opacity-0"
      />
      <Handle
        type="source"
        id="right"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-0 !bg-transparent !opacity-0"
      />
    </>
  );
});

MindMapNode.displayName = 'MindMapNode';

const NODE_TYPES = {
  mindMapNode: MindMapNode,
};

const MindMapCanvas = ({ user }) => {
  const wrapperRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const hasHydratedRef = useRef(false);
  const hydratedUsernameRef = useRef('');
  const skipNextAutosaveRef = useRef(true);
  const reactFlowInstance = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [mapId, setMapId] = useState('');
  const [mapTitle, setMapTitle] = useState('Mind Map của bạn');
  const [topic, setTopic] = useState('Whalio Mind Map');
  const [theme, setTheme] = useState('ocean');
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

  const applyHydratedGraph = useCallback((nextNodes, nextEdges, nextTheme = theme) => {
    const themedGraph = getLayoutedElements(nextNodes, nextEdges, nextTheme);
    setNodes(themedGraph.nodes);
    setEdges(themedGraph.edges);
  }, [setEdges, setNodes, theme]);

  const handleDeleteBranch = useCallback((nodeId) => {
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

    applyHydratedGraph(nextNodes, nextEdges, theme);
    closeContextMenu();
    toast.success('Đã xóa nhánh khỏi sơ đồ');
  }, [applyHydratedGraph, closeContextMenu, edges, nodes, theme]);

  const handleQuickAdd = useCallback((parentId, preferredDirection) => {
    const parentNode = nodes.find((node) => node.id === parentId);
    if (!parentNode) return;

    const siblings = edges.filter((edge) => edge.source === parentId).length;
    const childId = `node-${Date.now()}`;
    const childLabel = parentId === 'root' ? 'Ý chính mới' : 'Ý con mới';
    const childDirection =
      parentId === 'root'
        ? preferredDirection || (siblings % 2 === 0 ? 'right' : 'left')
        : parentNode.data?.direction || preferredDirection || 'right';
    const childDepth = Number(parentNode.data?.depth || 0) + 1;
    const childColorIndex =
      parentId === 'root'
        ? siblings
        : Number(parentNode.data?.colorIndex || 0);

    const nextNodes = [
      ...nodes,
      createBaseNode({
        id: childId,
        label: childLabel,
        x: parentNode.position.x + (childDirection === 'left' ? -260 : 260),
        y: parentNode.position.y + (siblings - 1) * 80,
        depth: childDepth,
        colorIndex: childColorIndex,
        theme,
        direction: childDirection,
        parentId,
      }),
    ];

    const edgeColor = getThemeConfig(theme).edgePalette[childColorIndex % getThemeConfig(theme).edgePalette.length];
    const nextEdges = [
      ...edges,
      createBaseEdge({
        id: `edge-${parentId}-${childId}`,
        source: parentId,
        target: childId,
        color: edgeColor,
        depth: childDepth,
        sourceSide: childDirection === 'left' ? 'left' : 'right',
        targetSide: childDirection === 'left' ? 'right' : 'left',
      }),
    ];

    applyHydratedGraph(nextNodes, nextEdges, theme);
    setEditingNodeId(childId);
    setEditingValue(childLabel);
  }, [applyHydratedGraph, edges, nodes, theme]);

  const hydratedNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          theme,
          onEdit: (id) => {
            const target = nodes.find((item) => item.id === id);
            setEditingNodeId(id);
            setEditingValue(String(target?.data?.label || ''));
          },
          onDeleteBranch: (id) => handleDeleteBranch(id),
          onQuickAdd: (id, direction) => handleQuickAdd(id, direction),
        },
      })),
    [handleDeleteBranch, handleQuickAdd, nodes, theme]
  );

  const resetToStarter = useCallback((nextTheme = 'ocean') => {
    const starter = buildStarterMap(nextTheme);
    skipNextAutosaveRef.current = true;
    setMapId('');
    setMapTitle(starter.title);
    setTopic(starter.topic);
    setTheme(nextTheme);
    setNodes(starter.nodes);
    setEdges(starter.edges);
    requestAnimationFrame(() => reactFlowInstance.fitView({ padding: 0.22, duration: 480 }));
  }, [reactFlowInstance, setEdges, setNodes]);

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
        resetToStarter('ocean');
        hydratedUsernameRef.current = '';
        hasHydratedRef.current = true;
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const response = await mindMapService.getCurrentMap();
      if (!isMounted) return;

      if (!response?.success || !response?.mindMap) {
        resetToStarter('ocean');
        hydratedUsernameRef.current = activeUsername;
        setIsLoading(false);
        hasHydratedRef.current = true;
        return;
      }

      const loadedTheme = String(response.mindMap.theme || 'ocean');
      const rawNodes = Array.isArray(response.mindMap.nodes) ? response.mindMap.nodes.map(serializeNode) : [];
      const rawEdges = Array.isArray(response.mindMap.edges) ? response.mindMap.edges.map(serializeEdge) : [];
      const fallback = rawNodes.length > 0 ? { nodes: rawNodes, edges: rawEdges } : buildStarterMap(loadedTheme);
      const themedGraph = getLayoutedElements(fallback.nodes, fallback.edges, loadedTheme);

      skipNextAutosaveRef.current = true;
      setMapId(String(response.mindMap.id || response.mindMap._id || ''));
      setMapTitle(String(response.mindMap.title || 'Mind Map của bạn'));
      setTopic(String(response.mindMap.topic || 'Whalio Mind Map'));
      setTheme(loadedTheme);
      setNodes(themedGraph.nodes);
      setEdges(themedGraph.edges);
      hydratedUsernameRef.current = activeUsername;
      setIsLoading(false);
      hasHydratedRef.current = true;

      requestAnimationFrame(() => {
        reactFlowInstance.fitView({ padding: 0.22, duration: 520 });
      });
    };

    loadCurrentMap();
    return () => {
      isMounted = false;
    };
  }, [reactFlowInstance, resetToStarter, setEdges, setNodes, user?.username]);

  useEffect(() => {
    if (!hasHydratedRef.current || !user?.username) return undefined;

    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return undefined;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      const payload = {
        title: mapTitle,
        topic,
        theme,
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
  }, [edges, mapId, mapTitle, nodes, reactFlowInstance, theme, topic, user?.username]);

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

    const nextGraph = flattenTreeToGraph(tree, theme);
    setNodes(nextGraph.nodes);
    setEdges(nextGraph.edges);
    setTopic(trimmedPrompt);
    setMapTitle(trimmedPrompt);
    setAiPrompt(trimmedPrompt);
    setIsAiPromptOpen(false);
    requestAnimationFrame(() => reactFlowInstance.fitView({ padding: 0.22, duration: 560 }));
    toast.success(`Whalio AI đã dựng sơ đồ cho "${trimmedPrompt}"`);
  }, [aiPrompt, reactFlowInstance, setEdges, setNodes, theme]);

  const handleAutoLayout = useCallback(() => {
    const nextGraph = getLayoutedElements(nodes, edges, theme);
    setNodes(nextGraph.nodes);
    setEdges(nextGraph.edges);
    requestAnimationFrame(() => reactFlowInstance.fitView({ padding: 0.22, duration: 480 }));
    toast.success('Đã căn chỉnh sơ đồ tự động');
  }, [edges, nodes, reactFlowInstance, setEdges, setNodes, theme]);

  const handleThemeChange = useCallback((nextTheme) => {
    setTheme(nextTheme);
    const nextGraph = getLayoutedElements(nodes, edges, nextTheme);
    setNodes(nextGraph.nodes);
    setEdges(nextGraph.edges);
  }, [edges, nodes, setEdges, setNodes]);

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
      const direction = contextMenu.node.data?.direction || 'right';
      const colorIndex =
        contextMenu.node.id === 'root'
          ? (edges.filter((edge) => edge.source === 'root').length + index)
          : Number(contextMenu.node.data?.colorIndex || 0);
      const depth = Number(contextMenu.node.data?.depth || 0) + 1;
      nextNodes.push(
        createBaseNode({
          id: childId,
          label,
          x: contextMenu.node.position.x + (direction === 'left' ? -250 : 250),
          y: contextMenu.node.position.y + (index - 1.5) * 88,
          depth,
          colorIndex,
          theme,
          direction,
          parentId: contextMenu.node.id,
        })
      );
      const edgeColor = getThemeConfig(theme).edgePalette[colorIndex % getThemeConfig(theme).edgePalette.length];
      nextEdges.push(
        createBaseEdge({
          id: `edge-${contextMenu.node.id}-${childId}`,
          source: contextMenu.node.id,
          target: childId,
          color: edgeColor,
          depth,
          sourceSide: direction === 'left' ? 'left' : 'right',
          targetSide: direction === 'left' ? 'right' : 'left',
        })
      );
    });

    applyHydratedGraph(nextNodes, nextEdges, theme);
    toast.success('Whalio AI đã khai triển thêm ý mới');
  }, [applyHydratedGraph, closeContextMenu, contextMenu, edges, mapTitle, nodes, theme, topic]);

  const handleExportPng = useCallback(async () => {
    if (!wrapperRef.current) return;
    try {
      const dataUrl = await toPng(wrapperRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#eff6ff',
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
        backgroundColor: '#eff6ff',
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
      const direction = targetNode?.data?.direction === 'left' ? 'left' : 'right';
      const colorIndex = Number(targetNode?.data?.colorIndex || sourceNode?.data?.colorIndex || 0);
      const color = getThemeConfig(theme).edgePalette[colorIndex % getThemeConfig(theme).edgePalette.length];

      setEdges((currentEdges) =>
        addEdge(
          createBaseEdge({
            id: `edge-${params.source}-${params.target}-${Date.now()}`,
            source: params.source,
            target: params.target,
            color,
            depth: Number(targetNode?.data?.depth || 1),
            sourceSide: direction === 'left' ? 'left' : 'right',
            targetSide: direction === 'left' ? 'right' : 'left',
          }),
          currentEdges
        )
      );
    },
    [nodes, setEdges, theme]
  );

  const themeConfig = getThemeConfig(theme);

  if (!user?.username) {
    return (
      <div className="relative min-h-[calc(100vh-7rem)] overflow-hidden rounded-[2rem] border border-blue-100/70 bg-white/80 p-6 shadow-[0_24px_80px_-40px_rgba(37,99,235,0.35)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.16),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_40%)]" />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center justify-center gap-5 py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-blue-600 shadow-lg shadow-blue-200/50 dark:bg-blue-500/15 dark:text-blue-300">
            <LogIn size={34} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Sơ đồ tư duy cần tài khoản để lưu lại</h1>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Đăng nhập để tạo mind map bằng Whalio AI, tự động lưu vào MongoDB và mở lại lần sau.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-7rem)]">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-500">Whalio Mind Map</p>
          <input
            value={mapTitle}
            onChange={(event) => setMapTitle(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-transparent bg-transparent px-0 text-3xl font-black tracking-tight text-slate-900 outline-none placeholder:text-slate-400 dark:text-white md:max-w-xl"
            placeholder="Đặt tên sơ đồ..."
          />
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Double-click node để sửa nhanh, hover node để thêm nhánh con, click phải để mở rộng bằng AI.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-blue-100/80 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isSaving ? 'Đang lưu MongoDB...' : 'Tự động lưu'}
        </div>
      </div>

      <div
        ref={wrapperRef}
        className={`relative overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br ${themeConfig.canvasClass} shadow-[0_36px_120px_-48px_rgba(37,99,235,0.38)] dark:border-slate-800/90`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(148,163,184,0.18)_1px,transparent_1px)] [background-size:22px_22px] dark:bg-[radial-gradient(circle,rgba(148,163,184,0.12)_1px,transparent_1px)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.3),transparent_32%,transparent_68%,rgba(191,219,254,0.26))]" />

        {isLoading ? (
          <div className="relative flex min-h-[72vh] items-center justify-center">
            <div className="flex items-center gap-3 rounded-full border border-white/80 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-600 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200">
              <Loader2 size={18} className="animate-spin" />
              Đang mở sơ đồ tư duy...
            </div>
          </div>
        ) : (
          <div className="relative h-[72vh] min-h-[640px]">
            <ReactFlow
              nodes={hydratedNodes}
              edges={edges}
              nodeTypes={NODE_TYPES}
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
              fitViewOptions={{ padding: 0.22 }}
              minZoom={0.25}
              maxZoom={1.8}
              proOptions={{ hideAttribution: true }}
              defaultEdgeOptions={{ type: 'bezier' }}
              className="mind-map-flow"
            >
              <Background color="rgba(148,163,184,0.28)" gap={22} size={1.4} />
              <Controls
                position="bottom-right"
                className="!bottom-24 !right-5 !overflow-hidden !rounded-2xl !border !border-white/70 !bg-white/80 !shadow-xl !backdrop-blur dark:!border-slate-700 dark:!bg-slate-900/80"
              />
            </ReactFlow>

            <div className="absolute right-6 top-6 z-20 flex flex-col items-end gap-3">
              <button
                type="button"
                onClick={() => setIsAiPromptOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-[0_20px_50px_-20px_rgba(37,99,235,0.8)] transition-transform hover:-translate-y-0.5 hover:bg-blue-700"
              >
                <Sparkles size={16} />
                ✨ Tạo sơ đồ bằng Whalio AI
              </button>

              {isAiPromptOpen && (
                <div className="w-[min(92vw,420px)] rounded-[1.6rem] border border-white/70 bg-white/88 p-4 shadow-2xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/88">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                      <Bot size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-900 dark:text-white">Whalio AI Generator</p>
                      <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                        Nhập chủ đề như "Kiến trúc máy tính", "Đệ quy", hay "OOP trong Java".
                      </p>
                    </div>
                  </div>
                  <textarea
                    value={aiPrompt}
                    onChange={(event) => setAiPrompt(event.target.value)}
                    placeholder="Ví dụ: Kiến trúc máy tính"
                    className="mt-4 h-28 w-full rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-300 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100"
                  />
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAiPromptOpen(false)}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
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
            </div>

            {editingNodeId && (
              <div className="absolute left-1/2 top-6 z-30 w-[min(90vw,420px)] -translate-x-1/2 rounded-[1.4rem] border border-white/70 bg-white/90 p-4 shadow-2xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/90">
                <p className="text-sm font-black text-slate-900 dark:text-white">Chỉnh sửa node</p>
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
                  className="mt-3 w-full rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm outline-none focus:border-blue-300 dark:border-slate-700 dark:bg-slate-800"
                />
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingNodeId('');
                      setEditingValue('');
                    }}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
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
                className="fixed z-[120] w-72 rounded-[1.4rem] border border-white/70 bg-white/92 p-3 shadow-2xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/92"
                style={{ left: contextMenu.x, top: contextMenu.y }}
              >
                <p className="px-2 text-xs font-black uppercase tracking-[0.24em] text-blue-500">Whalio AI</p>
                <p className="px-2 pt-2 text-sm font-bold text-slate-900 dark:text-white">
                  {contextMenu.node.data?.label}
                </p>
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

            <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-4">
              <div className="flex w-full max-w-4xl flex-col gap-2 rounded-[1.5rem] border border-white/70 bg-white/62 px-3 py-3 shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/62 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  {Object.values(THEMES).map((themeOption) => (
                    <button
                      key={themeOption.id}
                      type="button"
                      onClick={() => handleThemeChange(themeOption.id)}
                      className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                        theme === themeOption.id
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-300/50'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {themeOption.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoLayout}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3.5 py-1.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                  >
                    <RefreshCcw size={16} />
                    Auto Layout
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPng}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3.5 py-1.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                  >
                    <ImageDown size={16} />
                    Xuất PNG
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3.5 py-1.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                  >
                    <FileText size={16} />
                    Xuất PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => reactFlowInstance.fitView({ padding: 0.22, duration: 480 })}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
                  >
                    <Download size={16} />
                    Fit View
                  </button>
                </div>
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
