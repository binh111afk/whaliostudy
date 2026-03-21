import dagre from 'dagre';

export const ROOT_X = 0;
export const ROOT_Y = 0;
export const ROOT_NODE_ID = 'root';
export const DEFAULT_THEME = 'xmind';
export const MOBILE_BREAKPOINT = 768;

export const BRANCH_COLORS = [
  '#f97316',
  '#22c55e',
  '#3b82f6',
  '#a855f7',
  '#ef4444',
  '#14b8a6',
  '#eab308',
  '#ec4899',
];

export const getBranchColor = (index = 0) => BRANCH_COLORS[Math.abs(Number(index) || 0) % BRANCH_COLORS.length];

export const getNodeDimensions = (depth = 0, isMobile = false) => {
  if (depth === 0) {
    return isMobile ? { width: 250, height: 84 } : { width: 300, height: 96 };
  }

  if (depth === 1) {
    return isMobile ? { width: 200, height: 72 } : { width: 230, height: 76 };
  }

  return isMobile ? { width: 156, height: 48 } : { width: 176, height: 52 };
};

export const buildNodeLookup = (nodes) =>
  (Array.isArray(nodes) ? nodes : []).reduce((acc, node) => {
    acc[node.id] = node;
    return acc;
  }, {});

export const buildChildrenLookup = (edges) => {
  const lookup = {};
  (Array.isArray(edges) ? edges : []).forEach((edge) => {
    if (!lookup[edge.source]) lookup[edge.source] = [];
    lookup[edge.source].push(edge.target);
  });
  return lookup;
};

export const createBaseNode = ({
  id,
  label,
  x,
  y,
  depth = 0,
  branchIndex = 0,
  branchColor,
  theme = DEFAULT_THEME,
  direction = 'right',
  parentId = null,
  layoutDirection = 'LR',
  isNew = false,
}) => ({
  id,
  type: 'mindMapNode',
  position: { x, y },
  data: {
    label,
    depth,
    branchIndex,
    branchColor: branchColor || getBranchColor(branchIndex),
    theme,
    direction,
    parentId,
    layoutDirection,
    isNew,
  },
  draggable: true,
});

export const createBaseEdge = ({
  id,
  source,
  target,
  branchIndex = 0,
  color,
  depth = 1,
  sourceSide = 'right',
  targetSide = 'left',
  layoutDirection = 'LR',
}) => ({
  id,
  source,
  target,
  type: 'mindMapEdge',
  sourceHandle: sourceSide,
  targetHandle: targetSide,
  animated: false,
  data: {
    depth,
    branchIndex,
    color: color || getBranchColor(branchIndex),
    layoutDirection,
  },
});

