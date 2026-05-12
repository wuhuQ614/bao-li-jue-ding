import React, { useState, useRef, useEffect, useCallback } from 'react';

let shapeIdCounter = 0;
const genId = () => `s${++shapeIdCounter}_${Date.now()}`;

const GRID_COLORS = { major: 'rgba(0,180,255,0.18)', minor: 'rgba(0,180,255,0.07)' };

const snapValue = (v, size) => {
  if (!size || size <= 0) return v;
  return Math.round(v / size) * size;
};

const VectorCadTab = ({ onClose }) => {
  const [tool, setTool] = useState('select');
  const [color, setColor] = useState('#00aaff');
  const [fillColor, setFillColor] = useState('');
  const [lineWidth, setLineWidth] = useState(2);
  const [gridSize, setGridSize] = useState(20);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  const [shapes, setShapes] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const [cursorWorld, setCursorWorld] = useState({ x: 0, y: 0 });

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const isPanning = useRef(false);
  const isDrawing = useRef(false);
  const isDragging = useRef(false);
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const drawStart = useRef(null);
  const dragStart = useRef(null);
  const dragShapeOrigins = useRef([]);
  const polyPoints = useRef([]);
  const arcMid = useRef(null);
  const selectionRect = useRef(null);
  const rafRef = useRef(null);

  const snap = useCallback((v) => {
    if (!snapToGrid || gridSize <= 0) return v;
    return Math.round(v / gridSize) * gridSize;
  }, [snapToGrid, gridSize]);

  const screenToWorld = useCallback((sx, sy) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const cx = sx - rect.left - rect.width / 2;
    const cy = sy - rect.top - rect.height / 2;
    return { x: (cx - pan.x) / zoom, y: (cy - pan.y) / zoom };
  }, [zoom, pan]);

  const pushUndo = useCallback((currentShapes) => {
    setUndoStack(prev => {
      const next = [...prev, currentShapes];
      return next.length > 100 ? next.slice(-100) : next;
    });
    setRedoStack([]);
  }, []);

  const commitShapes = useCallback((newShapes) => {
    pushUndo(shapes);
    setShapes(newShapes);
    setSelectedIds([]);
  }, [shapes, pushUndo]);

  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    pushUndo(shapes);
    const idSet = new Set(selectedIds);
    setShapes(prev => prev.filter(s => !idSet.has(s.id)));
    setSelectedIds([]);
  }, [selectedIds, shapes, pushUndo]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
        return;
      }

      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        if (undoStack.length === 0) return;
        const prev = undoStack[undoStack.length - 1];
        setRedoStack(rs => [...rs, shapes]);
        setUndoStack(us => us.slice(0, -1));
        setShapes(prev);
        setSelectedIds([]);
        return;
      }
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        if (redoStack.length === 0) return;
        const next = redoStack[redoStack.length - 1];
        setUndoStack(us => [...us, shapes]);
        setRedoStack(rs => rs.slice(0, -1));
        setShapes(next);
        setSelectedIds([]);
        return;
      }
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        exportSVG();
        return;
      }

      if (!e.ctrlKey && !e.metaKey) {
        const keyMap = { 'v': 'select', 'l': 'line', 'c': 'circle', 'r': 'rectangle', 'a': 'arc', 'p': 'polygon', 's': 'spline' };
        if (keyMap[e.key]) { e.preventDefault(); setTool(keyMap[e.key]); }
      }

      if (e.key === 'Escape') {
        setTool('select');
        setSelectedIds([]);
        polyPoints.current = [];
        arcMid.current = null;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [undoStack, redoStack, shapes, deleteSelected]);

  const drawShape = (ctx, s) => {
    const hasFill = s.fill && s.fill !== 'none';
    if (hasFill) {
      ctx.fillStyle = s.fill;
      ctx.globalAlpha = s.opacity != null ? s.opacity : 0.3;
    }
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash(s.dash || []);
    ctx.globalAlpha = s.opacity != null ? s.opacity : 1;

    if (s.type === 'line') {
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    } else if (s.type === 'circle') {
      ctx.beginPath();
      ctx.arc(s.cx, s.cy, s.r, 0, Math.PI * 2);
      if (hasFill) ctx.fill();
      ctx.stroke();
    } else if (s.type === 'rect') {
      if (hasFill) ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeRect(s.x, s.y, s.w, s.h);
    } else if (s.type === 'arc') {
      ctx.beginPath();
      ctx.arc(s.cx, s.cy, s.r, s.a1, s.a2, s.a2 < s.a1);
      if (hasFill) ctx.fill();
      ctx.stroke();
    } else if (s.type === 'polygon') {
      if (s.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
      if (s.closed) ctx.closePath();
      if (hasFill) ctx.fill();
      ctx.stroke();
    } else if (s.type === 'spline') {
      if (s.points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) {
        const mx = (s.points[i - 1].x + s.points[i].x) / 2;
        const my = (s.points[i - 1].y + s.points[i].y) / 2;
        if (i === 1) ctx.lineTo(mx, my);
        else ctx.quadraticCurveTo(s.points[i - 1].x, s.points[i - 1].y, mx, my);
      }
      ctx.lineTo(s.points[s.points.length - 1].x, s.points[s.points.length - 1].y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  };

  const renderGrid = (ctx, w, h) => {
    if (!showGrid) return;
    const dpr = window.devicePixelRatio || 1;

    let gs = gridSize;
    const screenGridSize = gs * zoom * dpr;
    if (screenGridSize < 8) {
      const factor = Math.ceil(8 / screenGridSize);
      gs = gridSize * factor;
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const offsetX = ((pan.x * zoom * dpr) % (gs * zoom * dpr) + gs * zoom * dpr) % (gs * zoom * dpr);
    const offsetY = ((pan.y * zoom * dpr) % (gs * zoom * dpr) + gs * zoom * dpr) % (gs * zoom * dpr);

    const pxPerUnit = gs * zoom * dpr;

    ctx.strokeStyle = GRID_COLORS.minor;
    ctx.lineWidth = 0.5;
    for (let x = offsetX; x <= w * dpr; x += pxPerUnit) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h * dpr);
      ctx.stroke();
    }
    for (let y = offsetY; y <= h * dpr; y += pxPerUnit) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w * dpr, y);
      ctx.stroke();
    }

    const majorInterval = gs * 5;
    const majorPx = majorInterval * zoom * dpr;
    if (majorPx >= 20) {
      ctx.strokeStyle = GRID_COLORS.major;
      ctx.lineWidth = 1;
      const majorOffsetX = ((pan.x * zoom * dpr) % (majorInterval * zoom * dpr) + majorInterval * zoom * dpr) % (majorInterval * zoom * dpr);
      const majorOffsetY = ((pan.y * zoom * dpr) % (majorInterval * zoom * dpr) + majorInterval * zoom * dpr) % (majorInterval * zoom * dpr);
      for (let x = majorOffsetX; x <= w * dpr; x += majorPx) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h * dpr);
        ctx.stroke();
      }
      for (let y = majorOffsetY; y <= h * dpr; y += majorPx) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w * dpr, y);
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  const drawAxis = (ctx) => {
    ctx.save();
    ctx.setTransform(zoom * (window.devicePixelRatio || 1), 0, 0, zoom * (window.devicePixelRatio || 1), pan.x * (window.devicePixelRatio || 1), pan.y * (window.devicePixelRatio || 1));
    ctx.strokeStyle = 'rgba(0,180,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-10000, 0);
    ctx.lineTo(10000, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -10000);
    ctx.lineTo(0, 10000);
    ctx.stroke();
    ctx.restore();
  };

  const renderAll = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    renderGrid(ctx, w, h);
    drawAxis(ctx);

    ctx.save();
    ctx.setTransform(zoom * dpr, 0, 0, zoom * dpr, pan.x * zoom * dpr + w * dpr / 2, pan.y * zoom * dpr + h * dpr / 2);

    for (const s of shapes) {
      drawShape(ctx, s);
    }

    const idSet = new Set(selectedIds);
    for (const s of shapes) {
      if (!idSet.has(s.id)) continue;
      ctx.save();
      ctx.strokeStyle = '#ff6600';
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([6 / zoom, 3 / zoom]);
      ctx.globalAlpha = 0.8;
      let bx = 0, by = 0, bw = 0, bh = 0;
      if (s.type === 'line') {
        bx = Math.min(s.x1, s.x2) - 5 / zoom;
        by = Math.min(s.y1, s.y2) - 5 / zoom;
        bw = Math.abs(s.x2 - s.x1) + 10 / zoom;
        bh = Math.abs(s.y2 - s.y1) + 10 / zoom;
      } else if (s.type === 'circle') {
        bx = s.cx - s.r - 5 / zoom;
        by = s.cy - s.r - 5 / zoom;
        bw = s.r * 2 + 10 / zoom;
        bh = s.r * 2 + 10 / zoom;
      } else if (s.type === 'rect') {
        bx = s.x - 5 / zoom;
        by = s.y - 5 / zoom;
        bw = s.w + 10 / zoom;
        bh = s.h + 10 / zoom;
      } else if (s.type === 'polygon' || s.type === 'spline') {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of s.points) {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        }
        bx = minX - 5 / zoom;
        by = minY - 5 / zoom;
        bw = maxX - minX + 10 / zoom;
        bh = maxY - minY + 10 / zoom;
      } else if (s.type === 'arc') {
        bx = s.cx - s.r - 5 / zoom;
        by = s.cy - s.r - 5 / zoom;
        bw = s.r * 2 + 10 / zoom;
        bh = s.r * 2 + 10 / zoom;
      }
      ctx.strokeRect(bx, by, bw, bh);
      ctx.restore();
    }

    if (selectionRect.current) {
      const r = selectionRect.current;
      ctx.save();
      ctx.strokeStyle = '#ff6600';
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([4 / zoom, 4 / zoom]);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = 'rgba(255,102,0,0.08)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.restore();
    }

    if (tool === 'polygon' && polyPoints.current.length > 0 && isDrawing.current) {
      ctx.save();
      ctx.setLineDash([4 / zoom, 4 / zoom]);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(polyPoints.current[0].x, polyPoints.current[0].y);
      for (let i = 1; i < polyPoints.current.length; i++) {
        ctx.lineTo(polyPoints.current[i].x, polyPoints.current[i].y);
      }
      ctx.lineTo(cursorWorld.x, cursorWorld.y);
      ctx.stroke();
      ctx.restore();
    }

    if (tool === 'spline' && polyPoints.current.length > 0 && isDrawing.current) {
      const pts = [...polyPoints.current, cursorWorld];
      if (pts.length > 1) {
        ctx.save();
        ctx.setLineDash([4 / zoom, 4 / zoom]);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          const mx = (pts[i - 1].x + pts[i].x) / 2;
          const my = (pts[i - 1].y + pts[i].y) / 2;
          if (i === 1) ctx.lineTo(mx, my);
          else ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, mx, my);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.stroke();
        ctx.restore();
      }
    }

    if (isDrawing.current && drawStart.current && tool !== 'select' && tool !== 'polygon' && tool !== 'spline') {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.setLineDash([6 / zoom, 4 / zoom]);
      ctx.globalAlpha = 0.5;
      const start = drawStart.current;
      const end = cursorWorld;

      if (tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      } else if (tool === 'circle') {
        const r = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
        ctx.beginPath();
        ctx.arc(start.x, start.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (tool === 'rectangle') {
        ctx.strokeRect(Math.min(start.x, end.x), Math.min(start.y, end.y), Math.abs(end.x - start.x), Math.abs(end.y - start.y));
      } else if (tool === 'arc' && arcMid.current) {
        const mid = arcMid.current;
        const cx = (start.x + end.x + mid.x) / 3;
        const cy = (start.y + end.y + mid.y) / 3;
        const r = Math.sqrt((start.x - cx) ** 2 + (start.y - cy) ** 2);
        const a1 = Math.atan2(start.y - cy, start.x - cx);
        const a2 = Math.atan2(end.y - cy, end.x - cx);
        ctx.beginPath();
        ctx.arc(cx, cy, r, a1, a2, a2 < a1);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();
  }, [shapes, selectedIds, zoom, pan, tool, color, lineWidth, cursorWorld, showGrid, gridSize, snapToGrid]);

  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      renderAll();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { running = false; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [renderAll]);

  const getWorldPoint = useCallback((e) => {
    let cx, cy;
    if (e.touches) {
      cx = e.touches[0].clientX;
      cy = e.touches[0].clientY;
    } else {
      cx = e.clientX;
      cy = e.clientY;
    }
    let pt = screenToWorld(cx, cy);
    return { x: snap(pt.x), y: snap(pt.y), rawX: pt.x, rawY: pt.y };
  }, [screenToWorld, snap]);

  const isPointInShape = (px, py, s, threshold) => {
    const t = threshold / zoom;
    if (s.type === 'line') {
      const d = distToSegment(px, py, s.x1, s.y1, s.x2, s.y2);
      return d < t;
    } else if (s.type === 'circle') {
      const d = Math.abs(Math.sqrt((px - s.cx) ** 2 + (py - s.cy) ** 2) - s.r);
      return d < t;
    } else if (s.type === 'rect') {
      let rx = s.x, ry = s.y, rw = s.w, rh = s.h;
      if (rw < 0) { rx += rw; rw = -rw; }
      if (rh < 0) { ry += rh; rh = -rh; }
      if (px >= rx - t && px <= rx + rw + t && py >= ry - t && py <= ry + rh + t) {
        if (px >= rx + t && px <= rx + rw - t && py >= ry + t && py <= ry + rh - t) return false;
        return true;
      }
      return false;
    } else if (s.type === 'polygon' || s.type === 'spline') {
      for (let i = 0; i < s.points.length - 1; i++) {
        const d = distToSegment(px, py, s.points[i].x, s.points[i].y, s.points[i + 1].x, s.points[i + 1].y);
        if (d < t) return true;
      }
      return false;
    } else if (s.type === 'arc') {
      const d = Math.abs(Math.sqrt((px - s.cx) ** 2 + (py - s.cy) ** 2) - s.r);
      if (d < t) {
        const ang = Math.atan2(py - s.cy, px - s.cx);
        let a1 = s.a1, a2 = s.a2;
        if (a2 < a1) a2 += Math.PI * 2;
        let na = ang;
        if (na < a1) na += Math.PI * 2;
        return na >= a1 && na <= a2;
      }
      return false;
    }
    return false;
  };

  const distToSegment = (px, py, x1, y1, x2, y2) => {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    let t = ((px - x1) * dx + (py - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const nx = x1 + t * dx, ny = y1 + t * dy;
    return Math.sqrt((px - nx) ** 2 + (py - ny) ** 2);
  };

  const selectShapesAtPoint = (px, py, additive) => {
    const threshold = 10;
    let hits = [];
    for (const s of shapes) {
      if (isPointInShape(px, py, s, threshold)) {
        hits.push(s.id);
      }
    }
    if (hits.length === 0) {
      if (!additive) setSelectedIds([]);
      return;
    }
    const hit = hits[hits.length - 1];
    if (additive) {
      setSelectedIds(prev => prev.includes(hit) ? prev.filter(id => id !== hit) : [...prev, hit]);
    } else {
      setSelectedIds([hit]);
    }
  };

  const selectShapesInRect = (rx, ry, rw, rh) => {
    const ids = [];
    for (const s of shapes) {
      let bx, by, bw, bh;
      if (s.type === 'line') {
        bx = Math.min(s.x1, s.x2);
        by = Math.min(s.y1, s.y2);
        bw = Math.abs(s.x2 - s.x1);
        bh = Math.abs(s.y2 - s.y1);
      } else if (s.type === 'circle' || s.type === 'arc') {
        bx = s.cx - s.r;
        by = s.cy - s.r;
        bw = s.r * 2;
        bh = s.r * 2;
      } else if (s.type === 'rect') {
        bx = Math.min(s.x, s.x + s.w);
        by = Math.min(s.y, s.y + s.h);
        bw = Math.abs(s.w);
        bh = Math.abs(s.h);
      } else if (s.type === 'polygon' || s.type === 'spline') {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of s.points) {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        }
        bx = minX; by = minY; bw = maxX - minX; bh = maxY - minY;
      } else continue;

      if (bx + bw >= rx && bx <= rx + rw && by + bh >= ry && by <= ry + rh) {
        ids.push(s.id);
      }
    }
    setSelectedIds(ids);
  };

  const handleMouseDown = (e) => {
    if (e.button === 1) {
      e.preventDefault();
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
      return;
    }
    if (e.button === 2) return;

    const pt = getWorldPoint(e);
    setCursorWorld(pt);

    if (tool === 'select') {
      const threshold = 10;
      let hitId = null;
      for (const s of shapes) {
        if (isPointInShape(pt.x, pt.y, s, threshold)) {
          hitId = s.id;
        }
      }
      if (hitId) {
        if (e.shiftKey) {
          setSelectedIds(prev => prev.includes(hitId) ? prev.filter(id => id !== hitId) : [...prev, hitId]);
        } else if (!selectedIds.includes(hitId)) {
          setSelectedIds([hitId]);
        }
        isDragging.current = true;
        dragStart.current = { x: pt.x, y: pt.y };
        const idSet = new Set(e.shiftKey ? [...selectedIds, hitId] : [hitId]);
        if (e.shiftKey) {
          if (selectedIds.includes(hitId)) idSet.delete(hitId);
          else idSet.add(hitId);
        }
        dragShapeOrigins.current = shapes.filter(s => idSet.has(s.id)).map(s => {
          if (s.type === 'line') return { id: s.id, x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 };
          if (s.type === 'circle') return { id: s.id, cx: s.cx, cy: s.cy };
          if (s.type === 'rect') return { id: s.id, x: s.x, y: s.y };
          if (s.type === 'polygon' || s.type === 'spline') return { id: s.id, points: s.points.map(p => ({ ...p })) };
          if (s.type === 'arc') return { id: s.id, cx: s.cx, cy: s.cy };
          return null;
        }).filter(Boolean);
      } else {
        if (!e.shiftKey) setSelectedIds([]);
        selectionRect.current = { x: pt.x, y: pt.y, w: 0, h: 0 };
        isPanning.current = false;
        isDragging.current = false;
      }
      return;
    }

    isDrawing.current = true;
    if (tool === 'polygon') {
      if (polyPoints.current.length === 0) {
        polyPoints.current = [pt];
      } else {
        const first = polyPoints.current[0];
        const d = Math.sqrt((pt.x - first.x) ** 2 + (pt.y - first.y) ** 2);
        if (d < 10 / zoom && polyPoints.current.length >= 3) {
          commitShapes([...shapes, {
            id: genId(), type: 'polygon', points: [...polyPoints.current],
            color, lineWidth, fill: fillColor, closed: true, opacity: 1,
          }]);
          polyPoints.current = [];
          isDrawing.current = false;
          return;
        }
        polyPoints.current = [...polyPoints.current, pt];
      }
      return;
    }
    if (tool === 'spline') {
      polyPoints.current = [...polyPoints.current, pt];
      return;
    }
    drawStart.current = pt;
  };

  const handleMouseMove = (e) => {
    let cx, cy;
    if (e.touches) {
      cx = e.touches[0].clientX;
      cy = e.touches[0].clientY;
    } else {
      cx = e.clientX;
      cy = e.clientY;
    }

    if (isPanning.current) {
      const dx = cx - panStart.current.x;
      const dy = cy - panStart.current.y;
      setPan({ x: panStart.current.px + dx, y: panStart.current.py + dy });
      return;
    }

    const pt = getWorldPoint(e);
    setCursorWorld(pt);

    if (isDragging.current && dragStart.current && dragShapeOrigins.current.length > 0) {
      const dx = pt.x - dragStart.current.x;
      const dy = pt.y - dragStart.current.y;
      const origins = dragShapeOrigins.current;
      setShapes(prev => prev.map(s => {
        const orig = origins.find(o => o.id === s.id);
        if (!orig) return s;
        if (s.type === 'line') return { ...s, x1: orig.x1 + dx, y1: orig.y1 + dy, x2: orig.x2 + dx, y2: orig.y2 + dy };
        if (s.type === 'circle') return { ...s, cx: orig.cx + dx, cy: orig.cy + dy };
        if (s.type === 'rect') return { ...s, x: orig.x + dx, y: orig.y + dy };
        if (s.type === 'polygon' || s.type === 'spline')
          return { ...s, points: orig.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
        if (s.type === 'arc') return { ...s, cx: orig.cx + dx, cy: orig.cy + dy };
        return s;
      }));
      return;
    }

    if (selectionRect.current) {
      selectionRect.current.w = pt.x - selectionRect.current.x;
      selectionRect.current.h = pt.y - selectionRect.current.y;
      return;
    }
  };

  const handleMouseUp = (e) => {
    if (e.button === 1) {
      isPanning.current = false;
      return;
    }
    if (isDragging.current) {
      const dist = dragStart.current
        ? Math.sqrt((cursorWorld.x - dragStart.current.x) ** 2 + (cursorWorld.y - dragStart.current.y) ** 2)
        : 0;
      if (dist > 2) {
        pushUndo(shapes);
      }
      isDragging.current = false;
      dragStart.current = null;
      dragShapeOrigins.current = [];
      return;
    }

    if (selectionRect.current) {
      const r = selectionRect.current;
      const rx = Math.min(r.x, r.x + r.w);
      const ry = Math.min(r.y, r.y + r.h);
      const rw = Math.abs(r.w);
      const rh = Math.abs(r.h);
      selectShapesInRect(rx, ry, rw, rh);
      selectionRect.current = null;
      return;
    }

    if (!isDrawing.current) return;
    isDrawing.current = false;

    const { x: cx, y: cy } = screenToWorld(e.clientX, e.clientY);

    if (tool === 'polygon' || tool === 'spline') return;

    if (tool === 'arc') {
      if (!arcMid.current) {
        arcMid.current = snap({ x: cx, y: cy });
        isDrawing.current = true;
        return;
      }
    }

    const start = drawStart.current;
    if (!start) return;

    const end = { x: snap(cx), y: snap(cy) };

    let newShape = null;
    if (tool === 'line') {
      if (Math.abs(end.x - start.x) < 1 && Math.abs(end.y - start.y) < 1) { drawStart.current = null; return; }
      newShape = { id: genId(), type: 'line', x1: start.x, y1: start.y, x2: end.x, y2: end.y, color, lineWidth, opacity: 1 };
    } else if (tool === 'circle') {
      const r = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
      if (r < 2) { drawStart.current = null; arcMid.current = null; return; }
      newShape = { id: genId(), type: 'circle', cx: start.x, cy: start.y, r, color, lineWidth, fill: fillColor, opacity: 1 };
    } else if (tool === 'rectangle') {
      if (Math.abs(end.x - start.x) < 2 && Math.abs(end.y - start.y) < 2) { drawStart.current = null; return; }
      newShape = { id: genId(), type: 'rect', x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), w: Math.abs(end.x - start.x), h: Math.abs(end.y - start.y), color, lineWidth, fill: fillColor, opacity: 1 };
    } else if (tool === 'arc') {
      const mid = arcMid.current;
      if (!mid) { drawStart.current = null; arcMid.current = null; return; }
      const ax = (start.x + end.x + mid.x) / 3;
      const ay = (start.y + end.y + mid.y) / 3;
      const ar = Math.sqrt((start.x - ax) ** 2 + (start.y - ay) ** 2);
      if (ar < 2) { drawStart.current = null; arcMid.current = null; return; }
      const a1 = Math.atan2(start.y - ay, start.x - ax);
      const a2 = Math.atan2(end.y - ay, end.x - ax);
      newShape = { id: genId(), type: 'arc', cx: ax, cy: ay, r: ar, a1, a2, color, lineWidth, opacity: 1 };
    }

    if (newShape) {
      commitShapes([...shapes, newShape]);
    }
    drawStart.current = null;
    arcMid.current = null;
  };

  const handleDoubleClick = (e) => {
    if (tool === 'polygon' && polyPoints.current.length >= 3) {
      const pt = getWorldPoint(e);
      polyPoints.current.push(pt);
      commitShapes([...shapes, {
        id: genId(), type: 'polygon', points: [...polyPoints.current],
        color, lineWidth, fill: fillColor, closed: true, opacity: 1,
      }]);
      polyPoints.current = [];
      isDrawing.current = false;
      return;
    }
    if (tool === 'spline' && polyPoints.current.length >= 2) {
      const pt = getWorldPoint(e);
      polyPoints.current.push(pt);
      commitShapes([...shapes, {
        id: genId(), type: 'spline', points: [...polyPoints.current],
        color, lineWidth, opacity: 1,
      }]);
      polyPoints.current = [];
      isDrawing.current = false;
      return;
    }
    if (tool === 'select') {
      const pt = getWorldPoint(e);
      selectShapesAtPoint(pt.x, pt.y, e.shiftKey);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const worldBefore = screenToWorld(e.clientX, e.clientY);

    const factor = e.deltaY > 0 ? 0.91 : 1.1;
    const newZoom = Math.max(0.01, Math.min(200, zoom * factor));
    setZoom(newZoom);

    const worldAfter = screenToWorld(e.clientX, e.clientY);
    setPan(prev => ({
      x: prev.x + (worldAfter.x - worldBefore.x) * newZoom,
      y: prev.y + (worldAfter.y - worldBefore.y) * newZoom,
    }));
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoom, pan, screenToWorld]);

  const exportSVG = () => {
    let svg = `<svg xmlns="http://www.w3.org/2000/svg">`;
    for (const s of shapes) {
      const c = s.color || '#000';
      const lw = s.lineWidth || 2;
      const fill = s.fill && s.fill !== 'none' ? ` fill="${s.fill}" fill-opacity="0.3"` : ' fill="none"';
      if (s.type === 'line') svg += `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="${c}" stroke-width="${lw}" stroke-linecap="round"/>`;
      else if (s.type === 'circle') svg += `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" stroke="${c}" stroke-width="${lw}"${fill}/>`;
      else if (s.type === 'rect') svg += `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" stroke="${c}" stroke-width="${lw}"${fill}/>`;
      else if (s.type === 'polygon') svg += `<polygon points="${s.points.map(p => `${p.x},${p.y}`).join(' ')}" stroke="${c}" stroke-width="${lw}"${fill}/>`;
      else if (s.type === 'spline') svg += `<polyline points="${s.points.map(p => `${p.x},${p.y}`).join(' ')}" stroke="${c}" stroke-width="${lw}" fill="none"/>`;
      else if (s.type === 'arc') svg += `<path d="M${s.cx + s.r * Math.cos(s.a1)},${s.cy + s.r * Math.sin(s.a1)} A${s.r},${s.r} 0 0,${s.a2 < s.a1 ? 0 : 1} ${s.cx + s.r * Math.cos(s.a2)},${s.cy + s.r * Math.sin(s.a2)}" stroke="${c}" stroke-width="${lw}" fill="none"/>`;
    }
    svg += `</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'vector-cad.svg'; a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onCtx = (e) => e.preventDefault();
    container.addEventListener('contextmenu', onCtx);
    return () => container.removeEventListener('contextmenu', onCtx);
  }, []);

  const tools = [
    { id: 'select', label: '选择', icon: '⊹', key: 'V' },
    { id: 'line', label: '直线', icon: '╲', key: 'L' },
    { id: 'circle', label: '圆', icon: '○', key: 'C' },
    { id: 'rectangle', label: '矩形', icon: '▭', key: 'R' },
    { id: 'arc', label: '弧线', icon: '⌒', key: 'A' },
    { id: 'polygon', label: '多边形', icon: '⬠', key: 'P' },
    { id: 'spline', label: '曲线', icon: '〜', key: 'S' },
  ];

  return (
    <div className="flex flex-col w-full h-full bg-[#0a0d14] overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1 bg-gray-900/80 border-b border-white/5 shrink-0 flex-wrap">
        {tools.map(t => (
          <button
            key={t.id}
            onClick={() => {
              setTool(t.id);
              polyPoints.current = [];
              arcMid.current = null;
              isDrawing.current = false;
              selectionRect.current = null;
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all ${
              tool === t.id
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
            }`}
            title={`${t.label} (${t.key})`}
          >
            <span className="text-[10px]">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}

        <div className="w-px h-5 bg-white/10 mx-1" />

        <label className="flex items-center gap-1 text-[10px] text-gray-400">
          <span>描边</span>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
          />
        </label>
        <label className="flex items-center gap-1 text-[10px] text-gray-400">
          <span>填充</span>
          <input
            type="color"
            value={fillColor || '#000000'}
            onChange={(e) => setFillColor(e.target.value === '#000000' ? '' : e.target.value)}
            className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
          />
          {fillColor && (
            <button onClick={() => setFillColor('')} className="text-[8px] text-red-400 hover:text-red-300 ml-0.5">✕</button>
          )}
        </label>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <span>线宽</span>
          <input
            type="range" min="1" max="20" value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="w-12 h-1 accent-blue-400"
          />
          <span className="text-blue-400 font-mono w-5">{lineWidth}</span>
        </div>

        <div className="w-px h-5 bg-white/10 mx-1" />

        {selectedIds.length > 0 && (
          <button
            onClick={deleteSelected}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
          >
            <span>✕</span>
            <span>删除({selectedIds.length})</span>
          </button>
        )}

        <div className="w-px h-5 bg-white/10 mx-1" />

        <button
          onClick={() => {
            if (undoStack.length === 0) return;
            const prev = undoStack[undoStack.length - 1];
            setRedoStack(rs => [...rs, shapes]);
            setUndoStack(us => us.slice(0, -1));
            setShapes(prev);
            setSelectedIds([]);
          }}
          disabled={undoStack.length === 0}
          className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
            undoStack.length > 0
              ? 'text-gray-300 hover:bg-white/5 hover:text-white'
              : 'text-gray-600 cursor-not-allowed'
          }`}
          title="撤销 (Ctrl+Z)"
        >
          ↶ 撤销
        </button>
        <button
          onClick={() => {
            if (redoStack.length === 0) return;
            const next = redoStack[redoStack.length - 1];
            setUndoStack(us => [...us, shapes]);
            setRedoStack(rs => rs.slice(0, -1));
            setShapes(next);
            setSelectedIds([]);
          }}
          disabled={redoStack.length === 0}
          className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
            redoStack.length > 0
              ? 'text-gray-300 hover:bg-white/5 hover:text-white'
              : 'text-gray-600 cursor-not-allowed'
          }`}
          title="恢复 (Ctrl+Y)"
        >
          ↷ 恢复
        </button>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <button
          onClick={exportSVG}
          className="px-2 py-1 rounded text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/10 transition-all"
          title="导出SVG (Ctrl+S)"
        >
          ⬇ SVG
        </button>

        <div className="flex items-center gap-1 ml-auto">
          <label className="flex items-center gap-1 text-[10px] text-gray-400">
            <span>吸附</span>
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={(e) => setSnapToGrid(e.target.checked)}
              className="w-3 h-3 accent-blue-400"
            />
          </label>
          <label className="flex items-center gap-1 text-[10px] text-gray-400">
            <span>网格</span>
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="w-3 h-3 accent-blue-400"
            />
          </label>
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <span>大小</span>
            <input
              type="range" min="5" max="100" value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value))}
              className="w-12 h-1 accent-blue-400"
            />
            <span className="text-blue-400 font-mono w-6">{gridSize}</span>
          </div>
          <span className="text-[10px] text-gray-500 font-mono ml-1">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 relative w-full overflow-hidden"
        style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onTouchStart={(e) => {
          if (e.touches.length === 1) {
            handleMouseDown({ ...e.touches[0], button: 0, touches: e.touches });
          }
        }}
        onTouchMove={(e) => {
          if (e.touches.length === 1) {
            e.preventDefault();
            handleMouseMove({ ...e.touches[0], touches: e.touches });
          }
        }}
        onTouchEnd={(e) => {
          handleMouseUp({ button: 0 });
        }}
      >
        <canvas
          ref={canvasRef}
          className="block absolute top-0 left-0"
        />
        {tool !== 'select' && tool !== 'polygon' && tool !== 'spline' && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 bg-gray-900/70 px-2 py-1 rounded pointer-events-none">
            {tool === 'arc' && !arcMid.current ? '点击设置弧线中点' : '拖拽创建图形 · 滚轮缩放 · 空格拖拽平移'}
          </div>
        )}
        {tool === 'polygon' && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 bg-gray-900/70 px-2 py-1 rounded pointer-events-none">
            {polyPoints.current.length === 0 ? '点击添加顶点 · 双击闭合' : `顶点: ${polyPoints.current.length} · 双击或点击起点闭合`}
          </div>
        )}
        {tool === 'spline' && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 bg-gray-900/70 px-2 py-1 rounded pointer-events-none">
            {polyPoints.current.length === 0 ? '点击添加控制点 · 双击完成' : `控制点: ${polyPoints.current.length} · 双击完成曲线`}
          </div>
        )}
      </div>
    </div>
  );
};

export default VectorCadTab;
