import React, { memo, useMemo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';

const sampleBezierPoint = (t, p0, p1, p2, p3) => {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;

  return {
    x: (mt2 * mt) * p0.x + (3 * mt2 * t) * p1.x + (3 * mt * t2) * p2.x + (t2 * t) * p3.x,
    y: (mt2 * mt) * p0.y + (3 * mt2 * t) * p1.y + (3 * mt * t2) * p2.y + (t2 * t) * p3.y,
  };
};

const buildControlPoints = (sourceX, sourceY, targetX, targetY, layoutDirection) => {
  const deltaX = targetX - sourceX;
  const deltaY = targetY - sourceY;

  if (layoutDirection === 'TB') {
    const controlOffset = Math.max(64, Math.abs(deltaY) * 0.38);
    return [
      { x: sourceX, y: sourceY + controlOffset },
      { x: targetX, y: targetY - controlOffset },
    ];
  }

  const controlOffset = Math.max(72, Math.abs(deltaX) * 0.35);
  return [
    { x: sourceX + Math.sign(deltaX || 1) * controlOffset, y: sourceY },
    { x: targetX - Math.sign(deltaX || 1) * controlOffset, y: targetY },
  ];
};

const buildTaperPath = (sourceX, sourceY, targetX, targetY, layoutDirection) => {
  const p0 = { x: sourceX, y: sourceY };
  const p3 = { x: targetX, y: targetY };
  const [p1, p2] = buildControlPoints(sourceX, sourceY, targetX, targetY, layoutDirection);
  const samples = 22;
  const left = [];
  const right = [];

  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    const point = sampleBezierPoint(t, p0, p1, p2, p3);
    const nextPoint = sampleBezierPoint(Math.min(1, t + 1 / samples), p0, p1, p2, p3);
    const dx = nextPoint.x - point.x;
    const dy = nextPoint.y - point.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / length;
    const ny = dx / length;
    const width = Math.max(1.25, 7.4 - t * 5.8);

    left.push(`${point.x + nx * width},${point.y + ny * width}`);
    right.unshift(`${point.x - nx * width},${point.y - ny * width}`);
  }

  return `M ${left.join(' L ')} L ${right.join(' L ')} Z`;
};

const CustomEdge = memo((props) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
  } = props;

  const color = data?.color || '#3b82f6';
  const layoutDirection = data?.layoutDirection || 'LR';
  const depth = Number(data?.depth || 1);
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: layoutDirection === 'TB' ? 0.36 : 0.42,
  });

  const taperPath = useMemo(
    () => buildTaperPath(sourceX, sourceY, targetX, targetY, layoutDirection),
    [layoutDirection, sourceX, sourceY, targetX, targetY]
  );

  return (
    <>
      <defs>
        <linearGradient id={`mindmap-edge-gradient-${id}`} gradientUnits="userSpaceOnUse" x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}>
          <stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <stop offset="65%" stopColor={color} stopOpacity={depth <= 1 ? '0.3' : '0.22'} />
          <stop offset="100%" stopColor={color} stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <path d={taperPath} fill={`url(#mindmap-edge-gradient-${id})`} />
      <BaseEdge
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: depth <= 1 ? 2.4 : 1.8,
          strokeOpacity: depth <= 1 ? 0.88 : 0.62,
          strokeLinecap: 'round',
        }}
      />
      <EdgeLabelRenderer>
        <div style={{ display: 'none' }} />
      </EdgeLabelRenderer>
    </>
  );
});

CustomEdge.displayName = 'CustomEdge';

export default CustomEdge;
