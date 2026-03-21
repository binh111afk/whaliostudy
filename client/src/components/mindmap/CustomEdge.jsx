import React, { memo, useMemo } from 'react';

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
    const offsetY = Math.max(86, Math.abs(deltaY) * 0.42);
    const swayX = deltaX * 0.14;
    return [
      { x: sourceX + swayX, y: sourceY + offsetY },
      { x: targetX - swayX, y: targetY - offsetY },
    ];
  }

  const offsetX = Math.max(94, Math.abs(deltaX) * 0.4);
  const swayY = deltaY * 0.16;
  const sign = Math.sign(deltaX || 1);

  return [
    { x: sourceX + sign * offsetX, y: sourceY + swayY * 0.55 },
    { x: targetX - sign * offsetX, y: targetY - swayY * 0.55 },
  ];
};

const buildTaperPath = (p0, p1, p2, p3, depth) => {
  const samples = 26;
  const left = [];
  const right = [];
  const startWidth = depth <= 1 ? 5.6 : depth === 2 ? 4.1 : 3.2;
  const endWidth = depth <= 1 ? 1.4 : 1.15;

  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    const point = sampleBezierPoint(t, p0, p1, p2, p3);
    const nextPoint = sampleBezierPoint(Math.min(1, t + 1 / samples), p0, p1, p2, p3);
    const dx = nextPoint.x - point.x;
    const dy = nextPoint.y - point.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / length;
    const ny = dx / length;
    const eased = 1 - (1 - t) * (1 - t);
    const width = startWidth + (endWidth - startWidth) * eased;

    left.push(`${point.x + nx * width},${point.y + ny * width}`);
    right.unshift(`${point.x - nx * width},${point.y - ny * width}`);
  }

  return `M ${left.join(' L ')} L ${right.join(' L ')} Z`;
};

const CustomEdge = memo(({ id, sourceX, sourceY, targetX, targetY, data }) => {
  const color = data?.color || '#3b82f6';
  const layoutDirection = data?.layoutDirection || 'LR';
  const depth = Number(data?.depth || 1);

  const geometry = useMemo(() => {
    const p0 = { x: sourceX, y: sourceY };
    const p3 = { x: targetX, y: targetY };
    const [p1, p2] = buildControlPoints(sourceX, sourceY, targetX, targetY, layoutDirection);

    return {
      cubicPath: `M ${p0.x},${p0.y} C ${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`,
      taperPath: buildTaperPath(p0, p1, p2, p3, depth),
    };
  }, [depth, layoutDirection, sourceX, sourceY, targetX, targetY]);

  return (
    <>
      <defs>
        <linearGradient
          id={`mindmap-edge-gradient-${id}`}
          gradientUnits="userSpaceOnUse"
          x1={sourceX}
          y1={sourceY}
          x2={targetX}
          y2={targetY}
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.56" />
          <stop offset="58%" stopColor={color} stopOpacity={depth <= 1 ? '0.24' : '0.18'} />
          <stop offset="100%" stopColor={color} stopOpacity="0.03" />
        </linearGradient>
      </defs>

      <path d={geometry.taperPath} fill={`url(#mindmap-edge-gradient-${id})`} />
      <path
        d={geometry.cubicPath}
        fill="none"
        stroke={color}
        strokeOpacity={depth <= 1 ? 0.62 : 0.42}
        strokeWidth={depth <= 1 ? 1.55 : 1.15}
        strokeLinecap="round"
      />
      <path
        d={geometry.cubicPath}
        fill="none"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
      <path d={geometry.cubicPath} fill="none" stroke="transparent" strokeWidth="18" />
    </>
  );
});

CustomEdge.displayName = 'CustomEdge';

export default CustomEdge;
