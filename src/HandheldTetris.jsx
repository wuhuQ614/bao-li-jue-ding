import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const COLS = 10;
const ROWS = 20;
const EMPTY_CELL = null;

const BLOCK_TYPES = ['I', 'L', 'J', 'Z', 'S', 'O', 'T'];

const BLOCK_SHAPES = {
  I: [[1, 1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  Z: [[1, 1, 0], [0, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
};

const ORIGINS = {
  I: [-1, 3],
  L: [0, 3],
  J: [0, 3],
  Z: [0, 3],
  S: [0, 3],
  O: [-1, 4],
  T: [0, 3],
};

const SRS_I_KICKS = {
  '0>1': [[0,0], [0,-2], [0,1], [1,-2], [-2,1]],
  '1>2': [[0,0], [0,-1], [0,2], [-2,-1], [1,2]],
  '2>3': [[0,0], [0,2], [0,-1], [-1,2], [2,-1]],
  '3>0': [[0,0], [0,1], [0,-2], [2,1], [-1,-2]],
};

const SRS_JLSTZ_KICKS = {
  '0>1': [[0,0], [0,-1], [-1,-1], [2,0], [2,-1]],
  '1>2': [[0,0], [0,1], [1,1], [-2,0], [-2,1]],
  '2>3': [[0,0], [0,1], [-1,1], [2,0], [2,1]],
  '3>0': [[0,0], [0,-1], [1,-1], [-2,0], [-2,-1]],
};

const SPEEDS = [800, 650, 500, 370, 250, 160];
const DELAYS = [50, 60, 70, 80, 90, 100];
const CLEAR_POINTS = [100, 300, 700, 1500];
const EACH_LINES = 20;
const MAX_POINT = 999999;
const STORAGE_KEY = 'REACT_TETRIS';

const getRandomType = () => BLOCK_TYPES[Math.floor(Math.random() * BLOCK_TYPES.length)];

const rotateShape = (shape) => {
  const rows = shape.length;
  const cols = shape[0].length;
  if (rows === 2 && cols === 2) return shape;
  const result = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      result[c][rows - 1 - r] = shape[r][c];
    }
  }
  return result;
};

const generateStartMatrix = (startLines) => {
  const getLine = (min, max) => {
    const count = Math.floor(Math.random() * (max - min + 1)) + min;
    const line = Array(COLS).fill(0);
    const pool = Array.from({ length: COLS }, (_, i) => i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    for (let i = 0; i < count; i++) line[pool[i]] = 1;
    return line;
  };
  const result = [];
  for (let i = 0; i < startLines; i++) {
    if (i <= 2) result.push(getLine(5, 8));
    else if (i <= 6) result.push(getLine(4, 9));
    else result.push(getLine(3, 9));
  }
  while (result.length < ROWS) result.unshift(Array(COLS).fill(0));
  return result;
};

const Controller = ({ style, onDown, onUp, children }) => {
  const holdRef = useRef(null);
  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    onDown?.();
    holdRef.current = setTimeout(() => {
      const step = () => {
        onDown?.();
        holdRef.current = setTimeout(step, 100);
      };
      holdRef.current = setTimeout(step, 200);
    }, 200);
  }, [onDown]);
  const onPointerUp = useCallback((e) => {
    e.preventDefault();
    clearTimeout(holdRef.current);
    holdRef.current = null;
    onUp?.();
  }, [onUp]);
  const onPointerLeave = useCallback(() => {
    if (holdRef.current) {
      clearTimeout(holdRef.current);
      holdRef.current = null;
      onUp?.();
    }
  }, [onUp]);
  return (
    <div
      style={style}
      onMouseDown={onPointerDown}
      onMouseUp={onPointerUp}
      onMouseLeave={onPointerLeave}
      onTouchStart={onPointerDown}
      onTouchEnd={onPointerUp}
    >
      {children}
    </div>
  );
};

const DIGITS = {
  0: [[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
  1: [[0,0,1],[0,0,1],[0,0,1],[0,0,1],[0,0,1]],
  2: [[1,1,1],[0,0,1],[1,1,1],[1,0,0],[1,1,1]],
  3: [[1,1,1],[0,0,1],[1,1,1],[0,0,1],[1,1,1]],
  4: [[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1]],
  5: [[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
  6: [[1,1,1],[1,0,0],[1,1,1],[1,0,1],[1,1,1]],
  7: [[1,1,1],[0,0,1],[0,0,1],[0,0,1],[0,0,1]],
  8: [[1,1,1],[1,0,1],[1,1,1],[1,0,1],[1,1,1]],
  9: [[1,1,1],[1,0,1],[1,1,1],[0,0,1],[1,1,1]],
};

const DOT = { width: 4, height: 4, background: '#879372', border: 'none' };
const DOT_C = { width: 4, height: 4, background: '#000', border: 'none' };
const DOT_D = { width: 4, height: 4, background: '#560000', border: 'none' };
const GAP = 1;

const renderNumber = (num, length, opts = {}) => {
  const str = String(num).padStart(length || String(num).length, '0');
  const totalCols = str.length * (3 + GAP) - GAP;
  const totalRows = 5;
  const dotMap = opts.color ? (() => {
    const map = {};
    if (opts.color === 'c') map[1] = DOT_C;
    else if (opts.color === 'd') map[1] = DOT_D;
    return map;
  })() : { 1: DOT };
  return (
    <div style={{ display: 'inline-grid', gridTemplateColumns: `repeat(${totalCols}, 4px)`, gap: `${GAP}px` }}>
      {Array.from({ length: totalRows }, (_, ri) => {
        const rowEls = [];
        for (let di = 0; di < str.length; di++) {
          if (di > 0) rowEls.push(<div key={`g-${ri}-${di}`} style={{ width: 4, height: 4 }} />);
          const digit = DIGITS[str[di]];
          for (let ci = 0; ci < 3; ci++) {
            const v = digit[ri][ci];
            const s = dotMap[v] || {};
            rowEls.push(<div key={`d-${ri}-${di}-${ci}`} style={s} />);
          }
        }
        return rowEls;
      })}
    </div>
  );
};

const HandheldTetris = ({ onBack, onGameModeChange }) => {
  const [board, setBoard] = useState(() => Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY_CELL)));
  const [currentPiece, setCurrentPiece] = useState(null);
  const [nextType, setNextType] = useState(getRandomType());
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [maxScore, setMaxScore] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY))?.max || 0;
    } catch { return 0; }
  });
  const [startLines, setStartLines] = useState(0);
  const [speedLevel, setSpeedLevel] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY))?.speedStart ?? 2;
    } catch { return 2; }
  });
  const [resetTrigger, setResetTrigger] = useState(false);
  const [dropAnim, setDropAnim] = useState(false);
  const [overAnimating, setOverAnimating] = useState(false);
  const [banner, setBanner] = useState('');
  const [keyPressed, setKeyPressed] = useState({});

  const boardRef = useRef(board);
  const pieceRef = useRef(currentPiece);
  const nextRef = useRef(nextType);
  const scoreRef = useRef(score);
  const levelRef = useRef(level);
  const linesRef = useRef(lines);
  const overRef = useRef(gameOver);
  const playRef = useRef(isPlaying);
  const pauseRef = useRef(isPaused);
  const musicRef = useRef(musicEnabled);
  const maxRef = useRef(maxScore);
  const startLinesRef = useRef(startLines);
  const speedRef = useRef(speedLevel);
  const dropTimerRef = useRef(null);
  const overTimerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const canvasRef = useRef(null);
  const particleRef = useRef(null);
  const animLockRef = useRef(false);
  const dropAnimTimerRef = useRef(null);
  const lockPieceFnRef = useRef(null);
  const triggerOverAnimFnRef = useRef(null);

  const saveData = useCallback(() => {
    try {
      const d = {
        max: maxRef.current,
        startLines: startLinesRef.current,
        speedStart: speedRef.current,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    } catch {}
  }, []);

  const ensureCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      try { audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
    }
    return audioCtxRef.current;
  }, []);

  const fx = useCallback((name) => {
    if (!musicRef.current) return;
    const ctx = ensureCtx();
    if (!ctx) return;
    const play = () => {
      const now = ctx.currentTime;
      try {
        switch (name) {
          case 'clear': {
            [523, 659, 784, 1047].forEach((freq, i) => {
              const o = ctx.createOscillator();
              const g = ctx.createGain();
              o.type = 'square';
              o.frequency.value = freq;
              g.gain.setValueAtTime(0.08, now + i * 0.07);
              g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.12);
              o.connect(g); g.connect(ctx.destination);
              o.start(now + i * 0.07); o.stop(now + i * 0.07 + 0.12);
            });
            break;
          }
          case 'rotate': {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'square';
            o.frequency.setValueAtTime(440, now);
            o.frequency.exponentialRampToValueAtTime(880, now + 0.04);
            g.gain.setValueAtTime(0.06, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
            o.connect(g); g.connect(ctx.destination);
            o.start(now); o.stop(now + 0.06);
            break;
          }
          case 'move': {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'square';
            o.frequency.value = 220;
            g.gain.setValueAtTime(0.04, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
            o.connect(g); g.connect(ctx.destination);
            o.start(now); o.stop(now + 0.03);
            break;
          }
          case 'fall': {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'triangle';
            o.frequency.setValueAtTime(300, now);
            o.frequency.exponentialRampToValueAtTime(80, now + 0.12);
            g.gain.setValueAtTime(0.1, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            o.connect(g); g.connect(ctx.destination);
            o.start(now); o.stop(now + 0.12);
            break;
          }
          case 'gameover': {
            [440, 370, 311, 261].forEach((freq, i) => {
              const o = ctx.createOscillator();
              const g = ctx.createGain();
              o.type = 'sawtooth';
              o.frequency.value = freq;
              g.gain.setValueAtTime(0.06, now + i * 0.18);
              g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.18 + 0.25);
              o.connect(g); g.connect(ctx.destination);
              o.start(now + i * 0.18); o.stop(now + i * 0.18 + 0.25);
            });
            break;
          }
          case 'start': {
            [262, 330, 392, 523].forEach((freq, i) => {
              const o = ctx.createOscillator();
              const g = ctx.createGain();
              o.type = 'square';
              o.frequency.value = freq;
              g.gain.setValueAtTime(0.06, now + i * 0.09);
              g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.12);
              o.connect(g); g.connect(ctx.destination);
              o.start(now + i * 0.09); o.stop(now + i * 0.09 + 0.12);
            });
            break;
          }
        }
      } catch {}
    };
    if (ctx.state === 'suspended') {
      ctx.resume().then(play);
    } else {
      play();
    }
  }, [ensureCtx]);

  const collide = useCallback((piece) => {
    if (!piece) return true;
    const { shape, xy } = piece;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const ny = xy[0] + r, nx = xy[1] + c;
          if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
          if (ny >= 0 && boardRef.current[ny][nx]) return true;
        }
      }
    }
    return false;
  }, []);

  const clearKeys = useCallback(() => setKeyPressed({}), []);

  const fireParticles = useCallback((rows, snap) => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const cw = cvs.width, ch = cvs.height;
    const cwCell = cw / COLS, chCell = ch / ROWS;
    const ps = [];
    rows.forEach(row => {
      for (let c = 0; c < COLS; c++) {
        if (snap[row][c]) {
          for (let i = 0; i < 3; i++) {
            ps.push({
              x: c * cwCell + cwCell / 2, y: row * chCell + chCell / 2,
              vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4 - 2,
              life: 1, decay: 0.015 + Math.random() * 0.025, color: '#000',
              size: cwCell * (0.3 + Math.random() * 0.4),
            });
          }
        }
      }
    });
    const run = () => {
      ctx.clearRect(0, 0, cw, ch);
      let alive = false;
      ps.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life -= p.decay;
        if (p.life > 0) { alive = true; ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
      });
      ctx.globalAlpha = 1;
      if (alive) particleRef.current = requestAnimationFrame(run);
      else { particleRef.current = null; ctx.clearRect(0, 0, cw, ch); }
    };
    if (particleRef.current) cancelAnimationFrame(particleRef.current);
    run();
  }, []);

  const triggerOverAnim = useCallback(() => {
    setOverAnimating(true);
    const base = boardRef.current.map(r => [...r]);
    const fills = ['#efcc19', '#f0d000', '#e8c800', '#9ead86', '#8a9e76', '#7d8e6a'];
    let r = 0;
    const step = () => {
      if (r >= ROWS) { overTimerRef.current = setTimeout(() => { setOverAnimating(false); setBanner(''); }, 500); return; }
      const db = base.map(rr => [...rr]);
      for (let c = 0; c < COLS; c++) db[r][c] = fills[r % fills.length];
      setBoard(db);
      r++;
      overTimerRef.current = setTimeout(step, 50);
    };
    step();
  }, []);

  const spawnNext = useCallback(() => {
    const next = nextRef.current;
    const newNext = getRandomType();
    nextRef.current = newNext;
    setNextType(newNext);
    const p = {
      type: next,
      shape: BLOCK_SHAPES[next].map(r => [...r]),
      xy: [...ORIGINS[next]],
      rotateIndex: 0,
      timeStamp: Date.now(),
    };
    pieceRef.current = p;
    setCurrentPiece(p);
    if (collide(p)) {
      pieceRef.current = null;
      setCurrentPiece(null);
      overRef.current = true;
      setGameOver(true);
      setIsPlaying(false);
      playRef.current = false;
      clearKeys();
      fx('gameover');
      triggerOverAnimFnRef.current?.();
    }
  }, [collide, clearKeys, fx]);

  const startFall = useCallback(() => {
    clearTimeout(dropTimerRef.current);
    dropTimerRef.current = null;
    if (!playRef.current || overRef.current || pauseRef.current) return;
    const si = Math.min(speedRef.current - 1 + levelRef.current - 1, SPEEDS.length - 1);
    const interval = SPEEDS[si];
    dropTimerRef.current = setTimeout(() => {
      if (!playRef.current || overRef.current || pauseRef.current) return;
      const piece = pieceRef.current;
      if (!piece) return;
      const next = { ...piece, xy: [piece.xy[0] + 1, piece.xy[1]] };
      if (!collide(next)) {
        next.timeStamp = Date.now();
        pieceRef.current = next;
        setCurrentPiece(next);
        startFall();
      } else {
        setDropAnim(true);
        dropAnimTimerRef.current = setTimeout(() => setDropAnim(false), 100);
        lockPieceFnRef.current?.();
      }
    }, interval);
  }, [collide]);

  const lockPiece = useCallback(() => {
    if (animLockRef.current) return;
    const piece = pieceRef.current;
    if (!piece) return;
    const nb = boardRef.current.map(r => [...r]);
    const { shape, xy } = piece;
    shape.forEach((row, r) => row.forEach((v, c) => {
      if (v) {
        const ny = xy[0] + r, nx = xy[1] + c;
        if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) nb[ny][nx] = 1;
      }
    }));
    const cleared = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      if (nb[r].every(v => v)) cleared.push(r);
    }
    const snap = nb.map(r => [...r]);
    if (cleared.length) {
      cleared.sort((a, b) => b - a).forEach(row => { nb.splice(row, 1); });
      while (nb.length < ROWS) nb.unshift(Array(COLS).fill(EMPTY_CELL));
    }
    boardRef.current = nb;
    setBoard(nb.map(r => [...r]));
    if (overRef.current) return;

    if (cleared.length) {
      fireParticles(cleared, snap);
      fx('clear');
      const newLines = linesRef.current + cleared.length;
      const newLevel = Math.floor(newLines / EACH_LINES) + 1;
      const pts = CLEAR_POINTS[Math.min(cleared.length - 1, 3)] * newLevel;
      let ns = Math.min(scoreRef.current + pts, MAX_POINT);
      linesRef.current = newLines;
      scoreRef.current = ns;
      levelRef.current = newLevel;
      setLines(newLines);
      setScore(ns);
      setLevel(newLevel);
      if (ns > maxRef.current) { maxRef.current = ns; setMaxScore(ns); saveData(); }
      setBanner(cleared.length >= 4 ? 'Tetris' : cleared.length === 3 ? 'Good' : cleared.length === 2 ? 'Nice' : '');
      setTimeout(() => setBanner(''), 800);
    }

    if (boardRef.current[0].some(v => v)) {
      overRef.current = true;
      setGameOver(true);
      setIsPlaying(false);
      playRef.current = false;
      clearTimeout(dropTimerRef.current);
      dropTimerRef.current = null;
      clearKeys();
      fx('gameover');
      triggerOverAnim();
      return;
    }
    spawnNext();
    startFall();
  }, [collide, clearKeys, fx, saveData, spawnNext, startFall]);

  const moveLeftFn = useCallback(() => {
    if (!playRef.current || overRef.current || pauseRef.current) return;
    const p = pieceRef.current;
    if (!p) return;
    const n = { ...p, xy: [p.xy[0], p.xy[1] - 1] };
    if (!collide(n)) {
      const d = DELAYS[Math.min(speedRef.current - 1 + levelRef.current - 1, DELAYS.length - 1)];
      n.timeStamp = Date.now() + parseInt(d, 10);
      pieceRef.current = n;
      setCurrentPiece(n);
      fx('move');
    }
  }, [collide, fx]);

  const moveRightFn = useCallback(() => {
    if (!playRef.current || overRef.current || pauseRef.current) return;
    const p = pieceRef.current;
    if (!p) return;
    const n = { ...p, xy: [p.xy[0], p.xy[1] + 1] };
    if (!collide(n)) {
      const d = DELAYS[Math.min(speedRef.current - 1 + levelRef.current - 1, DELAYS.length - 1)];
      n.timeStamp = Date.now() + parseInt(d, 10);
      pieceRef.current = n;
      setCurrentPiece(n);
      fx('move');
    }
  }, [collide, fx]);

  const moveDownFn = useCallback(() => {
    if (!playRef.current || overRef.current || pauseRef.current) return;
    const p = pieceRef.current;
    if (!p) return;
    const n = { ...p, xy: [p.xy[0] + 1, p.xy[1]] };
    if (!collide(n)) {
      n.timeStamp = Date.now();
      pieceRef.current = n;
      setCurrentPiece(n);
      fx('move');
      startFall();
    } else {
      lockPiece();
    }
  }, [collide, fx, lockPiece, startFall]);

  const rotateFn = useCallback(() => {
    if (!playRef.current || overRef.current || pauseRef.current) return;
    const p = pieceRef.current;
    if (!p || p.type === 'O') return;
    const rs = rotateShape(p.shape);
    const curState = p.rotateIndex % 4;
    const nextState = (curState + 1) % 4;
    const key = `${curState}>${nextState}`;
    const kicks = p.type === 'I' ? SRS_I_KICKS[key] : SRS_JLSTZ_KICKS[key];
    for (let i = 0; i < kicks.length; i++) {
      const [dr, dc] = kicks[i];
      const n = {
        ...p,
        shape: rs,
        xy: [p.xy[0] + dr, p.xy[1] + dc],
        rotateIndex: nextState,
      };
      if (!collide(n)) {
        n.timeStamp = Date.now();
        pieceRef.current = n;
        setCurrentPiece(n);
        fx('rotate');
        return;
      }
    }
  }, [collide, fx]);

  const hardDropFn = useCallback(() => {
    if (!playRef.current || overRef.current || pauseRef.current || animLockRef.current) return;
    const p = pieceRef.current;
    if (!p) return;
    animLockRef.current = true;
    let idx = 0;
    let bottom = { ...p, xy: [p.xy[0] + idx, p.xy[1]] };
    while (!collide({ ...bottom, xy: [bottom.xy[0] + 1, bottom.xy[1]] })) {
      idx++;
      bottom = { ...p, xy: [p.xy[0] + idx, p.xy[1]] };
    }
    bottom.timeStamp = Date.now();
    pieceRef.current = bottom;
    setCurrentPiece(bottom);
    fx('fall');
    setDropAnim(true);
    dropAnimTimerRef.current = setTimeout(() => setDropAnim(false), 100);
    clearTimeout(dropTimerRef.current);
    dropTimerRef.current = null;
    animLockRef.current = false;
    lockPiece();
  }, [collide, fx, lockPiece]);

  const togglePauseFn = useCallback(() => {
    if (!playRef.current || overRef.current) return;
    const np = !pauseRef.current;
    pauseRef.current = np;
    setIsPaused(np);
    if (np) {
      clearTimeout(dropTimerRef.current);
      dropTimerRef.current = null;
    } else {
      startFall();
    }
  }, [startFall]);

  const toggleMusicFn = useCallback(() => {
    const n = !musicRef.current;
    musicRef.current = n;
    setMusicEnabled(n);
  }, []);

  const resetFn = useCallback(() => {
    clearTimeout(dropTimerRef.current);
    clearTimeout(overTimerRef.current);
    clearTimeout(dropAnimTimerRef.current);
    if (particleRef.current) cancelAnimationFrame(particleRef.current);
    dropTimerRef.current = null;
    overTimerRef.current = null;
    dropAnimTimerRef.current = null;
    particleRef.current = null;
    animLockRef.current = false;
    const eb = Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY_CELL));
    boardRef.current = eb;
    setBoard(eb);
    pieceRef.current = null;
    setCurrentPiece(null);
    nextRef.current = getRandomType();
    setNextType(nextRef.current);
    scoreRef.current = 0; levelRef.current = 1; linesRef.current = 0;
    overRef.current = false; playRef.current = false; pauseRef.current = false;
    setScore(0); setLevel(1); setLines(0);
    setGameOver(false); setIsPlaying(false); setIsPaused(false);
    setResetTrigger(true);
    setOverAnimating(false);
    setKeyPressed({});
    setTimeout(() => setResetTrigger(false), 500);
  }, []);

  const startFn = useCallback(() => {
    clearTimeout(dropTimerRef.current);
    clearTimeout(overTimerRef.current);
    if (particleRef.current) cancelAnimationFrame(particleRef.current);
    dropTimerRef.current = null;
    overTimerRef.current = null;
    particleRef.current = null;
    animLockRef.current = false;
    const m = generateStartMatrix(startLinesRef.current);
    boardRef.current = m.map(r => [...r]);
    setBoard(m);
    scoreRef.current = 0; levelRef.current = 1; linesRef.current = 0;
    overRef.current = false; playRef.current = true; pauseRef.current = false;
    setScore(0); setLevel(1); setLines(0);
    setGameOver(false); setIsPlaying(true); setIsPaused(false);
    setResetTrigger(false); setOverAnimating(false);
    saveData();
    const firstType = getRandomType();
    nextRef.current = firstType; setNextType(firstType);
    fx('start');
    spawnNext();
    startFall();
  }, [fx, saveData, spawnNext, startFall]);

  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { pieceRef.current = currentPiece; }, [currentPiece]);
  useEffect(() => { nextRef.current = nextType; }, [nextType]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { linesRef.current = lines; }, [lines]);
  useEffect(() => { overRef.current = gameOver; }, [gameOver]);
  useEffect(() => { playRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { pauseRef.current = isPaused; }, [isPaused]);
  useEffect(() => { musicRef.current = musicEnabled; }, [musicEnabled]);
  useEffect(() => { maxRef.current = maxScore; }, [maxScore]);
  useEffect(() => { startLinesRef.current = startLines; }, [startLines]);
  useEffect(() => { speedRef.current = speedLevel; }, [speedLevel]);
  useEffect(() => { lockPieceFnRef.current = lockPiece; }, [lockPiece]);
  useEffect(() => { triggerOverAnimFnRef.current = triggerOverAnim; }, [triggerOverAnim]);

  useEffect(() => {
    if (onGameModeChange) onGameModeChange(true);
    return () => { if (onGameModeChange) onGameModeChange(false); };
  }, [onGameModeChange]);

  useEffect(() => {
    return () => {
      clearTimeout(dropTimerRef.current);
      clearTimeout(overTimerRef.current);
      if (particleRef.current) cancelAnimationFrame(particleRef.current);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.metaKey) return;
      if (!playRef.current || overRef.current || overAnimating) {
        const k = e.key;
        if (e.repeat && (k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight')) {
          e.preventDefault();
          if (k === 'ArrowUp') { const v = Math.min(10, startLinesRef.current + 1); startLinesRef.current = v; setStartLines(v); }
          else if (k === 'ArrowDown') { const v = Math.max(0, startLinesRef.current - 1); startLinesRef.current = v; setStartLines(v); }
          else if (k === 'ArrowLeft') { const v = Math.max(1, speedRef.current - 1); speedRef.current = v; setSpeedLevel(v); }
          else if (k === 'ArrowRight') { const v = Math.min(6, speedRef.current + 1); speedRef.current = v; setSpeedLevel(v); }
          return;
        }
        if (k === 'ArrowUp') { e.preventDefault(); const v = Math.min(10, startLinesRef.current + 1); startLinesRef.current = v; setStartLines(v); return; }
        if (k === 'ArrowDown') { e.preventDefault(); const v = Math.max(0, startLinesRef.current - 1); startLinesRef.current = v; setStartLines(v); return; }
        if (k === 'ArrowLeft') { e.preventDefault(); const v = Math.max(1, speedRef.current - 1); speedRef.current = v; setSpeedLevel(v); return; }
        if (k === 'ArrowRight') { e.preventDefault(); const v = Math.min(6, speedRef.current + 1); speedRef.current = v; setSpeedLevel(v); return; }
        if (e.key === 'r' || e.key === 'R') { e.preventDefault(); startFn(); }
        if (e.key === 'p' || e.key === 'P') { e.preventDefault(); startFn(); }
        if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); startFn(); }
        return;
      }
      const k = e.key;
      if (e.repeat) {
        if (k === 'ArrowDown') { e.preventDefault(); moveDownFn(); }
        else if (k === 'ArrowLeft') { e.preventDefault(); moveLeftFn(); }
        else if (k === 'ArrowRight') { e.preventDefault(); moveRightFn(); }
        return;
      }
      setKeyPressed(prev => ({ ...prev, [k]: true }));
      switch (k) {
        case 'ArrowLeft': e.preventDefault(); moveLeftFn(); break;
        case 'ArrowRight': e.preventDefault(); moveRightFn(); break;
        case 'ArrowDown': e.preventDefault(); moveDownFn(); break;
        case 'ArrowUp': e.preventDefault(); rotateFn(); break;
        case ' ': case 'Spacebar':
          e.preventDefault();
          if (!animLockRef.current) hardDropFn();
          break;
        case 'p': case 'P': e.preventDefault(); togglePauseFn(); break;
        case 'r': case 'R': e.preventDefault(); resetFn(); break;
        case 's': case 'S': e.preventDefault(); toggleMusicFn(); break;
      }
    };
    const handleKeyUp = (e) => {
      const k = e.key;
      setKeyPressed(prev => { const n = { ...prev }; delete n[k]; return n; });
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    if (isPaused && playRef.current && !overRef.current) {
      clearTimeout(dropTimerRef.current);
      dropTimerRef.current = null;
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying, isPaused, gameOver, overAnimating, moveLeftFn, moveRightFn, moveDownFn, rotateFn, hardDropFn, togglePauseFn, toggleMusicFn, resetFn, startFn]);

  const displayBoard = useMemo(() => {
    const db = board.map(r => [...r]);
    const p = currentPiece;
    if (p && isPlaying && !gameOver) {
      const { shape, xy } = p;
      shape.forEach((row, r) => row.forEach((v, c) => {
        if (v) {
          const ny = xy[0] + r, nx = xy[1] + c;
          if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
            if (db[ny][nx] === 1) {
              db[ny][nx] = 2;
            } else {
              db[ny][nx] = 1;
            }
          }
        }
      }));
    }
    return db;
  }, [board, currentPiece, isPlaying, gameOver]);

  const nextPiece = useMemo(() => {
    if (!nextType) return null;
    return { shape: BLOCK_SHAPES[nextType] };
  }, [nextType]);

  const gameActive = isPlaying && !gameOver && !overAnimating;
  const showLogo = !isPlaying && !gameOver && !overAnimating && !resetTrigger;

  const [scaleVal, setScaleVal] = useState(1);

  const handleResize = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const s = Math.min(vw / 640, vh / 960);
    setScaleVal(Math.max(0.3, s));
  }, []);

  useEffect(() => {
    setTimeout(() => handleResize(), 50);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const kbdActive = useCallback((k) => !!keyPressed[k], [keyPressed]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#009688', overflow: 'hidden',
    }}>
      <button onClick={() => { resetFn(); onBack?.(); }}
        style={{
          position: 'absolute', top: 12, left: 12, zIndex: 10,
          width: 36, height: 36, borderRadius: '50%', border: 'none',
          background: 'rgba(255,255,255,0.2)', color: '#fff',
          fontSize: 18, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >←</button>

      <div
        style={{
          width: 640,
          paddingTop: 42, paddingBottom: 10,
          boxShadow: '0 0 10px #fff inset',
          borderRadius: 20,
          background: '#efcc19',
          color: '#111',
          fontFamily: '"HanHei SC","PingHei","PingFang SC","STHeitiSC-Light","Helvetica Neue","Helvetica","Arial",sans-serif',
          fontSize: 20,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          transform: `scale(${scaleVal})`,
          transformOrigin: 'center center',
          transition: 'transform 0.1s',
        }}
      >
        <div style={{
          width: 480, padding: '45px 0 35px',
          border: '#000 solid', borderWidth: '0 10px 10px',
          margin: '0 auto', position: 'relative',
          transform: dropAnim ? 'translateY(5px)' : 'none',
        }}>
          <div style={{
            width: 390, height: 478,
            border: 'solid 5px',
            borderColor: '#987f0f #fae36c #fae36c #987f0f',
            margin: '0 auto', position: 'relative',
          }}>
            <div style={{
              width: 380, height: 468, margin: '0 auto',
              background: '#9ead86', padding: 8,
              border: '2px solid #494536',
              position: 'relative',
            }}>
              <div style={{
                width: 228,
                border: '2px solid #000',
                padding: '3px 1px 1px 3px',
                float: 'left',
              }}>
                {displayBoard.map((row, ri) => (
                  <div key={ri} style={{ width: 220, height: 22, clear: 'both' }}>
                    {row.map((cell, ci) => {
                      const isC = cell === 1;
                      const isD = cell === 2;
                      return (
                        <div key={ci} style={{
                          display: 'block',
                          width: 20,
                          height: 20,
                          padding: 2,
                          border: `2px solid ${isC ? '#000' : isD ? '#560000' : '#879372'}`,
                          marginRight: 2,
                          marginBottom: 2,
                          float: 'left',
                          boxSizing: 'border-box',
                        }}>
                          <div style={{
                            display: 'block',
                            width: 12,
                            height: 12,
                            background: isC ? '#000' : isD ? '#560000' : '#879372',
                            overflow: 'hidden',
                          }} />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              <canvas ref={canvasRef}
                style={{
                  position: 'absolute', left: 8, top: 8,
                  pointerEvents: 'none', width: 228, height: 440,
                }}
                width={228} height={440}
              />

              {showLogo && (
                <div style={{
                  position: 'absolute', inset: 0,
                  top: 8, left: 8, right: 8, bottom: 8,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  background: '#9ead86',
                  zIndex: 2,
                }}>
                  <div style={{
                    fontSize: 48, fontWeight: 'bold',
                    color: '#2d3418', opacity: 0.6,
                    fontFamily: 'monospace',
                    whiteSpace: 'nowrap',
                    marginBottom: 24,
                  }}>
                    TETRIS
                  </div>
                  <button onClick={startFn} style={{
                    padding: '10px 28px', borderRadius: 8, border: 'none',
                    background: '#efcc19', color: '#111', cursor: 'pointer',
                    fontSize: 16, fontWeight: 'bold',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  }}>
                    开始游戏
                  </button>
                </div>
              )}

              {gameOver && !overAnimating && (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(0,0,0,0.55)',
                  color: '#fff', fontFamily: 'monospace',
                  top: 8, left: 8, right: 8, bottom: 8,
                }}>
                  <div style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>GAME OVER</div>
                  <div style={{ fontSize: 14, marginBottom: 4 }}>得分: {score}</div>
                  <div style={{ fontSize: 14, marginBottom: 16 }}>最高: {maxScore}</div>
                  <button onClick={resetFn} style={{
                    padding: '6px 24px', borderRadius: 8, border: 'none',
                    background: '#efcc19', color: '#111', cursor: 'pointer',
                    fontSize: 14, fontWeight: 'bold',
                  }}>
                    重新开始(R)
                  </button>
                </div>
              )}

              {isPaused && gameActive && !gameOver && (
                <div style={{
                  position: 'absolute', top: 8, left: 8, right: 8, bottom: 8,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(0,0,0,0.4)',
                  color: '#fff',
                }}>
                  <div style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 16 }}>暂停</div>
                  <button onClick={togglePauseFn} style={{
                    padding: '8px 24px', borderRadius: 8, border: 'none',
                    background: '#efcc19', color: '#111',
                    fontSize: 14, cursor: 'pointer',
                  }}>
                    继续(P)
                  </button>
                </div>
              )}

              <div style={{
                width: 108, position: 'absolute',
                top: 8, right: 8,
                fontFamily: 'monospace',
                fontSize: 14, lineHeight: '47px',
              }}>
                <div style={{ height: 57, padding: '10px 0 0' }}>
                  <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 2, lineHeight: 1 }}>
                    {gameActive ? '得分' : '最高'}
                  </div>
                  <div style={{ lineHeight: 1 }}>
                    {renderNumber(gameActive ? score : maxScore, 6, { color: 'd' })}
                  </div>
                </div>
                <div style={{ height: 57, padding: '10px 0 0' }}>
                  <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 2, lineHeight: 1 }}>
                    {gameActive ? '消除' : '初始行'}
                  </div>
                  <div style={{ lineHeight: 1 }}>
                    {renderNumber(gameActive ? lines : startLines, 2)}
                  </div>
                </div>
                <div style={{ height: 57, padding: '10px 0 0' }}>
                  <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 2, lineHeight: 1 }}>等级</div>
                  <div style={{ lineHeight: 1 }}>
                    {renderNumber(gameActive ? level : speedLevel, 1)}
                  </div>
                </div>
                <div style={{ height: 57, padding: '10px 0 0' }}>
                  <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 2, lineHeight: 1 }}>下一个</div>
                  <div style={{ lineHeight: 1 }}>
                    {nextPiece ? (
                      <div style={{ width: 88 }}>
                        {[0, 1].map(ri => (
                          <div key={ri} style={{ height: 22, clear: 'both' }}>
                            {[0, 1, 2, 3].map(ci => {
                              const hasVal = nextPiece.shape && nextPiece.shape[ri] && nextPiece.shape[ri][ci];
                              return (
                                <div key={ci} style={{
                                  display: 'block',
                                  width: 20,
                                  height: 20,
                                  padding: 2,
                                  border: `2px solid ${hasVal ? '#000' : '#879372'}`,
                                  marginRight: 2,
                                  marginBottom: 2,
                                  float: 'right',
                                  boxSizing: 'border-box',
                                }}>
                                  <div style={{
                                    display: 'block',
                                    width: 12,
                                    height: 12,
                                    background: hasVal ? '#000' : '#879372',
                                    overflow: 'hidden',
                                  }} />
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div style={{
                  position: 'absolute', width: 114,
                  top: 390, left: -6,
                  fontSize: 14, lineHeight: 1,
                }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}
                    onClick={toggleMusicFn}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: musicEnabled ? '#4bc441' : '#8a8a7a',
                      border: '2px solid #000',
                      boxShadow: musicEnabled
                        ? '0px -3px 6px rgba(255,255,255,0.6) inset, 0px 5px 5px rgba(0,0,0,0.6) inset, 0 2px 3px rgba(0,0,0,0.2)'
                        : '0px 3px 6px rgba(255,255,255,0.6) inset, 0px -3px 6px rgba(0,0,0,0.6) inset, 0 2px 3px rgba(0,0,0,0.2)',
                    }} />
                    <span style={{ fontSize: 12 }}>♪</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', marginTop: 6 }}
                    onClick={togglePauseFn}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: isPaused ? '#4bc441' : '#8a8a7a',
                      border: '2px solid #000',
                      boxShadow: isPaused
                        ? '0px -3px 6px rgba(255,255,255,0.6) inset, 0px 5px 5px rgba(0,0,0,0.6) inset, 0 2px 3px rgba(0,0,0,0.2)'
                        : '0px 3px 6px rgba(255,255,255,0.6) inset, 0px -3px 6px rgba(0,0,0,0.6) inset, 0 2px 3px rgba(0,0,0,0.2)',
                    }} />
                    <span style={{ fontSize: 12 }}>⏸</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {banner && (
          <div style={{
            position: 'absolute', top: 140, left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 48, fontWeight: 'bold',
            color: '#efcc19',
            textShadow: '2px 2px 0 rgba(0,0,0,0.5)',
            zIndex: 5, pointerEvents: 'none',
            fontFamily: 'monospace',
          }}>
            {banner}
          </div>
        )}

        <div style={{
          width: 580, height: 330,
          margin: '20px auto 0',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 512,
            width: 52, display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <Controller style={{ width: 52, height: 52 }}
              onDown={togglePauseFn} onUp={clearKeys}
            >
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'linear-gradient(#4bc441, #0ec400)',
                border: '1px solid #000',
                boxShadow: kbdActive('p')
                  ? '0px -1px 2px rgba(255,255,255,0.6) inset, 0px 3px 3px rgba(0,0,0,0.7) inset, 1px 1px 1px rgba(0,0,0,0.2)'
                  : '0px 3px 6px rgba(255,255,255,0.8) inset, 0px -3px 6px rgba(0,0,0,0.8) inset, 1px 1px 1px rgba(0,0,0,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 'bold', color: '#111',
              }}>P</div>
            </Controller>
            <div style={{ fontSize: 11, marginTop: 4, color: '#111', fontWeight: 'bold' }}>暂停</div>
          </div>

          <div style={{
            position: 'absolute', top: 0, left: 422,
            width: 52, display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <Controller style={{ width: 52, height: 52 }}
              onDown={toggleMusicFn} onUp={clearKeys}
            >
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'linear-gradient(#4bc441, #0ec400)',
                border: '1px solid #000',
                boxShadow: kbdActive('s')
                  ? '0px -1px 2px rgba(255,255,255,0.6) inset, 0px 3px 3px rgba(0,0,0,0.7) inset, 1px 1px 1px rgba(0,0,0,0.2)'
                  : '0px 3px 6px rgba(255,255,255,0.8) inset, 0px -3px 6px rgba(0,0,0,0.8) inset, 1px 1px 1px rgba(0,0,0,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 'bold', color: '#111',
              }}>S</div>
            </Controller>
            <div style={{ fontSize: 11, marginTop: 4, color: '#111', fontWeight: 'bold' }}>音效</div>
          </div>

          <div style={{
            position: 'absolute', top: 0, left: 332,
            width: 52, display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <Controller style={{ width: 52, height: 52 }}
              onDown={resetFn} onUp={clearKeys}
            >
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'linear-gradient(#dc3333, #de0000)',
                border: '1px solid #000',
                boxShadow: kbdActive('r')
                  ? '0px -1px 2px rgba(255,255,255,0.6) inset, 0px 3px 3px rgba(0,0,0,0.7) inset, 1px 1px 1px rgba(0,0,0,0.2)'
                  : '0px 3px 6px rgba(255,255,255,0.8) inset, 0px -3px 6px rgba(0,0,0,0.8) inset, 1px 1px 1px rgba(0,0,0,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 'bold', color: '#111',
              }}>R</div>
            </Controller>
            <div style={{ fontSize: 11, marginTop: 4, color: '#111', fontWeight: 'bold' }}>重置</div>
          </div>

          <div style={{
            position: 'absolute', top: 0, left: 116,
            width: 120, display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <Controller style={{ width: 100, height: 100 }}
              onDown={rotateFn} onUp={clearKeys}
            >
              <div style={{
                width: 100, height: 100, borderRadius: '50%',
                background: 'linear-gradient(#6e77ef, #4652f3)',
                border: '1px solid #000',
                boxShadow: kbdActive('ArrowUp')
                  ? '0px -3px 6px rgba(255,255,255,0.6) inset, 0px 5px 5px rgba(0,0,0,0.6) inset, 0 3px 3px rgba(0,0,0,0.2)'
                  : '0px 5px 10px rgba(255,255,255,0.8) inset, 0px -5px 10px rgba(0,0,0,0.8) inset, 0 3px 3px rgba(0,0,0,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: 0, height: 0,
                  border: '8px solid',
                  borderColor: 'transparent transparent #111',
                  transform: 'translate(0, 8px) scale(1,2)',
                }} />
              </div>
            </Controller>
            <div style={{ fontSize: 11, marginTop: 4, color: '#111', fontWeight: 'bold' }}>旋转(↑)</div>
          </div>

          <div style={{
            position: 'absolute', top: 80, left: 26,
            width: 120, display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <Controller style={{ width: 100, height: 100 }}
              onDown={moveLeftFn} onUp={clearKeys}
            >
              <div style={{
                width: 100, height: 100, borderRadius: '50%',
                background: 'linear-gradient(#6e77ef, #4652f3)',
                border: '1px solid #000',
                boxShadow: kbdActive('ArrowLeft')
                  ? '0px -3px 6px rgba(255,255,255,0.6) inset, 0px 5px 5px rgba(0,0,0,0.6) inset, 0 3px 3px rgba(0,0,0,0.2)'
                  : '0px 5px 10px rgba(255,255,255,0.8) inset, 0px -5px 10px rgba(0,0,0,0.8) inset, 0 3px 3px rgba(0,0,0,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: 0, height: 0,
                  border: '8px solid',
                  borderColor: 'transparent transparent #111',
                  transform: 'rotate(270deg) scale(1,2)',
                }} />
              </div>
            </Controller>
            <div style={{ fontSize: 11, marginTop: 4, color: '#111', fontWeight: 'bold' }}>左(←)</div>
          </div>

          <div style={{
            position: 'absolute', top: 80, left: 206,
            width: 120, display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <Controller style={{ width: 100, height: 100 }}
              onDown={moveRightFn} onUp={clearKeys}
            >
              <div style={{
                width: 100, height: 100, borderRadius: '50%',
                background: 'linear-gradient(#6e77ef, #4652f3)',
                border: '1px solid #000',
                boxShadow: kbdActive('ArrowRight')
                  ? '0px -3px 6px rgba(255,255,255,0.6) inset, 0px 5px 5px rgba(0,0,0,0.6) inset, 0 3px 3px rgba(0,0,0,0.2)'
                  : '0px 5px 10px rgba(255,255,255,0.8) inset, 0px -5px 10px rgba(0,0,0,0.8) inset, 0 3px 3px rgba(0,0,0,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: 0, height: 0,
                  border: '8px solid',
                  borderColor: 'transparent transparent #111',
                  transform: 'rotate(90deg) scale(1,2)',
                }} />
              </div>
            </Controller>
            <div style={{ fontSize: 11, marginTop: 4, color: '#111', fontWeight: 'bold' }}>右(→)</div>
          </div>

          <div style={{
            position: 'absolute', top: 180, left: 116,
            width: 120, display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <Controller style={{ width: 100, height: 100 }}
              onDown={moveDownFn} onUp={clearKeys}
            >
              <div style={{
                width: 100, height: 100, borderRadius: '50%',
                background: 'linear-gradient(#6e77ef, #4652f3)',
                border: '1px solid #000',
                boxShadow: kbdActive('ArrowDown')
                  ? '0px -3px 6px rgba(255,255,255,0.6) inset, 0px 5px 5px rgba(0,0,0,0.6) inset, 0 3px 3px rgba(0,0,0,0.2)'
                  : '0px 5px 10px rgba(255,255,255,0.8) inset, 0px -5px 10px rgba(0,0,0,0.8) inset, 0 3px 3px rgba(0,0,0,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: 0, height: 0,
                  border: '8px solid',
                  borderColor: 'transparent transparent #111',
                  transform: 'rotate(180deg) scale(1,2)',
                }} />
              </div>
            </Controller>
            <div style={{ fontSize: 11, marginTop: 4, color: '#111', fontWeight: 'bold' }}>下(↓)</div>
          </div>

          <div style={{
            position: 'absolute', top: 110, left: 348,
            width: 200, display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <Controller style={{ width: 160, height: 160 }}
              onDown={hardDropFn} onUp={clearKeys}
            >
              <div style={{
                width: 160, height: 160, borderRadius: '50%',
                background: 'linear-gradient(#6e77ef, #4652f3)',
                border: '1px solid #000',
                boxShadow: kbdActive(' ')
                  ? '0px -3px 6px rgba(255,255,255,0.6) inset, 0px 5px 5px rgba(0,0,0,0.6) inset, 0 3px 3px rgba(0,0,0,0.2)'
                  : '0px 5px 10px rgba(255,255,255,0.8) inset, 0px -5px 10px rgba(0,0,0,0.8) inset, 0 3px 3px rgba(0,0,0,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 'bold', color: '#111',
              }}>
                硬降
              </div>
            </Controller>
            <div style={{ fontSize: 11, marginTop: 4, color: '#111', fontWeight: 'bold' }}>硬降(空格)</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HandheldTetris;