export const buildStarterMap = (layoutDirection = 'LR') => {
  const isMobile = layoutDirection === 'TB';
  return {
    title: 'Mind Map của bạn',
    topic: 'Whalio Mind Map',
    theme: DEFAULT_THEME,
    nodes: [
      createBaseNode({
        id: ROOT_NODE_ID,
        label: 'Whalio Mind Map',
        x: ROOT_X,
        y: ROOT_Y,
        depth: 0,
        branchIndex: 0,
        direction: layoutDirection === 'TB' ? 'down' : 'right',
        layoutDirection,
      }),
      createBaseNode({
        id: 'starter-1',
        label: 'Ý chính 1',
        x: isMobile ? 0 : 280,
        y: isMobile ? 180 : -90,
        depth: 1,
        branchIndex: 0,
        direction: layoutDirection === 'TB' ? 'down' : 'right',
        parentId: ROOT_NODE_ID,
        layoutDirection,
      }),
      createBaseNode({
        id: 'starter-2',
        label: 'Ý chính 2',
        x: isMobile ? 0 : -280,
        y: isMobile ? 340 : 90,
        depth: 1,
        branchIndex: 1,
        direction: layoutDirection === 'TB' ? 'down' : 'left',
        parentId: ROOT_NODE_ID,
        layoutDirection,
      }),
    ],
    edges: [
      createBaseEdge({
        id: 'edge-root-starter-1',
        source: ROOT_NODE_ID,
        target: 'starter-1',
        branchIndex: 0,
        depth: 1,
        sourceSide: layoutDirection === 'TB' ? 'bottom' : 'right',
        targetSide: layoutDirection === 'TB' ? 'top' : 'left',
        layoutDirection,
      }),
      createBaseEdge({
        id: 'edge-root-starter-2',
        source: ROOT_NODE_ID,
        target: 'starter-2',
        branchIndex: 1,
        depth: 1,
        sourceSide: layoutDirection === 'TB' ? 'bottom' : 'left',
        targetSide: layoutDirection === 'TB' ? 'top' : 'right',
        layoutDirection,
      }),
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
};

export const normalizeTreeNode = (rawNode, fallbackLabel = 'Chủ đề', depth = 0, maxDepth = 5) => {
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

export const normalizeHierarchyPayload = (payload, fallbackTopic = 'Mind Map') => {
  const rootCandidate = payload?.mindMap || payload?.tree || payload?.data || payload?.root || payload;
  return normalizeTreeNode(rootCandidate, fallbackTopic);
};

const layoutBranch = ({ rootId, nodes, edges, direction = 'right', isMobile = false }) => {
  if (!nodes.length) return [];

  const graph = new dagre.graphlib.Graph();
  graph.setGraph({
    rankdir: isMobile ? 'TB' : direction === 'left' ? 'RL' : 'LR',
    ranksep: isMobile ? 72 : 96,
    nodesep: isMobile ? 38 : 30,
    edgesep: isMobile ? 26 : 18,
    marginx: 0,
    marginy: 0,
  });
  graph.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    const size = getNodeDimensions(Number(node.data?.depth || 0), isMobile);
    graph.setNode(node.id, size);
  });

  const nodeIds = new Set(nodes.map((node) => node.id));
  edges.forEach((edge) => {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
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

export const getLayoutedElements = (nodes, edges, { layoutDirection = 'LR' } = {}) => {
  const safeNodes = nodes || [];
  const safeEdges = edges || [];
  const childrenLookup = buildChildrenLookup(safeEdges);
  const root = safeNodes.find((node) => node.id === ROOT_NODE_ID) || safeNodes[0];
  if (!root) return { nodes: [], edges: [] };

  const isMobile = layoutDirection === 'TB';
  const rootChildren = childrenLookup[root.id] || [];
  const assignments = {};

  rootChildren.forEach((childId, index) => {
    const branchIndex = index;
    const direction = isMobile ? 'down' : index % 2 === 0 ? 'right' : 'left';
    const stack = [childId];

    while (stack.length) {
      const currentId = stack.pop();
      assignments[currentId] = { branchIndex, direction };
      (childrenLookup[currentId] || []).forEach((nextId) => stack.push(nextId));
    }
  });

  const enrichedNodes = safeNodes.map((node) => {
    const depth = node.id === root.id ? 0 : Number(node.data?.depth || 1);
    const assigned = assignments[node.id];
    const branchIndex = node.id === root.id ? 0 : assigned?.branchIndex ?? Number(node.data?.branchIndex || 0);
    const direction = node.id === root.id ? (isMobile ? 'down' : 'right') : assigned?.direction || node.data?.direction || 'right';

    return {
      ...node,
      data: {
        ...node.data,
        depth,
        branchIndex,
        branchColor: getBranchColor(branchIndex),
        direction,
        layoutDirection,
      },
    };
  });

  const positionedNodes = isMobile
    ? layoutBranch({ rootId: root.id, nodes: enrichedNodes, edges: safeEdges, isMobile: true })
    : (() => {
        const rightIds = new Set([root.id, ...Object.entries(assignments).filter(([, value]) => value.direction === 'right').map(([id]) => id)]);
        const leftIds = new Set([root.id, ...Object.entries(assignments).filter(([, value]) => value.direction === 'left').map(([id]) => id)]);
        const rightNodes = enrichedNodes.filter((node) => rightIds.has(node.id));
        const leftNodes = enrichedNodes.filter((node) => leftIds.has(node.id));
        const rightLayout = layoutBranch({ rootId: root.id, nodes: rightNodes, edges: safeEdges, direction: 'right', isMobile: false });
        const leftLayout = layoutBranch({ rootId: root.id, nodes: leftNodes, edges: safeEdges, direction: 'left', isMobile: false });
        const positionedMap = {};
        [...rightLayout, ...leftLayout].forEach((node) => {
          positionedMap[node.id] = node.position;
        });

        return enrichedNodes.map((node) => ({
          ...node,
          position: positionedMap[node.id] || node.position,
        }));
      })();

  const nextEdges = safeEdges.map((edge) => {
    const targetNode = positionedNodes.find((node) => node.id === edge.target);
    const branchIndex = Number(targetNode?.data?.branchIndex || edge.data?.branchIndex || 0);
    const depth = Number(targetNode?.data?.depth || edge.data?.depth || 1);
    const color = getBranchColor(branchIndex);
    const targetDirection = isMobile ? 'down' : targetNode?.data?.direction === 'left' ? 'left' : 'right';

    return {
      ...edge,
      type: 'mindMapEdge',
      sourceHandle: isMobile ? 'bottom' : targetDirection === 'left' ? 'left' : 'right',
      targetHandle: isMobile ? 'top' : targetDirection === 'left' ? 'right' : 'left',
      data: {
        ...edge.data,
        depth,
        branchIndex,
        color,
        layoutDirection,
      },
    };
  });

  return { nodes: positionedNodes, edges: nextEdges };
};

export const flattenTreeToGraph = (tree, options = {}) => {
  const layoutDirection = options.layoutDirection || 'LR';
  const isMobile = layoutDirection === 'TB';
  let sequence = 0;
  const nodes = [];
  const edges = [];

  const walk = (node, parentId = null, depth = 0, direction = 'right', branchIndex = 0) => {
    const id = parentId === null ? ROOT_NODE_ID : `node-${sequence += 1}`;

    nodes.push(
      createBaseNode({
        id,
        label: node.label,
        x: parentId === null ? ROOT_X : ROOT_X + (isMobile ? 0 : direction === 'left' ? -260 : 260),
        y: parentId === null ? ROOT_Y : ROOT_Y + sequence * 42,
        depth,
        branchIndex,
        direction: isMobile ? 'down' : direction,
        parentId,
        layoutDirection,
      })
    );

    if (parentId) {
      edges.push(
        createBaseEdge({
          id: `edge-${parentId}-${id}`,
          source: parentId,
          target: id,
          branchIndex,
          depth,
          sourceSide: isMobile ? 'bottom' : direction === 'left' ? 'left' : 'right',
          targetSide: isMobile ? 'top' : direction === 'left' ? 'right' : 'left',
          layoutDirection,
        })
      );
    }

    node.children.forEach((child, index) => {
      const childDirection = isMobile ? 'down' : depth === 0 ? (index % 2 === 0 ? 'right' : 'left') : direction;
      const childBranchIndex = depth === 0 ? index : branchIndex;
      walk(child, id, depth + 1, childDirection, childBranchIndex);
    });
  };

  walk(tree);
  return getLayoutedElements(nodes, edges, { layoutDirection });
};

export const serializeNode = (node) => ({
  id: String(node.id),
  type: String(node.type || 'mindMapNode'),
  position: {
    x: Number(node.position?.x || 0),
    y: Number(node.position?.y || 0),
  },
  data: {
    label: String(node.data?.label || ''),
    depth: Number(node.data?.depth || 0),
    branchIndex: Number(node.data?.branchIndex ?? node.data?.colorIndex ?? 0),
    branchColor: String(node.data?.branchColor || getBranchColor(node.data?.branchIndex ?? node.data?.colorIndex ?? 0)),
    theme: String(node.data?.theme || DEFAULT_THEME),
    direction: String(node.data?.direction || 'right'),
    parentId: node.data?.parentId ? String(node.data.parentId) : null,
    layoutDirection: String(node.data?.layoutDirection || 'LR'),
  },
});

export const serializeEdge = (edge) => ({
  id: String(edge.id),
  source: String(edge.source),
  target: String(edge.target),
  type: String(edge.type || 'mindMapEdge'),
});
