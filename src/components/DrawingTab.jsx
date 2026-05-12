import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Peer } from 'peerjs';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { COLORS, PROVINCE_PRESETS, PROVINCE_PRESET_IDS, aiPresetModels, proxyFetchUrl, SIGNAL_SERVER_HOST, PEER_SERVER_CONFIG, PEERJS_API_BASE } from '../utils/constants';
import { initAudio, playTone, setVibrationEnabledGlobal, vibrate, playTick, playWheelTick, playDing, playNumberDing, playDiceRoll, playThud } from '../utils/audio';
import { DicesIcon, XIcon, PlusIcon, RotateCcwIcon, CheckIcon, HashIcon, ChevronDownIcon, TrashIcon, ListIcon, MoonIcon, SunIcon, BombIcon, PokerCardIcon, BrushIcon, WheelIcon, EraserIcon, PoisonIcon } from '../components/icons';
const VectorCadTab = React.lazy(() => import('./VectorCadTab'));
import { saveDrawingCanvas, saveDrawingLayers, saveSavedCanvases, saveAutoSaveHistory, saveArtworks, loadDrawingCanvas, loadDrawingLayers, removeFromDB } from '../utils/canvasStorage';

// ==================== 画板标签页====================
const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
const BLEND_MODES = [
  { value: 'source-over', label: '正常', css: 'normal' },
  { value: 'multiply', label: '正片叠底', css: 'multiply' },
  { value: 'screen', label: '滤色', css: 'screen' },
  { value: 'overlay', label: '叠加', css: 'overlay' },
  { value: 'darken', label: '变暗', css: 'darken' },
  { value: 'lighten', label: '变亮', css: 'lighten' },
  { value: 'color-dodge', label: '颜色减淡', css: 'color-dodge' },
  { value: 'color-burn', label: '颜色加深', css: 'color-burn' },
  { value: 'hard-light', label: '强光', css: 'hard-light' },
  { value: 'soft-light', label: '柔光', css: 'soft-light' },
  { value: 'difference', label: '差值', css: 'difference' },
  { value: 'exclusion', label: '排除', css: 'exclusion' },
  { value: 'hue', label: '色相', css: 'hue' },
  { value: 'saturation', label: '饱和度', css: 'saturation' },
  { value: 'color', label: '颜色', css: 'color' },
  { value: 'luminosity', label: '明度', css: 'luminosity' },
];

const resolveBlendMode = (blendMode) => {
  if (!blendMode || blendMode === 'source-over') return 'source-over';
  const entry = BLEND_MODES.find(b => b.value === blendMode);
  if (!entry) return 'source-over';
  return entry.css === 'normal' ? 'source-over' : entry.css;
};

const brushCategories = [
  { id: 'pencil', name: '铅笔', strokeWidth: 2, texture: 'grainy', grain: true, pressure: true, category: 'line' },
  { id: 'round', name: '圆头画笔', strokeWidth: 6, texture: 'solid', grain: false, category: 'paint' },
  { id: 'flat', name: '扁头画笔', strokeWidth: 10, texture: 'flat', grain: false, category: 'paint' },
  { id: 'marker', name: '马克笔', strokeWidth: 14, texture: 'semi', opacity: 0.7, category: 'line' },
  { id: 'ballpoint', name: '圆珠笔', strokeWidth: 2, texture: 'solid', grain: false, opacity: 0.6, category: 'line' },
  { id: 'pen', name: '勾线画笔', strokeWidth: 1.5, texture: 'solid', grain: false, category: 'line' },
  { id: 'spray', name: '喷枪', strokeWidth: 20, texture: 'spray', particleCount: 50, category: 'paint' },
  { id: 'watercolor', name: '水彩笔', strokeWidth: 12, texture: 'watercolor', opacity: 0.15, category: 'paint' },
  { id: 'crayon', name: '蜡笔', strokeWidth: 10, texture: 'crayon', grain: true, category: 'sketch' },
  { id: 'charcoal', name: '碳笔', strokeWidth: 6, texture: 'charcoal', grain: true, category: 'sketch' },
  { id: 'gpen', name: 'G笔', strokeWidth: 4, texture: 'gpen', grain: false, category: 'line' },
  { id: 'dippen', name: '蘸水笔', strokeWidth: 2, texture: 'dippen', grain: false, category: 'line' },
  { id: 'inkbrush', name: '毛笔', strokeWidth: 8, texture: 'inkbrush', grain: false, category: 'special' },
  { id: 'oilpaint', name: '油画笔', strokeWidth: 12, texture: 'oilpaint', grain: true, category: 'paint' },
  { id: 'pastel', name: '粉彩笔', strokeWidth: 14, texture: 'pastel', grain: true, category: 'paint' },
  { id: 'airbrush', name: '柔边喷枪', strokeWidth: 18, texture: 'airbrush', grain: false, category: 'paint' },
  { id: 'halftone', name: '网点笔', strokeWidth: 16, texture: 'halftone', grain: false, category: 'texture' },
  { id: 'neon', name: '荧光笔', strokeWidth: 6, texture: 'neon', grain: false, category: 'texture' },
  { id: 'fur', name: '毛发笔', strokeWidth: 10, texture: 'fur', grain: false, category: 'special' },
  { id: 'pixel', name: '像素笔', strokeWidth: 4, texture: 'pixel', grain: false, category: 'special' },
  { id: 'chalk', name: '粉笔', strokeWidth: 8, texture: 'chalk', grain: true, opacity: 0.7, category: 'sketch' },
  { id: 'softpastel', name: '色粉笔', strokeWidth: 14, texture: 'softpastel', grain: true, opacity: 0.5, category: 'paint' },
  { id: 'acrylic', name: '丙烯', strokeWidth: 10, texture: 'acrylic', grain: false, opacity: 0.85, category: 'paint' },
  { id: 'gouache', name: '水粉', strokeWidth: 12, texture: 'gouache', grain: false, opacity: 0.75, category: 'paint' },
  { id: 'grass', name: '草丛', strokeWidth: 8, texture: 'grass', grain: false, particleCount: 12, category: 'special' },
  { id: 'cloud', name: '云朵', strokeWidth: 20, texture: 'cloud', grain: false, opacity: 0.3, category: 'texture' },
  { id: 'noise', name: '噪点', strokeWidth: 14, texture: 'noiseGrain', grain: true, opacity: 0.5, category: 'texture' },
  { id: 'halftone2', name: '半调', strokeWidth: 16, texture: 'halftone2', grain: false, category: 'texture' },
  { id: 'doubleline', name: '双线', strokeWidth: 6, texture: 'doubleline', grain: false, category: 'line' },
  { id: 'smudge', name: '涂抹', strokeWidth: 16, texture: 'smudge', grain: false, opacity: 0.4, category: 'special' },
  { id: 'mixer', name: '混色', strokeWidth: 14, texture: 'mixer', grain: false, opacity: 0.5, category: 'special' },
  { id: 'crosshatch', name: '交叉排线', strokeWidth: 10, texture: 'crosshatch', grain: false, opacity: 0.7, category: 'sketch' },
  { id: 'splatter', name: '泼溅', strokeWidth: 18, texture: 'splatter', grain: false, particleCount: 30, category: 'texture' },
  { id: 'stipple', name: '点画', strokeWidth: 14, texture: 'stipple', grain: false, opacity: 0.8, category: 'sketch' },
  { id: 'grunge', name: '肌理', strokeWidth: 16, texture: 'grunge', grain: true, opacity: 0.55, category: 'texture' },
  { id: 'sand', name: '砂粒', strokeWidth: 12, texture: 'sand', grain: true, opacity: 0.5, category: 'texture' },
  { id: 'scratch', name: '刮擦', strokeWidth: 8, texture: 'scratch', grain: false, opacity: 0.7, category: 'sketch' },
  { id: 'calligraphy', name: '书法笔', strokeWidth: 12, texture: 'calligraphy', grain: false, opacity: 0.9, category: 'special' },
  { id: 'cloth', name: '布料纹理', strokeWidth: 14, texture: 'cloth', grain: true, opacity: 0.55, category: 'texture' },
];

const BRUSH_GROUPS = [
  { key: 'line', name: '勾线', icon: '━', desc: '精细线条' },
  { key: 'paint', name: '上色', icon: '●', desc: '绘画涂色' },
  { key: 'sketch', name: '素描', icon: '╱', desc: '素描质感' },
  { key: 'texture', name: '纹理', icon: '▦', desc: '特效纹理' },
  { key: 'special', name: '特殊', icon: '◆', desc: '创意笔刷' },
];

const basicColors = [
  ['#000000','#333333','#666666','#999999','#CCCCCC','#FFFFFF'],
  ['#EF4444','#F97316','#F59E0B','#FBBF24','#84CC16','#22C55E'],
  ['#10B981','#14B8A6','#06B6D4','#0EA5E9','#3bf6e6ff','#6366F1'],
  ['#8B5CF6','#A855F7','#D946EF','#EC4899','#F43F5E','#FB7185'],
  ['#7C2D12','#92400E','#B45309','#D97706','#CA8A04','#65A30D'],
  ['#15803D','#0D9488','#0891B2','#0284C7','#2563EB','#4F46E5'],
];
const DrawingTab = ({ darkMode, glassMode, onGameModeChange, showAiChat, setShowAiChat, cadMode, setCadMode, guessGameActivatorRef, onGuessGameExit, initialCanvasSize, artworkToLoad, onBackToWorkspace }) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastRecompositeTimeRef = useRef(0);
  const drawThrottleTimeRef = useRef(0);
  const lastThumbUpdateRef = useRef(0);
  const lastFullThumbUpdateRef = useRef(0);
  const isDrawingRef = useRef(false);
  const canvasRectRef = useRef(null);
  const saveCanvasDebounceRef = useRef(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatNickname, setChatNickname] = useState(() => { try { return localStorage.getItem('globalChatNickname') || ''; } catch(e) { return ''; } });
  const [chatConnected, setChatConnected] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const setIsDrawingWithRef = (v) => { isDrawingRef.current = v; setIsDrawing(v); };
  const [color, setColor] = useState('#EF4444');
  const [isEraser, setIsEraser] = useState(false);
  const [isBucket, setIsBucket] = useState(false);
  const [isEyedropper, setIsEyedropper] = useState(false);
  const [isCalligraphy, setIsCalligraphy] = useState(false);
  const [isLineMode, setIsLineMode] = useState(false);
  const [isCircleMode, setIsCircleMode] = useState(false);
  const lineStartRef = useRef(null);
  const circleCenterRef = useRef(null);
  const shapePreviewRef = useRef(null);
  const [guideLines, setGuideLines] = useState([]);
  const [showGuideLines, setShowGuideLines] = useState(false);
  const [draggingGuideIdx, setDraggingGuideIdx] = useState(-1);
  const draggingGuideIdxRef = useRef(-1);
  const [cadTool, setCadTool] = useState('line');
  const cadShapeStart = useRef(null);
  const cadPolyPoints = useRef([]);
  const cadArcMid = useRef(null);
  const cadDimStart = useRef(null);
  const [cadTouchCursor, setCadTouchCursor] = useState({ x: 0, y: 0, visible: false });
  const [cadPendingEnd, setCadPendingEnd] = useState(null);
  const cadCursorContainerRef = useRef({ x: 0, y: 0 });
  const cadTouchPhaseRef = useRef('idle');
  const isTouchActiveRef = useRef(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterBlur, setFilterBlur] = useState(0);
  const [filterBrightness, setFilterBrightness] = useState(100);
  const [filterContrast, setFilterContrast] = useState(100);
  const [filterSaturate, setFilterSaturate] = useState(100);
  const [filterHueRotate, setFilterHueRotate] = useState(0);
  const [filterGrayscale, setFilterGrayscale] = useState(0);
  const [filterInvert, setFilterInvert] = useState(0);
  const [filterSepia, setFilterSepia] = useState(0);
  const [eyedropperColor, setEyedropperColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(6);
  const [activePanel, setActivePanel] = useState(null);
  const [isPaintingMode, setIsPaintingMode] = useState(false);
  const [stabilizerLevel, setStabilizerLevel] = useState(0);
  const [symmetryMode, setSymmetryMode] = useState('none');
  const [showSymmetryMenu, setShowSymmetryMenu] = useState(false);
  const [perspectivePoints, setPerspectivePoints] = useState([]);
  const [showPerspectiveEditor, setShowPerspectiveEditor] = useState(false);
  const [isAddingPerspectivePoint, setIsAddingPerspectivePoint] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recordedFramesRef = useRef([]);
  const [recordedFramesCount, setRecordedFramesCount] = useState(0);
  const [showTimeLapseMenu, setShowTimeLapseMenu] = useState(false);
  const getRecordedFrames = useCallback(() => recordedFramesRef.current, []);
  const [showLineArtMenu, setShowLineArtMenu] = useState(false);
  const [showDrawSettings, setShowDrawSettings] = useState(false);
  const [pressureMode, setPressureMode] = useState(() => { try { return JSON.parse(localStorage.getItem('drawing_pressure_mode') || 'false'); } catch { return false; } });
  const [showHelpBook, setShowHelpBook] = useState(false);
  const [isPixelMode, setIsPixelMode] = useState(false);
  const [pixelGridSize, setPixelGridSize] = useState(16);
  const [pixelModeType, setPixelModeType] = useState('full');
  const pixelGridRef = useRef(null);
  const [isWillowLeafMode, setIsWillowLeafMode] = useState(false);
  const [showWillowLeafPanel, setShowWillowLeafPanel] = useState(false);
  const willowLeafPointsRef = useRef([]);
  const willowLeafPreviewRef = useRef(null);
  const willowLeafDrawnStrokesRef = useRef([]);
  const [isVectorCadMode, setIsVectorCadMode] = useState(false);
  const [useWidthSlider, setUseWidthSlider] = useState(false);
  const [twoFingerUndo, setTwoFingerUndo] = useState(() => { try { return JSON.parse(localStorage.getItem('drawing_two_finger_undo') || 'false'); } catch { return false; } });
  const [drawDarkMode, setDrawDarkMode] = useState(() => { try { return JSON.parse(localStorage.getItem('drawing_dark_mode') || 'false'); } catch { return false; } });
  const [recordSavePath, setRecordSavePath] = useState('');
  const recordSaveDirHandleRef = useRef(null);
  const [brushOpacity, setBrushOpacity] = useState(1);
  const [isExtractingLineArt, setIsExtractingLineArt] = useState(false);
  const [lineArtOverlay, setLineArtOverlay] = useState(null);
  const [showLineArtOverlay, setShowLineArtOverlay] = useState(false);
  const [showAnimationPanel, setShowAnimationPanel] = useState(false);
  const [animFrames, setAnimFrames] = useState([]);
  const [currentAnimFrame, setCurrentAnimFrame] = useState(0);
  const [isPlayingAnim, setIsPlayingAnim] = useState(false);
  const [animFps, setAnimFps] = useState(8);
  const [animOnionSkin, setAnimOnionSkin] = useState(false);
  const [showLiveBrushMenu, setShowLiveBrushMenu] = useState(false);
  const [canvasTexture, setCanvasTexture] = useState('none');
  const currentTextureBgRef = useRef([255, 255, 255]);
  const textureCanvasRef = useRef(null);
  const textureCacheRef = useRef({});
  const textureGeneratingRef = useRef(false);
  const recompositeRafRef = useRef(null);
  const lineArtBtnRef = useRef(null);
  const animBtnRef = useRef(null);
  const liveBrushBtnRef = useRef(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreBtnRef = useRef(null);
  const animPlayRef = useRef(null);
  const animLoadReqIdRef = useRef(0);
  const recordIntervalRef = useRef(null);

  useEffect(() => {
    localStorage.removeItem('drawing_canvas_w');
    localStorage.removeItem('drawing_canvas_h');
  }, []);

  useEffect(() => {
    if (!chatNickname.trim()) return;
    let mounted = true;
    const CHAT_API = `http://${SIGNAL_SERVER_HOST}:9101`;

    const loadMessages = async () => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${CHAT_API}/messages`, { signal: controller.signal });
        clearTimeout(timer);
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json();
          const msgs = (data.messages || []).map(m => ({
            id: m.id, sender: m.nickname, text: m.text, time: m.time
          }));
          setChatMessages(msgs.slice(-200));
          setChatConnected(true);
        } else {
          setChatConnected(false);
        }
      } catch {
        if (mounted) setChatConnected(false);
      }
    };

    loadMessages();
    const interval = setInterval(loadMessages, 2000);
    return () => { mounted = false; clearInterval(interval); };
  }, [chatNickname]);

  const sendChatMessage = async () => {
    const text = chatInput.trim();
    if (!text || !chatNickname.trim()) return;
    const CHAT_API = `http://${SIGNAL_SERVER_HOST}:9101`;
    setChatInput('');
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${CHAT_API}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: chatNickname.trim(), text }),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setChatMessages(prev => [...prev.slice(-199), {
            id: data.message.id,
            sender: data.message.nickname,
            text: data.message.text,
            time: data.message.time
          }]);
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (isRecording) {
      recordIntervalRef.current = setInterval(() => {
        if (canvasRef.current) {
          try {
            const frameUrl = canvasRef.current.toDataURL('image/jpeg', 0.5);
            recordedFramesRef.current.push(frameUrl);
            if (recordedFramesRef.current.length > 300) recordedFramesRef.current.shift();
            setRecordedFramesCount(recordedFramesRef.current.length);
          } catch {}
        }
      }, 500);
    } else {
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
        recordIntervalRef.current = null;
      }
    }
    return () => {
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
        recordIntervalRef.current = null;
      }
    };
  }, [isRecording]);
  const stabilizerBufferRef = useRef([]);
  const stabilizerTargetRef = useRef(null);
  const symmetryBtnRef = useRef(null);
  const perspectiveBtnRef = useRef(null);
  const [auxMenuPos, setAuxMenuPos] = useState({ top: 0, left: 0 });
  const [bucketColor, setBucketColor] = useState('#3B82F6');
  const [showBucketPicker, setShowBucketPicker] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  useEffect(() => {
    if (isDrawing) {
      setActivePanel(null);
      setShowFilterPanel(false);
      setShowDrawSettings(false);
      setShowLineArtMenu(false);
      setShowLiveBrushMenu(false);
      setShowAnimationPanel(false);
      setShowLayerPanel(false);
      setShowSaveMenu(false);
      setShowWidthMenu(false);
      setShowCanvasSizeMenu(false);
      setShowTimeLapseMenu(false);
      setShowSymmetryMenu(false);
      setShowPerspectiveEditor(false);
      setShowOnionSkinPanel(false);
    }
  }, [isDrawing]);
  const [layers, setLayers] = useState([{ id: 1, name: '图层1', visible: true, opacity: 1, blendMode: 'source-over', locked: false, clippingMask: false }]);
  const prevShowLayerPanelRef = useRef(false);
  useEffect(() => {
    if (showLayerPanel && !prevShowLayerPanelRef.current) {
      requestAnimationFrame(() => {
        layers.forEach(layer => { updateLayerThumbnail(layer.id); });
      });
    }
    prevShowLayerPanelRef.current = showLayerPanel;
  }, [showLayerPanel, layers]);
  const layersRef = useRef(layers);
  layersRef.current = layers;
  const [activeLayerId, setActiveLayerId] = useState(1);
  const activeLayerIdRef = useRef(1);
  const nextLayerIdRef = useRef(2);
  const layerRefs = useRef({});
  const layerCtxRefs = useRef({});
  const compositeCanvasRefs = useRef({});
  const compositeCtxRefs = useRef({});
  const thumbnailRefs = useRef({});
  const onionSkinImgCacheRef = useRef({});
  const frameBaseCanvasRef = useRef(null);
  const onionSkinOverlayRef = useRef(null);
  const strokeStartLayerRef = useRef(null);
  const lastDprRef = useRef(window.devicePixelRatio || 1);
  const [onionSkin, setOnionSkin] = useState(() => { try { return localStorage.getItem('drawingOnionSkin') === 'true'; } catch(e) { return false; } });
  const [onionSkinSettings, setOnionSkinSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('drawingOnionSkinSettings');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return {
      prevEnabled: true,
      nextEnabled: true,
      prevColor: '#FF4444',
      nextColor: '#4444FF',
      prevOpacity: 35,
      nextOpacity: 35,
      range: 3,
      useTint: false,
      blendWithBg: false,
    };
  });
  const [showOnionSkinPanel, setShowOnionSkinPanel] = useState(false);
  const updateOnionSkinSetting = useCallback((key, value) => {
    setOnionSkinSettings(prev => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem('drawingOnionSkinSettings', JSON.stringify(next)); } catch(e) {}
      return next;
    });
  }, []);
  const toggleOnionSkin = useCallback(() => {
    setOnionSkin(prev => {
      try { localStorage.setItem('drawingOnionSkin', String(!prev)); } catch(e) {}
      return !prev;
    });
  }, []);
  const compositeClippingMasks = useCallback(() => {
    const currLayers = layersRef.current;
    const getBaseCanvas = (idx) => {
      const layer = currLayers[idx];
      if (!layer) return null;
      if (layer.clippingMask && idx > 0) {
        const belowComp = compositeCanvasRefs.current[layer.id];
        if (belowComp && belowComp.width > 0) return belowComp;
        return getBaseCanvas(idx - 1);
      }
      return layerRefs.current[layer.id];
    };
    for (let idx = currLayers.length - 1; idx >= 0; idx--) {
      const layer = currLayers[idx];
      if (!layer.clippingMask || idx === 0) continue;
      const srcCanvas = layerRefs.current[layer.id];
      if (!srcCanvas || srcCanvas.width === 0) continue;
      const baseCanvas = getBaseCanvas(idx - 1);
      if (!baseCanvas || baseCanvas.width === 0) continue;
      const compCanvas = compositeCanvasRefs.current[layer.id];
      if (!compCanvas) continue;
      if (compCanvas.width !== srcCanvas.width || compCanvas.height !== srcCanvas.height) {
        compCanvas.width = srcCanvas.width;
        compCanvas.height = srcCanvas.height;
      }
      const compCtx = compositeCtxRefs.current[layer.id];
      if (!compCtx) continue;
      compCtx.clearRect(0, 0, compCanvas.width, compCanvas.height);
      compCtx.drawImage(baseCanvas, 0, 0);
      compCtx.globalCompositeOperation = 'source-in';
      compCtx.drawImage(srcCanvas, 0, 0);
      compCtx.globalCompositeOperation = 'source-over';
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => compositeClippingMasks(), 50);
    return () => clearTimeout(timer);
  }, [layers, compositeClippingMasks]);
  useLayoutEffect(() => {
    compositeClippingMasks();
  }, [layers, compositeClippingMasks]);
  const symmetryGuideRef = useRef(null);
  const layerLongPressTimerRef = useRef(null);
  const [renamingLayerId, setRenamingLayerId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [layerPanelTab, setLayerPanelTab] = useState('layers');
  const [colorPickerMode, setColorPickerMode] = useState('square');
  const [colorPickerHue, setColorPickerHue] = useState(0);
  const [colorTab, setColorTab] = useState('recent');
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [refImages, setRefImages] = useState([]);
  const [draggingRefId, setDraggingRefId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const refInputRef = useRef(null);
  let nextRefId = 1;
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const saveBtnRef = useRef(null);
  const widthBtnRef = useRef(null);
  const layerBtnRef = useRef(null);
  const canvasSizeBtnRef = useRef(null);
  const [showCanvasSizeMenu, setShowCanvasSizeMenu] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [customCanvasW, setCustomCanvasW] = useState(1080);
  const [customCanvasH, setCustomCanvasH] = useState(1920);
  const [savedCanvases, setSavedCanvases] = useState(() => { try { return JSON.parse(localStorage.getItem('drawing_saved_canvases') || '[]'); } catch { return []; } });
  const [autoSaveHistory, setAutoSaveHistory] = useState(() => { try { return JSON.parse(localStorage.getItem('drawing_autosave_history') || '[]'); } catch { return []; } });
  const [galleryTab, setGalleryTab] = useState('manual');
  const [previewImage, setPreviewImage] = useState(null);
  const DEFAULT_CANVAS_W = 1080;
  const DEFAULT_CANVAS_H = 1920;
  const [canvasWidth, setCanvasWidth] = useState(() => { try { return parseInt(localStorage.getItem('drawing_canvas_w')) || DEFAULT_CANVAS_W; } catch { return DEFAULT_CANVAS_W; } });
  const [canvasHeight, setCanvasHeight] = useState(() => { try { return parseInt(localStorage.getItem('drawing_canvas_h')) || DEFAULT_CANVAS_H; } catch { return DEFAULT_CANVAS_H; } });

  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    const cw = canvasWidth || DEFAULT_CANVAS_W;
    const ch = canvasHeight || DEFAULT_CANVAS_H;
    layersRef.current.forEach(layer => {
      let lc = layerRefs.current[layer.id];
      if (!lc) {
        lc = document.createElement('canvas');
        layerRefs.current[layer.id] = lc;
      }
      if (lc.width !== cw * dpr || lc.height !== ch * dpr) {
        const prevContent = lc.width > 0 ? lc.toDataURL('image/png') : null;
        lc.width = cw * dpr;
        lc.height = ch * dpr;
        lc.style.width = cw + 'px';
        lc.style.height = ch + 'px';
        const ctx = lc.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (prevContent) {
          const img = new Image();
          img.onload = () => { ctx.drawImage(img, 0, 0); ctx.scale(dpr, dpr); };
          img.src = prevContent;
        } else {
          ctx.scale(dpr, dpr);
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        layerCtxRefs.current[layer.id] = ctx;
      }
    });
    setActiveCtx();
    recompositeCanvas();
  }, [canvasWidth, canvasHeight]);

  useEffect(() => {
    setActiveCtx();
    const isAnim = animFrames.length > 0 && currentAnimFrame >= 0 && currentAnimFrame < animFrames.length;
    if (!isAnim) {
      recompositeCanvas();
    }
  }, [activeLayerId]);

  useEffect(() => {
    recompositeCanvas();
  }, [onionSkin, onionSkinSettings, currentAnimFrame]);

  useEffect(() => {
    onionSkinImgCacheRef.current = {};
    recompositeCanvas();
  }, [animFrames]);

  useEffect(() => {
    const gridCanvas = pixelGridRef.current;
    if (!gridCanvas || !isPixelMode) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvasWidth;
    const h = canvasHeight;
    gridCanvas.width = w * dpr;
    gridCanvas.height = h * dpr;
    const gctx = gridCanvas.getContext('2d');
    gctx.setTransform(1, 0, 0, 1, 0, 0);
    gctx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    gctx.scale(dpr, dpr);
    gctx.strokeStyle = 'rgba(0,0,0,0.15)';
    gctx.lineWidth = 1;
    for (let x = 0; x <= w; x += pixelGridSize) {
      gctx.beginPath();
      gctx.moveTo(x, 0);
      gctx.lineTo(x, h);
      gctx.stroke();
    }
    for (let y = 0; y <= h; y += pixelGridSize) {
      gctx.beginPath();
      gctx.moveTo(0, y);
      gctx.lineTo(w, y);
      gctx.stroke();
    }
  }, [isPixelMode, pixelGridSize, canvasWidth, canvasHeight]);

  const resizeCanvasRafRef = useRef(null);
  const applyCustomCanvasSize = (targetW, targetH) => {
    const w = Math.max(100, targetW ?? customCanvasW);
    const h = Math.max(100, targetH ?? customCanvasH);
    setCustomCanvasW(w);
    setCustomCanvasH(h);
    localStorage.setItem('drawing_canvas_w', String(w));
    localStorage.setItem('drawing_canvas_h', String(h));
    setCanvasWidth(w);
    setCanvasHeight(h);
    if (resizeCanvasRafRef.current) cancelAnimationFrame(resizeCanvasRafRef.current);
    resizeCanvasRafRef.current = requestAnimationFrame(() => {
      resizeCanvasRafRef.current = null;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      applyBrushStyle(ctx);
      layers.forEach((layer) => {
        let lc = layerRefs.current[layer.id];
        if (!lc) {
          createLayerCanvas(layer.id);
          lc = layerRefs.current[layer.id];
        }
        if (!lc) return;
        lc.width = w * dpr;
        lc.height = h * dpr;
        const lctx = lc.getContext('2d');
        lctx.scale(dpr, dpr);
        applyBrushStyle(lctx);
        layerCtxRefs.current[layer.id] = lctx;
      });
      drawSymmetryGuide();
      const pg = pixelGridRef.current;
      if (pg && isPixelMode) {
        pg.width = w * dpr;
        pg.height = h * dpr;
        const pgCtx = pg.getContext('2d');
        pgCtx.setTransform(1, 0, 0, 1, 0, 0);
        pgCtx.clearRect(0, 0, pg.width, pg.height);
        pgCtx.scale(dpr, dpr);
        pgCtx.strokeStyle = 'rgba(0,0,0,0.15)';
        pgCtx.lineWidth = 1;
        for (let x = 0; x <= w; x += pixelGridSize) {
          pgCtx.beginPath();
          pgCtx.moveTo(x, 0);
          pgCtx.lineTo(x, h);
          pgCtx.stroke();
        }
        for (let y = 0; y <= h; y += pixelGridSize) {
          pgCtx.beginPath();
          pgCtx.moveTo(0, y);
          pgCtx.lineTo(w, y);
          pgCtx.stroke();
        }
      }
      setActiveCtx();
      updateSymCache(w, h, symmetryMode);
      recompositeCanvas();
      fitZoomToScreen();
    });
  };

  const drawSymmetryGuide = () => {
    const guideCanvas = symmetryGuideRef.current;
    if (!guideCanvas) return;
    if (symmetryMode === 'none') {
      guideCanvas.width = 0;
      guideCanvas.height = 0;
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    const w = canvasWidth || DEFAULT_CANVAS_W;
    const h = canvasHeight || DEFAULT_CANVAS_H;
    guideCanvas.width = w * dpr;
    guideCanvas.height = h * dpr;
    const ctx = guideCanvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
    ctx.scale(dpr, dpr);
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = Math.max(1, 1.5 / Math.max(zoom, 0.02));
    if (symmetryMode === 'horizontal' || symmetryMode === 'both' || symmetryMode === 'radial4') {
      ctx.strokeStyle = 'rgba(79,70,229,0.85)';
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();
    }
    if (symmetryMode === 'vertical' || symmetryMode === 'both' || symmetryMode === 'radial4') {
      ctx.strokeStyle = 'rgba(79,70,229,0.85)';
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
    }
    const rayToEdge = (cx, cy, angle, rw, rh) => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      let t = 1e9;
      if (cos > 1e-4) t = Math.min(t, (rw - cx) / cos);
      if (cos < -1e-4) t = Math.min(t, -cx / cos);
      if (sin > 1e-4) t = Math.min(t, (rh - cy) / sin);
      if (sin < -1e-4) t = Math.min(t, -cy / sin);
      return { x: cx + cos * t, y: cy + sin * t };
    };
    if (symmetryMode === 'radial6') {
      ctx.strokeStyle = 'rgba(139,92,246,0.8)';
      for (let a = 0; a < 6; a++) {
        const angle = (Math.PI * 2 / 6) * a;
        const ep = rayToEdge(w / 2, h / 2, angle, w, h);
        ctx.beginPath();
        ctx.moveTo(w / 2, h / 2);
        ctx.lineTo(ep.x, ep.y);
        ctx.stroke();
      }
    }
    if (symmetryMode === 'radial8') {
      ctx.strokeStyle = 'rgba(139,92,246,0.8)';
      for (let a = 0; a < 8; a++) {
        const angle = (Math.PI * 2 / 8) * a;
        const ep = rayToEdge(w / 2, h / 2, angle, w, h);
        ctx.beginPath();
        ctx.moveTo(w / 2, h / 2);
        ctx.lineTo(ep.x, ep.y);
        ctx.stroke();
      }
    }
  };

  const fitZoomToScreen = () => {
    const container = document.querySelector('[data-canvas-area]');
    if (!container) return;
    const vw = container.clientWidth;
    const vh = container.clientHeight;
    const cw = canvasWidth || DEFAULT_CANVAS_W;
    const ch = canvasHeight || DEFAULT_CANVAS_H;
    if (vw <= 0 || vh <= 0 || cw <= 0 || ch <= 0) return;
    const fitZ = Math.min(vw / cw, vh / ch, 1);
    updateZoomPan(fitZ, { x: 0, y: 0 });
  };

  const loadSavedCanvas = (dataUrl) => {
    const img = new Image();
    img.onload = () => {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      const dpr = window.devicePixelRatio || 1;
      setCanvasWidth(img.width);
      setCanvasHeight(img.height);
      const activeLayerCanvas = layerRefs.current[activeLayerIdRef.current];
      if (activeLayerCanvas) {
        activeLayerCanvas.width = img.width * dpr;
        activeLayerCanvas.height = img.height * dpr;
        const lctx = activeLayerCanvas.getContext('2d');
        lctx.setTransform(1, 0, 0, 1, 0, 0);
        lctx.drawImage(img, 0, 0);
        lctx.scale(dpr, dpr);
      }
      setActiveCtx();
      recompositeCanvas();
      setShowHistoryPanel(false);
    };
    img.src = dataUrl;
  };

  const deleteSavedCanvas = (index) => {
    const updated = [...savedCanvases];
    updated.splice(index, 1);
    setSavedCanvases(updated);
    saveSavedCanvases(updated);
  };

  const deleteAutoSaveEntry = (index) => {
    const updated = [...autoSaveHistory];
    updated.splice(index, 1);
    setAutoSaveHistory(updated);
    saveAutoSaveHistory(updated);
  };

  const openMenu = (setter, otherSetter, btnRef, isOpen) => {
    otherSetter(false);
    if (isOpen) { setter(false); return; }
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const isWidthMenu = setter === setShowWidthMenu;
      const panelWidth = isWidthMenu ? 176 : 208;
      let left, top;
      if (isWidthMenu) {
        left = rect.right + 6;
        top = rect.top;
        if (left + panelWidth > window.innerWidth - 8) {
          left = rect.left - panelWidth - 6;
        }
        if (top + 200 > window.innerHeight) {
          top = Math.max(8, window.innerHeight - 210);
        }
      } else {
        left = rect.left + rect.width / 2 - panelWidth / 2;
        if (left + panelWidth > window.innerWidth - 8) {
          left = window.innerWidth - panelWidth - 8;
        }
        if (left < 8) left = 8;
        top = rect.bottom + 6;
        if (top + 300 > window.innerHeight) {
          top = Math.max(8, rect.top - 300);
        }
      }
      setMenuPos({ top, left });
    }
    setter(true);
  };
  const [isDragOver, setIsDragOver] = useState(false);
  const [showWidthMenu, setShowWidthMenu] = useState(false);
  const panelRef = useRef(null);
  const [autoSave, setAutoSave] = useState(() => { try { return localStorage.getItem('drawing_autosave') === 'true'; } catch { return false; } });
  const [autoSaveInterval, setAutoSaveInterval] = useState(() => { try { return parseInt(localStorage.getItem('drawing_autosave_interval')) || 1; } catch { return 1; } });
  const [showAutoSaveSettings, setShowAutoSaveSettings] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const autoSaveTimerRef = useRef(null);

  const [showGuessGame, setShowGuessGame] = useState(false);
  useEffect(() => { if (guessGameActivatorRef) guessGameActivatorRef.current = setShowGuessGame; }, [guessGameActivatorRef]);
  const prevActiveLayerIdRef = useRef(activeLayerId);
  useEffect(() => {
    if (prevActiveLayerIdRef.current !== activeLayerId && prevActiveLayerIdRef.current) {
      updateLayerThumbnail(prevActiveLayerIdRef.current);
    }
    prevActiveLayerIdRef.current = activeLayerId;
  }, [activeLayerId]);

  const prevLayersLengthRef = useRef(layers.length);
  const prevLayersIdsRef = useRef(layers.map(l => l.id).join(','));
  useEffect(() => {
    const currentIds = layers.map(l => l.id).join(',');
    if (currentIds !== prevLayersIdsRef.current || layers.length !== prevLayersLengthRef.current) {
      requestAnimationFrame(() => {
        layers.forEach(layer => { updateLayerThumbnail(layer.id); });
      });
      prevLayersIdsRef.current = currentIds;
      prevLayersLengthRef.current = layers.length;
    }
  }, [layers]);
  const [guessGameExiting, setGuessGameExiting] = useState(false);
  const [gameSwitchAnim, setGameSwitchAnim] = useState('');
  const [tetrisExiting, setTetrisExiting] = useState(false);
  const [witchPoisonExiting, setWitchPoisonExiting] = useState(false);
  const [guessDevMode, setGuessDevMode] = useState(false);
  const [guessRoomId, setGuessRoomId] = useState('');
  const [guessInputRoomId, setGuessInputRoomId] = useState('');
  const [guessNickname, setGuessNickname] = useState(() => { try { return localStorage.getItem('violentGuessNickname') || ''; } catch(e) { return ''; } });
  const [guessIsHost, setGuessIsHost] = useState(false);
  const [guessConnected, setGuessConnected] = useState(false);
  const [guessPlayers, setGuessPlayers] = useState([]);
  const [guessChatMessages, setGuessChatMessages] = useState([]);
  const [guessChatInput, setGuessChatInput] = useState('');
  const [guessCurrentWord, setGuessCurrentWord] = useState('');
  const [guessWordHint, setGuessWordHint] = useState('');
  const [guessDrawerId, setGuessDrawerId] = useState('');
  const [guessRound, setGuessRound] = useState(0);
  const [guessScores, setGuessScores] = useState({});
  const [guessGameState, setGuessGameState] = useState('lobby');
  const [guessTimeLeft, setGuessTimeLeft] = useState(60);
  const [guessWordOptions, setGuessWordOptions] = useState([]);
  const guessPeerRef = useRef(null);
  const guessConnectionsRef = useRef([]);
  const guessHostConnRef = useRef(null);
  const guessMyIdRef = useRef('');
  const guessTimerRef = useRef(null);
  const guessCanvasSyncRef = useRef(false);
  const [guessDiscoveredRooms, setGuessDiscoveredRooms] = useState([]);
  const [guessIsScanningLan, setGuessIsScanningLan] = useState(false);
  const [guessIsScanningLobby, setGuessIsScanningLobby] = useState(false);
  const [guessIsJoining, setGuessIsJoining] = useState(false);
  const [guessHallMsg, setGuessHallMsg] = useState('');
  const [guessColorPickerOpen, setGuessColorPickerOpen] = useState(false);
  const [guessPickerPos, setGuessPickerPos] = useState({ top: 0, left: 0 });
  const [guessHue, setGuessHue] = useState(0);
  const [guessSat, setGuessSat] = useState(100);
  const [guessLight, setGuessLight] = useState(50);
  const guessColorWheelRef = useRef(null);
  const guessColorSquareRef = useRef(null);
  const [guessTheme, setGuessTheme] = useState(() => { try { const saved = localStorage.getItem('violentGuessTheme'); if (saved) return saved; return darkMode ? 'dark' : 'light'; } catch(e) { return darkMode ? 'dark' : 'light'; } });
  useEffect(() => {
    if (!localStorage.getItem('violentGuessTheme')) {
      setGuessTheme(darkMode ? 'dark' : 'light');
    }
  }, [darkMode]);
  useEffect(() => { try { localStorage.setItem('violentGuessTheme', guessTheme); } catch(e) {} }, [guessTheme]);
  useEffect(() => {
    return () => {
      if (bgMusicRef.current) {
        clearInterval(bgMusicRef.current.intervalId);
        bgMusicRef.current.audioCtx.close();
        bgMusicRef.current = null;
      }
    };
  }, []);
  const guessThemes = {
    light: { bg: 'bg-[#f0e6ff]', card: 'bg-white/80', border: 'border-white/60', title: 'text-gray-800', sub: 'text-gray-400', input: 'bg-gray-50/80 border-gray-200/80 text-gray-700', btn1: 'from-purple-500 to-indigo-500', btn1shadow: 'shadow-purple-200/50', btn2: 'from-blue-500 to-cyan-500', btn2shadow: 'shadow-blue-200/50', icon: 'stroke-[#8b5cf6]', iconHover: 'hover:bg-purple-100/60', divider: 'via-purple-200/60', accent: '#8b5cf6' },
    dark: { bg: 'bg-gray-900', card: 'bg-gray-800/80', border: 'border-gray-700/60', title: 'text-white', sub: 'text-gray-400', input: 'bg-gray-700/80 border-gray-600/80 text-gray-200', btn1: 'from-purple-600 to-indigo-600', btn1shadow: 'shadow-purple-900/50', btn2: 'from-blue-600 to-cyan-600', btn2shadow: 'shadow-blue-900/50', icon: 'stroke-[#a78bfa]', iconHover: 'hover:bg-gray-700/60', divider: 'via-gray-600/60', accent: '#a78bfa' },
    glass: { bg: 'bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100', card: 'bg-white/40 backdrop-blur-xl', border: 'border-white/50', title: 'text-blue-900', sub: 'text-blue-400', input: 'bg-white/50 border-blue-200/60 text-blue-800 placeholder-blue-300', btn1: 'from-blue-500 to-cyan-400', btn1shadow: 'shadow-blue-300/40', btn2: 'from-sky-400 to-blue-500', btn2shadow: 'shadow-sky-300/40', icon: 'stroke-[#3b82f6]', iconHover: 'hover:bg-blue-100/60', divider: 'via-blue-300/40', accent: '#3b82f6' },
  };
  const gt = guessThemes[guessTheme] || guessThemes.light;
  const guessLobbyPeerRef = useRef(null);
  const guessLobbyConnsRef = useRef([]);
  const guessRoomListRef = useRef([]);
  const guessHeartbeatRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showRulesDialog, setShowRulesDialog] = useState(false);
  const [bgMusicPlaying, setBgMusicPlaying] = useState(false);
  const bgMusicRef = useRef(null);
  const [showTetrisMode, setShowTetrisMode] = useState(false);
  const [showWitchPoisonMode, setShowWitchPoisonMode] = useState(false);
  const colorWheelRef = useRef(null);
  const colorSquareRef = useRef(null);
  const colorHueSliderRef = useRef(null);
  const hueMagRef = useRef(null);
  const hueMagContainerRef = useRef(null);
  const hueMagPosRef = useRef({ x: 0, y: 0 });
  const [hueMagActive, setHueMagActive] = useState(false);
  const hueRafRef = useRef(null);
  const magColorRef = useRef(null);
  const magPosRef = useRef({ x: 0, y: 0 });
  const magContainerRef = useRef(null);
  const magRafRef = useRef(null);
  const eyedropperMagPosRef = useRef({ x: 0, y: 0 });
  const [, forceUpdate] = useState(0);
  const [isPicking, setIsPicking] = useState(false);
  const [isEyedropperActive, setIsEyedropperActive] = useState(false);
  const eyedropperStartPosRef = useRef({ x: 0, y: 0 });
  const eyedropperHasMovedRef = useRef(false);
  const eyedropperMouseDownRef = useRef(false);

  const [activeBrush, setActiveBrush] = useState(1);
  const [activeBrushGroup, setActiveBrushGroup] = useState('line');
  const filteredBrushes = useMemo(() => {
    const groupIdx = {};
    brushCategories.forEach((b, i) => { if (b.category === activeBrushGroup) groupIdx[i] = b; });
    return groupIdx;
  }, [activeBrushGroup]);
  const [hueJitter, setHueJitter] = useState(0);

  const [savedColors, setSavedColors] = useState(() => {
    try {
      const saved = localStorage.getItem('drawingSavedColors');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [eyedropperSavedColors, setEyedropperSavedColors] = useState(() => {
    try {
      const saved = localStorage.getItem('drawingEyedropperColors');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [recentColors, setRecentColors] = useState(() => {
    try {
      const saved = localStorage.getItem('drawingRecentColors');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [colorAlpha, setColorAlpha] = useState(100);
  const [hexInput, setHexInput] = useState('');
  const colorBtnRef = useRef(null);
  const [showAiColorPopup, setShowAiColorPopup] = useState(false);
  const aiColorPopupRef = useRef(null);
  const [aiColorPrompt, setAiColorPrompt] = useState('');
  const [aiColorLoading, setAiColorLoading] = useState(false);
  const [aiColorMode, setAiColorMode] = useState('desc');
  const [aiColorPreview, setAiColorPreview] = useState([]);
  const [aiColorResults, setAiColorResults] = useState(() => {
    try {
      const saved = localStorage.getItem('drawingAiColors');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  useEffect(() => { localStorage.setItem('drawingAiColors', JSON.stringify(aiColorResults)); }, [aiColorResults]);

  const brushPreviewCanvasRef = useRef(null);
  const eyedropperMagRef = useRef(null);
  const eyedropperMagWrapRef = useRef(null);
  const [commandIndex, setCommandIndex] = useState(-1);
  const commandsRef = useRef([]);
  const commandIndexRef = useRef(-1);
  const commandRecordingRef = useRef(false);
  const currentStrokePointsRef = useRef([]);
  const [zoomInput, setZoomInput] = useState(() => {
    if (typeof window === 'undefined') return '100%';
    const cw = parseInt((window.localStorage && window.localStorage.getItem('drawing_canvas_w')) || '0') || 1080;
    const ch = parseInt((window.localStorage && window.localStorage.getItem('drawing_canvas_h')) || '0') || 1920;
    const z = Math.min((window.innerWidth - 80) / cw, (window.innerHeight - 120) / ch, 1);
    return `${(z * 100).toFixed(0)}%`;
  });
  const _initCW = (typeof window !== 'undefined') ? (parseInt((window.localStorage && window.localStorage.getItem('drawing_canvas_w')) || '0') || 1080) : 1080;
    const _initCH = (typeof window !== 'undefined') ? (parseInt((window.localStorage && window.localStorage.getItem('drawing_canvas_h')) || '0') || 1920) : 1920;
  const _estZoom = (typeof window !== 'undefined') ? Math.min((window.innerWidth - 80) / _initCW, (window.innerHeight - 120) / _initCH, 1) : 1;
  const [zoom, setZoomState] = useState(_estZoom);
  const [panOffset, setPanOffsetState] = useState({ x: 0, y: 0 });
  const [canvasRotation, setCanvasRotation] = useState(0);

  useEffect(() => {
    updateSymCache(canvasWidth, canvasHeight, symmetryMode);
    drawSymmetryGuide();
  }, [symmetryMode, canvasWidth, canvasHeight, zoom]);

  const [canvasReady, setCanvasReady] = useState(false);
  const zoomRef = useRef(_estZoom);
  const panOffsetRef = useRef({ x: 0, y: 0 });
  const transformContainerRef = useRef(null);
  const pinchRef = useRef({ distance: 0, centerX: 0, centerY: 0, isPinching: false, startZoom: 1, startPan: { x: 0, y: 0 }, startAngle: 0, startRotation: 0 });
  const panRef = useRef({ isPanning: false, startX: 0, startY: 0, startOffset: { x: 0, y: 0 } });
  const rotationRef = useRef(0);
  const rotationDegRef = useRef(0);
  const middlePanRef = useRef({ isPanning: false, startX: 0, startY: 0, startOffset: { x: 0, y: 0 } });
  const lastTapRef = useRef(null);
  const twoFingerTapRef = useRef(null);
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const cadTouchCursorRef = useRef({ x: 0, y: 0, visible: false });
  const cadPendingEndRef = useRef(null);
  const spaceDownRef = useRef(false);
  const flushTimerRef = useRef(null);
  const transformRAFPendingRef = useRef(false);
  const transformPendingRef = useRef({ zoom: _estZoom, pan: { x: 0, y: 0 } });
  const transformLastAppliedRef = useRef({ zoom: _estZoom, pan: { x: 0, y: 0 } });

  const applyTransformDOM = useCallback((newZoom, newPan, newRotation) => {
    if (newRotation !== undefined) rotationRef.current = newRotation;
    zoomRef.current = newZoom;
    panOffsetRef.current = newPan;
    transformPendingRef.current = { zoom: newZoom, pan: { x: newPan.x, y: newPan.y }, rotation: newRotation !== undefined ? newRotation : rotationRef.current };
    setZoomInput(`${(newZoom * 100).toFixed(0)}%`);
    if (!transformRAFPendingRef.current) {
      transformRAFPendingRef.current = true;
      requestAnimationFrame(() => {
        transformRAFPendingRef.current = false;
        const pending = transformPendingRef.current;
        const last = transformLastAppliedRef.current;
        if (pending.zoom === last.zoom && pending.pan.x === last.pan.x && pending.pan.y === last.pan.y && pending.rotation === last.rotation) return;
        last.zoom = pending.zoom;
        last.pan.x = pending.pan.x;
        last.pan.y = pending.pan.y;
        last.rotation = pending.rotation;
        if (transformContainerRef.current) {
          const rot = pending.rotation || 0;
          rotationDegRef.current = rot;
          transformContainerRef.current.style.transformOrigin = 'center center';
          transformContainerRef.current.style.transform =
            `translate(-50%, -50%) translate(${pending.pan.x}px, ${pending.pan.y}px) scale(${pending.zoom}) rotate(${rot}deg)`;
          if (canvasRef.current) {
            canvasRectRef.current = canvasRef.current.getBoundingClientRect();
          }
        }
      });
    }
  }, []);

  const flushTransformState = useCallback(() => {
    const z = zoomRef.current;
    const p = panOffsetRef.current;
    const r = rotationDegRef.current;
    setZoomState(z);
    setPanOffsetState({ x: p.x, y: p.y });
    setCanvasRotation(r);
    setZoomInput(`${(z * 100).toFixed(0)}%`);
  }, []);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;
      flushTransformState();
    }, 16);
  }, [flushTransformState]);

  const updateZoomPan = useCallback((newZoom, newPan) => {
    applyTransformDOM(newZoom, newPan);
    flushTransformState();
  }, [applyTransformDOM, flushTransformState]);

  useEffect(() => {
    let frameId;
    const checkInit = () => {
      const container = document.querySelector('[data-canvas-area]');
      if (container && container.clientWidth > 0 && container.clientHeight > 0) {
        const cw = canvasWidth || DEFAULT_CANVAS_W;
        const ch = canvasHeight || DEFAULT_CANVAS_H;
        const fitZ = Math.min(container.clientWidth / cw, container.clientHeight / ch, 1);
        updateZoomPan(fitZ, { x: 0, y: 0 });
        setCanvasReady(true);
      } else {
        frameId = requestAnimationFrame(checkInit);
      }
    };
    frameId = requestAnimationFrame(checkInit);
    return () => { if (frameId) cancelAnimationFrame(frameId); };
  }, [canvasWidth, canvasHeight, updateZoomPan]);

  useEffect(() => () => { if (flushTimerRef.current) clearTimeout(flushTimerRef.current); }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      if (cadMode && !e.ctrlKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        const cmdMap = { 'l': 'line', 'c': 'circle', 'r': 'rectangle', 'a': 'arc', 'p': 'polygon', 's': 'spline', 't': 'trim', 'd': 'dimension', 'm': 'move', 'e': 'erase', 'escape': null };
        if (key === 'escape') { setCadTool('select'); cadShapeStart.current = null; circleCenterRef.current = null; lineStartRef.current = null; cadDimStart.current = null; cadPolyPoints.current = []; clearShapePreview(); return; }
        if (cmdMap[key]) { e.preventDefault(); setCadTool(cmdMap[key]); cadShapeStart.current = null; circleCenterRef.current = null; lineStartRef.current = null; cadDimStart.current = null; cadPolyPoints.current = []; clearShapePreview(); return; }
      }
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        spaceDownRef.current = true;
        const canvasArea = document.querySelector('[data-canvas-area]');
        if (canvasArea) canvasArea.style.cursor = 'grab';
      }
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space') {
        spaceDownRef.current = false;
        if (middlePanRef.current.isPanning) {
          middlePanRef.current.isPanning = false;
        }
        const canvasArea = document.querySelector('[data-canvas-area]');
        if (canvasArea) canvasArea.style.cursor = '';
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [cadMode]);

  useEffect(() => {
    if (!cadMode) {
      setCadTool('line');
      setIsLineMode(false);
      setIsCircleMode(false);
      cadShapeStart.current = null;
      circleCenterRef.current = null;
      lineStartRef.current = null;
      cadPolyPoints.current = [];
      cadArcMid.current = null;
      cadDimStart.current = null;
      clearShapePreview();
      setCadTouchCursor({ x: 0, y: 0, visible: false });
      setCadPendingEnd(null);
      setIsEyedropper(false);
      setIsEyedropperActive(false);
      setIsDrawingWithRef(false);
      strokeStartLayerRef.current = null;
      const canvasArea = document.querySelector('[data-canvas-area]');
      if (canvasArea) canvasArea.style.cursor = '';
    }
    if (cadMode) {
      setIsEraser(false);
      setIsPaintingMode(false);
      setIsBucket(false);
      setIsCalligraphy(false);
      setIsLineMode(false);
      setIsCircleMode(false);
      setIsWillowLeafMode(false);
      setActivePanel(null);
      setShowFilterPanel(false);
      setShowGuideLines(false);
      cadShapeStart.current = null;
      circleCenterRef.current = null;
      lineStartRef.current = null;
      cadPolyPoints.current = [];
      cadArcMid.current = null;
      clearShapePreview();
      setCadTouchCursor({ x: 0, y: 0, visible: false });
      setCadPendingEnd(null);
    }
  }, [cadMode]);


  useEffect(() => {
    if (isEyedropper) {
      setIsEyedropperActive(false);
      eyedropperHasMovedRef.current = false;
      eyedropperMouseDownRef.current = false;
      eyedropperStartPosRef.current = { x: 0, y: 0 };
      eyedropperMagPosRef.current = { x: 0, y: 0 };
    }
  }, [isEyedropper]);

  useEffect(() => {
    const canvasArea = document.querySelector('[data-canvas-area]');
    if (canvasArea && !cadMode && !spaceDownRef.current && !isEyedropper) {
      canvasArea.style.cursor = isWillowLeafMode ? 'crosshair' : '';
    }
    if (!isWillowLeafMode) {
      const previewCanvas = willowLeafPreviewRef.current;
      if (previewCanvas) {
        const pctx = previewCanvas.getContext('2d');
        pctx.setTransform(1, 0, 0, 1, 0, 0);
        pctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      }
      willowLeafPointsRef.current = [];
      willowLeafDrawnStrokesRef.current = [];
    }
  }, [isWillowLeafMode, cadMode, isEyedropper]);

  const initCanvas = (canvas, fillWhite = false) => {
    if (!canvas) return;
    const panContainer = canvas.parentElement;
    const outerDiv = panContainer.parentElement;
    if (!outerDiv) return;
    const rect = outerDiv.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (width === 0 || height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const lastDpr = lastDprRef.current;
    const dprChanged = Math.abs(dpr - lastDpr) > 0.01;
    if (dprChanged) {
      lastDprRef.current = dpr;
    }
    const needResize = canvas.width !== width * dpr || canvas.height !== height * dpr;
    if (!needResize && !dprChanged && !fillWhite) return;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 6;
    ctx.globalAlpha = 1;
    if (fillWhite) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      drawCanvasTexture(ctx, canvas.width, canvas.height, canvasTexture);
      ctx.scale(dpr, dpr);
    }
  };

  const createLayerCanvas = (layerId) => {
    const cw = canvasWidth || DEFAULT_CANVAS_W;
    const ch = canvasHeight || DEFAULT_CANVAS_H;
    const dpr = window.devicePixelRatio || 1;
    const offscreen = document.createElement('canvas');
    offscreen.width = cw * dpr;
    offscreen.height = ch * dpr;
    offscreen.style.width = cw + 'px';
    offscreen.style.height = ch + 'px';
    const ctx = offscreen.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 6;
    ctx.globalAlpha = 1;
    layerRefs.current[layerId] = offscreen;
    layerCtxRefs.current[layerId] = ctx;
    return offscreen;
  };

  const initLayerCanvas = (canvas, fillWhite = false) => {
    if (!canvas) return;
    const cw = canvasWidth || DEFAULT_CANVAS_W;
    const ch = canvasHeight || DEFAULT_CANVAS_H;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 6;
    ctx.globalAlpha = 1;
    if (fillWhite) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cw, ch);
    }
  };

  const addLayer = () => {
    const newId = nextLayerIdRef.current++;
    createLayerCanvas(newId);
    const newLayer = { id: newId, name: `图层${newId}`, visible: true, opacity: 1, blendMode: 'source-over', locked: false, clippingMask: false };
    recordCommand({ type: 'addLayer', layer: { ...newLayer } });
    setLayers(prev => [...prev, newLayer]);
    activeLayerIdRef.current = newId;
    setActiveLayerId(newId);
    setActiveCtx();
    recompositeCanvas();
    requestRecomposite();
  };

  const deleteLayer = (id) => {
    if (layers.length <= 1) return;
    const deletedCanvas = layerRefs.current[id];
    const deletedPixelData = deletedCanvas ? (() => { try { const tCtx = deletedCanvas.getContext('2d'); tCtx.setTransform(1,0,0,1,0,0); return tCtx.getImageData(0,0, deletedCanvas.width, deletedCanvas.height); } catch(e) { return null; } })() : null;
    const deletedLayer = layers.find(l => l.id === id);
    recordCommand({ type: 'deleteLayer', layer: deletedLayer ? { ...deletedLayer } : null, pixelData: deletedPixelData, canvasW: canvasWidth, canvasH: canvasHeight });
    setLayers(prev => {
      const newLayers = prev.filter(l => l.id !== id);
      if (id === activeLayerIdRef.current) {
        const newActiveId = newLayers[newLayers.length - 1].id;
        activeLayerIdRef.current = newActiveId;
        setActiveLayerId(newActiveId);
      }
      return newLayers;
    });
    delete layerRefs.current[id];
    delete layerCtxRefs.current[id];
    delete compositeCanvasRefs.current[id];
    delete compositeCtxRefs.current[id];
    delete thumbnailRefs.current[id];
    setActiveCtx();
    recompositeCanvas();
  };

  const setActiveLayer = (id) => {
    if (isDrawingRef.current) return;
    activeLayerIdRef.current = id;
    setActiveLayerId(id);
  };

  const duplicateLayer = (id) => {
    const srcLayer = layers.find(l => l.id === id);
    if (!srcLayer) return;
    const newId = nextLayerIdRef.current++;
    const idx = layers.findIndex(l => l.id === id);
    const newLayer = { id: newId, name: `${srcLayer.name} 副本`, visible: true, opacity: srcLayer.opacity, blendMode: srcLayer.blendMode, locked: false, clippingMask: false };
    createLayerCanvas(newId);
    const srcCanvas = layerRefs.current[id];
    const dstCanvas = layerRefs.current[newId];
    if (srcCanvas && dstCanvas) {
      dstCanvas.width = srcCanvas.width;
      dstCanvas.height = srcCanvas.height;
      dstCanvas.style.width = srcCanvas.style.width;
      dstCanvas.style.height = srcCanvas.style.height;
      const dstCtx = dstCanvas.getContext('2d');
      dstCtx.setTransform(1, 0, 0, 1, 0, 0);
      dstCtx.drawImage(srcCanvas, 0, 0);
      const dpr = window.devicePixelRatio || 1;
      dstCtx.scale(dpr, dpr);
      layerCtxRefs.current[newId] = dstCtx;
    }
    recordCommand({ type: 'duplicateLayer', layer: { ...newLayer }, sourceId: id });
    setLayers(prev => {
      const next = [...prev];
      next.splice(idx + 1, 0, newLayer);
      return next;
    });
    activeLayerIdRef.current = newId;
    setActiveLayerId(newId);
    setActiveCtx();
    recompositeCanvas();
  };

  const moveLayerUp = (id) => {
    const idx = layers.findIndex(l => l.id === id);
    if (idx >= layers.length - 1) return;
    recordCommand({ type: 'reorderLayers', fromIndex: idx, toIndex: idx + 1 });
    setLayers(prev => {
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
    recompositeCanvas();
  };

  const moveLayerDown = (id) => {
    const idx = layers.findIndex(l => l.id === id);
    if (idx <= 0) return;
    recordCommand({ type: 'reorderLayers', fromIndex: idx, toIndex: idx - 1 });
    setLayers(prev => {
      const next = [...prev];
      [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
      return next;
    });
    recompositeCanvas();
  };

  const toggleLayerVisibility = (id) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
    recompositeCanvas();
  };

  const toggleLayerLock = (id) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, locked: !l.locked } : l));
  };

  const toggleClippingMask = (id) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, clippingMask: !l.clippingMask } : l));
    recompositeCanvas();
  };

  const setLayerOpacity = (id, opacity) => {
    const oldLayer = layers.find(l => l.id === id);
    recordCommand({ type: 'layerProperty', id, key: 'opacity', oldValue: oldLayer ? oldLayer.opacity : 1, newValue: opacity });
    setLayers(prev => prev.map(l => l.id === id ? { ...l, opacity } : l));
    recompositeCanvas();
  };

  const setLayerBlendMode = (id, blendMode) => {
    const oldLayer = layers.find(l => l.id === id);
    recordCommand({ type: 'layerProperty', id, key: 'blendMode', oldValue: oldLayer ? oldLayer.blendMode : 'source-over', newValue: blendMode });
    setLayers(prev => prev.map(l => l.id === id ? { ...l, blendMode } : l));
    recompositeCanvas();
  };

  const renameLayer = (id, newName) => {
    if (!newName.trim()) return;
    const oldLayer = layers.find(l => l.id === id);
    recordCommand({ type: 'renameLayer', id, oldName: oldLayer ? oldLayer.name : '', newName: newName.trim() });
    setLayers(prev => prev.map(l => l.id === id ? { ...l, name: newName.trim() } : l));
    setRenamingLayerId(null);
  };

  const updateLayerThumbnail = useCallback((layerId) => {
    const canvas = layerRefs.current[layerId];
    const thumbCanvas = thumbnailRefs.current[layerId];
    if (!canvas || !thumbCanvas || canvas.width === 0) return;
    const ctx = thumbCanvas.getContext('2d');
    ctx.clearRect(0, 0, 32, 32);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 32, 32);
    try { ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, 32, 32); } catch(e) {}
  }, []);

  const mergeDown = (id) => {
    const idx = layers.findIndex(l => l.id === id);
    if (idx <= 0) return;
    const upper = layers[idx];
    const lower = layers[idx - 1];
    const upperCanvas = layerRefs.current[upper.id];
    const lowerCanvas = layerRefs.current[lower.id];
    let prevUpperPixels = null;
    if (upperCanvas) {
      try { const tCtx = upperCanvas.getContext('2d'); tCtx.setTransform(1,0,0,1,0,0); prevUpperPixels = tCtx.getImageData(0,0, upperCanvas.width, upperCanvas.height); } catch(e) {}
    }
    recordCommand({ type: 'mergeDown', upper: { ...upper }, lower: { ...lower }, prevUpperPixels, prevLowerPixelData: lowerCanvas ? (() => { try { const tCtx = lowerCanvas.getContext('2d'); tCtx.setTransform(1,0,0,1,0,0); return tCtx.getImageData(0,0, lowerCanvas.width, lowerCanvas.height); } catch(e) { return null; } })() : null });
    if (upperCanvas && lowerCanvas) {
      const ctx = lowerCanvas.getContext('2d');
      ctx.globalAlpha = upper.opacity;
      ctx.globalCompositeOperation = resolveBlendMode(upper.blendMode);
      ctx.drawImage(upperCanvas, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    setLayers(prev => prev.filter(l => l.id !== id));
    delete layerRefs.current[id];
    delete layerCtxRefs.current[id];
    delete compositeCanvasRefs.current[id];
    delete compositeCtxRefs.current[id];
    delete thumbnailRefs.current[id];
    if (activeLayerIdRef.current === id) {
      activeLayerIdRef.current = lower.id;
      setActiveLayerId(lower.id);
    }
    setActiveCtx();
    recompositeCanvas();
  };

  const flattenLayers = () => {
    const mainCanvas = canvasRef.current;
    if (!mainCanvas) return;
    const flatCanvas = document.createElement('canvas');
    flatCanvas.width = mainCanvas.width;
    flatCanvas.height = mainCanvas.height;
    const flatCtx = flatCanvas.getContext('2d');
    drawCanvasTexture(flatCtx, flatCanvas.width, flatCanvas.height, canvasTexture);
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      if (!layer.visible) continue;
      const lc = layerRefs.current[layer.id];
      if (!lc) continue;
      flatCtx.globalAlpha = layer.opacity;
      flatCtx.globalCompositeOperation = resolveBlendMode(layer.blendMode);
      flatCtx.drawImage(lc, 0, 0);
    }
    flatCtx.globalAlpha = 1;
    flatCtx.globalCompositeOperation = 'source-over';
    const dpr = window.devicePixelRatio || 1;
    const w = mainCanvas.width / dpr;
    const h = mainCanvas.height / dpr;
    const ctx = mainCanvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(flatCanvas, 0, 0, mainCanvas.width, mainCanvas.height, 0, 0, w, h);
    const newId = 1;
    nextLayerIdRef.current = 2;
    layerRefs.current = {};
    layerCtxRefs.current = {};
    compositeCanvasRefs.current = {};
    compositeCtxRefs.current = {};
    thumbnailRefs.current = {};
    createLayerCanvas(newId);
    setLayers([{ id: newId, name: '图层1', visible: true, opacity: 1, blendMode: 'source-over', locked: false, clippingMask: false }]);
    activeLayerIdRef.current = newId;
    setActiveLayerId(newId);
    setActiveCtx();
    recompositeCanvas();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const panContainer = canvas.parentElement;
    const outerDiv = panContainer.parentElement;
    if (!outerDiv) return;

    const doInit = () => {
      const rect = outerDiv.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      if (width === 0 || height === 0) return false;
      const dpr = window.devicePixelRatio || 1;
      const needResize = canvas.width !== width * dpr || canvas.height !== height * dpr;
      if (needResize) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
      }
      layers.forEach((layer) => {
        const lc = layerRefs.current[layer.id];
        if (!lc) return;
        const lcNeedResize = lc.width !== width * dpr || lc.height !== height * dpr;
        if (lcNeedResize) {
          const tempC = document.createElement('canvas');
          tempC.width = lc.width;
          tempC.height = lc.height;
          if (tempC.width > 0 && tempC.height > 0) {
            tempC.getContext('2d').drawImage(lc, 0, 0);
          }
          lc.width = width * dpr;
          lc.height = height * dpr;
          lc.style.width = width + 'px';
          lc.style.height = height + 'px';
          const lctx = lc.getContext('2d');
          if (tempC.width > 0 && tempC.height > 0) {
            lctx.drawImage(tempC, 0, 0);
          }
          lctx.scale(dpr, dpr);
          lctx.lineCap = 'round';
          lctx.lineJoin = 'round';
          lctx.lineWidth = 6;
          lctx.globalAlpha = 1;
        }
      });
      setActiveCtx();
      canvasRectRef.current = canvasRef.current?.getBoundingClientRect();
      recompositeCanvas();
      return true;
    };

    let initialized = doInit();
    if (!initialized) {
      const timer = setInterval(() => {
        if (doInit()) clearInterval(timer);
      }, 100);
    }

    let resizeTimeout;
    const observer = new ResizeObserver(() => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        doInit();
      }, 100);
    });
    observer.observe(outerDiv);
    return () => {
      observer.disconnect();
      if (resizeTimeout) clearTimeout(resizeTimeout);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const panContainer = canvas.parentElement;
    const outerDiv = panContainer ? panContainer.parentElement : null;
    if (!outerDiv) return;

    const doInit = () => {
      const rect = outerDiv.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      if (width === 0 || height === 0) return false;
      const dpr = window.devicePixelRatio || 1;
      const needResize = canvas.width !== width * dpr || canvas.height !== height * dpr;
      if (needResize) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
      }
      layers.forEach((layer) => {
        const lc = layerRefs.current[layer.id];
        if (!lc) return;
        const lcNeedResize = lc.width !== width * dpr || lc.height !== height * dpr;
        if (lcNeedResize) {
          const tempC = document.createElement('canvas');
          tempC.width = lc.width;
          tempC.height = lc.height;
          if (tempC.width > 0 && tempC.height > 0) {
            tempC.getContext('2d').drawImage(lc, 0, 0);
          }
          lc.width = width * dpr;
          lc.height = height * dpr;
          lc.style.width = width + 'px';
          lc.style.height = height + 'px';
          const lctx = lc.getContext('2d');
          if (tempC.width > 0 && tempC.height > 0) {
            lctx.drawImage(tempC, 0, 0);
          }
          lctx.scale(dpr, dpr);
          lctx.lineCap = 'round';
          lctx.lineJoin = 'round';
          lctx.lineWidth = 6;
          lctx.globalAlpha = 1;
        }
      });
      setActiveCtx();
      canvasRectRef.current = canvasRef.current?.getBoundingClientRect();
      if (!ctxRef.current) {
        const dpr2 = window.devicePixelRatio || 1;
        ctxRef.current = canvas.getContext('2d');
        ctxRef.current.setTransform(1, 0, 0, 1, 0, 0);
        ctxRef.current.scale(dpr2, dpr2);
      }
      recompositeCanvas();
      return true;
    };

    let initialized = doInit();
    if (!initialized) {
      const timer = setInterval(() => {
        if (doInit()) clearInterval(timer);
      }, 100);
    }

    let resizeTimeout;
    const observer = new ResizeObserver(() => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        doInit();
      }, 100);
    });
    observer.observe(outerDiv);

    return () => {
      observer.disconnect();
      if (resizeTimeout) clearTimeout(resizeTimeout);
    };
  }, [showGuessGame && (guessConnected || guessDevMode)]);

  useEffect(() => {
    if (!onBackToWorkspace) return;
    const handleBeforeUnload = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        try {
          const dataURL = canvas.toDataURL('image/png');
          localStorage.setItem('drawingCanvas', dataURL);
          saveDrawingCanvas(dataURL);
        localStorage.setItem('drawingCanvasWidth', String(canvasWidth));
        localStorage.setItem('drawingCanvasHeight', String(canvasHeight));
          const thumb = canvas.toDataURL('image/jpeg', 0.25);
          const artworks = JSON.parse(localStorage.getItem('drawing_artworks') || '[]');
          const existingIdx = artworks.findIndex(a => a.id === '_autosave_session');
          const entry = {
            id: '_autosave_session',
            name: '自动保存',
            w: canvasWidth,
            h: canvasHeight,
            dataURL,
            thumbnail: thumb,
            date: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }),
            timestamp: Date.now(),
          };
          if (existingIdx >= 0) {
            artworks[existingIdx] = entry;
          } else {
            artworks.unshift(entry);
          }
          if (artworks.length > 60) artworks.pop();
          saveArtworks(artworks);
        } catch {}
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') handleBeforeUnload();
    });
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('visibilitychange', handleBeforeUnload);
    };
  }, [canvasWidth, canvasHeight, onBackToWorkspace]);

  const applyBrushStyle = (ctx) => {
    if (!ctx) return;
    const brush = brushCategories[activeBrush];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([]);
    ctx.globalAlpha = isPaintingMode ? (brush.opacity || 1) * brushOpacity : (brush.opacity || 1);
  };

  useEffect(() => {
    if (ctxRef.current) {
      applyBrushStyle(ctxRef.current);
    }
  }, [activeBrush, lineWidth, brushOpacity]);

  useEffect(() => {
    if (showGuessGame && (guessConnected || guessDevMode)) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (initialCanvasSize) {
      localStorage.removeItem('drawingCanvas');
      localStorage.removeItem('drawingCanvasWidth');
      localStorage.removeItem('drawingCanvasHeight');
      setTimeout(() => {
        setCustomCanvasW(initialCanvasSize.w);
        setCustomCanvasH(initialCanvasSize.h);
        applyCustomCanvasSize(initialCanvasSize.w, initialCanvasSize.h);
        setActiveCtx();
        recompositeCanvas();
        setTimeout(() => {
          const container = document.querySelector('[data-canvas-area]');
          if (!container) return;
          const cw = initialCanvasSize.w;
          const ch = initialCanvasSize.h;
          const fitZ = Math.min(container.clientWidth / cw, container.clientHeight / ch, 1);
          updateZoomPan(fitZ, { x: 0, y: 0 });
        }, 200);
      }, 100);
      return;
    }
    if (artworkToLoad && artworkToLoad.dataURL) {
      setTimeout(() => {
        setCustomCanvasW(artworkToLoad.w);
        setCustomCanvasH(artworkToLoad.h);
        applyCustomCanvasSize(artworkToLoad.w, artworkToLoad.h);
        const img = new Image();
        img.onload = () => {
          const activeLayerCanvas = layerRefs.current[activeLayerIdRef.current];
          if (activeLayerCanvas) {
            const dpr = window.devicePixelRatio || 1;
            const lctx = activeLayerCanvas.getContext('2d');
            lctx.setTransform(1, 0, 0, 1, 0, 0);
            lctx.clearRect(0, 0, activeLayerCanvas.width, activeLayerCanvas.height);
            lctx.scale(dpr, dpr);
            lctx.drawImage(img, 0, 0, artworkToLoad.w, artworkToLoad.h);
          }
          setActiveCtx();
          recompositeCanvas();
          setTimeout(() => {
            const container = document.querySelector('[data-canvas-area]');
            if (!container) return;
            const aw = artworkToLoad.w;
            const ah = artworkToLoad.h;
            const fitZ = Math.min(container.clientWidth / aw, container.clientHeight / ah, 1);
            updateZoomPan(fitZ, { x: 0, y: 0 });
          }, 200);
        };
        img.src = artworkToLoad.dataURL;
      }, 100);
      return;
    }
    const fallbackLoadImage = (savedData, savedW, savedH, cw, ch) => {
      if (!savedData || !savedData.startsWith('data:image')) {
        setActiveCtx();
        recompositeCanvas();
        return;
      }
      const img = new Image();
      img.onload = () => {
        const activeLayerCanvas = layerRefs.current[activeLayerIdRef.current];
        if (activeLayerCanvas) {
          const dpr = window.devicePixelRatio || 1;
          const lctx = activeLayerCanvas.getContext('2d');
          lctx.setTransform(1, 0, 0, 1, 0, 0);
          lctx.clearRect(0, 0, activeLayerCanvas.width, activeLayerCanvas.height);
          if (savedW > 0 && savedH > 0) {
            lctx.scale(dpr, dpr);
            lctx.drawImage(img, 0, 0, savedW, savedH);
          } else {
            const scale = Math.min(cw / img.width, ch / img.height, 1);
            lctx.scale(dpr, dpr);
            lctx.drawImage(img, (cw - img.width * scale) / 2, (ch - img.height * scale) / 2, img.width * scale, img.height * scale);
          }
        }
        setActiveCtx();
        recompositeCanvas();
        setTimeout(() => fitZoomToScreen(), 200);
      };
      img.src = savedData;
    };
    setTimeout(() => {
      if (onBackToWorkspace) {
        const savedW = parseInt(localStorage.getItem('drawingCanvasWidth') || '0') || 0;
        const savedH = parseInt(localStorage.getItem('drawingCanvasHeight') || '0') || 0;
        if (savedW > 0 && savedH > 0) {
          setCustomCanvasW(savedW);
          setCustomCanvasH(savedH);
          applyCustomCanvasSize(savedW, savedH);
          const savedData = localStorage.getItem('drawingCanvas');
          const savedLayersStr = localStorage.getItem('drawingLayers');
          const savedActiveId = localStorage.getItem('drawingActiveLayerId');
          if (savedLayersStr) {
            try {
              const savedLayers = JSON.parse(savedLayersStr);
              const restoredActiveId = savedActiveId ? parseInt(savedActiveId) : (savedLayers.length > 0 ? savedLayers[savedLayers.length - 1].id : 1);
              let maxLayerId = 0;
              const restorePromises = savedLayers.map(sl => {
                maxLayerId = Math.max(maxLayerId, sl.id);
                return new Promise(resolve => {
                  createLayerCanvas(sl.id);
                  if (sl.dataURL) {
                    const img = new Image();
                    img.onload = () => {
                      const lc = layerRefs.current[sl.id];
                      if (lc) {
                        const lctx = lc.getContext('2d');
                        lctx.setTransform(1, 0, 0, 1, 0, 0);
                        lctx.drawImage(img, 0, 0);
                        const dpr = window.devicePixelRatio || 1;
                        lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                      }
                      resolve();
                    };
                    img.onerror = resolve;
                    img.src = sl.dataURL;
                  } else {
                    resolve();
                  }
                });
              });
              Promise.all(restorePromises).then(() => {
                nextLayerIdRef.current = maxLayerId + 1;
                setLayers(savedLayers.map(sl => ({
                  id: sl.id,
                  name: sl.name || `图层${sl.id}`,
                  visible: sl.visible !== undefined ? sl.visible : true,
                  opacity: sl.opacity !== undefined ? sl.opacity : 1,
                  blendMode: sl.blendMode || 'source-over',
                  locked: !!sl.locked,
                  clippingMask: !!sl.clippingMask,
                })));
                activeLayerIdRef.current = restoredActiveId;
                setActiveLayerId(restoredActiveId);
                setActiveCtx();
                recompositeCanvas();
                setTimeout(() => fitZoomToScreen(), 200);
              });
            } catch (e) { console.error(e); fallbackLoadImage(savedData, savedW, savedH, cw, ch); }
            return;
          }
          if (savedData && savedData.startsWith('data:image')) {
            fallbackLoadImage(savedData, savedW, savedH, cw, ch);
          } else {
            setActiveCtx();
            recompositeCanvas();
          }
          return;
        }
      }
      const cw = canvasWidth || DEFAULT_CANVAS_W;
      const ch = canvasHeight || DEFAULT_CANVAS_H;
      applyCustomCanvasSize(cw, ch);
      try {
        const savedData = localStorage.getItem('drawingCanvas');
        const savedLayersStr2 = localStorage.getItem('drawingLayers');
        const savedActiveId2 = localStorage.getItem('drawingActiveLayerId');
        if (savedLayersStr2) {
          try {
            const savedLayers2 = JSON.parse(savedLayersStr2);
            const restoredActiveId2 = savedActiveId2 ? parseInt(savedActiveId2) : (savedLayers2.length > 0 ? savedLayers2[savedLayers2.length - 1].id : 1);
            let maxLayerId2 = 0;
            Promise.all(savedLayers2.map(sl => {
              maxLayerId2 = Math.max(maxLayerId2, sl.id);
              return new Promise(resolve => {
                createLayerCanvas(sl.id);
                if (sl.dataURL) {
                  const img = new Image();
                  img.onload = () => {
                    const lc = layerRefs.current[sl.id];
                    if (lc) {
                      const lctx = lc.getContext('2d');
                      lctx.setTransform(1, 0, 0, 1, 0, 0);
                      lctx.drawImage(img, 0, 0);
                      const dpr = window.devicePixelRatio || 1;
                      lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                    }
                    resolve();
                  };
                  img.onerror = resolve;
                  img.src = sl.dataURL;
                } else { resolve(); }
              });
            })).then(() => {
              nextLayerIdRef.current = maxLayerId2 + 1;
              setLayers(savedLayers2.map(sl => ({
                id: sl.id,
                name: sl.name || `图层${sl.id}`,
                visible: sl.visible !== undefined ? sl.visible : true,
                opacity: sl.opacity !== undefined ? sl.opacity : 1,
                blendMode: sl.blendMode || 'source-over',
                locked: !!sl.locked,
                clippingMask: !!sl.clippingMask,
              })));
              activeLayerIdRef.current = restoredActiveId2;
              setActiveLayerId(restoredActiveId2);
              setActiveCtx();
              recompositeCanvas();
            });
          } catch (e2) { console.error(e2); }
          return;
        }
        if (savedData && savedData.startsWith('data:image')) {
          fallbackLoadImage(savedData, 0, 0, cw, ch);
        } else {
          setActiveCtx();
          recompositeCanvas();
        }
      } catch (e) { console.error(e); setActiveCtx(); recompositeCanvas(); }
    }, 50);
  }, [showGuessGame, guessConnected, initialCanvasSize, artworkToLoad, canvasReady]);

  useEffect(() => {
    const handleResize = () => {
      fitZoomToScreen();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (activePanel && panelRef.current && !panelRef.current.contains(e.target) && !(aiColorPopupRef.current && aiColorPopupRef.current.contains(e.target)) && !(colorBtnRef.current && colorBtnRef.current.contains(e.target))) {
        setActivePanel(null);
      }
      if (showWidthMenu && !e.target.closest('[data-width-btn]') && !e.target.closest('[data-width-menu]')) {
        setShowWidthMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activePanel, showWidthMenu]);

  useEffect(() => { commandIndexRef.current = commandIndex; }, [commandIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        doUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'Z' && e.shiftKey))) {
        e.preventDefault();
        doRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleDragOver = (e) => {
      e.preventDefault();
      if (e.target.closest('[data-canvas-area]')) {
        setIsDragOver(true);
      }
    };
    const handleDragLeave = (e) => {
      e.preventDefault();
      setIsDragOver(false);
    };
    const handleDrop = (e) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const panContainer = canvas.parentElement;
            const outerDiv = panContainer.parentElement;
            if (!outerDiv || outerDiv.clientWidth === 0) return;
            const dpr = window.devicePixelRatio || 1;
            const width = outerDiv.clientWidth;
            const height = outerDiv.clientHeight;
            const activeLayerCanvas = layerRefs.current[activeLayerIdRef.current];
            if (activeLayerCanvas) {
              if (activeLayerCanvas.width !== width * dpr || activeLayerCanvas.height !== height * dpr) {
                activeLayerCanvas.width = width * dpr;
                activeLayerCanvas.height = height * dpr;
                activeLayerCanvas.style.width = `${width}px`;
                activeLayerCanvas.style.height = `${height}px`;
              }
              const lctx = activeLayerCanvas.getContext('2d');
              lctx.setTransform(1, 0, 0, 1, 0, 0);
              lctx.scale(dpr, dpr);
              lctx.lineCap = 'round';
              lctx.lineJoin = 'round';
              const scale = Math.min(width / img.width, height / img.height, 1);
              lctx.drawImage(img, (width - img.width * scale) / 2, (height - img.height * scale) / 2, img.width * scale, img.height * scale);
            }
            setActiveCtx();
            recompositeCanvas();
            const saveData = canvas.toDataURL('image/jpeg', 0.85);
            localStorage.setItem('drawingCanvas', saveData);
            saveDrawingCanvas(saveData);
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(files[0]);
      }
    };
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('drawingSavedColors', JSON.stringify(savedColors));
    } catch (e) { console.error(e); }
  }, [savedColors]);

  useEffect(() => {
    try {
      localStorage.setItem('drawingEyedropperColors', JSON.stringify(eyedropperSavedColors));
    } catch (e) { console.error(e); }
  }, [eyedropperSavedColors]);

  useEffect(() => {
    try {
      localStorage.setItem('drawingRecentColors', JSON.stringify(recentColors));
    } catch (e) { console.error(e); }
  }, [recentColors]);

  useEffect(() => {
    if (activePanel === 'brush' && brushPreviewCanvasRef.current) {
      const canvas = brushPreviewCanvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const brush = brushCategories[activeBrush];
      const pts = [
        { x: 10, y: 22 }, { x: 50, y: 10 }, { x: 100, y: 18 },
        { x: 140, y: 8 }, { x: 190, y: 20 },
      ];
      for (let i = 1; i < pts.length; i++) {
        const dist = Math.sqrt((pts[i].x - pts[i-1].x) ** 2 + (pts[i].y - pts[i-1].y) ** 2);
        const steps = Math.max(1, Math.floor(dist / (brush.strokeWidth * 0.3)));
        for (let j = 0; j <= steps; j++) {
          const t = j / steps;
          const sx = pts[i-1].x + (pts[i].x - pts[i-1].x) * t;
          const sy = pts[i-1].y + (pts[i].y - pts[i-1].y) * t;
          drawTextureStamp(ctx, sx, sy, brush, lineWidth * 1.2, color);
        }
      }
      ctx.globalAlpha = 1;
    }
  }, [activePanel, activeBrush, color, lineWidth]);

  useEffect(() => {
    if (activePanel === 'color' && colorSquareRef.current && colorHueSliderRef.current) {
      drawHueSlider();
      drawSquare();
    }
  }, [activePanel, colorPickerHue]);

  const drawColorWheel = () => {
    const canvas = colorWheelRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = w / 2;
    ctx.clearRect(0, 0, w, h);
    for (let angle = 0; angle < 360; angle++) {
      const startAngle = (angle - 1) * Math.PI / 180;
      const endAngle = (angle + 1) * Math.PI / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.closePath();
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      gradient.addColorStop(0, 'white');
      gradient.addColorStop(1, `hsl(${angle}, 100%, 50%)`);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  };

  const drawHueSlider = () => {
    const canvas = colorHueSliderRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.createImageData(w, h);
    const d = imgData.data;
    for (let x = 0; x < w; x++) {
      const hue = (x / w) * 360;
      const [r, g, b] = hslToRgbFast(hue, 1, 0.5);
      for (let y = 0; y < h; y++) {
        const i = (y * w + x) * 4;
        d[i] = r; d[i+1] = g; d[i+2] = b; d[i+3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  };

  const drawHueMagnifier = (clientX) => {
    const slider = colorHueSliderRef.current;
    const mag = hueMagRef.current;
    if (!slider || !mag) return;
    const ctx = mag.getContext('2d');
    const mw = mag.width;
    const mh = mag.height;
    const rect = slider.getBoundingClientRect();
    const relX = clientX - rect.left;
    const ratio = relX / rect.width;
    const imgData = ctx.createImageData(mw, mh);
    const d = imgData.data;
    const zoom = 4;
    const stripH = mh * 0.5;
    const yOffset = Math.floor((mh - stripH) / 2);
    const yEnd = yOffset + Math.ceil(stripH);
    for (let px = 0; px < mw; px++) {
      const srcRatio = ratio + (px - mw / 2) / (mw * zoom);
      const hue = Math.max(0, Math.min(360, srcRatio * 360));
      const [r, g, b] = hslToRgbFast(hue, 1, 0.5);
      for (let py = yOffset; py < yEnd; py++) {
        const i = (py * mw + px) * 4;
        d[i] = r; d[i+1] = g; d[i+2] = b; d[i+3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mw / 2, yOffset - 4);
    ctx.lineTo(mw / 2, yEnd + 4);
    ctx.stroke();
  };

  const handleHueInteraction = (clientX, clientY, showMag) => {
    const c = colorHueSliderRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const hue = Math.floor(Math.max(0, Math.min(360, ((clientX - r.left) / r.width) * 360)));
    if (hueRafRef.current) return;
    hueRafRef.current = requestAnimationFrame(() => {
      hueRafRef.current = null;
      setColorPickerHue(hue);
      if (showMag !== undefined) setHueMagActive(showMag);
      drawHueMagnifier(clientX);
      const mc = hueMagContainerRef.current;
      if (mc) {
        mc.style.left = clientX + 'px';
        mc.style.top = clientY + 'px';
      }
      const curHex = isBucket ? bucketColor : color;
      const cRgb = hexToRgb(curHex);
      const cR = cRgb.r / 255, cG = cRgb.g / 255, cB = cRgb.b / 255;
      const cMax = Math.max(cR, cG, cB), cMin = Math.min(cR, cG, cB), cL = (cMax + cMin) / 2;
      let cS = 0;
      if (cMax !== cMin) {
        const d = cMax - cMin;
        cS = cL > 0.5 ? d / (2 - cMax - cMin) : d / (cMax + cMin);
      }
      const [nR, nG, nB] = hslToRgbFast(hue, cS, cL);
      const newHex = rgbToHex(nR, nG, nB);
      if (isBucket) { setBucketColor(newHex); } else { setColor(newHex); }
    });
  };

  const drawSquare = () => {
    const canvas = colorSquareRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.createImageData(w, h);
    const d = imgData.data;
    const hue = colorPickerHue;
    for (let y = 0; y < h; y++) {
      const s = 0;
      const l = 1 - y / h;
      for (let x = 0; x < w; x++) {
        const sat = x / w;
        const [r, g, b] = hslToRgbFast(hue, sat, l);
        const i = (y * w + x) * 4;
        d[i] = r; d[i+1] = g; d[i+2] = b; d[i+3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  };

  function hslToRgbFast(h, s, l) {
    h /= 360;
    if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1/6) return p + (q - p) * 6 * t; if (t < 1/2) return q; if (t < 2/3) return p + (q - p) * (2/3 - t) * 6; return p; };
    return [Math.round(hue2rgb(p, q, h + 1/3) * 255), Math.round(hue2rgb(p, q, h) * 255), Math.round(hue2rgb(p, q, h - 1/3) * 255)];
  }

  const pickColorFromCanvas = (ref, e, isMove = false) => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY);
    if (clientX === undefined) return;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      if (!isMove) { setIsPicking(false); magColorRef.current = null; forceUpdate(n => n + 1); }
      return;
    }
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, '0')).join('');
    magColorRef.current = hex;
    magPosRef.current = { x: clientX, y: clientY };
    const mc = magContainerRef.current;
    if (mc) {
      mc.style.left = clientX + 'px';
      mc.style.top = clientY + 'px';
    }
    if (magRafRef.current) return;
    magRafRef.current = requestAnimationFrame(() => {
      magRafRef.current = null;
      if (isBucket) { setBucketColor(hex); } else { setColor(hex); setIsEraser(false); }
      if (!isMove) addRecentColor(hex);
      forceUpdate(n => n + 1);
    });
  };

  const saveDebounceTimerRef = useRef(null);

  const saveCanvasToStorage = () => {
    try {
      if (showGuessGame && (guessConnected || guessDevMode)) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      clearTimeout(saveDebounceTimerRef.current);
      saveDebounceTimerRef.current = setTimeout(() => {
        try {
          const dataURL = canvas.toDataURL('image/jpeg', 0.85);
          saveDrawingCanvas(dataURL);
          localStorage.setItem('drawingCanvasWidth', String(canvasWidth));
          localStorage.setItem('drawingCanvasHeight', String(canvasHeight));
          const currentLayers = layersRef.current;
          const serializedLayers = currentLayers.map(layer => {
            const lc = layerRefs.current[layer.id];
            let layerData = null;
            if (lc && lc.width > 0) {
              try {
                const ctx = lc.getContext('2d');
                const imgData = ctx.getImageData(0, 0, lc.width, lc.height);
                const hasPixels = imgData.data.some(v => v !== 0);
                if (hasPixels) layerData = lc.toDataURL('image/jpeg', 0.8);
              } catch { layerData = lc.toDataURL('image/jpeg', 0.8); }
            }
            return {
              id: layer.id,
              name: layer.name,
              visible: layer.visible,
              opacity: layer.opacity,
              blendMode: layer.blendMode,
              locked: layer.locked,
              clippingMask: layer.clippingMask,
              dataURL: layerData,
            };
          });
          saveDrawingLayers(JSON.stringify(serializedLayers));
          localStorage.setItem('drawingActiveLayerId', String(activeLayerIdRef.current));
          if (onBackToWorkspace) {
            const artworks = JSON.parse(localStorage.getItem('drawing_artworks') || '[]');
            const existingIdx = artworks.findIndex(a => a.id === '_autosave_session');
            const entry = {
              id: '_autosave_session',
              name: '自动保存',
              w: canvasWidth,
              h: canvasHeight,
              dataURL,
              thumbnail: '',
              date: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }),
              timestamp: Date.now(),
            };
            (async () => {
              try {
                const thumbBlob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.15));
                if (thumbBlob) {
                  const reader = new FileReader();
                  entry.thumbnail = await new Promise(r => { reader.onloadend = () => r(reader.result); reader.readAsDataURL(thumbBlob); });
                }
              } catch {}
              const a2 = JSON.parse(localStorage.getItem('drawing_artworks') || '[]');
              const idx2 = a2.findIndex(a => a.id === '_autosave_session');
              if (idx2 >= 0) a2[idx2] = entry; else a2.unshift(entry);
              if (a2.length > 60) a2.pop();
              saveArtworks(a2);
            })();
          }
        } catch (e) { console.error(e); }
      }, 500);
    } catch (e) { console.error(e); }
  };

  const captureLayerSnapshots = () => {
    const snapshots = {};
    layersRef.current.forEach(layer => {
      const lc = layerRefs.current[layer.id];
      if (lc && lc.width > 0) {
        try { snapshots[layer.id] = lc.toDataURL('image/jpeg', 0.85); } catch {}
      }
    });
    return snapshots;
  };

  const recordSnapshot = () => {
    recordCommand({ type: 'snapshot', layerSnapshots: captureLayerSnapshots() });
  };

  const recordCommand = (cmd) => {
    if (commandRecordingRef.current) return;
    if (showGuessGame && (guessConnected || guessDevMode)) return;
    commandRecordingRef.current = true;
    const cmds = commandsRef.current;
    const curIdx = commandIndexRef.current;
    const newCmds = cmds.slice(0, curIdx + 1);
    newCmds.push(cmd);
    if (newCmds.length > 50) {
      const removed = newCmds.shift();
      if (removed && removed.layerSnapshots) {
        Object.keys(removed.layerSnapshots).forEach(k => { removed.layerSnapshots[k] = null; });
      }
    }
    commandsRef.current = newCmds;
    const newIdx = newCmds.length - 1;
    commandIndexRef.current = newIdx;
    setCommandIndex(newIdx);
    setTimeout(() => { commandRecordingRef.current = false; }, 50);
  };

  const replayGuardRef = useRef(false);

  const replayAllCommands = async (toIndex) => {
    if (replayGuardRef.current) return;
    replayGuardRef.current = true;
    try {
      const cmds = commandsRef.current;
      const dpr = window.devicePixelRatio || 1;
      const cw = canvasWidth || DEFAULT_CANVAS_W;
      const ch = canvasHeight || DEFAULT_CANVAS_H;

      layersRef.current.forEach(layer => {
        const lc = layerRefs.current[layer.id];
        if (!lc) return;
        const lctx = lc.getContext('2d');
        lctx.setTransform(1, 0, 0, 1, 0, 0);
        lctx.clearRect(0, 0, lc.width, lc.height);
        lctx.scale(dpr, dpr);
        applyBrushStyle(lctx);
      });

      const canvas = canvasRef.current;
      if (canvas) {
        const mainCtx = canvas.getContext('2d');
        mainCtx.setTransform(1, 0, 0, 1, 0, 0);
        mainCtx.clearRect(0, 0, canvas.width, canvas.height);
        mainCtx.scale(dpr, dpr);
        mainCtx.fillStyle = '#ffffff';
        mainCtx.fillRect(0, 0, cw, ch);
        applyBrushStyle(mainCtx);
      }

      for (let i = 0; i <= toIndex && i < cmds.length; i++) {
        const cmd = cmds[i];
        if (cmd.type === 'snapshot') {
          if (cmd.layerSnapshots) {
            const layerIds = Object.keys(cmd.layerSnapshots);
            const images = await Promise.all(layerIds.map(id => new Promise(resolve => {
              const img = new Image();
              img.onload = () => resolve({ id, img });
              img.onerror = () => resolve({ id, img: null });
              img.src = cmd.layerSnapshots[id];
            })));
            for (const { id, img } of images) {
              const lc2 = layerRefs.current[id];
              if (!lc2 || !img) continue;
              const lctx2 = lc2.getContext('2d');
              lctx2.setTransform(1, 0, 0, 1, 0, 0);
              lctx2.clearRect(0, 0, lc2.width, lc2.height);
              lctx2.drawImage(img, 0, 0);
              lctx2.scale(dpr, dpr);
              applyBrushStyle(lctx2);
            }
          } else {
            await new Promise(resolve => {
              const img = new Image();
              img.onload = () => {
                const activeId = activeLayerIdRef.current;
                layersRef.current.forEach(layer => {
                  const lc2 = layerRefs.current[layer.id];
                  if (!lc2) return;
                  const lctx2 = lc2.getContext('2d');
                  lctx2.setTransform(1, 0, 0, 1, 0, 0);
                  lctx2.clearRect(0, 0, lc2.width, lc2.height);
                  lctx2.scale(dpr, dpr);
                  if (layer.id === activeId) {
                    lctx2.drawImage(img, 0, 0);
                  }
                  applyBrushStyle(lctx2);
                });
                resolve();
              };
              img.onerror = resolve;
              img.src = cmd.dataURL;
            });
          }
        } else if (cmd.type === 'fill') {
          recompositeCanvas();
          floodFillReplay(cmd);
        } else if (cmd.type === 'clearLayer') {
          const lc = layerRefs.current[cmd.layerId];
          if (lc) {
            const lctx = lc.getContext('2d');
            lctx.setTransform(1, 0, 0, 1, 0, 0);
            lctx.clearRect(0, 0, lc.width, lc.height);
            lctx.scale(dpr, dpr);
            applyBrushStyle(lctx);
          }
        } else {
          const lctx = layerCtxRefs.current[cmd.layerId];
          if (!lctx) continue;
          lctx.save();
          lctx.globalAlpha = cmd.opacity || 1;
          lctx.strokeStyle = cmd.color;
          lctx.fillStyle = cmd.color;
          lctx.lineWidth = cmd.size;
          lctx.lineCap = 'round';
          lctx.lineJoin = 'round';
          lctx.setLineDash([]);

          if (cmd.type === 'erase') {
            lctx.globalCompositeOperation = 'destination-out';
            lctx.strokeStyle = 'rgba(0,0,0,1)';
            lctx.lineWidth = cmd.size * ERASER_SCALE;
            const pts = cmd.points;
            for (let j = 1; j < pts.length; j++) {
              lctx.beginPath();
              lctx.moveTo(pts[j - 1].x, pts[j - 1].y);
              lctx.lineTo(pts[j].x, pts[j].y);
              lctx.stroke();
            }
          } else if (cmd.type === 'willowLeaf') {
            lctx.globalCompositeOperation = cmd.isEraser ? 'destination-out' : 'source-over';
            lctx.globalAlpha = 1;
            lctx.beginPath();
            lctx.moveTo(cmd.points[0].x, cmd.points[0].y);
            for (let j = 1; j < cmd.points.length; j++) {
              lctx.lineTo(cmd.points[j].x, cmd.points[j].y);
            }
            lctx.closePath();
            lctx.fillStyle = cmd.color;
            lctx.fill();
            lctx.strokeStyle = cmd.color;
            lctx.lineWidth = cmd.size;
            lctx.stroke();
          } else {
            lctx.globalCompositeOperation = 'source-over';
            const pts = cmd.points;
            for (let j = 1; j < pts.length; j++) {
              const fromPts = getSymmetryPoints(pts[j - 1].x, pts[j - 1].y, cw, ch);
              const toPts = getSymmetryPoints(pts[j].x, pts[j].y, cw, ch);
              for (let k = 0; k < fromPts.length; k++) {
                drawTextureStamp(lctx, fromPts[k].x, fromPts[k].y, cmd.brush, cmd.size, cmd.color);
                lctx.beginPath();
                lctx.moveTo(fromPts[k].x, fromPts[k].y);
                lctx.lineTo(toPts[k].x, toPts[k].y);
                lctx.stroke();
              }
            }
          }
          lctx.restore();
        }
      }
      recompositeCanvas();
      saveCanvasToStorage();
    } finally {
      replayGuardRef.current = false;
    }
  };

  const floodFillReplay = (cmd) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const activeLayerCanvas = layerRefs.current[cmd.layerId];
    if (!activeLayerCanvas) return;

    const w = canvas.width;
    const h = canvas.height;
    const lctx = activeLayerCanvas.getContext('2d');
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    const imageData = lctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const x = Math.floor(cmd.x * dpr);
    const y = Math.floor(cmd.y * dpr);

    if (x < 0 || x >= w || y < 0 || y >= h) { lctx.scale(dpr, dpr); return; }

    const startIdx = (y * w + x) * 4;
    const targetColor = [data[startIdx], data[startIdx + 1], data[startIdx + 2], data[startIdx + 3]];
    const fillColor = hexToRgba(cmd.color);

    if (colorsMatch(targetColor, fillColor, 5)) { lctx.scale(dpr, dpr); return; }

    const tolerance = cmd.tolerance || 30;
    const stack = [[x, y]];
    const visited = new Uint8Array(w * h);

    while (stack.length > 0) {
      const [cx, cy] = stack.pop();
      if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
      const pos = cy * w + cx;
      if (visited[pos]) continue;
      const idx = pos * 4;
      const curColor = [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
      if (!colorsMatch(curColor, targetColor, tolerance)) continue;
      visited[pos] = 1;
      data[idx] = fillColor[0];
      data[idx + 1] = fillColor[1];
      data[idx + 2] = fillColor[2];
      data[idx + 3] = fillColor[3];
      stack.push([cx + 1, cy]);
      stack.push([cx - 1, cy]);
      stack.push([cx, cy + 1]);
      stack.push([cx, cy - 1]);
    }

    lctx.putImageData(imageData, 0, 0);
    lctx.scale(dpr, dpr);
  };

  const doUndo = () => {
    const idx = commandIndexRef.current;
    if (idx < 0) return;
    const newIdx = idx - 1;
    commandIndexRef.current = newIdx;
    setCommandIndex(newIdx);
    replayAllCommands(newIdx);
  };

  const doRedo = () => {
    const idx = commandIndexRef.current;
    const cmds = commandsRef.current;
    if (idx >= cmds.length - 1) return;
    const newIdx = idx + 1;
    commandIndexRef.current = newIdx;
    setCommandIndex(newIdx);
    replayAllCommands(newIdx);
  };

  const undo = doUndo;
  const redo = doRedo;

  const lastPosRef = useRef(null);
  const stampIntervalRef = useRef(0);
  const calligraphySpeedRef = useRef(0);
  const calligraphyLastWidthRef = useRef(0);
  const pressureStrokeProgressRef = useRef(0);
  const pressureSmoothWidthRef = useRef(0);
  const pressureLastTimeRef = useRef(0);
  const pressureTotalDistRef = useRef(0);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };
    const dpr = window.devicePixelRatio || 1;
    const canvasW = canvas.width / dpr;
    const canvasH = canvas.height / dpr;
    let offsetX, offsetY;
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      offsetX = (e.touches[0].clientX - rect.left) * canvasW / rect.width;
      offsetY = (e.touches[0].clientY - rect.top) * canvasH / rect.height;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      offsetX = (e.changedTouches[0].clientX - rect.left) * canvasW / rect.width;
      offsetY = (e.changedTouches[0].clientY - rect.top) * canvasH / rect.height;
    } else {
      offsetX = (e.clientX - rect.left) * canvasW / rect.width;
      offsetY = (e.clientY - rect.top) * canvasH / rect.height;
    }
    return { offsetX, offsetY };
  };

  const clearShapePreview = () => {
    if (shapePreviewRef.current) {
      const pCtx = shapePreviewRef.current.getContext('2d');
      pCtx.clearRect(0, 0, shapePreviewRef.current.width, shapePreviewRef.current.height);
    }
  };

  const drawShapePreview = (startX, startY, endX, endY, mode) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!shapePreviewRef.current) {
      shapePreviewRef.current = document.createElement('canvas');
    }
    const dpr = window.devicePixelRatio || 1;
    shapePreviewRef.current.width = canvas.width;
    shapePreviewRef.current.height = canvas.height;
    const pCtx = shapePreviewRef.current.getContext('2d');
    pCtx.clearRect(0, 0, shapePreviewRef.current.width, shapePreviewRef.current.height);
    pCtx.scale(dpr, dpr);
    pCtx.strokeStyle = color;
    pCtx.lineWidth = lineWidth;
    pCtx.lineCap = 'round';
    pCtx.lineJoin = 'round';
    pCtx.setLineDash([6, 4]);
    pCtx.globalAlpha = 0.7;
    if (mode === 'line') {
      pCtx.beginPath();
      pCtx.moveTo(startX, startY);
      pCtx.lineTo(endX, endY);
      pCtx.stroke();
    } else if (mode === 'circle') {
      const dx = endX - startX;
      const dy = endY - startY;
      const radius = Math.sqrt(dx * dx + dy * dy);
      pCtx.beginPath();
      pCtx.arc(startX, startY, radius, 0, Math.PI * 2);
      pCtx.stroke();
      pCtx.setLineDash([2, 3]);
      pCtx.globalAlpha = 0.3;
      pCtx.beginPath();
      pCtx.moveTo(startX, startY);
      pCtx.lineTo(endX, endY);
      pCtx.stroke();
    } else if (mode === 'rectangle') {
      pCtx.strokeRect(Math.min(startX, endX), Math.min(startY, endY), Math.abs(endX - startX), Math.abs(endY - startY));
    } else if (mode === 'arc') {
      const mid = cadArcMid.current;
      if (mid) {
        const cx = (startX + endX + mid.x) / 3;
        const cy = (startY + endY + mid.y) / 3;
        const r = Math.sqrt((startX - cx)**2 + (startY - cy)**2);
        const a1 = Math.atan2(startY - cy, startX - cx);
        const a2 = Math.atan2(endY - cy, endX - cx);
        pCtx.beginPath();
        pCtx.arc(cx, cy, r, a1, a2, a2 < a1);
        pCtx.stroke();
        pCtx.setLineDash([2, 3]);
        pCtx.globalAlpha = 0.3;
        pCtx.beginPath(); pCtx.arc(cx, cy, 2, 0, Math.PI*2); pCtx.stroke();
        pCtx.beginPath(); pCtx.moveTo(cx, cy); pCtx.lineTo(startX, startY); pCtx.stroke();
        pCtx.beginPath(); pCtx.moveTo(cx, cy); pCtx.lineTo(endX, endY); pCtx.stroke();
      }
    } else if (mode === 'polygon') {
      const pts = cadPolyPoints.current;
      if (pts.length > 1) {
        pCtx.beginPath();
        pCtx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) pCtx.lineTo(pts[i].x, pts[i].y);
        pCtx.lineTo(endX, endY);
        pCtx.stroke();
        pCtx.globalAlpha = 0.3;
        for (let i = 0; i < pts.length; i++) { pCtx.beginPath(); pCtx.arc(pts[i].x, pts[i].y, 3, 0, Math.PI*2); pCtx.fill(); }
      }
    } else if (mode === 'spline') {
      const pts = [...cadPolyPoints.current, { x: endX, y: endY }];
      if (pts.length > 2) {
        pCtx.beginPath();
        pCtx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i++) {
          const cp1x = pts[i-1].x + (pts[i].x - pts[i-1].x) * 0.5;
          const cp1y = pts[i-1].y;
          const cp2x = pts[i].x;
          const cp2y = pts[i].y;
          const mx = (pts[i-1].x + pts[i].x) / 2;
          const my = (pts[i-1].y + pts[i].y) / 2;
          pCtx.quadraticCurveTo(pts[i-1].x, pts[i-1].y, mx, my);
        }
        pCtx.quadraticCurveTo(pts[pts.length-2].x, pts[pts.length-2].y, pts[pts.length-1].x, pts[pts.length-1].y);
        pCtx.stroke();
        pCtx.globalAlpha = 0.3;
        for (let i = 0; i < cadPolyPoints.current.length; i++) {
          pCtx.beginPath(); pCtx.arc(cadPolyPoints.current[i].x, cadPolyPoints.current[i].y, 3, 0, Math.PI*2); pCtx.fill();
        }
      }
    } else if (mode === 'trim') {
      pCtx.strokeStyle = '#ff4444';
      pCtx.lineWidth = lineWidth * 2;
      pCtx.globalAlpha = 0.3;
      pCtx.lineCap = 'round';
      pCtx.lineJoin = 'round';
      pCtx.beginPath();
      pCtx.moveTo(startX, startY);
      pCtx.lineTo(endX, endY);
      pCtx.stroke();
      pCtx.strokeStyle = '#ff4444';
      pCtx.lineWidth = 1;
      pCtx.globalAlpha = 0.7;
      pCtx.setLineDash([3, 3]);
      pCtx.beginPath();
      pCtx.moveTo(startX, startY);
      pCtx.lineTo(endX, endY);
      pCtx.stroke();
      pCtx.globalAlpha = 0.5;
      pCtx.setLineDash([]);
      pCtx.beginPath(); pCtx.arc(startX, startY, 3, 0, Math.PI*2); pCtx.fill();
      pCtx.beginPath(); pCtx.arc(endX, endY, 3, 0, Math.PI*2); pCtx.fill();
      pCtx.stroke();
    } else if (mode === 'dimension') {
      const dx = endX - startX, dy = endY - startY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist > 1) {
        const absDx = Math.abs(dx), absDy = Math.abs(dy);
        let dimDx, dimDy, perpNx, perpNy;
        if (absDx > absDy * 2) {
          dimDx = dx > 0 ? dist : -dist; dimDy = 0;
          perpNx = 0; perpNy = -1;
        } else if (absDy > absDx * 2) {
          dimDx = 0; dimDy = dy > 0 ? dist : -dist;
          perpNx = 1; perpNy = 0;
        } else {
          dimDx = dx; dimDy = dy;
          perpNx = -dy/dist; perpNy = dx/dist;
        }
        const dimEx = startX + dimDx, dimEy = startY + dimDy;
        const dimDist = Math.sqrt(dimDx*dimDx + dimDy*dimDy);
        const off = 25;
        const lsx = startX+perpNx*off, lsy = startY+perpNy*off;
        const lex = dimEx+perpNx*off, ley = dimEy+perpNy*off;
        pCtx.globalAlpha = 0.35;
        pCtx.beginPath(); pCtx.moveTo(startX, startY); pCtx.lineTo(lsx, lsy); pCtx.stroke();
        pCtx.beginPath(); pCtx.moveTo(dimEx, dimEy); pCtx.lineTo(lex, ley); pCtx.stroke();
        pCtx.globalAlpha = 0.7;
        pCtx.lineWidth = 0.8;
        pCtx.beginPath(); pCtx.moveTo(lsx, lsy); pCtx.lineTo(lex, ley); pCtx.stroke();
        pCtx.globalAlpha = 0.5;
        pCtx.font = `bold ${Math.max(10, lineWidth*2)}px sans-serif`;
        pCtx.textAlign = 'center';
        pCtx.textBaseline = 'middle';
        pCtx.fillText(dimDist.toFixed(1), (lsx+lex)/2, (lsy+ley)/2);
      }
    }
    pCtx.setLineDash([]);
    pCtx.globalAlpha = 1;
    pCtx.setTransform(1, 0, 0, 1, 0, 0);
    recompositeCanvas();
    const dpr2 = window.devicePixelRatio || 1;
    const mainCtx = canvas.getContext('2d');
    mainCtx.setTransform(1, 0, 0, 1, 0, 0);
    mainCtx.drawImage(shapePreviewRef.current, 0, 0);
    mainCtx.scale(dpr2, dpr2);
  };

  const commitShape = (startX, startY, endX, endY, mode) => {
    const ctx = getActiveCtx();
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    if (mode === 'line') {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    } else if (mode === 'circle') {
      const dx = endX - startX;
      const dy = endY - startY;
      const radius = Math.sqrt(dx * dx + dy * dy);
      ctx.beginPath();
      ctx.arc(startX, startY, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (mode === 'rectangle') {
      const rx = Math.min(startX, endX);
      const ry = Math.min(startY, endY);
      const rw = Math.abs(endX - startX);
      const rh = Math.abs(endY - startY);
      ctx.strokeRect(rx, ry, rw, rh);
    } else if (mode === 'arc') {
      const mid = cadArcMid.current;
      if (mid) {
        const cx = (startX + endX + mid.x) / 3;
        const cy = (startY + endY + mid.y) / 3;
        const r = Math.sqrt((startX - cx)**2 + (startY - cy)**2);
        const a1 = Math.atan2(startY - cy, startX - cx);
        const a2 = Math.atan2(endY - cy, endX - cx);
        ctx.beginPath();
        ctx.arc(cx, cy, r, a1, a2, a2 < a1);
        ctx.stroke();
      }
    } else if (mode === 'polygon') {
      const pts = cadPolyPoints.current;
      if (pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.stroke();
      cadPolyPoints.current = [];
    }
    ctx.restore();
    lineStartRef.current = null;
    circleCenterRef.current = null;
    cadShapeStart.current = null;
    cadArcMid.current = null;
    clearShapePreview();
    setCadPendingEnd(null);
    recompositeCanvas();
    const snapData = canvasRef.current?.toDataURL('image/png') || '';
    recordSnapshot();
  };

  const commitSpline = () => {
    const pts = cadPolyPoints.current;
    if (pts.length < 2) return;
    const ctx = getActiveCtx();
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const mx = (pts[i-1].x + pts[i].x) / 2;
      const my = (pts[i-1].y + pts[i].y) / 2;
      if (i === 1) ctx.lineTo(mx, my);
      else ctx.quadraticCurveTo(pts[i-2].x, pts[i-2].y, mx, my);
    }
    ctx.stroke();
    ctx.restore();
    cadPolyPoints.current = [];
    clearShapePreview();
    setCadPendingEnd(null);
    recompositeCanvas();
    const snapSpline = canvasRef.current?.toDataURL('image/png') || '';
    recordSnapshot();
  };

  const commitTrim = (sx, sy, ex, ey) => {
    const ctx = getActiveCtx();
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.lineWidth = lineWidth * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const dx = ex - sx;
    const dy = ey - sy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) {
      ctx.beginPath();
      ctx.arc(sx, sy, lineWidth * 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
    ctx.restore();
    lineStartRef.current = null;
    clearShapePreview();
    setCadPendingEnd(null);
    recompositeCanvas();
    const snapTrim = canvasRef.current?.toDataURL('image/png') || '';
    recordSnapshot();
  };

  const commitDimension = (sx, sy, ex, ey) => {
    const ctx = getActiveCtx();
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const dx = ex - sx;
    const dy = ey - sy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    let dimDx, dimDy, perpNx, perpNy;
    if (absDx > absDy * 2) {
      dimDx = dx > 0 ? dist : -dist;
      dimDy = 0;
      perpNx = 0; perpNy = -1;
    } else if (absDy > absDx * 2) {
      dimDx = 0;
      dimDy = dy > 0 ? dist : -dist;
      perpNx = 1; perpNy = 0;
    } else {
      dimDx = dx; dimDy = dy;
      const d = Math.sqrt(dx*dx+dy*dy);
      perpNx = -dy/d; perpNy = dx/d;
    }
    const dimEx = sx + dimDx;
    const dimEy = sy + dimDy;
    const dimDist = Math.sqrt(dimDx*dimDx + dimDy*dimDy);
    const offset = 25;
    const arrowLen = 8;
    const arrowW = 3;
    const lsx = sx + perpNx * offset;
    const lsy = sy + perpNy * offset;
    const lex = dimEx + perpNx * offset;
    const ley = dimEy + perpNy * offset;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(lsx, lsy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(dimEx, dimEy);
    ctx.lineTo(lex, ley);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(lsx, lsy);
    ctx.lineTo(lex, ley);
    ctx.stroke();
    const dirX = dimDx / dimDist;
    const dirY = dimDy / dimDist;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lsx, lsy);
    ctx.lineTo(lsx + dirX * arrowLen + perpNx * arrowW, lsy + dirY * arrowLen + perpNy * arrowW);
    ctx.lineTo(lsx + dirX * arrowLen - perpNx * arrowW, lsy + dirY * arrowLen - perpNy * arrowW);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(lex, ley);
    ctx.lineTo(lex - dirX * arrowLen + perpNx * arrowW, ley - dirY * arrowLen + perpNy * arrowW);
    ctx.lineTo(lex - dirX * arrowLen - perpNx * arrowW, ley - dirY * arrowLen - perpNy * arrowW);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lsx, lsy, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lex, ley, 1.5, 0, Math.PI * 2);
    ctx.fill();
    const midX = (lsx + lex) / 2;
    const midY = (lsy + ley) / 2;
    const text = dimDist.toFixed(1);
    const fontSize = Math.max(10, lineWidth * 2);
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(midX - tw / 2 - 3, midY - fontSize / 2 - 1, tw + 6, fontSize + 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.3;
    ctx.strokeRect(midX - tw / 2 - 3, midY - fontSize / 2 - 1, tw + 6, fontSize + 2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.fillText(text, midX, midY);
    ctx.restore();
    cadDimStart.current = null;
    clearShapePreview();
    setCadPendingEnd(null);
    recompositeCanvas();
    const snapDim = canvasRef.current?.toDataURL('image/png') || '';
    recordSnapshot();
  };

  const addGuideLine = (type) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const pos = type === 'horizontal' ? (canvas.height / dpr) / 2 : (canvas.width / dpr) / 2;
    setGuideLines(prev => [...prev, { type, position: pos, id: Date.now() }]);
    setShowGuideLines(true);
  };

  const removeGuideLine = (id) => {
    setGuideLines(prev => prev.filter(g => g.id !== id));
  };

  const applyFilter = () => {
    const ctx = getActiveCtx();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const activeLayerCanvas = layerRefs.current[activeLayerId];
    if (!activeLayerCanvas) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = activeLayerCanvas.width;
    tempCanvas.height = activeLayerCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(activeLayerCanvas, 0, 0);
    const lctx = activeLayerCanvas.getContext('2d');
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.clearRect(0, 0, activeLayerCanvas.width, activeLayerCanvas.height);
    const filterStr = `blur(${filterBlur}px) brightness(${filterBrightness}%) contrast(${filterContrast}%) saturate(${filterSaturate}%) hue-rotate(${filterHueRotate}deg) grayscale(${filterGrayscale}%) invert(${filterInvert}%) sepia(${filterSepia}%)`;
    lctx.filter = filterStr;
    lctx.drawImage(tempCanvas, 0, 0);
    lctx.filter = 'none';
    lctx.scale(dpr, dpr);
    layerCtxRefs.current[activeLayerId] = lctx;
    recompositeCanvas();
    const snapFilter = canvasRef.current?.toDataURL('image/png') || '';
    recordSnapshot();
    setFilterBlur(0); setFilterBrightness(100); setFilterContrast(100); setFilterSaturate(100);
    setFilterHueRotate(0); setFilterGrayscale(0); setFilterInvert(0); setFilterSepia(0);
    setShowFilterPanel(false);
  };

  const getActiveCtx = () => {
    const layerCanvas = layerRefs.current[activeLayerId];
    if (!layerCanvas) return ctxRef.current;
    const ctx = layerCanvas.getContext('2d');
    return ctx;
  };

  const setActiveCtx = () => {
    if (showGuessGame && (guessConnected || guessDevMode)) {
      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        ctxRef.current = canvas.getContext('2d');
        ctxRef.current.setTransform(1, 0, 0, 1, 0, 0);
        ctxRef.current.scale(dpr, dpr);
        ctxRef.current.lineCap = 'round';
        ctxRef.current.lineJoin = 'round';
        return;
      }
    }
    const layerCanvas = layerRefs.current[activeLayerIdRef.current];
    if (!layerCanvas) return;
    const ctx = layerCanvas.getContext('2d');
    ctxRef.current = ctx;
  };

  const pickEyedropperColor = (e, drawMag = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { offsetX, offsetY } = getCoordinates(e);
    const dpr = window.devicePixelRatio || 1;
    const px = Math.floor(offsetX * dpr);
    const py = Math.floor(offsetY * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
      const pixel = ctx.getImageData(px, py, 1, 1).data;
      const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, '0')).join('');
      setEyedropperColor(hex);
      if (drawMag) {
        const magCanvas = eyedropperMagRef.current;
        if (magCanvas) {
          const magCtx = magCanvas.getContext('2d');
          magCtx.imageSmoothingEnabled = false;
          magCtx.clearRect(0, 0, magCanvas.width, magCanvas.height);
          const magScale = 8;
          const sourceSizeCSS = magCanvas.width / magScale;
          const sourceSizeDPR = sourceSizeCSS * dpr;
          let sx = px - sourceSizeDPR / 2;
          let sy = py - sourceSizeDPR / 2;
          magCtx.save();
          magCtx.beginPath();
          magCtx.arc(magCanvas.width / 2, magCanvas.height / 2, magCanvas.width / 2 - 2, 0, Math.PI * 2);
          magCtx.clip();
          magCtx.drawImage(canvas, sx, sy, sourceSizeDPR, sourceSizeDPR, 0, 0, magCanvas.width, magCanvas.height);
          magCtx.restore();
        }
      }
    }
    ctx.scale(dpr, dpr);
    forceUpdate(n => n + 1);
  };

  const confirmEyedropperColor = () => {
    const c = eyedropperColor;
    setColor(c);
    setBucketColor(c);
    if (!eyedropperSavedColors.includes(c)) {
      if (eyedropperSavedColors.length >= 20) {
        setEyedropperSavedColors(prev => [...prev.slice(1), c]);
      } else {
        setEyedropperSavedColors(prev => [...prev, c]);
      }
    }
    setIsEyedropperActive(false);
    eyedropperHasMovedRef.current = false;
    eyedropperMagPosRef.current = { x: 0, y: 0 };
    forceUpdate(n => n + 1);
  };

  const startDrawing = (e) => {
    e.preventDefault();
    if (!ctxRef.current) return;
    if (isWillowLeafMode) {
      const { offsetX, offsetY } = getCoordinates(e);
      willowLeafPointsRef.current = [{ x: offsetX, y: offsetY }];
      willowLeafDrawnStrokesRef.current = [];
      const previewCanvas = willowLeafPreviewRef.current;
      if (previewCanvas) {
        const dpr = window.devicePixelRatio || 1;
        const mainCanvas = canvasRef.current;
        previewCanvas.width = mainCanvas.width;
        previewCanvas.height = mainCanvas.height;
        previewCanvas.style.width = mainCanvas.style.width;
        previewCanvas.style.height = mainCanvas.style.height;
        const pctx = previewCanvas.getContext('2d');
        pctx.setTransform(1, 0, 0, 1, 0, 0);
        pctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        pctx.scale(dpr, dpr);
      }
      setIsDrawingWithRef(true);
      canvasRectRef.current = canvasRef.current?.getBoundingClientRect();
      return;
    }
    const activeLayer = layersRef.current.find(l => l.id === activeLayerIdRef.current);
    if (activeLayer?.locked) return;
    if (isEyedropper) {
      const clientX = e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY);
      eyedropperStartPosRef.current = { x: clientX, y: clientY };
      eyedropperHasMovedRef.current = false;
      eyedropperMouseDownRef.current = true;
      setIsEyedropperActive(false);
      return;
    }
    if (isBucket) {
      const { offsetX, offsetY } = getCoordinates(e);
      floodFill(offsetX, offsetY);
      return;
    }
    if (!isPaintingMode && !isEraser && !isCalligraphy) return;
    const { offsetX, offsetY } = getCoordinates(e);
    const snapX = (isPixelMode && pixelModeType === 'full') ? Math.floor(offsetX / pixelGridSize) * pixelGridSize + pixelGridSize / 2 : offsetX;
    const snapY = (isPixelMode && pixelModeType === 'full') ? Math.floor(offsetY / pixelGridSize) * pixelGridSize + pixelGridSize / 2 : offsetY;
    lastPosRef.current = { x: snapX, y: snapY };
    currentStrokePointsRef.current = [{ x: snapX, y: snapY }];
    stampIntervalRef.current = 0;
    calligraphySpeedRef.current = 0;
    calligraphyLastWidthRef.current = isCalligraphy ? lineWidth * 1.5 : 0;
    pressureStrokeProgressRef.current = 0;
    pressureSmoothWidthRef.current = lineWidth;
    pressureLastTimeRef.current = performance.now();
    pressureTotalDistRef.current = 0;
    stabilizerBufferRef.current = [{ x: offsetX, y: offsetY }];
    setIsDrawingWithRef(true);
    canvasRectRef.current = canvasRef.current?.getBoundingClientRect();
  };

  const drawTextureStamp = (ctx, x, y, brush, size, c, opacityMul = 1) => {
    const texture = brush.texture;
    if (texture === 'spray') {
      const particles = brush.particleCount || 40;
      for (let i = 0; i < particles; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * size;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        const ps = Math.random() * 1.5 + 0.5;
        ctx.globalAlpha = (Math.random() * 0.5 + 0.1) * opacityMul;
        ctx.fillStyle = c;
        ctx.fillRect(px, py, ps, ps);
      }
    } else if (texture === 'crayon') {
      const w = size;
      const h = size * 0.4;
      for (let dx = -w/2; dx < w/2; dx += 1.5) {
        for (let dy = -h/2; dy < h/2; dy += 1.5) {
          if (Math.random() > 0.45) {
            ctx.globalAlpha = (Math.random() * 0.3 + 0.15) * opacityMul;
            ctx.fillStyle = c;
            ctx.fillRect(x + dx, y + dy, 1.5, 1.5);
          }
        }
      }
    } else if (texture === 'charcoal') {
      const w = size;
      const h = size * 0.35;
      for (let dx = -w/2; dx < w/2; dx += 1) {
        for (let dy = -h/2; dy < h/2; dy += 1) {
          if (Math.random() > 0.3) {
            ctx.globalAlpha = (Math.random() * 0.4 + 0.2) * opacityMul;
            ctx.fillStyle = c;
            const s = Math.random() * 2 + 0.5;
            ctx.fillRect(x + dx, y + dy, s, s);
          }
        }
      }
    } else if (texture === 'watercolor') {
      const r = size * 0.8;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, c + '30');
      gradient.addColorStop(0.5, c + '15');
      gradient.addColorStop(1, c + '00');
      ctx.fillStyle = gradient;
      ctx.globalAlpha = 1 * opacityMul;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (texture === 'pencil') {
      const w = size * 0.6;
      for (let dx = -w/2; dx < w/2; dx += 1) {
        if (Math.random() > 0.5) {
          ctx.globalAlpha = (Math.random() * 0.3 + 0.1) * opacityMul;
          ctx.fillStyle = c;
          const dy = (Math.random() - 0.5) * size * 0.3;
          ctx.fillRect(x + dx, y + dy, 1, 1);
        }
      }
    } else if (texture === 'marker') {
      ctx.globalAlpha = brush.opacity || 0.6;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.ellipse(x, y, size * 0.5, size * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (texture === 'flat') {
      ctx.globalAlpha = 1 * opacityMul;
      ctx.fillStyle = c;
      ctx.fillRect(x - size * 0.5, y - size * 0.15, size, size * 0.3);
    } else if (texture === 'gpen') {
      const speed = brush._lastSpeed || 0;
      const w = size * (0.3 + Math.min(speed * 0.05, 0.7));
      ctx.globalAlpha = 1 * opacityMul;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.ellipse(x, y, w * 0.5, size * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (texture === 'dippen') {
      const speed = brush._lastSpeed || 0;
      const w = size * (0.15 + Math.min(speed * 0.08, 0.6));
      ctx.globalAlpha = 0.9 * opacityMul;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.ellipse(x, y, w * 0.5, size * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (texture === 'inkbrush') {
      const speed = brush._lastSpeed || 0;
      const w = size * (0.2 + Math.min(speed * 0.06, 0.8));
      ctx.globalAlpha = 0.85 * opacityMul;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.ellipse(x, y, w * 0.6, w * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const ox = (Math.random() - 0.5) * w * 0.8;
        const oy = (Math.random() - 0.5) * w * 0.4;
        ctx.globalAlpha = (Math.random() * 0.3 + 0.1) * opacityMul;
        ctx.beginPath();
        ctx.arc(x + ox, y + oy, Math.random() * w * 0.2 + 1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (texture === 'oilpaint') {
      const w = size * 0.6;
      ctx.globalAlpha = 0.9 * opacityMul;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.ellipse(x, y, w, w * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 5; i++) {
        const ox = (Math.random() - 0.5) * w * 1.2;
        const oy = (Math.random() - 0.5) * w * 0.6;
        ctx.globalAlpha = (Math.random() * 0.4 + 0.2) * opacityMul;
        ctx.beginPath();
        ctx.ellipse(x + ox, y + oy, Math.random() * w * 0.3 + 2, Math.random() * w * 0.15 + 1, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (texture === 'pastel') {
      const w = size * 0.7;
      for (let dx = -w; dx < w; dx += 2) {
        for (let dy = -w * 0.4; dy < w * 0.4; dy += 2) {
          if (Math.random() > 0.35) {
            ctx.globalAlpha = (Math.random() * 0.25 + 0.1) * opacityMul;
            ctx.fillStyle = c;
            ctx.fillRect(x + dx, y + dy, 2, 2);
          }
        }
      }
    } else if (texture === 'airbrush') {
      const r = size;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, c + '40');
      gradient.addColorStop(0.3, c + '25');
      gradient.addColorStop(0.7, c + '10');
      gradient.addColorStop(1, c + '00');
      ctx.fillStyle = gradient;
      ctx.globalAlpha = 0.4 * opacityMul;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (texture === 'halftone') {
      const r = size * 0.6;
      const dotSpacing = Math.max(3, size * 0.15);
      ctx.globalAlpha = 1 * opacityMul;
      ctx.fillStyle = c;
      for (let dx = -r; dx < r; dx += dotSpacing) {
        for (let dy = -r; dy < r; dy += dotSpacing) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < r) {
            const dotR = Math.max(0.5, (1 - dist / r) * dotSpacing * 0.35);
            ctx.beginPath();
            ctx.arc(x + dx, y + dy, dotR, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    } else if (texture === 'neon') {
      ctx.save();
      ctx.shadowColor = c;
      ctx.shadowBlur = size * 1.5;
      ctx.globalAlpha = 0.9 * opacityMul;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1 * opacityMul;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, size * 0.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (texture === 'fur') {
      ctx.globalAlpha = 0.6 * opacityMul;
      ctx.strokeStyle = c;
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const len = Math.random() * size * 0.6 + size * 0.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
        ctx.stroke();
      }
    } else if (texture === 'pixel') {
      const ps = Math.max(2, Math.round(size * 0.3));
      const gx = Math.floor(x / ps) * ps;
      const gy = Math.floor(y / ps) * ps;
      ctx.globalAlpha = 1 * opacityMul;
      ctx.fillStyle = c;
      ctx.fillRect(gx, gy, ps, ps);
    } else if (texture === 'chalk') {
      const r = size * 0.55;
      ctx.globalAlpha = 0.15 * opacityMul;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x + (Math.random() - 0.5) * r, y + (Math.random() - 0.5) * r, r * (0.6 + Math.random() * 0.4), 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 6; i++) {
        const dx = (Math.random() - 0.5) * r * 1.5;
        const dy = (Math.random() - 0.5) * r * 1.5;
        const sr = Math.random() * r * 0.3 + 0.3;
        ctx.globalAlpha = (Math.random() * 0.08 + 0.04) * opacityMul;
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (texture === 'softpastel') {
      const w2 = size * 0.8;
      for (let dx = -w2; dx < w2; dx += 2) {
        for (let dy = -w2; dy < w2; dy += 2) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < w2 && Math.random() > 0.45) {
            const alpha = Math.max(0, 1 - dist / w2) * 0.12 + Math.random() * 0.06;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = c;
            ctx.beginPath();
            ctx.arc(x + dx + (Math.random() - 0.5) * 3, y + dy + (Math.random() - 0.5) * 3, 1.5 + Math.random(), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    } else if (texture === 'acrylic') {
      ctx.globalAlpha = 0.85 * opacityMul;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.ellipse(x, y, size * 0.5, size * 0.35, Math.random() * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + (Math.random() - 0.5) * size * 0.2, y + (Math.random() - 0.5) * size * 0.2, size * 0.3, size * 0.2, Math.random() * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (texture === 'gouache') {
      ctx.globalAlpha = 0.75 * opacityMul;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      const gradient = ctx.createRadialGradient(x, y, size * 0.1, x, y, size * 0.55);
      gradient.addColorStop(0, c);
      gradient.addColorStop(0.7, c + '60');
      gradient.addColorStop(1, c + '15');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.55, 0, Math.PI * 2);
      ctx.fill();
    } else if (texture === 'grass') {
      ctx.globalAlpha = 0.7 * opacityMul;
      ctx.strokeStyle = c;
      for (let i = 0; i < 8; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
        const len = size * (0.5 + Math.random() * 0.6);
        const sx = x + (Math.random() - 0.5) * size * 0.6;
        const sy = y;
        ctx.lineWidth = 1 + Math.random() * 1.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(sx + Math.cos(angle) * len * 0.5, sy + Math.sin(angle) * len * 0.5 - len * 0.3, sx + Math.cos(angle) * len, sy + Math.sin(angle) * len);
        ctx.stroke();
      }
    } else if (texture === 'cloud') {
      const r = size * 0.7;
      ctx.globalAlpha = 0.08 * opacityMul;
      for (let i = 0; i < 5; i++) {
        const cx = x + (Math.random() - 0.5) * r * 1.5;
        const cy = y + (Math.random() - 0.5) * r;
        const cr = r * (0.4 + Math.random() * 0.6);
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
        grad.addColorStop(0, c + '30');
        grad.addColorStop(0.6, c + '10');
        grad.addColorStop(1, c + '00');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (texture === 'noiseGrain') {
      const r2 = size * 0.6;
      for (let i = 0; i < 20; i++) {
        const dx = (Math.random() - 0.5) * r2 * 2;
        const dy = (Math.random() - 0.5) * r2 * 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < r2) {
          const alpha = Math.max(0, (1 - dist / r2) * 0.2 + Math.random() * 0.1);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = c;
          ctx.fillRect(x + dx, y + dy, 1.5, 1.5);
        }
      }
    } else if (texture === 'halftone2') {
      const r3 = size * 0.55;
      const dotSpacing = Math.max(3, size * 0.12);
      ctx.globalAlpha = 1 * opacityMul;
      ctx.fillStyle = c;
      for (let dx = -r3; dx < r3; dx += dotSpacing) {
        for (let dy = -r3; dy < r3; dy += dotSpacing) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < r3) {
            const dotR = Math.max(0.3, (1 - dist / r3) * dotSpacing * 0.4);
            ctx.beginPath();
            ctx.arc(x + dx + dotSpacing * 0.5, y + dy + dotSpacing * 0.5, dotR, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    } else if (texture === 'doubleline') {
      const angle = Math.random() * Math.PI * 2;
      const nx = Math.cos(angle), ny = Math.sin(angle);
      ctx.globalAlpha = 0.8 * opacityMul;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x + nx * size * 0.3, y + ny * size * 0.3, size * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - nx * size * 0.3, y - ny * size * 0.3, size * 0.18, 0, Math.PI * 2);
      ctx.fill();
    } else if (texture === 'smudge') {
      const smudgeR = size * 0.7;
      const smudgeGrad = ctx.createRadialGradient(x, y, 0, x, y, smudgeR);
      smudgeGrad.addColorStop(0, c + '15');
      smudgeGrad.addColorStop(0.5, c + '08');
      smudgeGrad.addColorStop(1, c + '00');
      ctx.globalAlpha = 0.4 * opacityMul;
      ctx.fillStyle = smudgeGrad;
      ctx.beginPath();
      ctx.arc(x, y, smudgeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    } else if (texture === 'mixer') {
      const mxR = size * 0.6;
      ctx.globalAlpha = 0.35 * opacityMul;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x, y, mxR, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const grad = ctx.createRadialGradient(x + (Math.random() - 0.5) * mxR, y + (Math.random() - 0.5) * mxR, 0, x + (Math.random() - 0.5) * mxR, y + (Math.random() - 0.5) * mxR, mxR * (0.3 + Math.random() * 0.4));
        grad.addColorStop(0, c + '40');
        grad.addColorStop(1, c + '05');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x + (Math.random() - 0.5) * mxR * 0.8, y + (Math.random() - 0.5) * mxR * 0.8, mxR * (0.3 + Math.random() * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (texture === 'crosshatch') {
      const r4 = size * 0.55;
      ctx.strokeStyle = c;
      ctx.lineWidth = 0.5;
      for (let layer = 0; layer < 2; layer++) {
        const baseAngle = layer * 0.7 + (Math.random() - 0.5) * 0.3;
        const spacing = Math.max(1.5, size * 0.07);
        for (let d = -r4; d < r4; d += spacing) {
          ctx.globalAlpha = (0.25 + Math.random() * 0.3) * opacityMul;
          ctx.beginPath();
          const nx = Math.cos(baseAngle), ny = Math.sin(baseAngle);
          const cx = x + nx * d, cy = y + ny * d;
          ctx.moveTo(cx - nx * r4, cy - ny * r4);
          ctx.lineTo(cx + nx * r4, cy + ny * r4);
          ctx.stroke();
        }
      }
    } else if (texture === 'splatter') {
      const particles = brush.particleCount || 25;
      for (let i = 0; i < particles; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * size;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        const ps = Math.random() * 3 + 0.3;
        ctx.globalAlpha = (Math.random() * 0.6 + 0.15) * opacityMul;
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(px, py, ps, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < Math.floor(particles * 0.3); i++) {
        const px = x + (Math.random() - 0.5) * size * 1.2;
        const py = y + (Math.random() - 0.5) * size * 0.8;
        ctx.globalAlpha = (Math.random() * 0.3 + 0.1) * opacityMul;
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(px, py, Math.random() * 2 + 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (texture === 'stipple') {
      const r5 = size * 0.55;
      const dotDensity = 40;
      for (let i = 0; i < dotDensity; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * r5;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        const edgeAlpha = Math.max(0, 1 - dist / r5) * 1.2;
        const dotR = 0.4 + edgeAlpha * 1.0;
        ctx.globalAlpha = Math.min(1, edgeAlpha * 0.8 + Math.random() * 0.15) * opacityMul;
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (texture === 'grunge') {
      const r6 = size * 0.6;
      for (let i = 0; i < 35; i++) {
        const ax = (Math.random() - 0.5) * r6 * 2;
        const ay = (Math.random() - 0.5) * r6 * 2;
        if (Math.sqrt(ax * ax + ay * ay) < r6 * 1.2) {
          const alpha = Math.random() * 0.25 + 0.05;
          ctx.globalAlpha = alpha * opacityMul;
          ctx.fillStyle = c;
          const bw = Math.random() * size * 0.5 + 2;
          const bh = Math.random() * size * 0.3 + 1;
          ctx.fillRect(x + ax, y + ay, bw, bh);
        }
      }
    } else if (texture === 'sand') {
      const r7 = size * 0.55;
      for (let i = 0; i < 60; i++) {
        const ax = (Math.random() - 0.5) * r7 * 2;
        const ay = (Math.random() - 0.5) * r7 * 2;
        if (Math.sqrt(ax * ax + ay * ay) < r7) {
          ctx.globalAlpha = (Math.random() * 0.18 + 0.04) * opacityMul;
          ctx.fillStyle = c;
          ctx.fillRect(x + ax, y + ay, 1 + Math.random() * 0.8, 1 + Math.random() * 0.8);
        }
      }
    } else if (texture === 'scratch') {
      ctx.strokeStyle = c;
      ctx.lineWidth = 0.6;
      const scratchAngle = (Math.random() - 0.5) * 0.4;
      const scratchLen = size * 0.7;
      const scratchCount = Math.floor(size * 0.4);
      for (let i = 0; i < scratchCount; i++) {
        ctx.globalAlpha = (Math.random() * 0.35 + 0.1) * opacityMul;
        const ox = (Math.random() - 0.5) * size * 0.7;
        const oy = (Math.random() - 0.5) * size * 0.25;
        const len = scratchLen * (0.5 + Math.random() * 0.5);
        ctx.beginPath();
        ctx.moveTo(x + ox - Math.cos(scratchAngle) * len, y + oy - Math.sin(scratchAngle) * len);
        ctx.lineTo(x + ox + Math.cos(scratchAngle) * len, y + oy + Math.sin(scratchAngle) * len);
        ctx.stroke();
      }
    } else if (texture === 'calligraphy') {
      const calAngle = brush._lastAngle || 0.7;
      const calW = size * 0.6;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(calAngle);
      ctx.globalAlpha = 0.9 * opacityMul;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.1);
      ctx.lineTo(calW * 0.7, -size * 0.02);
      ctx.lineTo(calW * 0.7 + Math.random() * 1, size * 0.02);
      ctx.lineTo(0, size * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (texture === 'cloth') {
      const clR = size * 0.6;
      ctx.strokeStyle = c;
      ctx.lineWidth = 0.4;
      const hSpacing = Math.max(2.5, size * 0.09);
      const vSpacing = Math.max(2.5, size * 0.11);
      for (let dy = -clR; dy < clR; dy += vSpacing) {
        const rowAlpha = 0.08 + Math.random() * 0.12;
        ctx.globalAlpha = rowAlpha * opacityMul;
        const offset = (Math.floor(dy / vSpacing) % 2) * hSpacing * 0.5;
        for (let dx = -clR + offset; dx < clR; dx += hSpacing) {
          if (Math.sqrt(dx * dx + dy * dy) < clR) {
            ctx.beginPath();
            ctx.moveTo(x + dx - hSpacing * 0.3, y + dy - vSpacing * 0.25);
            ctx.lineTo(x + dx + hSpacing * 0.3, y + dy - vSpacing * 0.25);
            ctx.moveTo(x + dx, y + dy - vSpacing * 0.3);
            ctx.lineTo(x + dx, y + dy + vSpacing * 0.3);
            ctx.stroke();
          }
        }
      }
    } else {
      ctx.globalAlpha = 1 * opacityMul;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const jitterColor = (hex, jitter) => {
    if (!jitter) return hex;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let s = max === min ? 0 : l > 127 ? (max - min) / (510 - max - min) : (max - min) / (max + min);
    let h = 0;
    if (max !== min) {
      if (max === r) h = ((g - b) / (max - min)) * 60;
      else if (max === g) h = (2 + (b - r) / (max - min)) * 60;
      else h = (4 + (r - g) / (max - min)) * 60;
    }
    h = ((h + (Math.random() - 0.5) * jitter * 2) % 360 + 360) % 360;
    if (s < 0.15) s = 0.15 + Math.random() * 0.25;
    s = Math.min(1, s + (Math.random() - 0.5) * 0.1);
    const hueToRgb = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1/6) return p + (q - p) * 6 * t; if (t < 1/2) return q; if (t < 2/3) return p + (q - p) * (2/3 - t) * 6; return p; };
    const q = l < 128 ? l * (1 + s) / 255 : (l + s * (255 - l)) / 255;
    const p = 2 * l / 255 - q;
    const nr = Math.round(hueToRgb(p, q, h / 360 + 1/3) * 255);
    const ng = Math.round(hueToRgb(p, q, h / 360) * 255);
    const nb = Math.round(hueToRgb(p, q, h / 360 - 1/3) * 255);
    return '#' + [nr, ng, nb].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
  };

  const drawStrokeSegment = (ctx, fromX, fromY, toX, toY, strokeColor, strokeLineWidth, strokeIsEraser, strokeIsCalligraphy, strokeCalligraphyWidth) => {
    if (!ctx) return;
    if (strokeIsEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = strokeLineWidth * ERASER_SCALE;
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    } else if (strokeIsCalligraphy) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = hueJitter > 1 ? jitterColor(strokeColor, hueJitter) : strokeColor;
      ctx.lineWidth = strokeCalligraphyWidth;
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();
    } else {
      const brush = brushCategories[activeBrush];
      const dist = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
      brush._lastSpeed = dist;
      const isFastBrush = brush.texture === 'solid' || brush.id === 'gpen' || brush.id === 'dippen' || brush.id === 'pixel';
      if (isFastBrush && hueJitter <= 1) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = brushOpacity !== undefined ? brushOpacity : 1;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeLineWidth * 1.2;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        const steps = Math.max(1, Math.floor(dist / (brush.strokeWidth * 0.2)));
        ctx.globalCompositeOperation = 'source-over';
        ctx.setLineDash([]);
        for (let i = 0; i < steps; i++) {
          const t = i / steps;
          const sx = fromX + (toX - fromX) * t;
          const sy = fromY + (toY - fromY) * t;
          const jc = hueJitter > 1 ? jitterColor(strokeColor, hueJitter) : strokeColor;
          drawTextureStamp(ctx, sx, sy, brush, strokeLineWidth * 1.2, jc, brushOpacity);
        }
        ctx.globalAlpha = 1;
      }
    }
  };

  const symCenterRef = useRef({ cx: 960, cy: 540 });
  const radialAnglesRef = useRef({});

  const updateSymCache = (cw, ch, mode) => {
    symCenterRef.current = { cx: cw / 2, cy: ch / 2 };
    if (mode === 'radial6') {
      const angles = [];
      for (let a = 1; a < 6; a++) {
        const angle = (Math.PI * 2 / 6) * a;
        angles.push({ cos: Math.cos(angle), sin: Math.sin(angle) });
      }
      radialAnglesRef.current = { 6: angles };
    } else if (mode === 'radial8') {
      const angles = [];
      for (let a = 1; a < 8; a++) {
        const angle = (Math.PI * 2 / 8) * a;
        angles.push({ cos: Math.cos(angle), sin: Math.sin(angle) });
      }
      radialAnglesRef.current = { 8: angles };
    } else {
      radialAnglesRef.current = {};
    }
  };

  const getSymmetryPoints = (x, y, canvasW, canvasH) => {
    const pts = [{ x, y }];
    if (symmetryMode === 'horizontal') {
      pts.push({ x: canvasW - x, y });
    } else if (symmetryMode === 'vertical') {
      pts.push({ x, y: canvasH - y });
    } else if (symmetryMode === 'both') {
      pts.push({ x: canvasW - x, y });
      pts.push({ x, y: canvasH - y });
      pts.push({ x: canvasW - x, y: canvasH - y });
    } else if (symmetryMode === 'radial4') {
      pts.push({ x: canvasW - x, y });
      pts.push({ x, y: canvasH - y });
      pts.push({ x: canvasW - x, y: canvasH - y });
    } else if (symmetryMode === 'radial6') {
      const { cx, cy } = symCenterRef.current;
      const dx = x - cx, dy = y - cy;
      const angles = radialAnglesRef.current[6];
      if (angles) {
        for (let i = 0; i < angles.length; i++) {
          pts.push({ x: cx + dx * angles[i].cos - dy * angles[i].sin, y: cy + dx * angles[i].sin + dy * angles[i].cos });
        }
      }
    } else if (symmetryMode === 'radial8') {
      const { cx, cy } = symCenterRef.current;
      const dx = x - cx, dy = y - cy;
      const angles = radialAnglesRef.current[8];
      if (angles) {
        for (let i = 0; i < angles.length; i++) {
          pts.push({ x: cx + dx * angles[i].cos - dy * angles[i].sin, y: cy + dx * angles[i].sin + dy * angles[i].cos });
        }
      }
    }
    return pts;
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing || !ctxRef.current) return;
    if (isMobileDevice) {
      const now = performance.now();
      if (now - drawThrottleTimeRef.current < 8) return;
      drawThrottleTimeRef.current = now;
    }
    if (isWillowLeafMode) {
      const { offsetX, offsetY } = getCoordinates(e);
      willowLeafPointsRef.current.push({ x: offsetX, y: offsetY });
      const pts = willowLeafPointsRef.current;
      const previewCanvas = willowLeafPreviewRef.current;
      if (previewCanvas && pts.length >= 2) {
        const pctx = previewCanvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        pctx.setTransform(1, 0, 0, 1, 0, 0);
        pctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        pctx.scale(dpr, dpr);
        pctx.beginPath();
        pctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          pctx.lineTo(pts[i].x, pts[i].y);
        }
        pctx.closePath();
        pctx.fillStyle = isEraser ? 'rgba(255,255,255,0.6)' : color + '99';
        pctx.fill();
        pctx.strokeStyle = isEraser ? 'rgba(255,255,255,0.9)' : color;
        pctx.lineWidth = 1.5;
        pctx.globalAlpha = 0.9;
        pctx.lineCap = 'round';
        pctx.lineJoin = 'round';
        pctx.setLineDash([]);
        pctx.stroke();
      }
      return;
    }
    let { offsetX, offsetY } = getCoordinates(e);
    if (isPixelMode && pixelModeType === 'full') {
      offsetX = Math.floor(offsetX / pixelGridSize) * pixelGridSize + pixelGridSize / 2;
      offsetY = Math.floor(offsetY / pixelGridSize) * pixelGridSize + pixelGridSize / 2;
    }
    const last = lastPosRef.current;
    if (!last) return;

    if (stabilizerLevel > 0) {
      stabilizerBufferRef.current.push({ x: offsetX, y: offsetY });
      const buf = stabilizerBufferRef.current;
      const windowSize = Math.min(stabilizerLevel * 5 + 3, buf.length);
      const startIdx = Math.max(0, buf.length - windowSize);
      let sx = 0, sy = 0, totalW = 0;
      for (let i = startIdx; i < buf.length; i++) {
        const t = (i - startIdx) / (windowSize - 1 || 1);
        const w = t * t * (3 - 2 * t);
        sx += buf[i].x * w;
        sy += buf[i].y * w;
        totalW += w;
      }
      const smoothFactor = 0.3 + stabilizerLevel * 0.15;
      offsetX = offsetX * (1 - smoothFactor) + (sx / totalW) * smoothFactor;
      offsetY = offsetY * (1 - smoothFactor) + (sy / totalW) * smoothFactor;
    }

    if (perspectivePoints.length > 0 && !isEraser) {
      const snapDist = 15;
      let bestDist = snapDist;
      let snapX = offsetX, snapY = offsetY;
      for (const vp of perspectivePoints) {
        const dx = offsetX - vp.x;
        const dy = offsetY - vp.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) continue;
        const dirX = dx / len;
        const dirY = dy / len;
        const perpDist = Math.abs((last.x - vp.x) * dirY - (last.y - vp.y) * dirX);
        if (perpDist < snapDist && perpDist < bestDist) {
          const projLen = (offsetX - vp.x) * dirX + (offsetY - vp.y) * dirY;
          const projX = vp.x + dirX * projLen;
          const projY = vp.y + dirY * projLen;
          const snapStrength = 1 - perpDist / snapDist;
          snapX = offsetX + (projX - offsetX) * snapStrength * 0.8;
          snapY = offsetY + (projY - offsetY) * snapStrength * 0.8;
          bestDist = perpDist;
        }
      }
      offsetX = snapX;
      offsetY = snapY;
    }

    let calligraphyWidth = 0;
    let pressureWidth = lineWidth;
    if (isCalligraphy) {
      const dist = Math.sqrt((offsetX - last.x) ** 2 + (offsetY - last.y) ** 2);
      const speed = dist;
      calligraphySpeedRef.current = calligraphySpeedRef.current * 0.6 + speed * 0.4;
      const smoothSpeed = calligraphySpeedRef.current;
      const maxWidth = lineWidth * 2;
      const minWidth = Math.max(1, lineWidth * 0.15);
      const targetWidth = maxWidth - (maxWidth - minWidth) * Math.min(1, smoothSpeed / 40);
      calligraphyWidth = calligraphyLastWidthRef.current * 0.5 + targetWidth * 0.5;
      calligraphyLastWidthRef.current = calligraphyWidth;
    } else if (pressureMode && !isEraser) {
      const dist = Math.sqrt((offsetX - last.x) ** 2 + (offsetY - last.y) ** 2);
      const now = performance.now();
      const dt = Math.max(0.5, now - pressureLastTimeRef.current);
      pressureLastTimeRef.current = now;
      const instantSpeed = dist / dt * 50;
      pressureTotalDistRef.current += dist;
      const strokeDist = pressureTotalDistRef.current;
      const entryLen = lineWidth * 4;
      let entryFactor = 1;
      if (strokeDist < entryLen) {
        const t = strokeDist / entryLen;
        entryFactor = 0.35 + 0.65 * (t * t);
      }
      const pMaxW = lineWidth * 2.4;
      const pMinW = Math.max(0.8, lineWidth * 0.12);
      const speedClamp = Math.min(1, instantSpeed / 18);
      const speedFactor = 1 - speedClamp;
      const velocityW = pMinW + (pMaxW - pMinW) * speedFactor * speedFactor;
      const rawW = velocityW * entryFactor;
      pressureWidth = pressureSmoothWidthRef.current * 0.4 + rawW * 0.6;
      if (!isFinite(pressureWidth) || pressureWidth < 0.5) pressureWidth = lineWidth;
      pressureSmoothWidthRef.current = pressureWidth;
    }

    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const canvasW = canvas.width / dpr;
    const canvasH = canvas.height / dpr;

    const fromPts = getSymmetryPoints(last.x, last.y, canvasW, canvasH);
    const toPts = getSymmetryPoints(offsetX, offsetY, canvasW, canvasH);

    for (let i = 0; i < fromPts.length; i++) {
      drawStrokeSegment(ctxRef.current, fromPts[i].x, fromPts[i].y, toPts[i].x, toPts[i].y, color, pressureMode && !isEraser && !isCalligraphy ? pressureWidth : lineWidth, isEraser, isCalligraphy, calligraphyWidth);
    }

    currentStrokePointsRef.current.push({ x: offsetX, y: offsetY });
    lastPosRef.current = { x: offsetX, y: offsetY };
    requestRecomposite();

    if (showGuessGame && guessConnected && !guessDevMode && isGuessDrawer && guessGameState === 'playing') {
      broadcastToPeers({
        type: 'draw',
        x1: last.x, y1: last.y,
        x2: offsetX, y2: offsetY,
        color: isEraser ? '#FFFFFF' : color,
        width: isEraser ? lineWidth * ERASER_SCALE : lineWidth,
      });
    }
  };

  const stopDrawing = (e) => {
    if (isWillowLeafMode) {
      const pts = willowLeafPointsRef.current;
      const previewCanvas = willowLeafPreviewRef.current;
      if (previewCanvas) {
        const pctx = previewCanvas.getContext('2d');
        pctx.setTransform(1, 0, 0, 1, 0, 0);
        pctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      }
      if (pts.length >= 3) {
        const ctx = ctxRef.current;
        ctx.save();
        if (isEraser) {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.globalAlpha = 1;
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1;
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = isEraser ? 'rgba(0,0,0,1)' : color;
        ctx.fill();
        ctx.restore();
      }
      willowLeafPointsRef.current = [];
      willowLeafDrawnStrokesRef.current = [];
      setIsDrawingWithRef(false);
      recompositeCanvas();
      const wlLayerId = strokeStartLayerRef.current || activeLayerIdRef.current;
      recordCommand({ type: 'willowLeaf', layerId: wlLayerId, color: isEraser ? 'rgba(0,0,0,1)' : color, size: 1.5, points: pts.map(p => ({ x: p.x, y: p.y })), isEraser: !!isEraser });
      strokeStartLayerRef.current = null;
      return;
    }
    if (isEyedropper) {
      pickEyedropperColor(e, false);
      const c = eyedropperColor;
      setColor(c);
      setBucketColor(c);
      if (!eyedropperSavedColors.includes(c)) {
        if (eyedropperSavedColors.length >= 20) {
          setEyedropperSavedColors(prev => [...prev.slice(1), c]);
        } else {
          setEyedropperSavedColors(prev => [...prev, c]);
        }
      }
      setIsEyedropperActive(false);
      eyedropperHasMovedRef.current = false;
      eyedropperMouseDownRef.current = false;
      eyedropperMagPosRef.current = { x: 0, y: 0 };
      forceUpdate(n => n + 1);
      return;
    }
    if (e && e.preventDefault) e.preventDefault();
    if (!ctxRef.current) return;
    ctxRef.current.globalAlpha = 1;
    ctxRef.current.setLineDash([]);
    ctxRef.current.globalCompositeOperation = 'source-over';
    lastPosRef.current = null;
    setIsDrawingWithRef(false);
    const pts = currentStrokePointsRef.current;
    if (pts.length >= 2) {
      const brush = brushCategories[activeBrush];
      recordCommand({
        type: isEraser ? 'erase' : 'stroke',
        layerId: strokeStartLayerRef.current || activeLayerIdRef.current,
        brush: brush?.texture || 'pencil',
        color,
        size: lineWidth,
        opacity: colorAlpha / 100,
        points: pts.map(p => ({ x: p.x, y: p.y })),
      });
    }
    strokeStartLayerRef.current = null;
    currentStrokePointsRef.current = [];
    recompositeCanvas();
    updateLayerThumbnail(activeLayerIdRef.current);
    if (isRecording && canvasRef.current) {
      try {
        const frameUrl = canvasRef.current.toDataURL('image/jpeg', 0.5);
        recordedFramesRef.current.push(frameUrl);
        if (recordedFramesRef.current.length > 300) recordedFramesRef.current.shift();
        setRecordedFramesCount(recordedFramesRef.current.length);
      } catch {}
    }
  };

  const drawCanvasTexture = (ctx, w, h, texture, targetW, targetH) => {
    const tw = targetW || w;
    const th = targetH || h;
    const textureRGB = {
      none: [255, 255, 255], sketch: [252, 248, 240], watercolor: [250, 245, 235],
      oilcanvas: [238, 228, 210], ricepaper: [253, 249, 240], parchment: [245, 235, 220],
      kraft: [196, 168, 130], black: [26, 26, 26], gray: [128, 128, 128], blue: [208, 224, 240],
    };
    const [bgR, bgG, bgB] = textureRGB[texture] || [255, 255, 255];
    if (texture === 'none' || texture === 'black' || texture === 'gray' || texture === 'blue') {
      ctx.fillStyle = `rgb(${bgR},${bgG},${bgB})`;
      ctx.fillRect(0, 0, tw, th);
      return;
    }
    const MAX_TEXTURE_SIZE = 800;
    let scale = 1;
    let drawW = tw;
    let drawH = th;
    if (tw > MAX_TEXTURE_SIZE || th > MAX_TEXTURE_SIZE) {
      scale = MAX_TEXTURE_SIZE / Math.max(tw, th);
      drawW = Math.floor(tw * scale);
      drawH = Math.floor(th * scale);
    }
    const imgData = ctx.createImageData(drawW, drawH);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = bgR; d[i + 1] = bgG; d[i + 2] = bgB; d[i + 3] = 255;
    }
    if (texture === 'sketch') {
      for (let y = 0; y < drawH; y++) {
        for (let x = 0; x < drawW; x++) {
          const i = (y * drawW + x) * 4;
          const nx1 = Math.sin(x * 0.03 + y * 0.07) * Math.cos(y * 0.05 - x * 0.02);
          const nx2 = Math.sin(x * 0.11 - y * 0.09) * Math.cos(x * 0.13 + y * 0.06);
          const n = (nx1 + nx2) * 0.5;
          if (Math.random() < 0.08 + Math.abs(n) * 0.05) {
            const v = (Math.abs(n) * 4 + Math.random() * 5) * (n > 0 ? 1 : 0.7);
            d[i] -= v; d[i + 1] -= v; d[i + 2] -= v;
          }
          if ((x + y * 0.5) % 5 < 1 && Math.random() < 0.3) { d[i] -= 1; d[i+1] -= 1; d[i+2] -= 1; }
        }
      }
    } else if (texture === 'watercolor') {
      for (let y = 0; y < drawH; y++) {
        for (let x = 0; x < drawW; x++) {
          const i = (y * drawW + x) * 4;
          const bump = Math.sin(x * 0.08) * Math.sin(y * 0.12) * Math.sin((x+y) * 0.04)
            + Math.sin(x * 0.15 - y * 0.09) * 0.5;
          const fiber = Math.abs(Math.sin(x * 0.4 + y * 0.2)) < 0.08 ? 1 : 0;
          const v = (bump * 3 + Math.random() * 6) * (bump > 0 ? 1.2 : 0.6) + fiber * 4;
          if (v > 0) { d[i] -= v; d[i+1] -= v; d[i+2] -= v; }
        }
      }
    } else if (texture === 'oilcanvas') {
      for (let y = 0; y < drawH; y++) {
        for (let x = 0; x < drawW; x++) {
          const i = (y * drawW + x) * 4;
          const wx = (x % 10) / 10;
          const wy = (y % 10) / 10;
          const weaveX = Math.abs(wx - 0.5) < 0.35 ? 1 : 0;
          const weaveY = Math.abs(wy - 0.5) < 0.35 ? 1 : 0;
          const weave = weaveX !== weaveY ? 1 : 0;
          const threadV = weave ? 5 : 0;
          const noise = Math.random() < 0.18 ? Math.random() * 6 : 0;
          const v = threadV + noise;
          if (v > 0) { d[i] -= v; d[i+1] -= v; d[i+2] -= v; }
        }
      }
    } else if (texture === 'ricepaper') {
      for (let y = 0; y < drawH; y++) {
        for (let x = 0; x < drawW; x++) {
          const i = (y * drawW + x) * 4;
          const angle = Math.atan2(y - drawH/2, x - drawW/2);
          const r = Math.sqrt((x-drawW/2)**2 + (y-drawH/2)**2);
          const fiber = Math.sin(angle * 30 + r * 0.02) * Math.cos(angle * 7 - r * 0.01);
          const streak = Math.abs(fiber) > 0.85 ? (fiber > 0 ? 1 : -1) : 0;
          const v = (Math.random() < 0.12 ? Math.random() * 7 : 0) + streak * 5;
          if (v > 0) { d[i] -= v; d[i+1] -= v*0.95; d[i+2] -= v*0.9; }
          if (v < 0) { d[i] += -v*0.5; d[i+1] += -v*0.45; d[i+2] += -v*0.4; }
        }
      }
    } else if (texture === 'parchment') {
      for (let y = 0; y < drawH; y++) {
        for (let x = 0; x < drawW; x++) {
          const i = (y * drawW + x) * 4;
          const stain = Math.sin(x * 0.008 + 1.5) * Math.cos(y * 0.01 - 0.8)
            + Math.sin(x * 0.015 - y * 0.012) * 0.5;
          const ageNoise = Math.random() < 0.22 ? (Math.random() - 0.3) * 8 : 0;
          const v = stain * 4 + ageNoise;
          if (v > 0) { d[i] -= v; d[i+1] -= v*0.92; d[i+2] -= v*0.75; }
          if (v < 0) { d[i] += (-v)*0.3; d[i+1] += (-v)*0.28; d[i+2] += (-v)*0.2; }
        }
      }
    } else if (texture === 'kraft') {
      for (let y = 0; y < drawH; y++) {
        for (let x = 0; x < drawW; x++) {
          const i = (y * drawW + x) * 4;
          if (Math.random() < 0.28) {
            const v = Math.random() * 10;
            d[i] = Math.max(0, d[i] - v); d[i + 1] = Math.max(0, d[i + 1] - v); d[i + 2] = Math.max(0, d[i + 2] - v);
          }
          if ((x + y) % 8 < 1 || (x - y + drawH) % 8 < 1) {
            d[i] = Math.max(0, d[i] - 2); d[i + 1] = Math.max(0, d[i + 1] - 2); d[i + 2] = Math.max(0, d[i + 2] - 2);
          }
        }
      }
    } else if (texture === 'black' || texture === 'gray') {
      for (let y = 0; y < drawH; y++) {
        for (let x = 0; x < drawW; x++) {
          const i = (y * drawW + x) * 4;
          if (Math.random() < 0.1) {
            const v = texture === 'black' ? Math.random() * 8 : (Math.random() - 0.5) * 10;
            d[i] = Math.max(0, Math.min(255, d[i] + v)); d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + v)); d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + v));
          }
        }
      }
    } else if (texture === 'blue') {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          if (Math.random() < 0.1) {
            const v = Math.random() * 5;
            d[i] = Math.max(0, d[i] - v); d[i + 1] = Math.max(0, d[i + 1] - v); d[i + 2] = Math.max(0, d[i + 2] + v * 0.5);
          }
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
    if (scale < 1) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = drawW;
      tempCanvas.height = drawH;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(ctx.canvas, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'low';
      ctx.clearRect(0, 0, tw, th);
      ctx.drawImage(tempCanvas, 0, 0, drawW, drawH, 0, 0, tw, th);
    }
    if (texture === 'oilcanvas') {
      ctx.strokeStyle = 'rgba(80,60,20,0.08)';
      ctx.lineWidth = 1;
      for (let row = 0; row < th; row += 10) {
        ctx.beginPath();
        ctx.moveTo(0, row);
        for (let x = 0; x < tw; x += 20) { ctx.lineTo(x, row + Math.sin(x * 0.02 + row * 0.01) * 1.5); }
        ctx.stroke();
      }
      for (let col = 0; col < tw; col += 10) {
        ctx.beginPath();
        ctx.moveTo(col, 0);
        for (let y = 0; y < th; y += 20) { ctx.lineTo(col + Math.sin(y * 0.02 + col * 0.01) * 1.5, y); }
        ctx.stroke();
      }
    }
  };

  const updateTextureCanvas = (texture) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvasWidth || DEFAULT_CANVAS_W;
    const h = canvasHeight || DEFAULT_CANVAS_H;
    const cacheKey = `${texture}_${w}_${h}`;
    if (textureCacheRef.current[cacheKey]) {
      return;
    }
    textureGeneratingRef.current = true;
    let tc = textureCanvasRef.current;
    if (!tc) {
      tc = document.createElement('canvas');
      textureCanvasRef.current = tc;
    }
    if (tc.width !== w * (window.devicePixelRatio || 1) || tc.height !== h * (window.devicePixelRatio || 1)) {
      tc.width = w * (window.devicePixelRatio || 1);
      tc.height = h * (window.devicePixelRatio || 1);
    }
    const ctx = tc.getContext('2d');
    ctx.clearRect(0, 0, tc.width, tc.height);
    drawCanvasTexture(ctx, w * (window.devicePixelRatio || 1), h * (window.devicePixelRatio || 1), texture);
    textureCacheRef.current[cacheKey] = true;
    textureGeneratingRef.current = false;
  };

  useEffect(() => {
    updateTextureCanvas(canvasTexture);
  }, [canvasTexture]);

  const loadFrameToOffscreen = (idx) => {
    const reqId = ++animLoadReqIdRef.current;
    const frames = animFrames;
    if (!frames[idx]) return null;
    const frameUrl = frames[idx];
    const cache = onionSkinImgCacheRef.current;
    if (cache[idx] !== undefined) {
      if (cache[idx] && cache[idx]._url === frameUrl && cache[idx].width > 0) return cache[idx];
      if (cache[idx] === null) return null;
    }
    const img = new window.Image();
    img.onload = () => {
      if (animLoadReqIdRef.current !== reqId) return;
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (w <= 0 || h <= 0) return;
      const oc = document.createElement('canvas');
      oc.width = w;
      oc.height = h;
      const octx = oc.getContext('2d');
      octx.drawImage(img, 0, 0);
      oc._url = frameUrl;
      cache[idx] = oc;
      requestRecomposite();
    };
    img.src = frames[idx];
    return null;
  };

  const renderOnionSkin = () => {
    if (!onionSkin) return;
    const canvas = onionSkinOverlayRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = (canvasWidth || DEFAULT_CANVAS_W) * dpr;
    const h = (canvasHeight || DEFAULT_CANVAS_H) * dpr;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isAnimMode = animFrames.length > 0 && currentAnimFrame >= 0 && currentAnimFrame < animFrames.length;
    const { range, prevEnabled, prevOpacity, nextEnabled, nextOpacity, useTint, prevColor, nextColor } = onionSkinSettings;

    if (isAnimMode) {
      const drawFrame = (frameIdx, alpha) => {
        if (frameIdx < 0 || frameIdx >= animFrames.length) return;
        const cached = loadFrameToOffscreen(frameIdx);
        if (!cached || cached.width === 0) return;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.drawImage(cached, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      };
      if (prevEnabled) {
        for (let i = range; i >= 1; i--) {
          const frameIdx = currentAnimFrame - i;
          drawFrame(frameIdx, (prevOpacity / 100) * Math.max(0.05, 1 - (i - 1) / range));
        }
      }
      if (nextEnabled) {
        for (let i = 1; i <= range; i++) {
          const frameIdx = currentAnimFrame + i;
          drawFrame(frameIdx, (nextOpacity / 100) * Math.max(0.05, 1 - (i - 1) / range));
        }
      }
    } else {
      const activeIdx = layers.findIndex(l => l.id === activeLayerId);
      layers.forEach((layer, idx) => {
        if (layer.id === activeLayerId || !layer.visible) return;
        const delta = idx - activeIdx;
        const absDelta = Math.abs(delta);
        if (absDelta === 0 || absDelta > range) return;
        const isPrev = delta < 0;
        if (isPrev && !prevEnabled) return;
        if (!isPrev && !nextEnabled) return;
        const maxOpacity = isPrev ? prevOpacity : nextOpacity;
        const alpha = Math.max(0.05, (maxOpacity / 100) * (1 - (absDelta - 1) / range));
        const lc = layerRefs.current[layer.id];
        if (!lc) return;
        ctx.save();
        ctx.globalAlpha = useTint ? 1 : alpha;
        ctx.drawImage(lc, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        if (useTint) {
          ctx.save();
          ctx.globalCompositeOperation = 'color';
          ctx.globalAlpha = alpha;
          ctx.fillStyle = isPrev ? prevColor : nextColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.restore();
        }
      });
    }
  };

  const recompositeCanvas = (texture) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (showGuessGame && (guessConnected || guessDevMode)) return;
    const tex = texture || canvasTexture;
    const dpr = window.devicePixelRatio || 1;
    const w = canvasWidth || DEFAULT_CANVAS_W;
    const h = canvasHeight || DEFAULT_CANVAS_H;
    const cacheKey = `${tex}_${w}_${h}`;
    if (!textureCacheRef.current[cacheKey]) {
      updateTextureCanvas(tex);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (textureCanvasRef.current && textureCacheRef.current[cacheKey]) {
      ctx.drawImage(textureCanvasRef.current, 0, 0);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const frameCanvas = frameBaseCanvasRef.current;
    const isAnimMode = animFrames.length > 0 && currentAnimFrame >= 0 && currentAnimFrame < animFrames.length;

    if (frameCanvas && frameCanvas.width > 0) {
      ctx.drawImage(frameCanvas, 0, 0, canvas.width, canvas.height);
    }

    const currentLayers = layersRef.current;
    const isDrawActive = isDrawingRef.current;
    for (let i = 0; i < currentLayers.length; i++) {
      const layer = currentLayers[i];
      if (!layer.visible) continue;
      if (onionSkin && !isAnimMode && !isDrawActive && layer.id !== activeLayerIdRef.current) continue;
      const lc = (layer.clippingMask && compositeCanvasRefs.current[layer.id]) || layerRefs.current[layer.id];
      if (!lc) continue;
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = resolveBlendMode(layer.blendMode);
      ctx.drawImage(lc, 0, 0);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    if (!isDrawActive) renderOnionSkin();

    if (!isDrawActive) {
      const thumbNow = performance.now();
      if (thumbNow - lastThumbUpdateRef.current > (isMobileDevice ? 64 : 16)) {
        updateLayerThumbnail(activeLayerIdRef.current);
        lastThumbUpdateRef.current = thumbNow;
      }
      if (showLayerPanel && !isMobileDevice) {
        const needFullUpdate = thumbNow - lastFullThumbUpdateRef.current > 200;
        if (needFullUpdate) {
          currentLayers.forEach(layer => { if (layer.id !== activeLayerIdRef.current) updateLayerThumbnail(layer.id); });
          lastFullThumbUpdateRef.current = thumbNow;
        }
      }
    }
  };

  const saveCanvasDebounced = () => {
    if (saveCanvasDebounceRef.current) clearTimeout(saveCanvasDebounceRef.current);
    const delay = isMobileDevice ? 1000 : 500;
    saveCanvasDebounceRef.current = setTimeout(() => {
      if (canvasRef.current) {
        try {
          const saveData = canvasRef.current.toDataURL('image/jpeg', 0.85);
          localStorage.setItem('drawingCanvas', saveData);
          saveDrawingCanvas(saveData);
        } catch {}
      }
    }, delay);
  };

  const requestRecomposite = () => {
    if (recompositeRafRef.current) cancelAnimationFrame(recompositeRafRef.current);
    const now = performance.now();
    const isDrawActive = isDrawingRef.current;
    const throttleMs = isMobileDevice ? (isDrawActive ? 60 : 32) : (isDrawActive ? 32 : 16);
    if (now - lastRecompositeTimeRef.current < throttleMs) {
      recompositeRafRef.current = requestAnimationFrame(() => {
        recompositeCanvas();
        recompositeRafRef.current = null;
        lastRecompositeTimeRef.current = performance.now();
      });
    } else {
      recompositeCanvas();
      lastRecompositeTimeRef.current = now;
    }
  };

  const applyCanvasTexture = (texture) => {
    setCanvasTexture(texture);
    textureCacheRef.current = {};
    updateTextureCanvas(texture);
    recompositeCanvas(texture);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !ctxRef.current) return;
    const dpr = window.devicePixelRatio || 1;
    if (showGuessGame && (guessConnected || guessDevMode)) {
      const ctx = ctxRef.current;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);
      return;
    }
    layers.forEach((layer) => {
      const lc = layerRefs.current[layer.id];
      if (lc) {
        const lctx = lc.getContext('2d');
        lctx.setTransform(1, 0, 0, 1, 0, 0);
        lctx.clearRect(0, 0, lc.width, lc.height);
        lctx.scale(dpr, dpr);
      }
    });
    recompositeCanvas();
    localStorage.removeItem('drawingCanvas');
    removeFromDB('drawingCanvas');
    removeFromDB('drawingLayers');
  };

  const saveCanvas = (isAutoSave = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const data = canvas.toDataURL('image/jpeg', 0.8);
      saveDrawingCanvas(data);
      setLastSaveTime(new Date());
      const thumb = canvas.toDataURL('image/jpeg', 0.2);
      const now = new Date();
      const timeStr = now.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (isAutoSave) {
        const newEntry = { time: timeStr, data, thumb, timestamp: now.getTime() };
        const updated = [newEntry, ...autoSaveHistory].slice(0, 10);
        setAutoSaveHistory(updated);
        saveAutoSaveHistory(updated);
      } else {
        const newEntry = { name: `画板${savedCanvases.length + 1}`, time: timeStr, data, thumb };
        const updated = [newEntry, ...savedCanvases].slice(0, 20);
        setSavedCanvases(updated);
        saveSavedCanvases(updated);
      }
      if (onBackToWorkspace && !isAutoSave) {
        try {
          const artworks = JSON.parse(localStorage.getItem('drawing_artworks') || '[]');
          const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
          const newArtwork = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            name: `画作${artworks.length + 1}`,
            w: canvasWidth,
            h: canvasHeight,
            dataURL: data,
            thumbnail: thumb,
            date: dateStr,
            timestamp: now.getTime(),
          };
          artworks.unshift(newArtwork);
          if (artworks.length > 50) artworks.pop();
          saveArtworks(artworks);
          window.dispatchEvent(new Event('artwork-updated'));
        } catch {}
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (autoSave) {
      localStorage.setItem('drawing_autosave', 'true');
      autoSaveTimerRef.current = setInterval(() => saveCanvas(true), autoSaveInterval * 60 * 1000);
    } else {
      localStorage.setItem('drawing_autosave', 'false');
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    }
    return () => { if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current); };
  }, [autoSave, autoSaveInterval]);

  const hexToRgba = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b, 255];
  };

  const colorsMatch = (a, b, tolerance) => {
    return Math.abs(a[0] - b[0]) <= tolerance &&
           Math.abs(a[1] - b[1]) <= tolerance &&
           Math.abs(a[2] - b[2]) <= tolerance &&
           Math.abs(a[3] - b[3]) <= tolerance;
  };

  const ERASER_SCALE = 4;

  const floodFill = (startX, startY) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const activeLayerCanvas = layerRefs.current[activeLayerIdRef.current];
    if (!activeLayerCanvas) return;
    const w = canvas.width;
    const h = canvas.height;
    const lctx = activeLayerCanvas.getContext('2d');
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    const imageData = lctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    
    const x = Math.floor(startX * dpr);
    const y = Math.floor(startY * dpr);
    
    if (x < 0 || x >= w || y < 0 || y >= h) {
      lctx.scale(dpr, dpr);
      return;
    }
    
    const startIdx = (y * w + x) * 4;
    const targetColor = [data[startIdx], data[startIdx + 1], data[startIdx + 2], data[startIdx + 3]];
    const fillColor = hexToRgba(bucketColor);
    
    if (colorsMatch(targetColor, fillColor, 5)) {
      lctx.scale(dpr, dpr);
      return;
    }
    
    const tolerance = 30;
    const stack = [[x, y]];
    const visited = new Uint8Array(w * h);
    
    while (stack.length > 0) {
      const [cx, cy] = stack.pop();
      
      if (cx < 0 || cx >= w || cy < 0 || cy >= h) continue;
      
      const pos = cy * w + cx;
      if (visited[pos]) continue;
      
      const idx = pos * 4;
      const currentColor = [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
      
      if (!colorsMatch(currentColor, targetColor, tolerance)) continue;
      
      visited[pos] = 1;
      data[idx] = fillColor[0];
      data[idx + 1] = fillColor[1];
      data[idx + 2] = fillColor[2];
      data[idx + 3] = fillColor[3];
      
      stack.push([cx + 1, cy]);
      stack.push([cx - 1, cy]);
      stack.push([cx, cy + 1]);
      stack.push([cx, cy - 1]);
    }
    
    lctx.putImageData(imageData, 0, 0);
    lctx.scale(dpr, dpr);
    recompositeCanvas();
    recordCommand({ type: 'fill', layerId: strokeStartLayerRef.current || activeLayerIdRef.current, x: startX, y: startY, color: bucketColor, tolerance: 30 });
  };

  const extractLineArt = async (threshold = 128, invert = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsExtractingLineArt(true);
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const w = canvas.width;
    const h = canvas.height;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const gray = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const idx = i * 4;
      gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      if (data[idx + 3] < 10) gray[i] = 255;
    }
    const edges = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const pos = y * w + x;
        const gx = -gray[pos - w - 1] + gray[pos - w + 1]
                   - 2 * gray[pos - 1] + 2 * gray[pos + 1]
                   - gray[pos + w - 1] + gray[pos + w + 1];
        const gy = -gray[pos - w - 1] - 2 * gray[pos - w] - gray[pos - w + 1]
                   + gray[pos + w - 1] + 2 * gray[pos + w] + gray[pos + w + 1];
        edges[pos] = Math.sqrt(gx * gx + gy * gy);
      }
    }
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = w;
    outputCanvas.height = h;
    const outCtx = outputCanvas.getContext('2d');
    const output = outCtx.createImageData(w, h);
    const outData = output.data;
    for (let i = 0; i < w * h; i++) {
      const idx = i * 4;
      const edgeVal = Math.min(255, edges[i] * 1.5);
      let val;
      if (invert) {
        val = edgeVal > threshold ? 255 : 0;
      } else {
        val = edgeVal > threshold ? 0 : 255;
      }
      outData[idx] = val;
      outData[idx + 1] = val;
      outData[idx + 2] = val;
      outData[idx + 3] = edgeVal > threshold * 0.3 ? 255 : 0;
    }
    outCtx.putImageData(output, 0, 0);
    const dataUrl = outputCanvas.toDataURL('image/png');
    setLineArtOverlay(dataUrl);
    setShowLineArtOverlay(true);
    ctx.scale(dpr, dpr);
    setIsExtractingLineArt(false);
  };

  const exportLineArt = () => {
    if (!lineArtOverlay) return;
    const link = document.createElement('a');
    link.href = lineArtOverlay;
    link.download = 'lineart.png';
    link.click();
  };

  const addAnimFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tctx = tempCanvas.getContext('2d');
    tctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    const currentLayers = layersRef.current;
    for (let i = 0; i < currentLayers.length; i++) {
      const layer = currentLayers[i];
      if (!layer.visible) continue;
      const lc = (layer.clippingMask && compositeCanvasRefs.current[layer.id]) || layerRefs.current[layer.id];
      if (!lc) continue;
      tctx.globalAlpha = layer.opacity;
      tctx.globalCompositeOperation = resolveBlendMode(layer.blendMode);
      tctx.drawImage(lc, 0, 0);
    }
    tctx.globalAlpha = 1;
    tctx.globalCompositeOperation = 'source-over';
    const dataUrl = tempCanvas.toDataURL('image/png');
    setAnimFrames(prev => {
      const next = [...prev, dataUrl];
      setCurrentAnimFrame(next.length - 1);
      return next;
    });
    if (!frameBaseCanvasRef.current || frameBaseCanvasRef.current.width !== canvas.width || frameBaseCanvasRef.current.height !== canvas.height) {
      const fb = document.createElement('canvas');
      fb.width = canvas.width;
      fb.height = canvas.height;
      frameBaseCanvasRef.current = fb;
    }
    const fctx = frameBaseCanvasRef.current.getContext('2d');
    fctx.setTransform(1, 0, 0, 1, 0, 0);
    fctx.clearRect(0, 0, canvas.width, canvas.height);
    fctx.drawImage(tempCanvas, 0, 0);
    Object.values(layerRefs.current).forEach(lc => {
      if (!lc) return;
      const lctx = lc.getContext('2d');
      lctx.setTransform(1, 0, 0, 1, 0, 0);
      lctx.clearRect(0, 0, lc.width, lc.height);
      lctx.scale(dpr, dpr);
    });
    recompositeCanvas();
  };

  const removeAnimFrame = (idx) => {
    setAnimFrames(prev => {
      const next = prev.filter((_, i) => i !== idx);
      const newLen = next.length;
      setCurrentAnimFrame(prevFrame => {
        if (prevFrame >= newLen) return Math.max(0, newLen - 1);
        return prevFrame;
      });
      return next;
    });
  };

  const playAnimation = () => {
    if (animFrames.length < 2) return;
    setIsPlayingAnim(true);
    let idx = currentAnimFrame;
    const step = () => {
      if (!isPlayingAnim && animPlayRef.current) return;
      loadAnimFrameToCanvas(idx);
      idx = (idx + 1) % animFrames.length;
      animPlayRef.current = setTimeout(step, 1000 / animFps);
    };
    step();
  };

  const stopAnimation = () => {
    setIsPlayingAnim(false);
    if (animPlayRef.current) clearTimeout(animPlayRef.current);
  };

  const exportAnimation = () => {
    if (animFrames.length === 0) return;
    for (let i = 0; i < animFrames.length; i++) {
      const link = document.createElement('a');
      link.href = animFrames[i];
      link.download = `anim_frame_${String(i).padStart(4, '0')}.png`;
      setTimeout(() => link.click(), i * 100);
    }
  };

  const loadAnimFrameToCanvas = (idx) => {
    if (idx < 0 || idx >= animFrames.length) return;
    const reqId = ++animLoadReqIdRef.current;
    setCurrentAnimFrame(idx);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cached = onionSkinImgCacheRef.current[idx];
    const setupFrameBase = (source) => {
      if (animLoadReqIdRef.current !== reqId) return;
      if (!frameBaseCanvasRef.current || frameBaseCanvasRef.current.width !== canvas.width || frameBaseCanvasRef.current.height !== canvas.height) {
        const fb = document.createElement('canvas');
        fb.width = canvas.width;
        fb.height = canvas.height;
        frameBaseCanvasRef.current = fb;
      }
      const fctx = frameBaseCanvasRef.current.getContext('2d');
      fctx.setTransform(1, 0, 0, 1, 0, 0);
      fctx.clearRect(0, 0, canvas.width, canvas.height);
      fctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      recompositeCanvas();
    };

    if (cached && cached._url === animFrames[idx] && cached.width > 0) {
      setupFrameBase(cached);
    } else {
      const img = new window.Image();
      img.onload = () => setupFrameBase(img);
      img.src = animFrames[idx];
    }
  };

  const duplicateAnimFrame = (idx) => {
    if (idx < 0 || idx >= animFrames.length) return;
    setAnimFrames(prev => {
      const newFrames = [...prev];
      newFrames.splice(idx + 1, 0, prev[idx]);
      return newFrames;
    });
  };

  const handleImportImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const panContainer = canvas.parentElement;
        const outerDiv = panContainer.parentElement;
        if (!outerDiv || outerDiv.clientWidth === 0) return;

        const dpr = window.devicePixelRatio || 1;
        const width = canvasWidth || DEFAULT_CANVAS_W;
        const height = canvasHeight || DEFAULT_CANVAS_H;

        const activeLayerCanvas = layerRefs.current[activeLayerIdRef.current];
        if (activeLayerCanvas) {
          if (activeLayerCanvas.width !== width * dpr || activeLayerCanvas.height !== height * dpr) {
            activeLayerCanvas.width = width * dpr;
            activeLayerCanvas.height = height * dpr;
            activeLayerCanvas.style.width = `${width}px`;
            activeLayerCanvas.style.height = `${height}px`;
          }
          const lctx = activeLayerCanvas.getContext('2d');
          lctx.setTransform(1, 0, 0, 1, 0, 0);
          lctx.scale(dpr, dpr);
          lctx.lineCap = 'round';
          lctx.lineJoin = 'round';
          const scaleW = (width * 0.9) / img.width;
          const scaleH = (height * 0.9) / img.height;
          const scale = Math.min(scaleW, scaleH, 10);
          const drawWidth = img.width * scale;
          const drawHeight = img.height * scale;
          const offsetX = (width - drawWidth) / 2;
          const offsetY = (height - drawHeight) / 2;
          lctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        }
        setActiveCtx();
        recompositeCanvas();
        const saveData = canvas.toDataURL('image/jpeg', 0.85);
        localStorage.setItem('drawingCanvas', saveData);
        saveDrawingCanvas(saveData);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportImage = async (format = 'png') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const dataURL = canvas.toDataURL(mimeType, 0.9);
    const base64Data = dataURL.split(',')[1];

    if (Capacitor.isNativePlatform()) {
      try {
        const fileName = `drawing_${Date.now()}.${format}`;
        const result = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents,
        });
        await Share.share({
          title: '导出图片',
          text: `图片已保存至：${result.uri}`,
          url: result.uri,
          dialogTitle: '分享图片',
        });
      } catch (e) {
        if (e.message !== 'User cancelled') {
          try {
            const fileName = `drawing_${Date.now()}.${format}`;
            await Filesystem.writeFile({
              path: fileName,
              data: base64Data,
              directory: Directory.Documents,
            });
          } catch (e2) {
            const blob = new Blob([Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))], { type: mimeType });
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
          }
        }
      }
    } else if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      try {
        const blob = new Blob([Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))], { type: mimeType });
        const file = new File([blob], `drawing.${format}`, { type: mimeType });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: '导出图片',
          });
        } else {
          const blobUrl = URL.createObjectURL(blob);
          const win = window.open(blobUrl, '_blank');
          if (!win) {
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `drawing.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
      } catch (e) {
        if (e.message !== 'User cancelled' && e.name !== 'AbortError') {
          const link = document.createElement('a');
          link.download = `drawing.${format}`;
          link.href = dataURL;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } else {
      const link = document.createElement('a');
      link.download = `drawing.${format}`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const hexToRgb = (hex) => {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const n = parseInt(full, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };

  const rgbToHex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

  const addRecentColor = (c) => {
    setRecentColors(prev => {
      const filtered = prev.filter(x => x !== c);
      return [c, ...filtered].slice(0, 12);
    });
  };

  const selectColor = (c) => {
    if (isBucket) {
      setBucketColor(c);
    } else {
      setColor(c);
    }
    setIsEraser(false);
    addRecentColor(c);
  };

  const BrushPreview = ({ brush, isActive }) => {
    const previewRef = useRef(null);

    useEffect(() => {
      const canvas = previewRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const pts = [
        { x: 3, y: 12 }, { x: 13, y: 4 }, { x: 24, y: 10 },
        { x: 35, y: 3 }, { x: 45, y: 12 },
      ];

      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i].x - pts[i-1].x;
        const dy = pts[i].y - pts[i-1].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.max(1, Math.floor(dist / (brush.strokeWidth * 0.4)));
        for (let j = 0; j <= steps; j++) {
          const t = j / steps;
          const sx = pts[i-1].x + dx * t;
          const sy = pts[i-1].y + dy * t;
          const previewBrush = { ...brush, _lastSpeed: dist };
          if (['pencil', 'crayon', 'charcoal', 'pastel'].includes(previewBrush.texture)) {
            previewBrush.strokeWidth = Math.max(1, previewBrush.strokeWidth * 0.5);
          }
          if (previewBrush.texture === 'spray') {
            previewBrush.particleCount = 15;
          }
          if (previewBrush.texture === 'oilpaint') {
            previewBrush.strokeWidth = Math.max(1, previewBrush.strokeWidth * 0.4);
          }
          if (previewBrush.texture === 'halftone') {
            previewBrush.strokeWidth = Math.max(1, previewBrush.strokeWidth * 0.4);
          }
          drawTextureStamp(ctx, sx, sy, previewBrush, Math.max(2, brush.strokeWidth * 0.6), isActive ? '#2dd4bf' : '#9ca3af');
        }
      }
    }, [brush, isActive, color]);

    return (
      <canvas
        ref={previewRef}
        width={48}
        height={20}
        className="rounded-md bg-gray-600/50 shrink-0"
      />
    );
  };

  const addSavedColor = () => {
    const currentColor = isBucket ? bucketColor : color;
    if (savedColors.includes(currentColor)) return;
    if (savedColors.length >= 16) {
      setSavedColors(prev => [...prev.slice(1), currentColor]);
    } else {
      setSavedColors(prev => [...prev, currentColor]);
    }
  };

  const removeSavedColor = (index) => {
    setSavedColors(prev => prev.filter((_, i) => i !== index));
  };

  const aiGenerateColors = async () => {
    if (!aiColorPrompt.trim()) return;
    const apiKey = localStorage.getItem('aiApiKey') || '';
    if (!apiKey) { alert('请先在AI助手设置内配置API Key'); return; }
    setAiColorLoading(true);
    setAiColorPreview([]);
    try {
      let userContent = aiColorPrompt;
      if (aiColorMode === 'rgb') {
        const parts = aiColorPrompt.split(/[,，\s]+/).map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 255);
        if (parts.length >= 3) {
          userContent = `基于RGB(${parts[0]},${parts[1]},${parts[2]})这个颜色，生成一组和谐的配色方案`;
        }
      }
      const _toolEP = localStorage.getItem('aiToolEndpoint') || 'https://api.deepseek.com/chat/completions';
      const _toolMD = localStorage.getItem('aiToolModel') || 'deepseek-v4-flash';
      const res = await fetch(_toolEP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: _toolMD,
          messages: [
            { role: 'system', content: '你是一个配色专家。用户会描述一种需求、场景、APP或事物，你需要返回一组适合的配色方案。严格只返回一个JSON数组，包含4-8个十六进制颜色码（（如"#FF5733"），不要返回任何其他内容、解释或markdown标记。示例格式：["#FF5733","#33FF57","#3357FF","#FF33A8"]' },
            { role: 'user', content: userContent }
          ],
          temperature: 0.7,
          max_tokens: 300
        })
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || '';
      if (!text) { setAiColorLoading(false); return; }

      let colors = [];

      const extractColors = (arr) => arr.filter(c => /^#[0-9a-fA-F]{3,6}$/i.test(c)).map(c => c.length === 4 ? '#' + c[1]+c[1]+c[2]+c[2]+c[3]+c[3] : c.toUpperCase());

      const firstBracket = text.indexOf('[');
      const lastBracket = text.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket > firstBracket) {
        try {
          const parsed = JSON.parse(text.substring(firstBracket, lastBracket + 1));
          if (Array.isArray(parsed)) {
            colors = extractColors(parsed);
          }
        } catch {}
      }

      if (colors.length === 0) {
        try {
          const parsed = JSON.parse(text.trim());
          if (Array.isArray(parsed)) {
            colors = extractColors(parsed);
          }
        } catch {}
      }

      if (colors.length === 0) {
        const allMatches = text.match(/\[[\s\S]*?\]/g);
        if (allMatches) {
          for (let i = allMatches.length - 1; i >= 0; i--) {
            try {
              const parsed = JSON.parse(allMatches[i]);
              if (Array.isArray(parsed)) {
                colors = extractColors(parsed);
                if (colors.length > 0) break;
              }
            } catch {}
          }
        }
      }

      if (colors.length === 0) {
        const hexMatches = text.match(/#[0-9a-fA-F]{3,6}/g);
        if (hexMatches) {
          colors = hexMatches.map(c => c.length === 4 ? '#' + c[1]+c[1]+c[2]+c[2]+c[3]+c[3] : c).filter(c => /^#[0-9a-fA-F]{6}$/i.test(c)).map(c => c.toUpperCase());
        }
      }

      if (colors.length > 0) {
        setAiColorPreview(colors.slice(0, 8));
      }
    } catch (e) {
      console.error('AI调色失败:', e);
    } finally {
      setAiColorLoading(false);
    }
  };

  const saveAiColor = (c) => {
    setAiColorResults(prev => {
      if (prev.some(x => x.toLowerCase() === c.toLowerCase())) return prev;
      const next = [c, ...prev];
      return next.length > 48 ? next.slice(0, 48) : next;
    });
    selectColor(c);
  };

  const getTouchDistance = (t1, t2) => {
    return Math.sqrt(Math.pow(t2.clientX - t1.clientX, 2) + Math.pow(t2.clientY - t1.clientY, 2));
  };

  const getTouchAngle = (t1, t2) => {
    return Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * (180 / Math.PI);
  };

  const getTouchCenter = (t1, t2) => {
    return { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const isOnRefImg = e.target.closest('[data-ref-img]');
      if (!isOnRefImg) {
        e.preventDefault();
        const now = Date.now();
        if (twoFingerUndo && twoFingerTapRef.current && (now - twoFingerTapRef.current.time) < 300) {
          twoFingerTapRef.current = null;
          doUndo();
          vibrate(30);
          return;
        }
        pinchRef.current = {
          distance: getTouchDistance(e.touches[0], e.touches[1]),
          centerX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          centerY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
          isPinching: true,
          startZoom: zoomRef.current,
          startPan: { ...panOffsetRef.current },
          startAngle: getTouchAngle(e.touches[0], e.touches[1]),
          startRotation: rotationRef.current,
          startTime: now,
        };
        isPaintingRef.current = false;
        setIsDrawingWithRef(false);
        panRef.current.isPanning = false;
      }
    } else if (e.touches.length === 1 && !pinchRef.current.isPinching) {
      const t = e.touches[0];
      touchStartPosRef.current = { x: t.clientX, y: t.clientY };
      if (cadMode && (cadTool === 'polygon' || cadTool === 'spline')) {
        const now = Date.now();
        if (lastTapRef.current && (now - lastTapRef.current.time) < 300 && Math.abs(t.clientX - lastTapRef.current.x) < 20 && Math.abs(t.clientY - lastTapRef.current.y) < 20) {
          e.preventDefault();
          if (cadTool === 'polygon' && cadPolyPoints.current.length >= 3) { commitShape(0,0,0,0,'polygon'); cadPolyPoints.current = []; }
          if (cadTool === 'spline' && cadPolyPoints.current.length >= 3) { commitSpline(); }
          lastTapRef.current = null;
          setCadPendingEnd(null);
          return;
        }
        lastTapRef.current = { time: now, x: t.clientX, y: t.clientY };
      }
      if (cadMode) {
        e.preventDefault();
        isTouchActiveRef.current = true;
        const fakeE = { clientX: t.clientX, clientY: t.clientY, button: 0, preventDefault: () => e.preventDefault(), _fromTouch: true };
        handleMouseDown(fakeE);
      } else if (isLineMode || isCircleMode) {
        const fakeE = { clientX: t.clientX, clientY: t.clientY, button: 0, preventDefault: () => e.preventDefault(), _fromTouch: true };
        handleMouseDown(fakeE);
      } else {
        startDrawing(e);
      }
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && pinchRef.current.isPinching) {
      if (e.target.closest('[data-ref-img]')) return;
      e.preventDefault();
      const newDist = getTouchDistance(e.touches[0], e.touches[1]);
      const center = getTouchCenter(e.touches[0], e.touches[1]);
      const distRatio = newDist / pinchRef.current.distance;
      const newZoom = Math.max(0.02, Math.min(200, pinchRef.current.startZoom * distRatio));
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      const panContainer = canvas.parentElement;
      const outerDiv = panContainer.parentElement;
      const containerRect = outerDiv.getBoundingClientRect();
      const centerX = containerRect.width / 2;
      const centerY = containerRect.height / 2;
      
      const pinchCenterX = center.x - containerRect.left;
      const pinchCenterY = center.y - containerRect.top;
      
      const deltaCenterX = center.x - pinchRef.current.centerX;
      const deltaCenterY = center.y - pinchRef.current.centerY;
      
      const ratio = newZoom / pinchRef.current.startZoom;
      const startPanX = pinchRef.current.startPan.x;
      const startPanY = pinchRef.current.startPan.y;
      const startPinchCenterX = pinchRef.current.centerX - containerRect.left;
      const startPinchCenterY = pinchRef.current.centerY - containerRect.top;
      
      const zoomDx = (startPinchCenterX - centerX - startPanX) * (1 - ratio);
      const zoomDy = (startPinchCenterY - centerY - startPanY) * (1 - ratio);
      
      const newX = startPanX + deltaCenterX + zoomDx;
      const newY = startPanY + deltaCenterY + zoomDy;

      const currentAngle = getTouchAngle(e.touches[0], e.touches[1]);
      const angleDelta = currentAngle - pinchRef.current.startAngle;
      const absAngle = Math.abs(angleDelta);
      const smoothedAngle = absAngle < 8 ? 0 : (angleDelta > 0 ? absAngle - 8 : -(absAngle - 8));
      let newRotation = (pinchRef.current.startRotation + smoothedAngle) % 360;
      if (newRotation < 0) newRotation += 360;

      applyTransformDOM(newZoom, { x: newX, y: newY }, newRotation);
      scheduleFlush();

      pinchRef.current.distance = newDist;
      pinchRef.current.centerX = center.x;
      pinchRef.current.centerY = center.y;
      pinchRef.current.startZoom = newZoom;
      pinchRef.current.startPan = { x: newX, y: newY };
      pinchRef.current.startRotation = newRotation;
      pinchRef.current.startAngle = currentAngle;
    } else if (e.touches.length === 1 && pinchRef.current.isPinching === false) {
      if (isEyedropper) {
        e.preventDefault();
        const touch = e.touches[0];
        if (eyedropperHasMovedRef.current) {
          eyedropperMagPosRef.current = { x: touch.clientX, y: touch.clientY };
          pickEyedropperColor(touch);
        } else {
          const dx = touch.clientX - eyedropperStartPosRef.current.x;
          const dy = touch.clientY - eyedropperStartPosRef.current.y;
          if (Math.sqrt(dx * dx + dy * dy) > 8) {
            eyedropperHasMovedRef.current = true;
            setIsEyedropperActive(true);
            eyedropperMagPosRef.current = { x: touch.clientX, y: touch.clientY };
            pickEyedropperColor(touch);
          }
        }
      } else if (cadMode || isLineMode || isCircleMode) {
        e.preventDefault();
        const touch = e.touches[0];
        if (cadMode) {
          if (cadTouchPhaseRef.current === 'start') {
            cadTouchPhaseRef.current = 'end';
          }
          const canvasArea = document.querySelector('[data-canvas-area]');
          const rect = canvasArea ? canvasArea.getBoundingClientRect() : null;
          const cx = rect ? touch.clientX - rect.left : touch.clientX;
          const cy = rect ? touch.clientY - rect.top : touch.clientY;
          cadCursorContainerRef.current = { x: cx, y: cy };
          setCadTouchCursor(prev => ({ x: cx, y: cy, visible: true }));
        }
        handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
      } else {
        draw(e);
      }
    }
  };

  const handleWheel = (e) => {
    const refImgEl = e.target.closest('[data-ref-img]');
    if (refImgEl) {
      e.preventDefault();
      const id = parseInt(refImgEl.dataset.refImg);
      const rect = refImgEl.getBoundingClientRect();
      const pctX = ((e.clientX - rect.left) / rect.width) * 100;
      const pctY = ((e.clientY - rect.top) / rect.height) * 100;
      const delta = e.deltaY > 0 ? -0.3 : 0.3;
      setRefImages(prev => prev.map(r => {
        if (r.id !== id) return r;
        const newScale = Math.max(1, Math.min(10, r.viewScale + delta));
        const ox = newScale > 1 ? pctX : 50;
        const oy = newScale > 1 ? pctY : 50;
        return { ...r, viewScale: newScale, viewOriginX: ox, viewOriginY: oy };
      }));
      return;
    }
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const currentZoom = zoomRef.current;
    const newZoom = Math.max(0.02, Math.min(200, currentZoom * delta));
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const panContainer = canvas.parentElement;
    const outerDiv = panContainer.parentElement;
    const containerRect = outerDiv.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;
    
    const ratio = newZoom / currentZoom;
    const newX = panOffsetRef.current.x + (mouseX - centerX - panOffsetRef.current.x) * (1 - ratio);
    const newY = panOffsetRef.current.y + (mouseY - centerY - panOffsetRef.current.y) * (1 - ratio);
    applyTransformDOM(newZoom, { x: newX, y: newY });
    scheduleFlush();
  };

  const handleMouseDown = (e) => {
    if (e.button === 1 || (e.button === 0 && spaceDownRef.current)) {
      e.preventDefault();
      middlePanRef.current = {
        isPanning: true,
        startX: e.clientX,
        startY: e.clientY,
        startOffset: { ...panOffsetRef.current },
      };
    } else if (cadMode && e.button === 0 && cadTool !== 'select' && !(isTouchActiveRef.current && !e._fromTouch)) {
      e.preventDefault();
      const { offsetX, offsetY } = getCoordinates(e);
      if (cadTool === 'line') {
        if (!lineStartRef.current) {
          lineStartRef.current = { x: offsetX, y: offsetY };
        }
      } else if (cadTool === 'circle') {
        circleCenterRef.current = { x: offsetX, y: offsetY };
      } else if (cadTool === 'rectangle') {
        if (!cadShapeStart.current) {
          cadShapeStart.current = { x: offsetX, y: offsetY };
        }
      } else if (cadTool === 'arc') {
        if (!lineStartRef.current) {
          lineStartRef.current = { x: offsetX, y: offsetY };
        } else if (!cadArcMid.current) {
          cadArcMid.current = { x: offsetX, y: offsetY };
        } else {
          commitShape(lineStartRef.current.x, lineStartRef.current.y, offsetX, offsetY, 'arc');
        }
      } else if (cadTool === 'polygon') {
        cadPolyPoints.current.push({ x: offsetX, y: offsetY });
      } else if (cadTool === 'spline') {
        cadPolyPoints.current.push({ x: offsetX, y: offsetY });
      } else if (cadTool === 'trim') {
        if (!lineStartRef.current) {
          lineStartRef.current = { x: offsetX, y: offsetY };
        } else {
          commitTrim(lineStartRef.current.x, lineStartRef.current.y, offsetX, offsetY);
        }
      } else if (cadTool === 'dimension') {
        cadDimStart.current = { x: offsetX, y: offsetY };
      }
    } else if (e.button === 0 && (isLineMode || isCircleMode)) {
      e.preventDefault();
      const { offsetX, offsetY } = getCoordinates(e);
      if (isLineMode) {
        if (!lineStartRef.current) {
          lineStartRef.current = { x: offsetX, y: offsetY };
        } else {
          commitShape(lineStartRef.current.x, lineStartRef.current.y, offsetX, offsetY, 'line');
        }
      } else if (isCircleMode) {
        circleCenterRef.current = { x: offsetX, y: offsetY };
      }
    } else {
      startDrawing(e);
    }
  };

  const handleMouseMove = (e) => {
    if (draggingGuideIdxRef.current >= 0) return;
    if (middlePanRef.current.isPanning) {
      const dx = e.clientX - middlePanRef.current.startX;
      const dy = e.clientY - middlePanRef.current.startY;
      const newX = middlePanRef.current.startOffset.x + dx;
      const newY = middlePanRef.current.startOffset.y + dy;
      applyTransformDOM(zoomRef.current, { x: newX, y: newY });
      scheduleFlush();
      const canvasArea = document.querySelector('[data-canvas-area]');
      if (canvasArea && spaceDownRef.current) canvasArea.style.cursor = 'grabbing';
    } else if (cadMode) {
      const { offsetX, offsetY } = getCoordinates(e);
      if (cadTool === 'line' && lineStartRef.current) {
        drawShapePreview(lineStartRef.current.x, lineStartRef.current.y, offsetX, offsetY, 'line');
      } else if (cadTool === 'circle' && circleCenterRef.current) {
        drawShapePreview(circleCenterRef.current.x, circleCenterRef.current.y, offsetX, offsetY, 'circle');
      } else if (cadTool === 'rectangle' && cadShapeStart.current) {
        drawShapePreview(cadShapeStart.current.x, cadShapeStart.current.y, offsetX, offsetY, 'rectangle');
      } else if (cadTool === 'arc' && lineStartRef.current && cadArcMid.current) {
        drawShapePreview(lineStartRef.current.x, lineStartRef.current.y, offsetX, offsetY, 'arc');
      } else if (cadTool === 'polygon' && cadPolyPoints.current.length > 0) {
        drawShapePreview(0, 0, offsetX, offsetY, 'polygon');
      } else if (cadTool === 'spline' && cadPolyPoints.current.length > 0) {
        drawShapePreview(0, 0, offsetX, offsetY, 'spline');
      } else if (cadTool === 'trim' && lineStartRef.current) {
        drawShapePreview(lineStartRef.current.x, lineStartRef.current.y, offsetX, offsetY, 'trim');
      } else if (cadTool === 'dimension' && cadDimStart.current) {
        drawShapePreview(cadDimStart.current.x, cadDimStart.current.y, offsetX, offsetY, 'dimension');
      }
    } else if (isLineMode && lineStartRef.current) {
      const { offsetX, offsetY } = getCoordinates(e);
      drawShapePreview(lineStartRef.current.x, lineStartRef.current.y, offsetX, offsetY, 'line');
    } else if (isCircleMode && circleCenterRef.current) {
      const { offsetX, offsetY } = getCoordinates(e);
      drawShapePreview(circleCenterRef.current.x, circleCenterRef.current.y, offsetX, offsetY, 'circle');
    } else if (isEyedropper && eyedropperMouseDownRef.current) {
      if (eyedropperHasMovedRef.current) {
        eyedropperMagPosRef.current = { x: e.clientX, y: e.clientY };
        pickEyedropperColor(e);
      } else {
        const dx = e.clientX - eyedropperStartPosRef.current.x;
        const dy = e.clientY - eyedropperStartPosRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > 8) {
          eyedropperHasMovedRef.current = true;
          setIsEyedropperActive(true);
          eyedropperMagPosRef.current = { x: e.clientX, y: e.clientY };
          pickEyedropperColor(e);
        }
      }
    } else if (isEyedropper) {
    } else {
      draw(e);
    }
  };

  const handleMouseUp = (e) => {
    if (draggingGuideIdxRef.current >= 0) return;
    if (isTouchActiveRef.current && !e._fromTouch) return;
    eyedropperMouseDownRef.current = false;
    if (e.button === 1 || (e.button === 0 && middlePanRef.current.isPanning)) {
      middlePanRef.current.isPanning = false;
      flushTransformState();
      const canvasArea = document.querySelector('[data-canvas-area]');
      if (canvasArea && spaceDownRef.current) canvasArea.style.cursor = 'grab';
    } else if (cadMode) {
      const { offsetX, offsetY } = getCoordinates(e);
      if (cadTool === 'circle' && circleCenterRef.current) {
        commitShape(circleCenterRef.current.x, circleCenterRef.current.y, offsetX, offsetY, 'circle');
      } else if (cadTool === 'line' && lineStartRef.current) {
        commitShape(lineStartRef.current.x, lineStartRef.current.y, offsetX, offsetY, 'line');
      } else if (cadTool === 'rectangle' && cadShapeStart.current) {
        commitShape(cadShapeStart.current.x, cadShapeStart.current.y, offsetX, offsetY, 'rectangle');
      } else if (cadTool === 'dimension' && cadDimStart.current) {
        commitDimension(cadDimStart.current.x, cadDimStart.current.y, offsetX, offsetY);
      }
      setIsDrawingWithRef(false);
      strokeStartLayerRef.current = null;
    } else if (e.button === 0 && isCircleMode && circleCenterRef.current) {
      const { offsetX, offsetY } = getCoordinates(e);
      commitShape(circleCenterRef.current.x, circleCenterRef.current.y, offsetX, offsetY, 'circle');
    } else {
      stopDrawing(e);
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      if (twoFingerUndo && pinchRef.current.isPinching && pinchRef.current.startTime && (Date.now() - pinchRef.current.startTime) < 300) {
        twoFingerTapRef.current = { time: Date.now() };
      }
      if (pinchRef.current.isPinching && e.touches.length === 1) {
        pinchRef.current.isPinching = false;
        flushTransformState();
        const t = e.touches[0];
        startDrawing({ clientX: t.clientX, clientY: t.clientY, preventDefault: () => {}, touches: e.touches });
        return;
      }
      pinchRef.current.isPinching = false;
      flushTransformState();
    }
    if (e.touches.length === 0) {
      setCadTouchCursor(prev => ({ ...prev, visible: false }));
      if (e.changedTouches.length > 0) {
        const t = e.changedTouches[0];
        const fakeE = { clientX: t.clientX, clientY: t.clientY, button: 0, preventDefault: () => {}, _fromTouch: true };

        if (cadMode) {
          e.preventDefault();
          handleMouseUp(fakeE);
          isTouchActiveRef.current = false;
        } else if (isCircleMode && circleCenterRef.current) {
          const { offsetX, offsetY } = getCoordinates(fakeE);
          commitShape(circleCenterRef.current.x, circleCenterRef.current.y, offsetX, offsetY, 'circle');
        } else {
          handleMouseUp(fakeE);
          isTouchActiveRef.current = false;
        }
      }
    }
  };

  const applyZoomInput = (e) => {
    if (e.key && e.key !== 'Enter') return;
    let raw = zoomInput.replace('%', '').trim();
    let num = parseFloat(raw);
    if (isNaN(num)) {
      setZoomInput(`${(zoomRef.current * 100).toFixed(0)}%`);
      return;
    }
    num = Math.max(2, Math.min(20000, num));
    const newZoom = num / 100;
    updateZoomPan(newZoom, panOffsetRef.current);
    setZoomInput(`${num.toFixed(0)}%`);
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  const GUESS_WORDS = [
    '苹果','香蕉','太阳','月亮','星星','房子','汽车','飞机','狗','猫','鼠','兔','狐','熊','猫熊',
    '老虎','牡丹','鹰','鸿雁','鸭','鹅','鹊','钟表','眼镜','帽子','鞋子','雨伞','蛋糕','冰淇淋','西瓜',
    '葡萄','草莓','菠萝','樱桃','柠檬','番茄','辣椒','蘑菇','胡萝卜','玉米','钢琴','吉他','笫',
    '小提琴','喇叭','足球','篮球','乒乓球','羽毛球','网球','棒球','滑板','游泳','跑步','自行车',
    '摩托车','火车','轮船','火箭','直升机','蝴蝶','蜗牛','螃蟹','章鱼','海豚','企鹅','长颈鹿',
    '大象','狮子','老虎','熊猫','兔子','乌鸦','鹦鹉','孔雀','鲨鱼','鲸鱼','彩虹','闪电','龙卷风',
    '火山','瀑布','沙漠','森林','岛屿','灯塔','城堡','桥梁','风车','摩天轮','过山车','旋转木马',
    '气球','蜡笔','礼物','钻石','皇冠','宝剑','盾牌','魔法棒','望远镜','显微镜','地球仪','指南针',
    '沙漠','骰子','扑克牌','棋盘','风筝','秋千','滑梯','跷跷板','蹦床','帐篷','睡袋','背包',
    '相机','手机','电视','电脑','冰箱','洗衣机','微波炉','吸尘器','台灯','蜡笔','烟花','鞭炮'
  ];

  const generateRoomId = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 5; i++) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
  };

  const getWordHint = (word) => word.split('').map(() => '■').join(' ');

  const pickRandomWords = () => {
    const shuffled = [...GUESS_WORDS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  };

  const broadcastToPeers = (data) => {
    if (guessIsHost) {
      guessConnectionsRef.current.forEach(conn => {
        try { conn.send(data); } catch(e) {}
      });
    } else if (guessHostConnRef.current) {
      try { guessHostConnRef.current.send(data); } catch(e) {}
    }
  };

  const guessRegisterToLobby = (roomId, nickname) => {
    const lobbyPeer = new Peer(undefined, PEER_SERVER_CONFIG);
    guessLobbyPeerRef.current = lobbyPeer;
    lobbyPeer.on('open', () => {
      const lobbyConn = lobbyPeer.connect('gdraw-lobby', { metadata: { type: 'register', roomId, nickname } });
      lobbyConn.on('open', () => {
        lobbyConn.send({ type: 'register', roomId, nickname, hostName: nickname });
        guessLobbyConnsRef.current.push(lobbyConn);
      });
      lobbyConn.on('error', () => {});
    });
    lobbyPeer.on('error', () => {});
  };

  const guessScanLanRooms = () => {
    setGuessIsScanningLan(true);
    setGuessDiscoveredRooms([]);
    setGuessHallMsg('');
    const scanPeer = new Peer(undefined, PEER_SERVER_CONFIG);
    let timeoutId = null;
    scanPeer.on('open', () => {
      const lobbyConn = scanPeer.connect('gdraw-lobby', { metadata: { type: 'scan' } });
      lobbyConn.on('open', () => { lobbyConn.send({ type: 'scan' }); });
      lobbyConn.on('data', (data) => {
        if (data.type === 'room-list') {
          setGuessDiscoveredRooms(data.rooms || []);
          setGuessIsScanningLan(false);
          if (timeoutId) clearTimeout(timeoutId);
          scanPeer.destroy();
          if (!data.rooms || data.rooms.length === 0) { setGuessHallMsg('当前无在线房间'); setTimeout(() => setGuessHallMsg(''), 3000); }
        }
      });
      lobbyConn.on('error', () => { setGuessIsScanningLan(false); if (timeoutId) clearTimeout(timeoutId); scanPeer.destroy(); });
      timeoutId = setTimeout(() => { setGuessIsScanningLan(false); scanPeer.destroy(); setGuessHallMsg('搜索超时，当前无在线房间'); setTimeout(() => setGuessHallMsg(''), 3000); }, 12000);
    });
    scanPeer.on('error', () => { setGuessIsScanningLan(false); if (timeoutId) clearTimeout(timeoutId); });
  };

  const guessScanLobbyRooms = async () => {
    setGuessIsScanningLobby(true);
    setGuessDiscoveredRooms([]);
    setGuessHallMsg('');
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${PEERJS_API_BASE}/peerjs/peers`, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const peerData = await res.json();
      let peerIds = [];
      if (Array.isArray(peerData)) { peerIds = peerData; }
      else if (peerData && typeof peerData === 'object' && !Array.isArray(peerData)) { peerIds = Object.keys(peerData); }
      else if (Array.isArray(peerData?.peers)) { peerIds = peerData.peers; }
      const roomPeers = peerIds.filter(id => typeof id === 'string' && id.startsWith('gdraw-'));
      const foundRooms = roomPeers.map(id => ({ roomId: String(id).replace('gdraw-', ''), hostName: String(id).replace('gdraw-', ''), playerCount: 1, createdAt: Date.now() }));
      if (foundRooms.length > 0) { setGuessDiscoveredRooms(foundRooms); }
      else { setGuessDiscoveredRooms([]); setGuessHallMsg('大厅无在线房间'); setTimeout(() => setGuessHallMsg(''), 3000); }
    } catch (err) {
      if (err.name === 'AbortError') { setGuessHallMsg('搜索超时，请检查网络'); }
      else { setGuessHallMsg('无法连接服务器，请检查网络'); }
      setTimeout(() => setGuessHallMsg(''), 3000);
    } finally { setGuessIsScanningLobby(false); }
  };

  const guessCreateRoom = () => {
    if (!guessNickname.trim()) return;
    localStorage.setItem('violentGuessNickname', guessNickname.trim());
    const roomId = generateRoomId();
    setGuessRoomId(roomId);
    setGuessIsHost(true);
    setGuessPlayers([{ id: 'host', name: guessNickname.trim(), score: 0 }]);
    setGuessScores({ host: 0 });
    setGuessChatMessages([{ type: 'system', text: `房间已创建，房间号 ${roomId}` }]);

    const peer = new Peer('gdraw-' + roomId, PEER_SERVER_CONFIG);
    guessPeerRef.current = peer;
    guessMyIdRef.current = 'host';

    peer.on('open', () => {
      setGuessConnected(true);
      setGuessChatMessages(prev => [...prev, { type: 'system', text: '已连接到信令服务器' }]);

      const lobbyPeer = new Peer('gdraw-lobby', PEER_SERVER_CONFIG);
      lobbyPeer.on('open', () => {
        guessLobbyPeerRef.current = lobbyPeer;
        guessRoomListRef.current = [{ roomId, hostName: guessNickname.trim(), playerCount: 1, createdAt: Date.now() }];
        lobbyPeer.on('connection', (conn) => {
          conn.on('open', () => { guessLobbyConnsRef.current.push(conn); });
          conn.on('data', (data) => {
            if (data.type === 'register') {
              const exists = guessRoomListRef.current.find(r => r.roomId === data.roomId);
              if (!exists) guessRoomListRef.current = [...guessRoomListRef.current, { roomId: data.roomId, hostName: data.hostName || data.nickname, playerCount: 1, createdAt: Date.now() }];
              guessLobbyConnsRef.current.forEach(c => { try { c.send({ type: 'room-list', rooms: guessRoomListRef.current }); } catch(e) {} });
            } else if (data.type === 'scan') {
              conn.send({ type: 'room-list', rooms: guessRoomListRef.current });
            } else if (data.type === 'unregister') {
              guessRoomListRef.current = guessRoomListRef.current.filter(r => r.roomId !== data.roomId);
              guessLobbyConnsRef.current.forEach(c => { try { c.send({ type: 'room-list', rooms: guessRoomListRef.current }); } catch(e) {} });
            }
          });
          conn.on('close', () => { guessLobbyConnsRef.current = guessLobbyConnsRef.current.filter(c => c !== conn); });
        });
      });
      lobbyPeer.on('error', () => { guessRegisterToLobby(roomId, guessNickname.trim()); });
    });

    peer.on('error', (err) => {
      console.error('Guess peer error:', err);
      setGuessChatMessages(prev => [...prev, { type: 'system', text: '连接信令服务器失败，请检查网络' }]);
      if (guessPeerRef.current) { guessPeerRef.current.destroy(); guessPeerRef.current = null; }
      setGuessConnected(false);
    });

    peer.on('disconnected', () => {
      setGuessConnected(false);
      setGuessChatMessages(prev => [...prev, { type: 'system', text: '与信令服务器断开连接，尝试重连...' }]);
      if (guessPeerRef.current) {
        guessPeerRef.current.reconnect();
      }
    });

    peer.on('connection', (conn) => {
      conn.on('open', () => {
        guessConnectionsRef.current.push(conn);
        conn.send({ type: 'welcome', players: guessPlayersRef.current, scores: guessScoresRef.current, gameState: guessGameStateRef.current, drawerId: guessDrawerIdRef.current, currentWord: guessCurrentWordRef.current, round: guessRoundRef.current });
        const newPlayer = { id: conn.peer, name: conn.metadata?.nickname || '玩家', score: 0 };
        const updatedPlayers = [...guessPlayersRef.current, newPlayer];
        const updatedScores = { ...guessScoresRef.current, [conn.peer]: 0 };
        setGuessPlayers(updatedPlayers);
        setGuessScores(updatedScores);
        guessPlayersRef.current = updatedPlayers;
        guessScoresRef.current = updatedScores;
        guessConnectionsRef.current.forEach(c => {
          try { c.send({ type: 'player-join', players: updatedPlayers, scores: updatedScores, name: newPlayer.name }); } catch(e) {}
        });
        setGuessChatMessages(prev => [...prev, { type: 'system', text: `${newPlayer.name} 加入了房间` }]);
      });

      conn.on('data', (data) => {
        if (data.type === 'chat') {
          setGuessChatMessages(prev => [...prev, { type: 'chat', name: data.name, text: data.text }]);
          guessConnectionsRef.current.forEach(c => {
            if (c.peer !== conn.peer) try { c.send(data); } catch(e) {}
          });
          if (guessGameStateRef.current === 'playing' && guessCurrentWordRef.current && conn.peer !== guessDrawerIdRef.current) {
            if (data.text.trim().toLowerCase() === (guessCurrentWordRef.current || '').toLowerCase()) {
              const updatedScores = { ...guessScoresRef.current };
              updatedScores[conn.peer] = (updatedScores[conn.peer] || 0) + 10;
              setGuessScores(updatedScores);
              guessScoresRef.current = updatedScores;
              setGuessChatMessages(prev => [...prev, { type: 'correct', name: data.name, text: '猜对了！' }]);
              guessConnectionsRef.current.forEach(c => {
                try { c.send({ type: 'correct', name: data.name, scores: updatedScores }); } catch(e) {}
              });
              if (guessTimerRef.current) { clearInterval(guessTimerRef.current); guessTimerRef.current = null; }
              setGuessGameState('round-end');
              guessGameStateRef.current = 'round-end';
              setIsPaintingMode(false);
              guessConnectionsRef.current.forEach(c => {
                try { c.send({ type: 'round-end', word: guessCurrentWordRef.current }); } catch(e) {}
              });
              setGuessChatMessages(prev => [...prev, { type: 'system', text: `正确答案：${guessCurrentWordRef.current}` }]);
            }
          }
        } else if (data.type === 'draw') {
          guessConnectionsRef.current.forEach(c => {
            if (c.peer !== conn.peer) try { c.send(data); } catch(e) {}
          });
          if (conn.peer === guessDrawerIdRef.current) {
            applyRemoteDraw(data);
          }
        } else if (data.type === 'canvas-sync') {
          guessConnectionsRef.current.forEach(c => {
            if (c.peer !== conn.peer) try { c.send(data); } catch(e) {}
          });
          if (conn.peer === guessDrawerIdRef.current) {
            applyRemoteCanvas(data);
          }
        } else if (data.type === 'word-chosen') {
          if (guessGameStateRef.current === 'choosing' && conn.peer === guessDrawerIdRef.current) {
            const word = data.word;
            setGuessCurrentWord(word);
            setGuessWordHint(getWordHint(word));
            setGuessGameState('playing');
            setGuessTimeLeft(60);
            setIsPaintingMode(false);
            guessGameStateRef.current = 'playing';
            guessCurrentWordRef.current = word;
            guessConnectionsRef.current.forEach(c => {
              if (c.peer !== conn.peer) try { c.send({ type: 'word-chosen-hide', hint: word }); } catch(e) {}
            });
            if (guessTimerRef.current) clearInterval(guessTimerRef.current);
            let timeLeft = 60;
            guessTimerRef.current = setInterval(() => {
              timeLeft--;
              setGuessTimeLeft(timeLeft);
              guessConnectionsRef.current.forEach(c => {
                try { c.send({ type: 'timer', time: timeLeft }); } catch(e) {}
              });
              if (timeLeft <= 0) {
                clearInterval(guessTimerRef.current);
                guessTimerRef.current = null;
                setGuessGameState('round-end');
                guessGameStateRef.current = 'round-end';
                setIsPaintingMode(false);
                guessConnectionsRef.current.forEach(c => {
                  try { c.send({ type: 'round-end', word: guessCurrentWordRef.current }); } catch(e) {}
                });
                setGuessChatMessages(prev => [...prev, { type: 'system', text: `时间到！正确答案：${guessCurrentWordRef.current}` }]);
              }
            }, 1000);
          }
        } else if (data.type === 'clear-canvas') {
          guessConnectionsRef.current.forEach(c => {
            if (c.peer !== conn.peer) try { c.send(data); } catch(e) {}
          });
          clearCanvas();
        } else if (data.type === 'guess-correct') {
          if (guessGameStateRef.current === 'playing' && guessCurrentWordRef.current) {
            const updatedScores = { ...guessScoresRef.current };
            updatedScores[data.peerId || conn.peer] = (updatedScores[data.peerId || conn.peer] || 0) + 10;
            setGuessScores(updatedScores);
            guessScoresRef.current = updatedScores;
            setGuessChatMessages(prev => [...prev, { type: 'correct', name: data.name, text: '猜对了！' }]);
            guessConnectionsRef.current.forEach(c => {
              try { c.send({ type: 'correct', name: data.name, scores: updatedScores }); } catch(e) {}
            });
            if (guessTimerRef.current) { clearInterval(guessTimerRef.current); guessTimerRef.current = null; }
            setGuessGameState('round-end');
            guessGameStateRef.current = 'round-end';
            setIsPaintingMode(false);
            guessConnectionsRef.current.forEach(c => {
              try { c.send({ type: 'round-end', word: guessCurrentWordRef.current }); } catch(e) {}
            });
            setGuessChatMessages(prev => [...prev, { type: 'system', text: `正确答案：${guessCurrentWordRef.current}` }]);
          }
        }
      });

      conn.on('close', () => {
        guessConnectionsRef.current = guessConnectionsRef.current.filter(c => c.peer !== conn.peer);
        const updatedPlayers = guessPlayersRef.current.filter(p => p.id !== conn.peer);
        const updatedScores = { ...guessScoresRef.current };
        delete updatedScores[conn.peer];
        setGuessPlayers(updatedPlayers);
        setGuessScores(updatedScores);
        guessPlayersRef.current = updatedPlayers;
        guessScoresRef.current = updatedScores;
        guessConnectionsRef.current.forEach(c => {
          try { c.send({ type: 'player-leave', players: updatedPlayers, scores: updatedScores, name: conn.metadata?.nickname }); } catch(e) {}
        });
        setGuessChatMessages(prev => [...prev, { type: 'system', text: `${conn.metadata?.nickname || '玩家'} 离开了房间` }]);
      });

      conn.on('error', () => {
        guessConnectionsRef.current = guessConnectionsRef.current.filter(c => c.peer !== conn.peer);
        const updatedPlayers = guessPlayersRef.current.filter(p => p.id !== conn.peer);
        const updatedScores = { ...guessScoresRef.current };
        delete updatedScores[conn.peer];
        setGuessPlayers(updatedPlayers);
        setGuessScores(updatedScores);
        guessPlayersRef.current = updatedPlayers;
        guessScoresRef.current = updatedScores;
        guessConnectionsRef.current.forEach(c => {
          try { c.send({ type: 'player-leave', players: updatedPlayers, scores: updatedScores, name: conn.metadata?.nickname }); } catch(e) {}
        });
      });
    });
  };

  const guessJoinRoom = (overrideRoomId) => {
    const rid = typeof overrideRoomId === 'string' ? overrideRoomId : '';
    const inputId = (rid || guessInputRoomId).trim().toUpperCase();
    if (!guessNickname.trim() || !inputId) return;
    const roomId = inputId;
    setGuessInputRoomId(rid || guessInputRoomId);
    setGuessRoomId(roomId);
    setGuessIsHost(false);
    setGuessIsJoining(true);
    setGuessChatMessages([{ type: 'system', text: '正在连接...' }]);
    localStorage.setItem('violentGuessNickname', guessNickname.trim());
    let retries = 0;
    const maxRetries = 3;
    let peer = null;

    const attemptJoin = () => {
      if (peer) { try { peer.destroy(); } catch(e) {} }
      peer = new Peer(undefined, PEER_SERVER_CONFIG);
      guessPeerRef.current = peer;

      peer.on('error', (err) => {
        console.error('Guess join error:', err.message || err);
        if (retries < maxRetries) {
          retries++;
          setGuessChatMessages(prev => [...prev, { type: 'system', text: '连接失败，正在重试(' + retries + '/' + maxRetries + ')...' }]);
          setTimeout(() => attemptJoin(), 1500);
        } else {
          setGuessIsJoining(false);
          setGuessChatMessages(prev => [...prev, { type: 'system', text: '无法连接，请确认信令服务器在线且房间号正确' }]);
          if (guessPeerRef.current) { guessPeerRef.current.destroy(); guessPeerRef.current = null; }
        }
      });

    peer.on('disconnected', () => {
      setGuessChatMessages(prev => [...prev, { type: 'system', text: '与信令服务器断开连接，尝试重连...' }]);
      if (guessPeerRef.current) {
        guessPeerRef.current.reconnect();
      }
    });

    peer.on('open', () => {
      guessMyIdRef.current = peer.id;
      const conn = peer.connect('gdraw-' + roomId, {
        metadata: { nickname: guessNickname.trim() }, reliable: true
      });
      guessHostConnRef.current = conn;
      const connectTimeout = setTimeout(() => {
        if (retries < maxRetries) {
          retries++;
          setGuessChatMessages(prev => [...prev, { type: 'system', text: '连接超时，正在重试(' + retries + '/' + maxRetries + ')...' }]);
          setTimeout(() => attemptJoin(), 1000);
        } else {
          setGuessIsJoining(false);
          setGuessChatMessages(prev => [...prev, { type: 'system', text: '连接超时，请确认房间号正确且房主在线' }]);
          try { peer.destroy(); } catch(e) {}
        }
      }, 12000);

      conn.on('open', () => {
        clearTimeout(connectTimeout);
        setGuessConnected(true);
        setGuessIsJoining(false);
        setGuessChatMessages(prev => [...prev, { type: 'system', text: '已连接到房间' }]);
      });

      conn.on('data', (data) => {
        if (data.type === 'welcome') {
          setGuessPlayers(data.players);
          setGuessScores(data.scores);
          guessPlayersRef.current = data.players;
          guessScoresRef.current = data.scores;
          if (data.gameState && data.gameState !== 'lobby') {
            setGuessGameState(data.gameState);
            guessGameStateRef.current = data.gameState;
            if (data.drawerId) { setGuessDrawerId(data.drawerId); guessDrawerIdRef.current = data.drawerId; }
            if (data.currentWord) { setGuessCurrentWord(data.currentWord); guessCurrentWordRef.current = data.currentWord; setGuessWordHint(getWordHint(data.currentWord)); }
            if (data.round) { setGuessRound(data.round); guessRoundRef.current = data.round; }
            if (data.gameState === 'playing' && data.drawerId && guessMyIdRef.current && data.drawerId === guessMyIdRef.current) {
              setIsPaintingMode(true); setIsEraser(false); setIsBucket(false); setIsEyedropper(false);
            }
          }
        } else if (data.type === 'player-join' || data.type === 'player-leave') {
          setGuessPlayers(data.players);
          setGuessScores(data.scores);
          guessPlayersRef.current = data.players;
          guessScoresRef.current = data.scores;
          setGuessChatMessages(prev => [...prev, { type: 'system', text: data.type === 'player-join' ? `${data.name} 加入了房间` : `${data.name} 离开了房间` }]);
        } else if (data.type === 'chat') {
          setGuessChatMessages(prev => [...prev, { type: 'chat', name: data.name, text: data.text }]);
        } else if (data.type === 'correct') {
          setGuessScores(data.scores);
          guessScoresRef.current = data.scores;
          setGuessChatMessages(prev => [...prev, { type: 'correct', name: data.name, text: '猜对了！' }]);
        } else if (data.type === 'game-start') {
          setGuessGameState('choosing');
          setGuessDrawerId(data.drawerId);
          setGuessRound(data.round);
          setGuessCurrentWord('');
          setGuessWordHint('');
          setGuessTimeLeft(60);
          guessGameStateRef.current = 'choosing';
          guessCurrentWordRef.current = '';
          guessDrawerIdRef.current = data.drawerId;
          guessRoundRef.current = data.round;
          clearCanvas();
          if (data.drawerId === guessMyIdRef.current) {
            setGuessWordOptions(data.words);
          } else {
            setGuessCurrentWord('');
            setGuessWordHint(getWordHint(data.hintLength ? '_'.repeat(data.hintLength) : ''));
          }
        } else if (data.type === 'word-chosen') {
          setGuessGameState('playing');
          guessGameStateRef.current = 'playing';
          setGuessCurrentWord(data.word);
          setGuessWordHint(getWordHint(data.word));
          setGuessTimeLeft(60);
        } else if (data.type === 'word-chosen-hide') {
          const isDrawer = guessIsHostRef.current ? guessDrawerIdRef.current === 'host' : guessDrawerIdRef.current === guessMyIdRef.current;
          if (!isDrawer) {
            setGuessGameState('playing');
            guessGameStateRef.current = 'playing';
            setGuessCurrentWord('');
            setGuessWordHint(getWordHint(data.hint));
            setGuessTimeLeft(60);
            setIsPaintingMode(false);
            setIsEraser(false);
            setIsBucket(false);
            setIsEyedropper(false);
          }
        } else if (data.type === 'draw') {
          if (guessDrawerIdRef.current !== guessMyIdRef.current) {
            applyRemoteDraw(data);
          }
        } else if (data.type === 'canvas-sync') {
          if (guessDrawerIdRef.current !== guessMyIdRef.current) {
            applyRemoteCanvas(data);
          }
        } else if (data.type === 'clear-canvas') {
          clearCanvas();
        } else if (data.type === 'timer') {
          setGuessTimeLeft(data.time);
        } else if (data.type === 'round-end') {
          setGuessGameState('round-end');
          guessGameStateRef.current = 'round-end';
          setGuessCurrentWord(data.word);
          setGuessWordHint(data.word);
          setIsPaintingMode(false);
          setGuessChatMessages(prev => [...prev, { type: 'system', text: `正确答案：${data.word}` }]);
          if (guessTimerRef.current) { clearInterval(guessTimerRef.current); guessTimerRef.current = null; }
        } else if (data.type === 'game-end') {
          setGuessGameState('ended');
          guessGameStateRef.current = 'ended';
          setGuessCurrentWord('');
          if (guessTimerRef.current) { clearInterval(guessTimerRef.current); guessTimerRef.current = null; }
        } else if (data.type === 'back-to-lobby') {
          setGuessGameState('lobby');
          guessGameStateRef.current = 'lobby';
          setGuessCurrentWord('');
          setGuessWordHint('');
          guessCurrentWordRef.current = '';
          if (guessTimerRef.current) { clearInterval(guessTimerRef.current); guessTimerRef.current = null; }
        }
      });

      conn.on('close', () => {
        setGuessConnected(false);
        setGuessIsJoining(false);
        guessHostConnRef.current = null;
        if (guessTimerRef.current) { clearInterval(guessTimerRef.current); guessTimerRef.current = null; }
        setGuessGameState('lobby');
        guessGameStateRef.current = 'lobby';
        setGuessCurrentWord('');
        setGuessWordHint('');
        guessCurrentWordRef.current = '';
        setGuessDrawerId('');
        setGuessRound(0);
        setGuessTimeLeft(60);
        setGuessWordOptions([]);
        setGuessChatMessages(prev => [...prev, { type: 'system', text: '与房间断开连接' }]);
      });

      conn.on('error', () => {
        setGuessConnected(false);
        setGuessIsJoining(false);
        guessHostConnRef.current = null;
        if (guessTimerRef.current) { clearInterval(guessTimerRef.current); guessTimerRef.current = null; }
        setGuessGameState('lobby');
        guessGameStateRef.current = 'lobby';
        setGuessCurrentWord('');
        setGuessWordHint('');
        guessCurrentWordRef.current = '';
        setGuessDrawerId('');
        setGuessRound(0);
        setGuessTimeLeft(60);
        setGuessWordOptions([]);
        setGuessChatMessages(prev => [...prev, { type: 'system', text: '与房间连接出错' }]);
      });
    });
    };
    attemptJoin();
  };

  const guessPlayersRef = useRef([]);
  guessPlayersRef.current = guessPlayers;
  const guessScoresRef = useRef({});
  guessScoresRef.current = guessScores;
  const guessGameStateRef = useRef('lobby');
  guessGameStateRef.current = guessGameState;
  const guessCurrentWordRef = useRef('');
  guessCurrentWordRef.current = guessCurrentWord;
  const guessDrawerIdRef = useRef('');
  guessDrawerIdRef.current = guessDrawerId;
  const guessIsHostRef = useRef(false);
  guessIsHostRef.current = guessIsHost;
  const guessRoundRef = useRef(0);
  guessRoundRef.current = guessRound;

  const applyRemoteDraw = (data) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = data.color || '#000000';
    ctx.lineWidth = data.width || 6;
    ctx.beginPath();
    ctx.moveTo(data.x1, data.y1);
    ctx.lineTo(data.x2, data.y2);
    ctx.stroke();
  };

  const applyRemoteCanvas = (data) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      const ctx = ctxRef.current;
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }
    };
    img.src = data.dataUrl;
  };

  const guessStartGame = () => {
    if (!guessIsHost) return;
    const players = guessPlayersRef.current;
    if (players.length < 2) return;
    const drawer = players[0];
    const words = pickRandomWords();
    setGuessGameState('choosing');
    setGuessDrawerId(drawer.id);
    setGuessRound(1);
    setGuessCurrentWord('');
    setGuessWordHint('');
    setGuessTimeLeft(60);
    guessGameStateRef.current = 'choosing';
    guessCurrentWordRef.current = '';
    guessDrawerIdRef.current = drawer.id;
    guessRoundRef.current = 1;
    clearCanvas();
    guessConnectionsRef.current.forEach(c => {
      try { c.send({ type: 'clear-canvas' }); } catch(e) {}
    });
    guessConnectionsRef.current.forEach(c => {
      try { c.send({ type: 'game-start', drawerId: drawer.id, round: 1, words: words, hintLength: words[0].length }); } catch(e) {}
    });
    setGuessWordOptions(words);
  };

  const guessChooseWord = (word) => {
    setGuessCurrentWord(word);
    setGuessWordHint(getWordHint(word));
    setGuessGameState('playing');
    setGuessTimeLeft(60);
    setIsPaintingMode(true);
    setIsEraser(false);
    setIsBucket(false);
    setIsEyedropper(false);
    guessGameStateRef.current = 'playing';
    guessCurrentWordRef.current = word;
    if (guessIsHost) {
      guessConnectionsRef.current.forEach(c => {
        try { c.send({ type: 'word-chosen-hide', hint: word }); } catch(e) {}
      });
      if (guessTimerRef.current) clearInterval(guessTimerRef.current);
      let timeLeft = 60;
      guessTimerRef.current = setInterval(() => {
        timeLeft--;
        setGuessTimeLeft(timeLeft);
        guessConnectionsRef.current.forEach(c => {
          try { c.send({ type: 'timer', time: timeLeft }); } catch(e) {}
        });
        if (timeLeft <= 0) {
          clearInterval(guessTimerRef.current);
          guessTimerRef.current = null;
          setGuessGameState('round-end');
          guessGameStateRef.current = 'round-end';
          setIsPaintingMode(false);
          guessConnectionsRef.current.forEach(c => {
            try { c.send({ type: 'round-end', word: guessCurrentWordRef.current }); } catch(e) {}
          });
          setGuessChatMessages(prev => [...prev, { type: 'system', text: `时间到！正确答案：${guessCurrentWordRef.current}` }]);
        }
      }, 1000);
    } else {
      if (guessHostConnRef.current) {
        try { guessHostConnRef.current.send({ type: 'word-chosen', word: word }); } catch(e) {}
      }
    }
  };

  const guessNextRound = () => {
    if (!guessIsHost) return;
    const players = guessPlayersRef.current;
    const currentDrawerIdx = players.findIndex(p => p.id === guessDrawerIdRef.current);
    const nextIdx = (currentDrawerIdx + 1) % players.length;
    const nextRound = nextIdx === 0 ? guessRoundRef.current + 1 : guessRoundRef.current;
    if (nextRound > 3) {
      setGuessGameState('ended');
      guessGameStateRef.current = 'ended';
      guessConnectionsRef.current.forEach(c => {
        try { c.send({ type: 'game-end' }); } catch(e) {}
      });
      return;
    }
    const drawer = players[nextIdx];
    const words = pickRandomWords();
    setGuessGameState('choosing');
    setGuessDrawerId(drawer.id);
    setGuessRound(nextRound);
    setGuessCurrentWord('');
    setGuessWordHint('');
    setGuessTimeLeft(60);
    guessGameStateRef.current = 'choosing';
    guessCurrentWordRef.current = '';
    guessDrawerIdRef.current = drawer.id;
    guessRoundRef.current = nextRound;
    clearCanvas();
    guessConnectionsRef.current.forEach(c => {
      try { c.send({ type: 'clear-canvas' }); } catch(e) {}
    });
    guessConnectionsRef.current.forEach(c => {
      try { c.send({ type: 'game-start', drawerId: drawer.id, round: nextRound, words: words, hintLength: words[0].length }); } catch(e) {}
    });
    setGuessWordOptions(words);
  };

  const guessSendChat = () => {
    if (!guessChatInput.trim()) return;
    const msg = { type: 'chat', name: guessNickname, text: guessChatInput.trim() };
    setGuessChatMessages(prev => [...prev, msg]);
    broadcastToPeers(msg);
    const isCurrentDrawer = guessIsHost ? guessDrawerIdRef.current === 'host' : guessDrawerIdRef.current === guessMyIdRef.current;
    if (guessGameStateRef.current === 'playing' && guessCurrentWordRef.current && !isCurrentDrawer) {
      if (guessChatInput.trim().toLowerCase() === (guessCurrentWordRef.current || '').toLowerCase()) {
        if (guessIsHost) {
          const updatedScores = { ...guessScoresRef.current };
          updatedScores['host'] = (updatedScores['host'] || 0) + 10;
          setGuessScores(updatedScores);
          guessScoresRef.current = updatedScores;
          setGuessChatMessages(prev => [...prev, { type: 'correct', name: guessNickname, text: '猜对了！' }]);
          if (guessTimerRef.current) { clearInterval(guessTimerRef.current); guessTimerRef.current = null; }
          setGuessGameState('round-end');
          guessGameStateRef.current = 'round-end';
          setIsPaintingMode(false);
          guessConnectionsRef.current.forEach(c => {
            try { c.send({ type: 'correct', name: guessNickname, scores: updatedScores }); } catch(e) {}
            try { c.send({ type: 'round-end', word: guessCurrentWordRef.current }); } catch(e) {}
          });
          setGuessChatMessages(prev => [...prev, { type: 'system', text: `正确答案：${guessCurrentWordRef.current}` }]);
        } else {
          const updatedScores = { ...guessScoresRef.current };
          updatedScores[guessMyIdRef.current] = (updatedScores[guessMyIdRef.current] || 0) + 10;
          setGuessScores(updatedScores);
          guessScoresRef.current = updatedScores;
          setGuessChatMessages(prev => [...prev, { type: 'correct', name: guessNickname, text: '猜对了！' }]);
          if (guessHostConnRef.current) {
            try { guessHostConnRef.current.send({ type: 'guess-correct', name: guessNickname, peerId: guessMyIdRef.current, scores: updatedScores }); } catch(e) {}
          }
        }
      }
    }
    setGuessChatInput('');
  };

  const guessLeaveRoom = () => {
    if (guessHeartbeatRef.current) { clearInterval(guessHeartbeatRef.current); guessHeartbeatRef.current = null; }
    if (guessLobbyPeerRef.current) {
      guessLobbyPeerRef.current.destroy();
      guessLobbyPeerRef.current = null;
    }
    guessLobbyConnsRef.current = [];
    guessRoomListRef.current = [];
    if (guessPeerRef.current) {
      guessPeerRef.current.destroy();
      guessPeerRef.current = null;
    }
    guessConnectionsRef.current = [];
    guessHostConnRef.current = null;
    if (guessTimerRef.current) { clearInterval(guessTimerRef.current); guessTimerRef.current = null; }
    setGuessConnected(false);
    setGuessIsHost(false);
    setGuessRoomId('');
    setGuessPlayers([]);
    setGuessScores({});
    setGuessChatMessages([]);
    setGuessGameState('lobby');
    guessGameStateRef.current = 'lobby';
    setGuessCurrentWord('');
    setGuessWordHint('');
    setGuessDrawerId('');
    setGuessRound(0);
    setGuessTimeLeft(60);
    setGuessWordOptions([]);
    setGuessDiscoveredRooms([]);
  };

  const isGuessDrawer = guessDrawerId === guessMyIdRef.current || (guessIsHost && guessDrawerId === 'host');

  const hslToHex = (h, s, l) => {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  const hexToHsl = (hex) => {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  };

  const guessWheelCacheRef = useRef(null);
  const guessSquareCacheRef = useRef(null);
  const guessPickerRafRef = useRef(null);
  const guessPickerStateRef = useRef({ hue: 0, sat: 100, light: 50 });

  const renderGuessWheelCache = () => {
    const size = 160;
    let cache = guessWheelCacheRef.current;
    if (!cache) {
      cache = document.createElement('canvas');
      cache.width = size;
      cache.height = size;
      guessWheelCacheRef.current = cache;
    }
    const ctx = cache.getContext('2d');
    const cx = size / 2, cy = size / 2;
    const outerR = size / 2 - 2;
    const innerR = outerR - 18;
    ctx.clearRect(0, 0, size, size);
    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = (angle - 1) * Math.PI / 180;
      const endAngle = (angle + 1) * Math.PI / 180;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, endAngle);
      ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = `hsl(${angle}, 100%, 50%)`;
      ctx.fill();
    }
  };

  const renderGuessSquareCache = (hue) => {
    const w = 120, h = 80;
    let cache = guessSquareCacheRef.current;
    if (!cache) {
      cache = document.createElement('canvas');
      cache.width = w;
      cache.height = h;
      guessSquareCacheRef.current = cache;
    }
    const ctx = cache.getContext('2d');
    const gradH = ctx.createLinearGradient(0, 0, w, 0);
    gradH.addColorStop(0, '#ffffff');
    gradH.addColorStop(1, `hsl(${hue}, 100%, 50%)`);
    ctx.fillStyle = gradH;
    ctx.fillRect(0, 0, w, h);
    const gradV = ctx.createLinearGradient(0, 0, 0, h);
    gradV.addColorStop(0, 'rgba(0,0,0,0)');
    gradV.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = gradV;
    ctx.fillRect(0, 0, w, h);
  };

  const drawGuessPickerToCanvas = () => {
    const { hue, sat, light } = guessPickerStateRef.current;
    const wheelCanvas = guessColorWheelRef.current;
    if (wheelCanvas && guessWheelCacheRef.current) {
      const ctx = wheelCanvas.getContext('2d');
      ctx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);
      ctx.drawImage(guessWheelCacheRef.current, 0, 0);
      const cx = 80, cy = 80;
      const outerR = 78;
      const innerR = outerR - 18;
      const midR = (outerR + innerR) / 2;
      const selAngle = hue * Math.PI / 180;
      const sx = cx + Math.cos(selAngle) * midR;
      const sy = cy + Math.sin(selAngle) * midR;
      ctx.beginPath();
      ctx.arc(sx, sy, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.fill();
    }
    const squareCanvas = guessColorSquareRef.current;
    if (squareCanvas && guessSquareCacheRef.current) {
      const ctx = squareCanvas.getContext('2d');
      const w = squareCanvas.width, h = squareCanvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(guessSquareCacheRef.current, 0, 0);
      const px = sat / 100 * w;
      const py = (1 - light / 100) * h;
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };

  const requestGuessPickerDraw = () => {
    if (guessPickerRafRef.current) return;
    guessPickerRafRef.current = requestAnimationFrame(() => {
      guessPickerRafRef.current = null;
      drawGuessPickerToCanvas();
    });
  };

  useEffect(() => {
    if (guessColorPickerOpen) {
      guessPickerStateRef.current = { hue: guessHue, sat: guessSat, light: guessLight };
      renderGuessWheelCache();
      renderGuessSquareCache(guessHue);
      requestGuessPickerDraw();
    }
  }, [guessColorPickerOpen]);

  useEffect(() => {
    if (!guessColorPickerOpen) return;
    guessPickerStateRef.current = { hue: guessHue, sat: guessSat, light: guessLight };
    renderGuessSquareCache(guessHue);
    requestGuessPickerDraw();
  }, [guessHue]);

  useEffect(() => {
    if (!guessColorPickerOpen) return;
    guessPickerStateRef.current = { hue: guessHue, sat: guessSat, light: guessLight };
    requestGuessPickerDraw();
  }, [guessSat, guessLight]);

  const handleGuessWheelClick = (e) => {
    const canvas = guessColorWheelRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2, cy = rect.height / 2;
    const dx = x - cx, dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const outerR = rect.width / 2 - 2;
    const innerR = outerR - 18;
    if (dist >= innerR && dist <= outerR) {
      let angle = Math.atan2(dy, dx) * 180 / Math.PI;
      if (angle < 0) angle += 360;
      angle = Math.round(angle);
      guessPickerStateRef.current.hue = angle;
      setGuessHue(angle);
      setColor(hslToHex(angle, guessPickerStateRef.current.sat, guessPickerStateRef.current.light));
      renderGuessSquareCache(angle);
      requestGuessPickerDraw();
    }
  };

  const handleGuessWheelDrag = useRef(false);
  const handleGuessSquareDrag = useRef(false);

  const handleGuessSquareClick = (e) => {
    const canvas = guessColorSquareRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    const newSat = Math.round(x / rect.width * 100);
    const newLight = Math.round((1 - y / rect.height) * 100);
    guessPickerStateRef.current.sat = newSat;
    guessPickerStateRef.current.light = newLight;
    setGuessSat(newSat);
    setGuessLight(newLight);
    setColor(hslToHex(guessPickerStateRef.current.hue, newSat, newLight));
    requestGuessPickerDraw();
  };

  const handleGuessWheelMouseMove = (e) => {
    if (!handleGuessWheelDrag.current) return;
    handleGuessWheelClick(e);
  };

  const handleGuessSquareMouseMove = (e) => {
    if (!handleGuessSquareDrag.current) return;
    handleGuessSquareClick(e);
  };

  const handleGuessPickerMouseUp = () => {
    handleGuessWheelDrag.current = false;
    handleGuessSquareDrag.current = false;
  };

  useEffect(() => {
    if (guessColorPickerOpen) {
      const onGlobalMouseMove = (e) => {
        if (handleGuessWheelDrag.current) handleGuessWheelClick(e);
        if (handleGuessSquareDrag.current) handleGuessSquareClick(e);
      };
      window.addEventListener('mouseup', handleGuessPickerMouseUp);
      window.addEventListener('touchend', handleGuessPickerMouseUp);
      window.addEventListener('mousemove', onGlobalMouseMove);
      return () => {
        window.removeEventListener('mouseup', handleGuessPickerMouseUp);
        window.removeEventListener('touchend', handleGuessPickerMouseUp);
        window.removeEventListener('mousemove', onGlobalMouseMove);
      };
    }
  }, [guessColorPickerOpen]);

  useEffect(() => {
    if (onGameModeChange) onGameModeChange(showGuessGame);
  }, [showGuessGame, showTetrisMode, showWitchPoisonMode]);

  useEffect(() => {
    if (showGuessGame && (guessConnected || guessDevMode)) {
      setIsPaintingMode(true);
      setIsEraser(false);
      setIsBucket(false);
      setIsEyedropper(false);
      setIsCalligraphy(false);
      setIsLineMode(false);
      setIsCircleMode(false);
    } else {
      setIsPaintingMode(false);
      setIsEraser(false);
      setIsBucket(false);
      setIsEyedropper(false);
      setIsCalligraphy(false);
      setIsLineMode(false);
      setIsCircleMode(false);
    }
  }, [showGuessGame && (guessConnected || guessDevMode)]);

  useEffect(() => {
    return () => {
      if (guessPeerRef.current) guessPeerRef.current.destroy();
      if (guessTimerRef.current) clearInterval(guessTimerRef.current);
    };
  }, []);

  const addRefImage = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const maxW = 280;
        const maxH = 200;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const id = nextRefId++;
        const initX = Math.max(20, (window.innerWidth - w) / 2);
        const initY = Math.max(20, (window.innerHeight - h) / 2);
        setRefImages(prev => [...prev, { id, src: e.target.result, x: initX, y: initY, baseW: w, baseH: h, viewScale: 1, viewOriginX: 50, viewOriginY: 50 }]);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };
  const removeRefImage = (id) => setRefImages(prev => prev.filter(r => r.id !== id));
  const resizeRefImage = (id, delta) => {
    setRefImages(prev => prev.map(r => {
      if (r.id !== id) return r;
      const w = Math.max(80, Math.min(600, r.baseW + delta));
      const h = Math.round(w * (r.baseH / r.baseW));
      return { ...r, baseW: w, baseH: h };
    }));
  };
  const resetRefImageView = (id) => {
    setRefImages(prev => prev.map(r => r.id === id ? { ...r, viewScale: 1, viewOriginX: 50, viewOriginY: 50 } : r));
  };
  const handleRefMouseDown = (id, e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setDraggingRefId(id);
    const img = refImages.find(r => r.id === id);
    if (!img) return;
    setDragOffset({ x: e.clientX - img.x, y: e.clientY - img.y });
  };
  useEffect(() => {
    if (draggingRefId === null) return;
    const handleMove = (e) => {
      const x = e.clientX - dragOffset.x;
      const y = e.clientY - dragOffset.y;
      setRefImages(prev => prev.map(r => r.id === draggingRefId ? { ...r, x, y } : r));
    };
    const handleUp = () => { setDraggingRefId(null); };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [draggingRefId, dragOffset]);

  useEffect(() => {
    if (draggingGuideIdx < 0) return;
    draggingGuideIdxRef.current = draggingGuideIdx;
    const handleGuideMove = (e) => {
      const container = document.querySelector('[data-canvas-area]');
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const idx = draggingGuideIdxRef.current;
      if (idx < 0) return;
      setGuideLines(prev => {
        const g = prev[idx];
        if (!g) return prev;
        const pos = g.type === 'horizontal'
          ? e.clientY - containerRect.top
          : e.clientX - containerRect.left;
        return prev.map((item, i) => i === idx ? { ...item, position: pos } : item);
      });
    };
    const handleGuideUp = () => {
      draggingGuideIdxRef.current = -1;
      setDraggingGuideIdx(-1);
    };
    window.addEventListener('mousemove', handleGuideMove);
    window.addEventListener('mouseup', handleGuideUp);
    window.addEventListener('touchmove', handleGuideMove, { passive: false });
    window.addEventListener('touchend', handleGuideUp);
    return () => {
      window.removeEventListener('mousemove', handleGuideMove);
      window.removeEventListener('mouseup', handleGuideUp);
      window.removeEventListener('touchmove', handleGuideMove);
      window.removeEventListener('touchend', handleGuideUp);
    };
  }, [draggingGuideIdx]);

  const refPinchRef = useRef({ startDist: 0, startScale: 1, targetId: null });
  const handleRefPinchStart = (e) => {
    if (e.touches.length !== 2) return;
    const t1 = e.touches[0], t2 = e.touches[1];
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const target = e.target.closest('[data-ref-img]');
    if (!target) return;
    const id = parseInt(target.dataset.refImg);
    const img = refImages.find(r => r.id === id);
    if (!img) return;
    refPinchRef.current = { startDist: dist, startScale: img.viewScale, targetId: id };
  };
  const handleRefPinchMove = (e) => {
    if (e.touches.length !== 2 || !refPinchRef.current.targetId) return;
    e.preventDefault();
    e.stopPropagation();
    const t1 = e.touches[0], t2 = e.touches[1];
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const scale = dist / refPinchRef.current.startDist * refPinchRef.current.startScale;
    const clamped = Math.max(1, Math.min(10, scale));
    const target = e.target.closest('[data-ref-img]');
    const rect = target ? target.getBoundingClientRect() : { left: 0, top: 0, width: 1, height: 1 };
    const midX = ((t1.clientX + t2.clientX) / 2 - rect.left) / rect.width * 100;
    const midY = ((t1.clientY + t2.clientY) / 2 - rect.top) / rect.height * 100;
    setRefImages(prev => prev.map(r => {
      if (r.id !== refPinchRef.current.targetId) return r;
      return { ...r, viewScale: clamped, viewOriginX: clamped > 1 ? midX : 50, viewOriginY: clamped > 1 ? midY : 50 };
    }));
  };
  const handleRefPinchEnd = () => { refPinchRef.current.targetId = null; };

  const handleContextMenu = (e) => {
    if (cadMode && (cadTool === 'polygon' || cadTool === 'spline') && cadPolyPoints.current.length > 0) {
      e.preventDefault();
      if (cadTool === 'polygon') { commitShape(0, 0, 0, 0, 'polygon'); cadPolyPoints.current = []; }
      if (cadTool === 'spline') { commitSpline(); }
    }
  };


  const canvasEvents = {
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    onMouseLeave: stopDrawing,
    onTouchStart: (e) => { e.preventDefault(); handleTouchStart(e); },
    onTouchMove: (e) => { e.preventDefault(); handleTouchMove(e); },
    onTouchEnd: (e) => { e.preventDefault(); handleTouchEnd(e); },
    onTouchCancel: (e) => { e.preventDefault(); stopDrawing(e); },
    onContextMenu: handleContextMenu
  };

  if (isVectorCadMode) {
    return (
      <React.Suspense fallback={<div className="flex items-center justify-center h-screen w-screen bg-zinc-900"><div className="text-white/80 text-sm">加载CAD模块中...</div></div>}>
        <VectorCadTab onClose={() => setIsVectorCadMode(false)} />
      </React.Suspense>
    );
  }
  return (
    <div className={`fixed inset-0 z-[9999] flex ${drawDarkMode ? 'draw-dark' : ''}`}>
      {(
        <div className={`w-[64px] shrink-0 flex flex-col border-r transition-all duration-150 ${isDrawing ? 'opacity-50 grayscale pointer-events-none' : ''} ${glassMode ? 'aurora-glass-card border-white/30' : 'bg-[#161b26] border-gray-700/50'}`}>
          {!cadMode && (
          <nav className="flex-1 px-1 pt-10 pb-2 space-y-0.5 overflow-y-auto">
            <button onClick={() => { setShowHelpBook(!showHelpBook); setActivePanel(null); }} className={`flex flex-col items-center gap-0.5 w-full px-1 py-1.5 rounded text-[9px] font-medium transition-all ${showHelpBook ? (glassMode ? 'bg-indigo-500/15 text-indigo-600' : 'bg-blue-500/15 text-blue-400') : (glassMode ? 'text-slate-500 hover:bg-white/30 hover:text-slate-700' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200')}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              <span>指南</span>
            </button>
            <button ref={colorBtnRef} onClick={() => { setIsBucket(false); setIsEraser(false); setIsEyedropper(false); setShowHelpBook(false); setActivePanel(activePanel === 'color' ? null : 'color'); }} className={`flex flex-col items-center gap-0.5 w-full px-1 py-1.5 rounded text-[9px] font-medium transition-all ${activePanel === 'color' && !isBucket && !isEyedropper ? (glassMode ? 'bg-indigo-500/15 text-indigo-600' : 'bg-blue-500/15 text-blue-400') : (glassMode ? 'text-slate-500 hover:bg-white/30 hover:text-slate-700' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200')}`}>
              <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: color }}></div>
              <span>颜色</span>
            </button>
            <button onClick={() => { if (!isPaintingMode) { setIsEraser(false); setIsBucket(false); setIsEyedropper(false); setIsCalligraphy(false); setIsLineMode(false); setIsCircleMode(false); setIsWillowLeafMode(false); setIsPaintingMode(true); setShowHelpBook(false); setActivePanel(null); } else { setActivePanel(activePanel === 'brush' ? null : 'brush'); } }} className={`relative flex flex-col items-center gap-0.5 w-full px-1 py-1.5 rounded text-[9px] font-medium transition-all ${isPaintingMode && !isEraser ? (glassMode ? 'bg-indigo-500/15 text-indigo-600' : 'bg-blue-500/15 text-blue-400') : (glassMode ? 'text-slate-500 hover:bg-white/30 hover:text-slate-700' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200')}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
              <span>画笔</span>
              {isPaintingMode && !isEraser && <svg className="absolute right-0 bottom-0 opacity-50" width="8" height="8" viewBox="0 0 8 8"><path d="M0 8h8V0L0 8z" fill="currentColor"/></svg>}
            </button>
            <button onClick={() => { setIsEraser(true); setIsPaintingMode(false); setIsBucket(false); setIsEyedropper(false); setIsCalligraphy(false); setIsLineMode(false); setIsCircleMode(false); setIsWillowLeafMode(false); setShowWillowLeafPanel(false); setShowHelpBook(false); setActivePanel(null); }} className={`flex flex-col items-center gap-0.5 w-full px-1 py-1.5 rounded text-[9px] font-medium transition-all ${isEraser ? (glassMode ? 'bg-indigo-500/15 text-indigo-600' : 'bg-blue-500/15 text-blue-400') : (glassMode ? 'text-slate-500 hover:bg-white/30 hover:text-slate-700' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200')}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8.086 2.207a2 2 0 0 1 2.828 0l3.879 3.879a2 2 0 0 1 0 2.828l-5.5 5.5A2 2 0 0 1 7.879 15H5.12a2 2 0 0 1-1.414-.586l-2.5-2.5a2 2 0 0 1 0-2.828zm2.121.707a1 1 0 0 0-1.414 0L4.16 7.547l5.293 5.293 4.633-4.633a1 1 0 0 0 0-1.414zM8.746 13.547 3.453 8.254 1.914 9.793a1 1 0 0 0 0 1.414l2.5 2.5a1 1 0 0 0 .707.293H7.88a1 1 0 0 0 .707-.293z"/></svg>
              <span>橡皮</span>
            </button>
            <button onClick={() => { if (isEyedropper) { setIsEyedropper(false); } else { setIsEyedropper(true); setIsPaintingMode(false); setIsBucket(false); setIsEraser(false); setIsCalligraphy(false); setIsLineMode(false); setIsCircleMode(false); setIsWillowLeafMode(false); setShowHelpBook(false); } }} className={`flex flex-col items-center gap-0.5 w-full px-1 py-1.5 rounded text-[9px] font-medium transition-all ${isEyedropper ? (glassMode ? 'bg-indigo-500/15 text-indigo-600' : 'bg-blue-500/15 text-blue-400') : (glassMode ? 'text-slate-500 hover:bg-white/30 hover:text-slate-700' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200')}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M13.354.646a1.207 1.207 0 0 0-1.708 0L8.5 3.793l-.646-.647a.5.5 0 1 0-.708.708L8.293 5l-7.147 7.146A.5.5 0 0 0 1 12.5v1.793l-.854.853a.5.5 0 1 0 .708.707L1.707 15H3.5a.5.5 0 0 0 .354-.146L11 7.707l1.146 1.147a.5.5 0 0 0 .708-.708l-.647-.646 3.147-3.146a1.207 1.207 0 0 0 0-1.708zM2 12.707l7-7L10.293 7l-7 7H2z"/></svg>
              <span>吸管</span>
            </button>
            <button onMouseDown={(e) => e.stopPropagation()} onClick={() => { if (!isBucket) { setIsEraser(false); setIsPaintingMode(false); setIsEyedropper(false); setIsCalligraphy(false); setIsLineMode(false); setIsCircleMode(false); setIsWillowLeafMode(false); setIsBucket(true); setShowHelpBook(false); setActivePanel(null); } else { if (activePanel === 'color') { setIsBucket(false); setActivePanel(null); } else { setActivePanel('color'); } } }} className={`relative flex flex-col items-center gap-0.5 w-full px-1 py-1.5 rounded text-[9px] font-medium transition-all ${isBucket ? (glassMode ? 'bg-indigo-500/15 text-indigo-600' : 'bg-blue-500/15 text-blue-400') : (glassMode ? 'text-slate-500 hover:bg-white/30 hover:text-slate-700' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200')}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M6.192 2.78c-.458-.677-.927-1.248-1.35-1.643a3 3 0 0 0-.71-.515c-.217-.104-.56-.205-.882-.02-.367.213-.427.63-.43.896-.003.304.064.664.173 1.044.196.687.556 1.528 1.035 2.402L.752 8.22c-.277.277-.269.656-.218.918.055.283.187.593.36.903.348.627.92 1.361 1.626 2.068.707.707 1.441 1.278 2.068 1.626.31.173.62.305.903.36.262.05.64.059.918-.218l5.615-5.615c.118.257.092.512.05.939-.03.292-.068.665-.073 1.176v.123h.003a1 1 0 0 0 1.993 0H14v-.057a1 1 0 0 0-.004-.117c-.055-1.25-.7-2.738-1.86-3.494a4 4 0 0 0-.211-.434c-.349-.626-.92-1.36-1.627-2.067S8.857 3.052 8.23 2.704c-.31-.172-.62-.304-.903-.36-.262-.05-.64-.058-.918.219zM4.16 1.867c.381.356.844.922 1.311 1.632l-.704.705c-.382-.727-.66-1.402-.813-1.938a3.3 3.3 0 0 1-.131-.673q.137.09.337.274m.394 3.965c.54.852 1.107 1.567 1.607 2.033a.5.5 0 1 0 .682-.732c-.453-.422-1.017-1.136-1.564-2.027l1.088-1.088q.081.181.183.365c.349.627.92 1.361 1.627 2.068.706.707 1.44 1.278 2.068 1.626q.183.103.365.183l-4.861 4.862-.068-.01c-.137-.027-.342-.104-.608-.252-.524-.292-1.186-.8-1.846-1.46s-1.168-1.32-1.46-1.846c-.147-.265-.225-.47-.251-.607l-.01-.068zm2.87-1.935a2.4 2.4 0 0 1-.241-.561c.135.033.324.11.562.241.524.292 1.186.8 1.846 1.46.45.45.83.901 1.118 1.31a3.5 3.5 0 0 0-1.066.091 11 11 0 0 1-.76-.694c-.66-.66-1.167-1.322-1.458-1.847z"/></svg>
              <span>填充</span>
              {isBucket && <svg className="absolute right-0 bottom-0 opacity-50" width="8" height="8" viewBox="0 0 8 8"><path d="M0 8h8V0L0 8z" fill="currentColor"/></svg>}
            </button>
            <button onClick={() => { setShowGuideLines(!showGuideLines); setShowHelpBook(false); if (!showGuideLines) { setActivePanel(null); } }} className={`flex flex-col items-center gap-0.5 w-full px-1 py-1.5 rounded text-[9px] font-medium transition-all ${showGuideLines ? (glassMode ? 'bg-indigo-500/15 text-indigo-600' : 'bg-blue-500/15 text-blue-400') : (glassMode ? 'text-slate-500 hover:bg-white/30 hover:text-slate-700' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200')}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="2" x2="12" y2="22" strokeDasharray="3 2"/><line x1="2" y1="12" x2="22" y2="12" strokeDasharray="3 2"/></svg>
              <span>辅助线</span>
            </button>
            <button onClick={() => { setIsPaintingMode(false); setIsBucket(false); setIsEyedropper(false); setIsEraser(false); setIsCalligraphy(false); setIsLineMode(false); setIsCircleMode(false); setCadMode(false); setShowHelpBook(false); setActivePanel(null); setShowWillowLeafPanel(!showWillowLeafPanel); }} className={`relative flex flex-col items-center gap-0.5 w-full px-1 py-1.5 rounded text-[9px] font-medium transition-all ${(isWillowLeafMode || showWillowLeafPanel) ? (glassMode ? 'bg-green-500/15 text-green-500' : 'bg-green-500/15 text-green-400') : (glassMode ? 'text-slate-500 hover:bg-white/30 hover:text-slate-700' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200')}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20c0 0 4-8 8-8s8 8 8 8"/><path d="M4 20c0 0 6-14 8-14s8 14 8 14"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>
              <span>柳叶笔</span>
              {isWillowLeafMode && <svg className="absolute right-0 bottom-0 opacity-50" width="8" height="8" viewBox="0 0 8 8"><path d="M0 8h8V0L0 8z" fill="currentColor"/></svg>}
            </button>
            <button onClick={() => { if (!isPixelMode) { setIsEraser(false); setIsPaintingMode(true); setIsBucket(false); setIsEyedropper(false); setIsCalligraphy(false); setIsLineMode(false); setIsCircleMode(false); setIsWillowLeafMode(false); setShowHelpBook(false); setActivePanel(null); setIsPixelMode(true); } else { setIsPixelMode(false); } }} className={`relative flex flex-col items-center gap-0.5 w-full px-1 py-1.5 rounded text-[9px] font-medium transition-all ${isPixelMode ? (glassMode ? 'bg-indigo-500/15 text-indigo-600' : 'bg-blue-500/15 text-blue-400') : (glassMode ? 'text-slate-500 hover:bg-white/30 hover:text-slate-700' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200')}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              <span>像素</span>
              {isPixelMode && <svg className="absolute right-0 bottom-0 opacity-50" width="8" height="8" viewBox="0 0 8 8"><path d="M0 8h8V0L0 8z" fill="currentColor"/></svg>}
            </button>
            <button onClick={() => { setCadMode(!cadMode); if (!cadMode) { setIsEraser(false); setIsPaintingMode(false); setIsBucket(false); setIsCalligraphy(false); setIsLineMode(false); setIsCircleMode(false); setIsWillowLeafMode(false); setActivePanel(null); setShowFilterPanel(false); setShowGuideLines(false); setShowHelpBook(false); } else { isTouchActiveRef.current = false; } }} className={`flex flex-col items-center gap-0.5 w-full px-1 py-1.5 rounded text-[9px] font-medium transition-all ${cadMode ? (glassMode ? 'bg-cyan-500/15 text-cyan-600' : 'bg-cyan-500/15 text-cyan-400') : (glassMode ? 'text-slate-500 hover:bg-white/30 hover:text-slate-700' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200')}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="7" x2="17" y2="7"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="17" x2="12" y2="17"/></svg>
              <span>CAD</span>
            </button>
            {useWidthSlider ? (
              <div className="w-full flex flex-col items-center py-1.5">
                <span className="text-[8px] text-gray-500 font-bold mb-0.5">粗细</span>
                <div className="relative" style={{ width: 24, height: 90 }}>
                  <div className="absolute left-1/2 top-1 bottom-1 w-1 -translate-x-1/2 rounded-full bg-white/10" />
                  <div className="absolute left-1/2 bottom-1 w-1 rounded-full bg-indigo-500 -translate-x-1/2" style={{ height: `${(lineWidth/500)*100}%`, maxHeight: 'calc(100% - 8px)' }} />
                  <div className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-indigo-400 border-2 border-white shadow-md" style={{ bottom: `calc(${(lineWidth/500)*100}% - 6px)`, maxHeight: 'calc(100% - 8px)' }} />
                  <input
                    type="range"
                    min="1"
                    max="500"
                    value={lineWidth}
                    onChange={(e) => setLineWidth(parseInt(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                  />
                </div>
                <span className="text-[7px] text-indigo-400 font-bold">{lineWidth}px</span>
              </div>
            ) : (
            <button ref={widthBtnRef} onClick={() => openMenu(setShowWidthMenu, () => { setShowSaveMenu(false); setShowCanvasSizeMenu(false); }, widthBtnRef, showWidthMenu)} className={`flex flex-col items-center gap-0.5 w-full px-1 py-1.5 rounded text-[9px] font-medium transition-all ${showWidthMenu ? (glassMode ? 'bg-indigo-500/15 text-indigo-600' : 'bg-blue-500/15 text-blue-400') : (glassMode ? 'text-slate-500 hover:bg-white/30 hover:text-slate-700' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200')}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 17h18v2H3z" fill="currentColor"/><path d="M3 12h18v3H3z" fill="currentColor" opacity="0.5"/><path d="M3 7h18v4H3z" fill="currentColor" opacity="0.3"/></svg>
              <span>粗细</span>
            </button>
            )}
            <div className="w-full flex flex-col items-center py-1.5">
              <span className="text-[8px] text-gray-500 font-bold mb-0.5">透明度</span>
              <div className="relative" style={{ width: 24, height: 90 }}>
                <div className="absolute left-1/2 top-1 bottom-1 w-1 -translate-x-1/2 rounded-full bg-white/10" />
                <div className="absolute left-1/2 bottom-1 w-1 rounded-full bg-indigo-500 -translate-x-1/2" style={{ height: `${brushOpacity * 100}%`, maxHeight: 'calc(100% - 8px)' }} />
                <div className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-indigo-400 border-2 border-white shadow-md" style={{ bottom: `calc(${brushOpacity * 100}% - 6px)` }} />
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={Math.round(brushOpacity * 100)}
                  onChange={(e) => setBrushOpacity(parseInt(e.target.value) / 100)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                />
              </div>
              <span className="text-[7px] text-indigo-400 font-bold">{Math.round(brushOpacity * 100)}%</span>
            </div>
            <div className={`my-1 border-t ${glassMode ? 'border-white/30' : 'border-white/5'}`}></div>
            <button ref={canvasSizeBtnRef} onClick={() => {
              setShowWidthMenu(false); setShowSaveMenu(false);
              if (showCanvasSizeMenu) { setShowCanvasSizeMenu(false); return; }
              if (canvasSizeBtnRef.current) {
                const rect = canvasSizeBtnRef.current.getBoundingClientRect();
                let left = rect.right + 6;
                let top = rect.top;
                if (left + 192 > window.innerWidth - 8) left = Math.max(8, rect.left - 192);
                if (top + 300 > window.innerHeight) top = Math.max(8, window.innerHeight - 310);
                setMenuPos({ top, left });
              }
              setShowCanvasSizeMenu(true);
            }} className={`flex flex-col items-center gap-0.5 w-full px-1 py-1.5 rounded text-[9px] font-medium transition-all ${showCanvasSizeMenu ? (glassMode ? 'bg-indigo-500/15 text-indigo-600' : 'bg-blue-500/15 text-blue-400') : (glassMode ? 'text-slate-500 hover:bg-white/30 hover:text-slate-700' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200')}`}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1zM1 7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1zM1 12a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1zm5 0a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z"/></svg>
              <span>画板</span>
            </button>
            {showCanvasSizeMenu && createPortal(
              <div className="fixed inset-0 z-[10000]" onClick={() => setShowCanvasSizeMenu(false)}>
                <div className="absolute drawing-popup animate-pop-in p-3 w-48 max-w-[90vw]"
                  style={{ top: menuPos.top, left: menuPos.left }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-[9px] text-gray-400 font-black tracking-wider uppercase mb-2">常用尺寸</div>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { w: 800, h: 600, label: '800×600' },
                      { w: 1024, h: 768, label: '1024×768' },
                      { w: 1280, h: 720, label: '1280×720' },
                      { w: 1920, h: 1080, label: '1920×1080' },
                      { w: 2560, h: 1440, label: '2560×1440' },
                      { w: 3840, h: 2160, label: '3840×2160' },
                    ].map(s => (
                      <button key={s.label} onClick={() => { applyCustomCanvasSize(s.w, s.h); setShowCanvasSizeMenu(false); }} className={`flex flex-col items-center py-1.5 drawing-popup-item ${(canvasWidth === s.w && canvasHeight === s.h) ? 'bg-blue-500/20 ring-1 ring-blue-500/30' : ''}`}>
                        <span className={`text-[9px] font-bold ${(canvasWidth === s.w && canvasHeight === s.h) ? 'text-blue-400' : 'text-gray-300'}`}>{s.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="drawing-popup-divider my-2" />
                  <div className="text-[9px] text-gray-400 font-black tracking-wider uppercase mb-2">自定义尺寸</div>
                  <div className="flex items-center gap-1.5">
                    <input inputMode="numeric" value={customCanvasW} onChange={e => setCustomCanvasW(Math.max(100, parseInt(e.target.value) || 100))} className="flex-1 min-w-0 h-7 text-center text-[10px] font-bold bg-white/5 border border-white/10 rounded-lg outline-none text-gray-300 focus:border-blue-500/50" placeholder="宽" />
                    <span className="text-[10px] text-gray-600 font-bold">×</span>
                    <input inputMode="numeric" value={customCanvasH} onChange={e => setCustomCanvasH(Math.max(100, parseInt(e.target.value) || 100))} className="flex-1 min-w-0 h-7 text-center text-[10px] font-bold bg-white/5 border border-white/10 rounded-lg outline-none text-gray-300 focus:border-blue-500/50" placeholder="高" />
                  </div>
                  <button onClick={() => { applyCustomCanvasSize(); setShowCanvasSizeMenu(false); }} className="w-full mt-2 py-1.5 text-[10px] font-bold bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all active:scale-[0.98]">应用自定义尺寸</button>
                  <div className="drawing-popup-divider my-2" />
                  <button onClick={() => { applyCustomCanvasSize(DEFAULT_CANVAS_W, DEFAULT_CANVAS_H); setShowCanvasSizeMenu(false); }} className={`w-full py-1.5 text-[10px] font-bold rounded-lg transition-all active:scale-[0.98] ${(canvasWidth === DEFAULT_CANVAS_W && canvasHeight === DEFAULT_CANVAS_H) ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200'}`}>回初始尺寸 {DEFAULT_CANVAS_W}×{DEFAULT_CANVAS_H}</button>
                  <div className="text-[9px] text-gray-600 text-center font-medium mt-1">当前画布: {canvasWidth}×{canvasHeight}</div>
                </div>
              </div>
            , document.body)}
            <div className={`my-1 border-t ${glassMode ? 'border-white/30' : 'border-white/5'}`}></div>
            <button onClick={() => { setShowDrawSettings(!showDrawSettings); }}
              className={`flex flex-col items-center gap-0.5 w-full px-1 py-1.5 rounded text-[9px] font-medium transition-all ${showDrawSettings ? (glassMode ? 'bg-indigo-500/15 text-indigo-600' : 'bg-blue-500/15 text-blue-400') : (glassMode ? 'text-slate-500 hover:bg-white/30 hover:text-slate-700' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200')}`}
              title="画板设置"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              <span>设置</span>
            </button>
          </nav>
          )}
          {cadMode && (
          <nav className="flex-1 px-1 pt-10 pb-2 space-y-0.5 overflow-y-auto">
            <div className={`px-1.5 py-1 mb-1 text-[8px] font-black text-center rounded ${glassMode ? 'bg-cyan-400/20 text-cyan-600' : 'bg-cyan-500/20 text-cyan-400'}`}>CAD</div>
            {[
              { id: 'line', label: '直线', key: 'L', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="20" x2="20" y2="4"/></svg> },
              { id: 'circle', label: '圆', key: 'C', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/></svg> },
              { id: 'rectangle', label: '矩形', key: 'R', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg> },
              { id: 'arc', label: '圆弧', key: 'A', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20 A8 8 0 0 1 20 20"/></svg> },
              { id: 'polygon', label: '多边形', key: 'P', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12,2 22,8 20,20 4,20 2,8"/></svg> },
              { id: 'spline', label: '样条线', key: 'S', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 20 Q8 4 12 12 Q16 20 20 6"/></svg> },
            ].map(t => (
              <button key={t.id} onClick={() => { setCadTool(t.id); cadShapeStart.current = null; circleCenterRef.current = null; lineStartRef.current = null; cadDimStart.current = null; clearShapePreview(); }} className={`flex flex-col items-center gap-0.5 w-full px-1 py-1.5 rounded text-[9px] font-medium transition-all ${cadTool === t.id ? (glassMode ? 'bg-cyan-500/20 text-cyan-600' : 'bg-cyan-500/15 text-cyan-400') : (glassMode ? 'text-slate-500 hover:bg-white/30 hover:text-slate-700' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200')}`}>
                {t.svg}
                <span className="flex items-center gap-1">{t.label}<kbd className="text-[7px] opacity-40">{t.key}</kbd></span>
              </button>
            ))}
            <div className={`my-1 border-t ${glassMode ? 'border-white/30' : 'border-white/5'}`}></div>
            {[
              { id: 'trim', label: '修剪', key: 'T', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg> },
              { id: 'dimension', label: '标注', key: 'D', svg: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="4" y1="18" x2="16" y2="6"/><polygon points="18 4 16 10 10 8"/></svg> },
            ].map(t => (
              <button key={t.id} onClick={() => { setCadTool(t.id); cadShapeStart.current = null; circleCenterRef.current = null; lineStartRef.current = null; cadDimStart.current = null; cadPolyPoints.current = []; clearShapePreview(); }} className={`flex flex-col items-center gap-0.5 w-full px-1 py-1.5 rounded text-[9px] font-medium transition-all ${cadTool === t.id ? (glassMode ? 'bg-cyan-500/20 text-cyan-600' : 'bg-cyan-500/15 text-cyan-400') : (glassMode ? 'text-slate-500 hover:bg-white/30 hover:text-slate-700' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200')}`}>
                {t.svg}
                <span className="flex items-center gap-1">{t.label}<kbd className="text-[7px] opacity-40">{t.key}</kbd></span>
              </button>
            ))}
            <div className={`my-1 border-t ${glassMode ? 'border-white/30' : 'border-white/5'}`}></div>
            <button onClick={() => setCadMode(false)} className={`flex flex-col items-center gap-0.5 w-full px-1 py-1.5 rounded text-[9px] font-medium transition-all ${glassMode ? 'bg-red-400/15 text-red-500 hover:bg-red-400/25' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>
              <span>返回画板</span>
            </button>
          </nav>
          )}
        </div>
      )}
      <div className={"flex-1 flex flex-col bg-[#f5f7fa]"}>
      <div className={`relative flex items-center gap-px px-1 py-0.5 shrink-0 z-30 border-b bg-white/95 backdrop-blur border-gray-200 shadow-sm overflow-x-auto transition-all duration-150 ${isDrawing ? 'opacity-50 grayscale pointer-events-none' : ''}`} style={{ WebkitOverflowScrolling: 'touch' }}>
        {onBackToWorkspace && (
          <button
            onClick={onBackToWorkspace}
            className="flex flex-col items-center justify-center gap-0 px-2 py-1 shrink-0 transition-all rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            title="返回工作区"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            <span className="text-[9px] font-medium">返回</span>
          </button>
        )}
        <button
          onClick={() => setShowHistoryPanel(!showHistoryPanel)}
          className={`flex flex-col items-center justify-center gap-0 px-2 py-1 shrink-0 transition-all rounded ${showHistoryPanel ? 'text-blue-600 border-b border-blue-500 pb-[4px]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
          title="历史作品"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
          <span className="text-[9px] font-medium">作品</span>
        </button>
        <button
          onClick={() => { initAudio(); playTick(); clearCanvas(); }}
          className={`flex flex-col items-center justify-center gap-0 px-2 py-1 shrink-0 transition-all rounded text-red-500 hover:text-red-600 hover:bg-red-50`}
          title="清空画板"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="text-[9px] font-medium">删除</span>
        </button>
        <div className="flex items-center justify-center shrink-0 border rounded overflow-hidden w-16 h-5 bg-white border-gray-200 shadow-sm">
          <input
            type="text"
            value={zoomInput}
            onChange={(e) => setZoomInput(e.target.value)}
            onBlur={applyZoomInput}
            onKeyDown={applyZoomInput}
            className="w-full h-full text-center text-[9px] font-bold bg-transparent outline-none text-gray-800"
          />
        </div>
        {cadMode && <span className="shrink-0 px-2 py-0.5 rounded-full text-[8px] font-black bg-cyan-500/15 text-cyan-600 border border-cyan-500/30">{cadTool === 'line' ? '直线' : cadTool === 'circle' ? '圆' : cadTool === 'rectangle' ? '矩形' : cadTool === 'arc' ? '圆弧' : cadTool === 'polygon' ? '多边形' : cadTool === 'spline' ? '样条线' : cadTool === 'trim' ? '修剪' : cadTool === 'dimension' ? '标注' : cadTool}</span>}
        <div className="w-px shrink-0 h-7 bg-gray-200 mx-1"></div>
        <button
          ref={saveBtnRef}
          onClick={() => openMenu(setShowSaveMenu, () => { setShowWidthMenu(false); setShowCanvasSizeMenu(false); }, saveBtnRef, showSaveMenu)}
          className={`flex flex-col items-center justify-center gap-0 px-2 py-1 shrink-0 transition-all rounded ${showSaveMenu ? 'text-blue-600 border-b border-blue-500 pb-[4px]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
          title="保存画板"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11 2H9v3h2z"/>
            <path d="M1.5 0h11.586a1.5 1.5 0 0 1 1.06.44l1.415 1.414A1.5 1.5 0 0 1 16 2.914V14.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 14.5v-13A1.5 1.5 0 0 1 1.5 0M1 1.5v13a.5.5 0 0 0 .5.5H2v-4.5A1.5 1.5 0 0 1 3.5 9h9a1.5 1.5 0 0 1 1.5 1.5V15h.5a.5.5 0 0 0 .5-.5V2.914a.5.5 0 0 0-.146-.353l-1.415-1.415A.5.5 0 0 0 13.086 1H13v4.5A1.5 1.5 0 0 1 11.5 7h-7A1.5 1.5 0 0 1 3 5.5V1H1.5a.5.5 0 0 0-.5.5m3 4a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5V1H4zM3 15h10v-4.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5z"/>
          </svg>
          <span className="text-[9px] font-medium">保存</span>
        </button>
        <div className="w-px shrink-0 h-7 bg-gray-200 mx-1"></div>
        <button
          onClick={undo}
          disabled={commandIndex < 0}
          className={`flex flex-col items-center justify-center gap-0 px-2 py-1 shrink-0 transition-all rounded ${commandIndex < 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          title="撤销"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
          <span className="text-[9px] font-medium">撤销</span>
        </button>
        <button
          onClick={redo}
          disabled={commandIndex >= commandsRef.current.length - 1}
          className={`flex flex-col items-center justify-center gap-0 px-2 py-1 shrink-0 transition-all rounded ${commandIndex >= commandsRef.current.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          title="恢复"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
          <span className="text-[9px] font-medium">恢复</span>
        </button>
        <div className="w-px shrink-0 h-7 bg-gray-200 mx-1"></div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImportImage}
          className="hidden"
        />
      </div>
      <div className={`relative flex items-center gap-px px-1 py-0.5 shrink-0 z-30 border-b bg-white/90 backdrop-blur border-gray-200/50 shadow-sm overflow-x-auto`} style={{ WebkitOverflowScrolling: 'touch' }}>
        <button
          ref={symmetryBtnRef}
          onClick={() => {
            if (showSymmetryMenu) { setShowSymmetryMenu(false); return; }
            if (symmetryBtnRef.current) {
              const rect = symmetryBtnRef.current.getBoundingClientRect();
              let left = rect.left;
              let top = rect.bottom + 6;
              if (left + 176 > window.innerWidth - 8) left = window.innerWidth - 184;
              if (left < 8) left = 8;
              if (top + 200 > window.innerHeight) top = Math.max(8, rect.top - 200);
              setAuxMenuPos({ top, left });
            }
            setShowSymmetryMenu(true);
          }}
          className={`flex flex-col items-center justify-center gap-0 px-2 py-1 shrink-0 transition-all rounded ${symmetryMode !== 'none' ? 'text-violet-600 border-b border-violet-500 pb-[4px]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
          title="对称绘画"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="16" cy="8" r="1" fill="currentColor"/><circle cx="8" cy="16" r="1" fill="currentColor"/><circle cx="16" cy="16" r="1" fill="currentColor"/></svg>
          <span className="text-[9px] font-medium">对称</span>
        </button>
        {showSymmetryMenu && createPortal(
          <div className="fixed inset-0 z-[10000]" onClick={() => setShowSymmetryMenu(false)}>
            <div className="absolute drawing-popup animate-pop-in p-2 w-44 max-w-[90vw]"
              style={{ top: auxMenuPos.top, left: auxMenuPos.left }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-[9px] text-gray-400 font-black tracking-wider uppercase mb-1.5">对称模式</div>
              <div className="grid grid-cols-2 gap-1">
                {[['none','关闭'],['horizontal','左右'],['vertical','上下'],['both','四向'],['radial4','4轴'],['radial6','6轴'],['radial8','8轴']].map(([key, label]) => (
                  <button key={key} onClick={() => { setSymmetryMode(key); setShowSymmetryMenu(false); }} className={`px-2 py-1.5 rounded text-[10px] font-bold transition-colors ${symmetryMode === key ? 'bg-violet-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button>
                ))}
              </div>
            </div>
          </div>
        , document.body)}
        <button
          ref={layerBtnRef}
          onClick={() => setShowLayerPanel(!showLayerPanel)}
          className={`flex flex-col items-center justify-center gap-0 px-2 py-1 shrink-0 transition-all rounded ${showLayerPanel ? 'text-blue-600 border-b border-blue-500 pb-[4px]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
          title="图层"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          <span className="text-[9px] font-medium">图层</span>
        </button>
        {showTimeLapseMenu && createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowTimeLapseMenu(false)}>
            <div className="drawing-popup animate-pop-in p-4 w-72 max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
              <div className="text-[11px] font-black text-gray-300 tracking-wider uppercase mb-3">延时摄影 — {recordedFramesCount} 帧</div>
              <div className="space-y-2">
                <button onClick={() => {
                  setShowTimeLapseMenu(false);
                  const frames = recordedFramesRef.current;
                  const w = window.open('', '_blank', 'width=600,height=500');
                  w.document.write(`<html><head><title>延时摄影</title><style>body{margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column}img{max-width:100%;max-height:80vh}p{color:#aaa;font:12px sans-serif;margin-top:8px}</style></head><body><img id="player"><p>共 ${frames.length} 帧 | 每100ms一帧</p></body></html>`);
                  const playerImg = w.document.getElementById('player');
                  const playLoop = () => {
                    let idx = 0;
                    const step = () => {
                      if (idx >= frames.length) idx = 0;
                      playerImg.src = frames[idx];
                      idx++;
                      if (!w.closed) setTimeout(step, 100);
                    };
                    step();
                  };
                  playLoop();
                }} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg drawing-popup-item text-gray-200">
                  <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  </div>
                  <div className="text-left">
                    <div className="text-[11px] font-bold">播放预览</div>
                    <div className="text-[9px] text-gray-500">在新窗口中播放延时动画</div>
                  </div>
                </button>
                <button onClick={async () => {
                  setShowTimeLapseMenu(false);
                  const frames = recordedFramesRef.current;
                  try {
                    let dirHandle = recordSaveDirHandleRef.current;
                    if (!dirHandle) {
                      dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
                      recordSaveDirHandleRef.current = dirHandle;
                      setRecordSavePath(dirHandle.name);
                    }
                    const frameDir = await dirHandle.getDirectoryHandle('timelapse_frames', { create: true });
                    for (let i = 0; i < frames.length; i++) {
                      const response = await fetch(frames[i]);
                      const blob = await response.blob();
                      const fileHandle = await frameDir.getFileHandle(`frame_${String(i).padStart(4, '0')}.png`, { create: true });
                      const writable = await fileHandle.createWritable();
                      await writable.write(blob);
                      await writable.close();
                    }
                    alert(`已保存 ${frames.length} 帧到选择的文件夹/timelapse_frames/`);
                  } catch (err) {
                    if (err.name !== 'AbortError') {
                      for (let i = 0; i < frames.length; i++) {
                        const link = document.createElement('a');
                        link.href = frames[i];
                        link.download = `frame_${String(i).padStart(4, '0')}.png`;
                        link.click();
                      }
                    }
                  }
                }} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg drawing-popup-item text-gray-200">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </div>
                  <div className="text-left">
                    <div className="text-[11px] font-bold">保存帧序列</div>
                    <div className="text-[9px] text-gray-500">选择文件夹保存所有帧为PNG</div>
                  </div>
                </button>
                <button onClick={() => {
                  setShowTimeLapseMenu(false);
                  const frames = recordedFramesRef.current;
                  const c = document.createElement('canvas');
                  const img = new Image();
                  img.onload = () => {
                    c.width = img.width; c.height = img.height;
                    const cx = c.getContext('2d');
                    let fi = 0;
                    const encodeFrame = () => {
                      if (fi >= frames.length) {
                        try {
                          c.toBlob((blob) => {
                            if (blob) {
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `timelapse_frame_${fi}.png`;
                              link.click();
                              URL.revokeObjectURL(url);
                            }
                          }, 'image/png');
                        } catch {}
                        return;
                      }
                      const fimg = new Image();
                      fimg.onload = () => {
                        cx.clearRect(0, 0, c.width, c.height);
                        cx.drawImage(fimg, 0, 0);
                        fi++;
                        encodeFrame();
                      };
                      fimg.src = frames[fi];
                    };
                    c.toBlob((blob) => {
                      if (blob) {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'timelapse_last_frame.png';
                        a.click();
                        URL.revokeObjectURL(url);
                      }
                    }, 'image/png');
                  };
                  img.src = frames[frames.length - 1];
                }} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg drawing-popup-item text-gray-200">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  </div>
                  <div className="text-left">
                    <div className="text-[11px] font-bold">保存最后一帧</div>
                    <div className="text-[9px] text-gray-500">导出最终画面为PNG</div>
                  </div>
                </button>
                <button onClick={() => {
                  setShowTimeLapseMenu(false);
                  recordedFramesRef.current = [];
                  setRecordedFramesCount(0);
                }} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg drawing-popup-item text-red-400">
                  <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </div>
                  <div className="text-left">
                    <div className="text-[11px] font-bold">丢弃录制</div>
                    <div className="text-[9px] text-red-400/60">清除所有录制帧</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        , document.body)}
        {showDrawSettings && createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowDrawSettings(false)}>
            <div className="drawing-popup animate-pop-in p-4 w-72 max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
              <div className="text-[11px] font-black text-gray-300 tracking-wider uppercase mb-4">画板设置</div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-gray-400">压感笔锋</div>
                      <div className="text-[9px] text-gray-500 mt-0.5">模拟真实毛笔的笔锋变化 <span className="text-amber-400/70">[开发中]</span></div>
                    </div>
                    <button
                      onClick={() => { const v = !pressureMode; setPressureMode(v); localStorage.setItem('drawing_pressure_mode', JSON.stringify(v)); }}
                      className={`relative w-8 h-4 rounded-full transition-colors ${pressureMode ? 'bg-teal-500' : 'bg-gray-600'}`}
                    >
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${pressureMode ? 'left-4' : 'left-0.5'}`} />
                    </button>
                  </div>
                </div>
                <div className="drawing-popup-divider" />
                <div>
                  <div className="text-[10px] font-bold text-gray-400 mb-2">粗细调节方式</div>
                  <div className="flex gap-2">
                    <button onClick={() => setUseWidthSlider(false)} className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${!useWidthSlider ? 'bg-teal-500/20 text-teal-400 ring-1 ring-teal-500/40' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                      <div className="flex flex-col items-center gap-1">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 17h18v2H3z" fill="currentColor"/><path d="M3 12h18v3H3z" fill="currentColor" opacity="0.5"/><path d="M3 7h18v4H3z" fill="currentColor" opacity="0.3"/></svg>
                        <span>按钮选择</span>
                      </div>
                    </button>
                    <button onClick={() => setUseWidthSlider(true)} className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${useWidthSlider ? 'bg-teal-500/20 text-teal-400 ring-1 ring-teal-500/40' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                      <div className="flex flex-col items-center gap-1">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="12" y1="21" x2="12" y2="8"/><line x1="20" y1="21" x2="20" y2="3"/></svg>
                        <span>滑动条</span>
                      </div>
                    </button>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-400 mb-2">录制保存位置</div>
                  <label className="flex-1 py-2 rounded-lg text-[10px] font-bold bg-white/5 text-gray-300 hover:bg-white/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    选择文件夹
                    <input type="file" webkitdirectory="" directory="" className="hidden" onChange={(e) => {
                      if (e.target.files?.length > 0) {
                        const path = e.target.files[0].webkitRelativePath?.split('/')[0] || '已选文件夹';
                        setRecordSavePath(path);
                        e.target.value = '';
                      }
                    }} />
                  </label>
                  {recordSavePath && (
                    <div className="mt-1.5 flex items-center gap-1">
                      <span className="text-[9px] text-teal-400/80 font-medium truncate">保存到: {recordSavePath}/</span>
                      <button onClick={() => { recordSaveDirHandleRef.current = null; setRecordSavePath(''); }} className="shrink-0 text-[8px] text-red-400/60 hover:text-red-400 transition-colors">✕</button>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-gray-400">双指双击撤销</div>
                      <div className="text-[9px] text-gray-500 mt-0.5">快速双指双击画布触发撤销</div>
                    </div>
                    <button
                      onClick={() => { const v = !twoFingerUndo; setTwoFingerUndo(v); localStorage.setItem('drawing_two_finger_undo', JSON.stringify(v)); }}
                      className={`relative w-8 h-4 rounded-full transition-colors ${twoFingerUndo ? 'bg-teal-500' : 'bg-gray-600'}`}
                    >
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${twoFingerUndo ? 'left-4' : 'left-0.5'}`} />
                    </button>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-gray-400">深色模式</div>
                      <div className="text-[9px] text-gray-500 mt-0.5">画板界面切换为深色主题</div>
                    </div>
                    <button
                      onClick={() => { const v = !drawDarkMode; setDrawDarkMode(v); localStorage.setItem('drawing_dark_mode', JSON.stringify(v)); }}
                      className={`relative w-8 h-4 rounded-full transition-colors ${drawDarkMode ? 'bg-teal-500' : 'bg-gray-600'}`}
                    >
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${drawDarkMode ? 'left-4' : 'left-0.5'}`} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="drawing-popup-divider mt-4" />
              <button onClick={() => setShowDrawSettings(false)} className="w-full mt-3 py-2 rounded-lg text-[10px] font-bold bg-white/5 text-gray-400 hover:bg-white/10 transition-all">关闭</button>
            </div>
          </div>
        , document.body)}
        {showLineArtMenu && createPortal(
          <div className="fixed inset-0 z-[10000]" onClick={() => setShowLineArtMenu(false)}>
            <div className="absolute drawing-popup animate-pop-in p-3 w-52 max-w-[90vw]"
              style={{ top: auxMenuPos.top, left: auxMenuPos.left }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-[9px] text-gray-400 font-black tracking-wider uppercase mb-2">线稿提取</div>
              <p className="text-[10px] text-gray-500 mb-2">将画面转化为清晰的线稿</p>
              <div className="space-y-1.5">
                <button onClick={() => { setShowLineArtMenu(false); extractLineArt(80, false); }} className="w-full px-3 py-2 rounded-lg text-[10px] font-bold bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-all">精细线稿（高灵敏度）</button>
                <button onClick={() => { setShowLineArtMenu(false); extractLineArt(128, false); }} className="w-full px-3 py-2 rounded-lg text-[10px] font-bold bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-all">标准线稿</button>
                <button onClick={() => { setShowLineArtMenu(false); extractLineArt(180, false); }} className="w-full px-3 py-2 rounded-lg text-[10px] font-bold bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-all">粗略线稿（低灵敏度）</button>
                <button onClick={() => { setShowLineArtMenu(false); extractLineArt(128, true); }} className="w-full px-3 py-2 rounded-lg text-[10px] font-bold bg-gray-600/30 text-gray-300 hover:bg-gray-600/40 transition-all">反色线稿</button>
              </div>
              {lineArtOverlay && (
                <div className="mt-3 pt-2 border-t border-gray-700/50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-gray-400 font-bold">线稿显示</span>
                    <button
                      onClick={() => setShowLineArtOverlay(!showLineArtOverlay)}
                      className={`relative w-8 h-4 rounded-full transition-colors ${showLineArtOverlay ? 'bg-cyan-500' : 'bg-gray-600'}`}
                    >
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${showLineArtOverlay ? 'left-4' : 'left-0.5'}`} />
                    </button>
                  </div>
                  <button onClick={() => { setShowLineArtMenu(false); exportLineArt(); }} className="w-full px-3 py-2 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-all">导出线稿</button>
                  <button onClick={() => { setShowLineArtMenu(false); setLineArtOverlay(null); setShowLineArtOverlay(false); }} className="w-full px-3 py-2 rounded-lg text-[10px] font-bold bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-all">清除线稿</button>
                </div>
              )}
            </div>
          </div>
        , document.body)}
        <button
          ref={liveBrushBtnRef}
          onClick={() => {
            if (showLiveBrushMenu) { setShowLiveBrushMenu(false); return; }
            if (liveBrushBtnRef.current) {
              const rect = liveBrushBtnRef.current.getBoundingClientRect();
              let left = rect.left;
              let top = rect.bottom + 6;
              if (left + 176 > window.innerWidth - 8) left = window.innerWidth - 184;
              if (left < 8) left = 8;
              if (top + 200 > window.innerHeight) top = Math.max(8, rect.top - 200);
              setAuxMenuPos({ top, left });
            }
            setShowLiveBrushMenu(true);
          }}
          className={`flex flex-col items-center justify-center gap-0 px-2 py-1 shrink-0 transition-all rounded ${canvasTexture !== 'none' ? 'text-pink-500 border-b border-pink-400 pb-[4px]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
          title="画布材质"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/></svg>
          <span className="text-[9px] font-medium">材质</span>
        </button>
        <input
          ref={refInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) addRefImage(e.target.files[0]); e.target.value = ''; }}
        />
        <button
          ref={moreBtnRef}
          onClick={() => {
            if (showMoreMenu) { setShowMoreMenu(false); return; }
            if (moreBtnRef.current) {
              const rect = moreBtnRef.current.getBoundingClientRect();
              const menuWidth = 192;
              let left = rect.right - menuWidth;
              let top = rect.bottom + 6;
              if (left < 8) left = 8;
              if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - 8 - menuWidth;
              if (top + 320 > window.innerHeight) top = Math.max(8, rect.top - 320);
              setAuxMenuPos({ top, left });
            }
            setShowMoreMenu(true);
          }}
          className={`flex flex-col items-center justify-center gap-0 px-2 py-1 shrink-0 transition-all rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100`}
          title="更多功能"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          <span className="text-[9px] font-medium">更多</span>
        </button>
        {showMoreMenu && createPortal(
          <div className="fixed inset-0 z-[10000]" onClick={() => setShowMoreMenu(false)}>
            <div className="absolute animate-pop-in p-3 w-52 max-w-[90vw] bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
              style={{ top: auxMenuPos.top, left: auxMenuPos.left }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-[10px] text-white/80 font-black tracking-widest uppercase mb-3 pb-2 border-b border-white/10">更多功能</div>
              <div className="space-y-1">
                <button onClick={() => { setShowMoreMenu(false); setIsVectorCadMode(!isVectorCadMode); }} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[11px] font-semibold transition-all ${isVectorCadMode ? 'bg-purple-500/20 text-purple-300 shadow-lg shadow-purple-500/10' : 'text-white/90 hover:bg-white/10 hover:text-white'}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                  矢量CAD {isVectorCadMode ? '· 已开启' : ''}
                </button>
                <button onClick={() => { setShowMoreMenu(false); if (showAnimationPanel) { setShowAnimationPanel(false); stopAnimation(); return; } setShowAnimationPanel(true); }} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[11px] font-semibold transition-all ${showAnimationPanel ? 'bg-orange-500/20 text-orange-300 shadow-lg shadow-orange-500/10' : 'text-white/90 hover:bg-white/10 hover:text-white'}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 2v20"/><path d="M17 2v20"/><path d="M2 12h20"/><path d="M2 7h5"/><path d="M2 17h5"/><path d="M17 7h5"/><path d="M17 17h5"/></svg>
                  动画时间轴 {animFrames.length > 0 ? `· ${animFrames.length}帧` : ''}
                </button>
                <button onClick={() => { setShowMoreMenu(false); if (isRecording) { setIsRecording(false); if (recordedFramesRef.current.length > 1) setShowTimeLapseMenu(true); } else { recordedFramesRef.current = []; setRecordedFramesCount(0); setIsRecording(true); } }} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[11px] font-semibold transition-all ${isRecording ? 'bg-red-500/20 text-red-300 shadow-lg shadow-red-500/10 animate-pulse' : 'text-white/90 hover:bg-white/10 hover:text-white'}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {isRecording ? (<><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></>) : (<circle cx="12" cy="12" r="10" fill="currentColor"></circle>)}
                  </svg>
                  {isRecording ? '停止录制' : '延时录制'}
                </button>
                <button onClick={() => { setShowMoreMenu(false); setShowFilterPanel(!showFilterPanel); }} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[11px] font-semibold transition-all ${showFilterPanel ? 'bg-indigo-500/20 text-indigo-300 shadow-lg shadow-indigo-500/10' : 'text-white/90 hover:bg-white/10 hover:text-white'}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                  滤镜
                </button>
                <button onClick={() => { setShowMoreMenu(false); if (showPerspectiveEditor) { setShowPerspectiveEditor(false); setIsAddingPerspectivePoint(false); return; } if (perspectiveBtnRef.current) { const rect = perspectiveBtnRef.current.getBoundingClientRect(); let left = rect.left; let top = rect.bottom + 6; if (left + 192 > window.innerWidth - 8) left = window.innerWidth - 200; if (left < 8) left = 8; if (top + 200 > window.innerHeight) top = Math.max(8, rect.top - 200); setAuxMenuPos({ top, left }); } setShowPerspectiveEditor(true); }} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[11px] font-semibold transition-all ${(perspectivePoints.length > 0 || isAddingPerspectivePoint) ? 'bg-red-500/20 text-red-300 shadow-lg shadow-red-500/10' : 'text-white/90 hover:bg-white/10 hover:text-white'}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20L12 4l8 16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                  透视尺
                </button>
                <button onClick={() => { setShowMoreMenu(false); if (lineArtBtnRef.current) { const rect = lineArtBtnRef.current.getBoundingClientRect(); let left = rect.left; let top = rect.bottom + 6; if (left + 176 > window.innerWidth - 8) left = window.innerWidth - 184; if (left < 8) left = 8; if (top + 200 > window.innerHeight) top = Math.max(8, rect.top - 200); setAuxMenuPos({ top, left }); } setShowLineArtMenu(true); }} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[11px] font-semibold transition-all ${isExtractingLineArt || showLineArtOverlay ? 'bg-cyan-500/20 text-cyan-300 shadow-lg shadow-cyan-500/10' : 'text-white/90 hover:bg-white/10 hover:text-white'}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                  线稿提取
                </button>
                <button onClick={() => { setShowMoreMenu(false); refInputRef.current?.click(); }} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[11px] font-semibold transition-all ${refImages.length > 0 ? 'bg-emerald-500/20 text-emerald-300 shadow-lg shadow-emerald-500/10' : 'text-white/90 hover:bg-white/10 hover:text-white'}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  参考图
                </button>
              </div>
            </div>
          </div>
        , document.body)}
        {showLiveBrushMenu && createPortal(
          <div className="fixed inset-0 z-[10000]" onClick={() => setShowLiveBrushMenu(false)}>
            <div className="absolute drawing-popup animate-pop-in p-3 w-56 max-w-[90vw]"
              style={{ top: auxMenuPos.top, left: auxMenuPos.left }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-[9px] text-gray-400 font-black tracking-wider uppercase mb-2">画布材质</div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  ['none', '默认', '#f5f7fa'],
                  ['sketch', '素描纸', '#fcf8f0'],
                  ['watercolor', '水彩纸', '#faf5eb'],
                  ['oilcanvas', '油画布', '#eee4d2'],
                  ['ricepaper', '宣纸', '#fdf9f0'],
                  ['parchment', '羊皮纸', '#f5ebdc'],
                  ['kraft', '牛皮纸', '#c4a882'],
                  ['black', '黑卡纸', '#1a1a1a'],
                  ['gray', '灰纸板', '#808080'],
                  ['blue', '蓝图纸', '#d0e0f0'],
                ].map(([key, label, bgColor]) => (
                  <button key={key} onClick={() => { setCanvasTexture(key); setShowLiveBrushMenu(false); applyCanvasTexture(key); }} className={`flex items-center gap-1.5 px-2 py-2 rounded text-[10px] font-bold transition-colors ${canvasTexture === key ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    <div className="w-5 h-5 rounded border border-gray-300 shrink-0" style={{ backgroundColor: bgColor }} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        , document.body)}
      </div>

      {showAnimationPanel && createPortal(
        <div className="fixed bottom-0 left-0 right-0 z-[200] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="drawing-popup animate-pop-in mx-auto mb-2 p-3 w-[420px] max-w-[90vw]" style={{ maxHeight: '50vh' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-black text-gray-300 tracking-wider uppercase">动画时间轴 — {animFrames.length} 帧</div>
              <div className="flex items-center gap-1">
                <button onClick={() => { const next = !animOnionSkin; setAnimOnionSkin(next); if (!onionSkin) setOnionSkin(true); }} className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-colors ${animOnionSkin ? 'bg-orange-500/30 text-orange-300' : 'bg-gray-700 text-gray-500 hover:text-gray-400'}`} title="洋葱皮：半透明显示前后帧">🧅 洋葱皮</button>
                <span className="text-[8px] text-gray-500">FPS</span>
                <input type="number" min="1" max="30" value={animFps} onChange={(e) => setAnimFps(Math.max(1, Math.min(30, parseInt(e.target.value) || 8)))} className="w-7 h-4 text-center text-[8px] font-bold bg-white/5 border border-white/10 rounded outline-none text-gray-300" />
                <button onClick={addAnimFrame} className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-orange-500/20 text-orange-300 hover:bg-orange-500/30">+帧</button>
                {isPlayingAnim ? (
                  <button onClick={stopAnimation} className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-500/20 text-red-300 hover:bg-red-500/30">⏹</button>
                ) : (
                  <button onClick={playAnimation} disabled={animFrames.length < 2} className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${animFrames.length < 2 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-green-500/20 text-green-300 hover:bg-green-500/30'}`}>▶</button>
                )}
                <button onClick={exportAnimation} disabled={animFrames.length === 0} className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${animFrames.length === 0 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'}`}>💾</button>
                <button onClick={() => { stopAnimation(); setAnimFrames([]); setCurrentAnimFrame(0); frameBaseCanvasRef.current = null; onionSkinImgCacheRef.current = {}; recompositeCanvas(); }} className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20">🗑</button>
              </div>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide" style={{ minHeight: 72 }}>
              {animFrames.length === 0 ? (
                <div className="flex items-center justify-center w-full text-[10px] text-gray-600 py-4">点击"+帧"捕获当前画布为动画帧<br/>画好一帧 → 添加帧 → 继续画下一帧</div>
              ) : animFrames.map((frame, idx) => (
                <div key={idx} className={`relative shrink-0 cursor-pointer rounded-lg overflow-hidden border-2 transition-all group ${idx === currentAnimFrame ? 'border-orange-400 shadow-lg shadow-orange-500/20' : 'border-gray-700 hover:border-gray-500'}`} onClick={() => { loadAnimFrameToCanvas(idx); stopAnimation(); }}>
                  <img src={frame} alt="" className="w-20 h-14 object-cover" />
                  {animOnionSkin && idx > 0 && (
                    <img src={animFrames[idx - 1]} alt="" className="absolute inset-0 w-20 h-14 object-cover opacity-20 mix-blend-multiply pointer-events-none" />
                  )}
                  <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-1">
                    <span className="text-[7px] font-bold text-white/70 bg-black/50 rounded px-0.5">{idx + 1}</span>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); duplicateAnimFrame(idx); }} className="w-3 h-3 flex items-center justify-center rounded-full bg-green-500/80 text-white hover:bg-green-400 text-[6px]" title="复制帧">⧉</button>
                      <button onClick={(e) => { e.stopPropagation(); removeAnimFrame(idx); }} className="w-3 h-3 flex items-center justify-center rounded-full bg-red-500/80 text-white hover:bg-red-400 text-[6px]" title="删除帧">×</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {animFrames.length > 0 && (
              <div className="mt-1 flex items-center gap-2">
                <button onClick={() => { if (currentAnimFrame > 0) { loadAnimFrameToCanvas(currentAnimFrame - 1); stopAnimation(); } }} disabled={currentAnimFrame <= 0} className={`text-[9px] ${currentAnimFrame <= 0 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-gray-200'}`}>◀</button>
                <input type="range" min="0" max={Math.max(0, animFrames.length - 1)} value={currentAnimFrame} onChange={(e) => { loadAnimFrameToCanvas(parseInt(e.target.value)); stopAnimation(); }} className="flex-1 h-1 rounded-full appearance-none cursor-pointer" style={{ background: `linear-gradient(to right, #f97316 0%, #f97316 ${(currentAnimFrame / Math.max(1, animFrames.length - 1)) * 100}%, rgba(255,255,255,0.1) ${(currentAnimFrame / Math.max(1, animFrames.length - 1)) * 100}%, rgba(255,255,255,0.1) 100%)` }} />
                <button onClick={() => { if (currentAnimFrame < animFrames.length - 1) { loadAnimFrameToCanvas(currentAnimFrame + 1); stopAnimation(); } }} disabled={currentAnimFrame >= animFrames.length - 1} className={`text-[9px] ${currentAnimFrame >= animFrames.length - 1 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-gray-200'}`}>▶</button>
                <span className="text-[9px] text-gray-500 font-mono w-10 text-right">{currentAnimFrame + 1}/{animFrames.length}</span>
              </div>
            )}
          </div>
        </div>
      , document.body)}

      {showHistoryPanel && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-gradient-to-b from-gray-50 to-white animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm shrink-0">
            <button onClick={() => { setShowHistoryPanel(false); setPreviewImage(null); }} className="flex items-center gap-1.5 px-3 py-2 -ml-1 rounded-xl text-gray-600 hover:bg-gray-100 active:scale-95 transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              <span className="text-sm font-bold">返回</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-900 leading-tight">我的作品</h3>
                <p className="text-[10px] text-gray-400">{savedCanvases.length + autoSaveHistory.length} 件作品</p>
              </div>
            </div>
            <div className="w-16" />
          </div>

          <div className="flex border-b border-gray-200 bg-white shrink-0">
            <button onClick={() => { setGalleryTab('manual'); setPreviewImage(null); }} className={`flex-1 py-2.5 text-xs font-bold transition-colors relative ${galleryTab === 'manual' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
              手动保存 ({savedCanvases.length})
              {galleryTab === 'manual' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-blue-600" />}
            </button>
            <button onClick={() => { setGalleryTab('auto'); setPreviewImage(null); }} className={`flex-1 py-2.5 text-xs font-bold transition-colors relative ${galleryTab === 'auto' ? 'text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}>
              自动保存 ({autoSaveHistory.length})
              {galleryTab === 'auto' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-purple-600" />}
            </button>
          </div>

          {previewImage ? (
            <div className="flex-1 overflow-auto p-5 flex flex-col items-center">
              <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-xl bg-gray-50 mb-5 ring-1 ring-gray-100">
                <img src={previewImage.data} alt="" className="w-full h-auto" />
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                {previewImage.time}
                {previewImage.name && <span className="text-gray-500 font-semibold ml-1">{previewImage.name}</span>}
              </div>
              <div className="flex gap-3">
                <button onClick={() => { loadSavedCanvas(previewImage.data); setShowHistoryPanel(false); setPreviewImage(null); }} className="px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition-all active:scale-95 shadow-lg shadow-blue-500/30">
                  加载此画
                </button>
                <button onClick={() => setPreviewImage(null)} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                  返回列表
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4">
              {(galleryTab === 'manual' ? savedCanvases : autoSaveHistory).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  </div>
                  <p className="text-base font-bold text-gray-300">{galleryTab === 'manual' ? '暂无手动保存' : '暂无自动保存'}</p>
                  <p className="text-xs text-gray-300 mt-1">{galleryTab === 'manual' ? '点击保存按钮保存当前画作' : '开启自动保存后将在这里记录'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {(galleryTab === 'manual' ? savedCanvases : autoSaveHistory).map((sc, i) => (
                    <div key={i} className="group relative rounded-2xl overflow-hidden bg-gray-50 ring-1 ring-gray-100 cursor-pointer hover:ring-blue-300 hover:shadow-xl transition-all" onClick={() => setPreviewImage(sc)}>
                      <div className="aspect-[4/3] overflow-hidden">
                        <img src={sc.thumb} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-0 left-0 right-0 p-2.5">
                        <p className="text-[11px] text-white/90 font-semibold truncate drop-shadow">{sc.name || sc.time}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); galleryTab === 'manual' ? deleteSavedCanvas(i) : deleteAutoSaveEntry(i); }}
                        className="absolute top-2.5 right-2.5 w-8 h-8 rounded-lg bg-black/50 backdrop-blur flex items-center justify-center text-white/70 hover:text-red-400 hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showWillowLeafPanel && (
        <div className="absolute top-[340px] left-[64px] z-50 bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200 shadow-[4px_4px_30px_rgba(0,0,0,0.1)] p-3 animate-color-panel-in w-44">
          <p className="text-[11px] font-bold text-gray-500 mb-2 px-1">柳叶笔 · 选择模式</p>
          <div className="space-y-1.5">
            <button onClick={() => { setIsWillowLeafMode(true); setIsEraser(false); setShowWillowLeafPanel(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all bg-gray-50 hover:bg-green-50 active:scale-[0.97] text-gray-700 hover:text-green-600">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-sm shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
              </div>
              <span>上色</span>
            </button>
            <button onClick={() => { setIsWillowLeafMode(true); setIsEraser(true); setShowWillowLeafPanel(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all bg-gray-50 hover:bg-pink-50 active:scale-[0.97] text-gray-700 hover:text-pink-500">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-sm shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16c-.5-.5-1-1-1-2s.4-1.5 1-2l10-10c.6-.6 1.5-.6 2 0l4 4c.6.6.6 1.5 0 2L9 18"/><path d="M6 17l3 3"/><path d="M18 5l-2 2"/></svg>
              </div>
              <span>擦除</span>
            </button>
          </div>
          <button onClick={() => setShowWillowLeafPanel(false)} className="w-full mt-2 px-3 py-1.5 rounded-lg text-[10px] text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all active:scale-[0.97]">取消</button>
        </div>
      )}

      {activePanel === 'color' && (
        <div ref={panelRef} className="absolute top-0 left-[64px] bottom-[56px] z-50 w-80 max-w-[calc(100vw-64px-60px)] bg-white/95 backdrop-blur-md border-r border-gray-200 shadow-[4px_0_30px_rgba(0,0,0,0.1)] animate-color-panel-in overflow-y-auto overflow-x-hidden flex flex-col">
          <div className="shrink-0 px-4 pt-4 pb-3 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl border-2 border-gray-200 shadow-sm shrink-0 relative overflow-hidden"
                style={{ backgroundColor: (isBucket ? bucketColor : color), opacity: colorAlpha / 100 }}>
                <div className="absolute inset-0" style={{ background: 'repeating-conic-gradient(#e5e7eb 0% 25%, transparent 0% 50%)', backgroundSize: '6px 6px', zIndex: -1 }} />
              </div>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="text-[11px] text-gray-400 font-bold shrink-0">#</span>
                <input type="text"
                  value={hexInput !== '' ? hexInput : (isBucket ? bucketColor : color).replace('#', '')}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
                    setHexInput(raw);
                    if (raw.length === 6 || raw.length === 3) {
                      const hex = '#' + (raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw);
                      if (/^#[0-9a-fA-F]{6}$/.test(hex)) selectColor(hex.toLowerCase());
                    }
                  }}
                  onBlur={() => setHexInput('')}
                  className="flex-1 min-w-0 px-2.5 py-1.5 text-xs font-mono bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 text-gray-700 transition-all"
                  maxLength={6}
                  spellCheck={false}
                />
              </div>
              <button onClick={() => setShowAiColorPopup(true)}
                className="p-2 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 text-purple-500 transition-all shrink-0 active:scale-90"
                title="AI调色"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4c0 1.95-2 4-4 6-2-2-4-4.05-4-6a4 4 0 0 1 4-4z"/><path d="M6.5 9.5L2 14l4.5 4.5"/><path d="M17.5 9.5L22 14l-4.5 4.5"/><circle cx="12" cy="18" r="3"/></svg>
              </button>
              <button onClick={addSavedColor}
                className="p-2 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-all shrink-0 active:scale-90"
                title="保存"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </div>

            <canvas ref={colorSquareRef} width={280} height={180}
              className="w-full rounded-xl cursor-crosshair border border-gray-200 shadow-sm"
              onMouseDown={(e) => { setIsPicking(true); pickColorFromCanvas(colorSquareRef, e); }}
              onMouseMove={(e) => { if (e.buttons === 1 && isPicking) pickColorFromCanvas(colorSquareRef, e, true); }}
              onMouseUp={() => { setIsPicking(false); magColorRef.current = null; if (magRafRef.current) { cancelAnimationFrame(magRafRef.current); magRafRef.current = null; } forceUpdate(n => n + 1); }}
              onMouseLeave={() => { if (isPicking) { setIsPicking(false); magColorRef.current = null; if (magRafRef.current) { cancelAnimationFrame(magRafRef.current); magRafRef.current = null; } forceUpdate(n => n + 1); } }}
              onTouchStart={(e) => { e.preventDefault(); setIsPicking(true); pickColorFromCanvas(colorSquareRef, e.touches[0]); }}
              onTouchMove={(e) => { e.preventDefault(); if (isPicking) pickColorFromCanvas(colorSquareRef, e.touches[0], true); }}
              onTouchEnd={() => { setIsPicking(false); magColorRef.current = null; if (magRafRef.current) { cancelAnimationFrame(magRafRef.current); magRafRef.current = null; } forceUpdate(n => n + 1); }}
            />

            <canvas ref={colorHueSliderRef} width={280} height={20}
              className="w-full rounded-full cursor-pointer border border-gray-200"
              onMouseDown={(e) => { setHueMagActive(true); handleHueInteraction(e.clientX, e.clientY, true); }}
              onMouseMove={(e) => { if (e.buttons !== 1) return; handleHueInteraction(e.clientX, e.clientY); }}
              onMouseUp={() => { setHueMagActive(false); if (hueRafRef.current) { cancelAnimationFrame(hueRafRef.current); hueRafRef.current = null; } }}
              onMouseLeave={() => { if (hueMagActive) { setHueMagActive(false); if (hueRafRef.current) { cancelAnimationFrame(hueRafRef.current); hueRafRef.current = null; } } }}
              onTouchStart={(e) => { e.preventDefault(); const t = e.touches[0]; setHueMagActive(true); handleHueInteraction(t.clientX, t.clientY, true); }}
              onTouchMove={(e) => { e.preventDefault(); const t = e.touches[0]; handleHueInteraction(t.clientX, t.clientY); }}
              onTouchEnd={() => { setHueMagActive(false); if (hueRafRef.current) { cancelAnimationFrame(hueRafRef.current); hueRafRef.current = null; } }}
            />

            <div className="space-y-3">
              {(() => {
                const cur = isBucket ? bucketColor : color;
                const rgb = hexToRgb(cur);
                return (
                  <>
                    {[
                      { label: 'R', color: '#ef4444', value: rgb.r, grad: `linear-gradient(to right, rgb(0,${rgb.g},${rgb.b}), rgb(255,${rgb.g},${rgb.b}))` },
                      { label: 'G', color: '#22c55e', value: rgb.g, grad: `linear-gradient(to right, rgb(${rgb.r},0,${rgb.b}), rgb(${rgb.r},255,${rgb.b}))` },
                      { label: 'B', color: '#3b82f6', value: rgb.b, grad: `linear-gradient(to right, rgb(${rgb.r},${rgb.g},0), rgb(${rgb.r},${rgb.g},255))` },
                    ].map(ch => (
                      <div key={ch.label} className="flex items-center gap-3">
                        <span className="text-[15px] font-bold w-6 text-center shrink-0" style={{ color: ch.color }}>{ch.label}</span>
                        <input type="range" min="0" max="255" value={ch.value}
                          onChange={(e) => { const v = parseInt(e.target.value); const r = ch.label === 'R' ? v : rgb.r; const g = ch.label === 'G' ? v : rgb.g; const b = ch.label === 'B' ? v : rgb.b; selectColor(rgbToHex(r, g, b)); }}
                          className="color-slider flex-1"
                          style={{ background: ch.grad }}
                        />
                        <span className="text-[15px] font-mono text-gray-500 w-10 text-right shrink-0">{ch.value}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-3">
                      <span className="text-[15px] font-bold w-6 text-center text-gray-400 shrink-0">×</span>
                      <input type="range" min="0" max="100" value={colorAlpha}
                        onChange={(e) => setColorAlpha(parseInt(e.target.value))}
                        className="color-slider flex-1"
                        style={{ background: `linear-gradient(to right, transparent, ${cur})` }}
                      />
                      <span className="text-[15px] font-mono text-gray-500 w-12 text-right shrink-0">{colorAlpha}%</span>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="flex gap-1.5">
              {['#000000','#1a1a1a','#333333','#4d4d4d','#666666','#808080','#999999','#b3b3b3','#cccccc','#e6e6e6','#ffffff'].map((c, i) => (
                <button key={i} onClick={() => selectColor(c)}
                  className={`flex-1 h-5 rounded-md border transition-all active:scale-90 ${(isBucket ? bucketColor : color) === c ? 'border-blue-400 ring-1 ring-blue-200 z-10' : 'border-gray-200 hover:border-gray-400'}`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          <div className="flex border-b border-gray-200 px-3 shrink-0">
            {[
                { key: 'recent', label: '最近' },
                { key: 'saved', label: '记录' },
                { key: 'eyedropper', label: '吸管' },
                { key: 'basic', label: '色相' },
                { key: 'ai', label: 'AI配色' },
              ].map(t => (
              <button key={t.key} onClick={() => setColorTab(t.key)}
                className={`flex-1 py-2 text-[11px] font-medium transition-all border-b-2 ${colorTab === t.key ? 'text-blue-600 border-blue-500' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
              >{t.label}</button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {colorTab === 'recent' && (
              recentColors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span className="text-[10px] mt-2">暂无记录</span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-gray-400 font-medium">最近使用 ({recentColors.length})</span>
                    <button onClick={() => setRecentColors([])} className="text-[10px] text-gray-400 hover:text-red-400 transition-colors">清空</button>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {recentColors.map((c, i) => (
                      <button key={i} onClick={() => selectColor(c)}
                        className={`w-full aspect-square rounded-lg border-2 transition-all active:scale-90 ${(isBucket ? bucketColor : color) === c ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200/60 hover:border-gray-300 hover:scale-105'}`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              )
            )}

            {colorTab === 'saved' && (
              savedColors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
                  <span className="text-[10px] mt-2">点击 + 保存常用颜色</span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-gray-400 font-medium">记忆色 ({savedColors.length})</span>
                    <button onClick={() => setSavedColors([])} className="text-[10px] text-gray-400 hover:text-red-400 transition-colors">清空</button>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {savedColors.map((c, i) => (
                      <div key={i} className="relative group">
                        <button onClick={() => selectColor(c)}
                          className={`w-full aspect-square rounded-lg border-2 transition-all active:scale-90 ${(isBucket ? bucketColor : color) === c ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200/60 hover:border-gray-300 hover:scale-105'}`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                        <button onClick={() => removeSavedColor(i)}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}

            {colorTab === 'eyedropper' && (
              eyedropperSavedColors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                  <svg width="28" height="28" viewBox="0 0 16 16" fill="currentColor"><path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755q-.247.248-.517.486z"/><path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.822a2.5 2.5 0 0 0 2.829 2.829"/><path d="M3.35 5.47q-.27.24-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12z"/></svg>
                  <span className="text-[10px] mt-2">使用吸管工具取色</span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-gray-400 font-medium">吸管颜色 ({eyedropperSavedColors.length})</span>
                    <button onClick={() => setEyedropperSavedColors([])} className="text-[10px] text-gray-400 hover:text-red-400 transition-colors">清空</button>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {eyedropperSavedColors.map((c, i) => (
                      <div key={i} className="relative group">
                        <button onClick={() => { selectColor(c); setEyedropperColor(c); }}
                          className={`w-full aspect-square rounded-lg border-2 transition-all active:scale-90 ${(isBucket ? bucketColor : color) === c ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200/60 hover:border-gray-300 hover:scale-105'}`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                        <button onClick={() => setEyedropperSavedColors(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}

            {colorTab === 'basic' && (
              <div className="space-y-3">
                {[
                  { label: '红', colors: ['#FF0000','#FF3333','#FF6666','#FF9999','#FFCCCC','#CC0000','#990000','#660000'] },
                  { label: '橙', colors: ['#FF6600','#FF8000','#FF9933','#FFB366','#FFCC99','#CC5200','#993D00','#662900'] },
                  { label: '黄', colors: ['#FFFF00','#FFFF33','#FFFF66','#FFFF99','#FFFFCC','#CCCC00','#999900','#666600'] },
                  { label: '绿', colors: ['#00FF00','#33FF33','#66FF66','#99FF99','#CCFFCC','#00CC00','#009900','#006600'] },
                  { label: '青', colors: ['#00FFFF','#33FFFF','#66FFFF','#99FFFF','#CCFFFF','#00CCCC','#009999','#006666'] },
                  { label: '蓝', colors: ['#0000FF','#3333FF','#6666FF','#9999FF','#CCCCFF','#0000CC','#000099','#000066'] },
                  { label: '紫', colors: ['#9900FF','#AA33FF','#BB66FF','#CC99FF','#DDCCFF','#7700CC','#550099','#330066'] },
                  { label: '粉', colors: ['#FF0066','#FF3388','#FF66AA','#FF99CC','#FFCCEE','#CC0052','#99003D','#660029'] },
                  { label: '棕', colors: ['#8B4513','#A0522D','#CD853F','#D2B48C','#DEB887','#6B3410','#4A2508','#2A1500'] },
                ].map(group => (
                  <div key={group.label}>
                    <span className="text-[10px] text-gray-400 font-medium block mb-1.5">{group.label}</span>
                    <div className="grid grid-cols-8 gap-1.5">
                      {group.colors.map((c, i) => (
                        <button key={i} onClick={() => selectColor(c)}
                          className={`w-full aspect-square rounded-md border-2 transition-all active:scale-90 ${(isBucket ? bucketColor : color) === c ? 'border-blue-400 ring-1 ring-blue-100' : 'border-gray-200/60 hover:border-gray-300 hover:scale-105'}`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {colorTab === 'ai' && (
              aiColorResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4c0 1.95-2 4-4 6-2-2-4-4.05-4-6a4 4 0 0 1 4-4z"/><path d="M6.5 9.5L2 14l4.5 4.5"/><path d="M17.5 9.5L22 14l-4.5 4.5"/><circle cx="12" cy="18" r="3"/></svg>
                  <span className="text-[10px] mt-2">点击上方 AI 按钮生成配色</span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-gray-400 font-medium">AI配色({aiColorResults.length})</span>
                    <button onClick={() => setAiColorResults([])} className="text-[10px] text-gray-400 hover:text-red-400 transition-colors">清空</button>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {aiColorResults.map((c, i) => (
                      <div key={i} className="relative group">
                        <button onClick={() => selectColor(c)}
                          className={`w-full aspect-square rounded-lg border-2 transition-all active:scale-90 ${(isBucket ? bucketColor : color) === c ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200/60 hover:border-gray-300 hover:scale-105'}`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                        <button onClick={() => setAiColorResults(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {hueMagActive && (
        <div ref={hueMagContainerRef} className="fixed pointer-events-none z-[101]" style={{ left: 0, top: 0, transform: 'translate(-50%, -80px)' }}>
          <div className="flex flex-col items-center">
            <div className="relative w-24 h-14 rounded-xl border-2 border-white/90 shadow-2xl overflow-hidden bg-gray-900/80 backdrop-blur-sm">
              <canvas ref={hueMagRef} width={192} height={56} className="w-full h-full" />
            </div>
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-6 border-l-transparent border-r-transparent border-t-white/90 mt-px" />
          </div>
        </div>
      )}

      {showAiColorPopup && (
        <div ref={aiColorPopupRef} className="fixed inset-0 z-[110] flex items-center justify-center" onMouseDown={e => e.stopPropagation()} onClick={() => setShowAiColorPopup(false)}>
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-80 max-w-[90vw] p-5 space-y-3 border border-gray-100" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4c0 1.95-2 4-4 6-2-2-4-4.05-4-6a4 4 0 0 1 4-4z"/><path d="M6.5 9.5L2 14l4.5 4.5"/><path d="M17.5 9.5L22 14l-4.5 4.5"/><circle cx="12" cy="18" r="3"/></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800">AI 自动调色</h3>
                  <p className="text-[10px] text-gray-400">{(() => { try { const m = localStorage.getItem('aiToolModel') || 'deepseek-v4-flash'; return aiPresetModels.find(p => p.model === m)?.name || m; } catch { return 'deepseek-v4-flash'; } })()} 驱动，组合色包最佳</p>
                </div>
              </div>
              <button onClick={() => setShowAiColorPopup(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="flex rounded-xl bg-gray-100 p-0.5">
              <button onClick={() => setAiColorMode('desc')}
                className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-all ${aiColorMode === 'desc' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}
              >描述配色</button>
              <button onClick={() => setAiColorMode('rgb')}
                className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-all ${aiColorMode === 'rgb' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}
              >RGB输出</button>
            </div>

            <div className="flex gap-2">
              <input
                value={aiColorPrompt}
                onChange={(e) => setAiColorPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !aiColorLoading) aiGenerateColors(); }}
                onMouseDown={e => e.stopPropagation()}
                onFocus={e => e.stopPropagation()}
                placeholder={aiColorMode === 'rgb' ? '如：255, 100, 50' : '描述配色风格、APP或事物'}
                className="flex-1 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all placeholder-gray-300"
                disabled={aiColorLoading}
                autoFocus
              />
              <button
                onClick={aiGenerateColors}
                disabled={!aiColorPrompt.trim() || aiColorLoading}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-bold disabled:opacity-30 active:scale-[0.97] transition-all shadow-lg shadow-purple-500/20 flex items-center gap-1.5 shrink-0"
              >
                {aiColorLoading ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                )}
                生成
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(aiColorMode === 'rgb'
                ? ['255,87,51', '52,152,219', '46,204,113', '155,89,182', '241,196,15', '230,126,34']
                : ['温暖秋天', '赛博朋克', '莫兰迪色', '日系小清新', '小红书配色', '抖音风格']
              ).map(tag => (
                <button key={tag} onClick={() => setAiColorPrompt(tag)}
                  className="px-2.5 py-1 rounded-lg bg-gray-50 text-gray-500 text-[10px] hover:bg-purple-50 hover:text-purple-500 transition-all border border-gray-100"
                >{tag}</button>
              ))}
            </div>

            {aiColorLoading && (
              <div className="flex flex-col items-center py-4 gap-2">
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-3 h-3 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <span className="text-[11px] text-gray-400">正在生成配色方案...</span>
              </div>
            )}

            {aiColorPreview.length > 0 && !aiColorLoading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 font-medium">点击选取 ×{aiColorPreview.length}</span>
                  <button onClick={() => {
                    setAiColorResults(prev => {
                      const merged = [...aiColorPreview, ...prev];
                      const unique = [];
                      const seen = new Set();
                      for (const c of merged) {
                        const lower = c.toLowerCase();
                        if (!seen.has(lower)) { seen.add(lower); unique.push(c); }
                      }
                      return unique.slice(0, 48);
                    });
                    if (aiColorPreview.length > 0) selectColor(aiColorPreview[0]);
                    setAiColorPreview([]);
                  }} className="text-[11px] text-purple-500 hover:text-purple-600 font-medium transition-colors">全部保存</button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {aiColorPreview.slice(0, 8).map((c, i) => {
                    const isSaved = aiColorResults.some(x => x.toLowerCase() === c.toLowerCase());
                    return (
                      <button key={i} onClick={() => saveAiColor(c)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all active:scale-95 ${isSaved ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'}`}>
                        <div className="w-full aspect-square rounded-lg shadow-sm border border-gray-200/60" style={{ backgroundColor: c }} />
                        <span className="text-[9px] font-mono font-bold text-gray-600 leading-tight">{c.toUpperCase()}</span>
                        {isSaved && <span className="text-[8px] text-purple-500">已保存</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!aiColorLoading && aiColorPreview.length === 0 && (
              <p className="text-[9px] text-gray-300 text-center pt-1">需要在设置内配好API Key</p>
            )}
          </div>
        </div>
      )}

      {magColorRef.current && activePanel === 'color' && !isEyedropper && (
        <div ref={magContainerRef} className="fixed pointer-events-none z-[100]" style={{ left: magPosRef.current.x, top: magPosRef.current.y, transform: 'translate(-28px, -80px)' }}>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full border-2 border-white shadow-xl" style={{ backgroundColor: magColorRef.current }}></div>
            <span className="text-[10px] font-mono text-white bg-gray-900/80 px-1.5 py-0.5 rounded mt-0.5">{magColorRef.current}</span>
          </div>
        </div>
      )}

      {isEyedropperActive && eyedropperMagPosRef.current.x > 0 && createPortal(
        (() => {
          const mx = eyedropperMagPosRef.current.x;
          const my = eyedropperMagPosRef.current.y;
          const vv = window.visualViewport || { width: window.innerWidth, height: window.innerHeight, offsetLeft: 0, offsetTop: 0 };
          const vw = vv.width;
          const vh = vv.height;
          const voX = vv.offsetLeft || 0;
          const voY = vv.offsetTop || 0;
          const wrapEl = eyedropperMagWrapRef.current;
          const magW = wrapEl ? wrapEl.offsetWidth : 130;
          const magH = wrapEl ? wrapEl.offsetHeight : 160;
          const gap = 16;
          const pad = 8;
          let left, top;
          if (mx + gap + magW + pad > vw + voX) {
            left = mx - gap - magW;
          } else {
            left = mx + gap;
          }
          if (my - magH - gap < voY) {
            top = my + gap;
          } else {
            top = my - magH - gap;
          }
          left = Math.max(voX + pad, Math.min(left, voX + vw - magW - pad));
          top = Math.max(voY + pad, Math.min(top, voY + vh - magH - pad));
          return (
          <div ref={eyedropperMagWrapRef} className="fixed pointer-events-none" style={{ left, top, zIndex: 999999 }}>
            <div className="flex flex-col items-center">
              <div className="relative w-28 h-28 rounded-full border-3 border-white/80 shadow-2xl overflow-hidden bg-gray-900/60">
                <canvas ref={eyedropperMagRef} width={224} height={224} className="w-full h-full" />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-2 h-px bg-red-500/80"></div>
                  <div className="absolute w-px h-2 bg-red-500/80"></div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-white bg-gray-900/80 px-1.5 py-0.5 rounded mt-0.5">{eyedropperColor}</span>
            </div>
          </div>
          );
        })()
      , document.body)}

      {showLayerPanel && (() => {
        const btnRect = layerBtnRef.current?.getBoundingClientRect();
        if (!btnRect) return null;
        const appW = Math.min(448, window.innerWidth);
        const appL = (window.innerWidth - appW) / 2;
        const appR = appL + appW;
        const panelW = Math.min(256, window.innerWidth - 16);
        const left = Math.max(appL + 4, Math.min(btnRect.left, appR - panelW - 4));
        return createPortal(
        <>
          <div className="fixed inset-0 z-[99998]" onClick={() => setShowLayerPanel(false)} />
          <div className="fixed z-[99999] w-64 max-w-[90vw] rounded-2xl shadow-2xl border overflow-hidden bg-gray-800 border-gray-700"
            style={{ top: btnRect.bottom + 4, left }}
            onClick={(e) => e.stopPropagation()}
          >
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/50">
            <div className="flex gap-1">
              <button onClick={() => setLayerPanelTab('layers')} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${layerPanelTab === 'layers' ? 'bg-teal-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>图层</button>
              <button onClick={() => setLayerPanelTab('properties')} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${layerPanelTab === 'properties' ? 'bg-teal-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>属性</button>
            </div>
            <div className="flex gap-1">
              <button onClick={toggleOnionSkin} onDoubleClick={() => setShowOnionSkinPanel(!showOnionSkinPanel)} className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold transition-colors ${onionSkin ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'}`} title="洋葱皮(双击设置)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              </button>
              <button onClick={() => setShowOnionSkinPanel(!showOnionSkinPanel)} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${showOnionSkinPanel ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'}`} title="洋葱皮设置">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              <button onClick={() => setShowLayerPanel(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          {layerPanelTab === 'properties' && (() => {
            const activeLayer = layers.find(l => l.id === activeLayerId);
            if (!activeLayer) return null;
            return (
              <div className="p-3 space-y-3 border-b border-gray-700/50">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">混合模式</span>
                  </div>
                  <select
                    value={activeLayer.blendMode}
                    onChange={(e) => setLayerBlendMode(activeLayerId, e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-gray-700 border border-gray-600 text-gray-200 text-xs font-medium outline-none focus:border-teal-500 transition-colors"
                  >
                    {BLEND_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">不透明度</span>
                    <span className="text-[11px] font-mono text-teal-400">{Math.round(activeLayer.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0" max="100" step="1"
                    value={Math.round(activeLayer.opacity * 100)}
                    onChange={(e) => setLayerOpacity(activeLayerId, parseInt(e.target.value) / 100)}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-teal-500 bg-gray-600"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">剪贴蒙版</span>
                  <button
                    onClick={() => toggleClippingMask(activeLayerId)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${activeLayer.clippingMask ? 'bg-teal-600' : 'bg-gray-600'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${activeLayer.clippingMask ? 'left-[18px]' : 'left-0.5'}`}></div>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">锁定</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => toggleLayerLock(activeLayerId)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${activeLayer.locked ? 'bg-yellow-600 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'}`}
                      title={activeLayer.locked ? '解锁图层' : '锁定图层'}
                    >
                      {activeLayer.locked ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {layerPanelTab === 'layers' && (
            <>
              <div className="max-h-60 overflow-y-auto p-1.5">
                {[...layers].reverse().map((layer) => (
                  <div
                    key={layer.id}
                    className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-lg mb-0.5 transition-all cursor-pointer select-none ${activeLayerId === layer.id ? 'bg-teal-600/30 ring-1 ring-teal-500/30' : 'hover:bg-gray-700/50'} ${!layer.visible ? 'opacity-50' : ''}`}
                    onClick={() => setActiveLayer(layer.id)}
                    onDoubleClick={() => { setRenamingLayerId(layer.id); setRenameValue(layer.name); }}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); }}
                      className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-colors ${layer.visible ? 'text-teal-400' : 'text-gray-600'}`}
                      title={layer.visible ? '隐藏图层' : '显示图层'}
                    >
                      {layer.visible ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      )}
                    </button>

                    <div className={`w-8 h-8 rounded border flex-shrink-0 overflow-hidden ${activeLayerId === layer.id ? 'border-teal-400' : 'border-gray-600'}`}>
                      <canvas
                        width="32" height="32"
                        className="w-full h-full"
                        ref={(el) => {
                          if (el) thumbnailRefs.current[layer.id] = el;
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      {renamingLayerId === layer.id ? (
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => renameLayer(layer.id, renameValue)}
                          onKeyDown={(e) => { if (e.key === 'Enter') renameLayer(layer.id, renameValue); if (e.key === 'Escape') setRenamingLayerId(null); }}
                          className="w-full px-1 py-0.5 rounded bg-gray-700 border border-teal-500 text-xs text-gray-200 outline-none"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className={`text-xs truncate block ${activeLayerId === layer.id ? 'text-teal-300 font-semibold' : 'text-gray-300'}`}>
                          {layer.name}
                        </span>
                      )}
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[9px] text-gray-500">{Math.round(layer.opacity * 100)}%</span>
                        {layer.blendMode !== 'source-over' && <span className="text-[9px] text-purple-400">{BLEND_MODES.find(b => b.value === layer.blendMode)?.label}</span>}
                        {layer.locked && <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-500"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
                        {layer.clippingMask && <span className="text-[9px] text-orange-400">✎</span>}
                      </div>
                    </div>

                    {activeLayerId === layer.id && <div className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0"></div>}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between px-2 py-2 border-t border-gray-700/50">
                <div className="flex gap-0.5">
                  <button onClick={addLayer} className="w-7 h-7 rounded-lg flex items-center justify-center text-teal-400 hover:bg-gray-700 transition-colors" title="新建图层">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>
                  </button>
                  <button onClick={() => duplicateLayer(activeLayerId)} className="w-7 h-7 rounded-lg flex items-center justify-center text-blue-400 hover:bg-gray-700 transition-colors" title="复制图层">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  </button>
                  <button onClick={() => moveLayerUp(activeLayerId)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-700 transition-colors" title="上移图层">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg>
                  </button>
                  <button onClick={() => moveLayerDown(activeLayerId)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-700 transition-colors" title="下移图层">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                </div>
                <div className="flex gap-0.5">
                  <button onClick={() => mergeDown(activeLayerId)} className="w-7 h-7 rounded-lg flex items-center justify-center text-orange-400 hover:bg-gray-700 transition-colors" title="向下合并">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
                  </button>
                  <button onClick={flattenLayers} className="w-7 h-7 rounded-lg flex items-center justify-center text-amber-400 hover:bg-gray-700 transition-colors" title="拼合图层">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="2" rx="1"/><rect x="2" y="15" width="20" height="2" rx="1"/></svg>
                  </button>
                  <button
                    onClick={() => { if (layers.length <= 1) return; deleteLayer(activeLayerId); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-gray-700 transition-colors"
                    title="删除图层"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        </>,
        document.body
        );
      })()}

      {showOnionSkinPanel && (() => {
        const btnRect = layerBtnRef.current?.getBoundingClientRect();
        if (!btnRect) return null;
        const appW = Math.min(448, window.innerWidth);
        const appL = (window.innerWidth - appW) / 2;
        const appR = appL + appW;
        const panelW = Math.min(256, window.innerWidth - 16);
        const left = Math.max(appL + 4, Math.min(btnRect.left, appR - panelW - 4));
        return createPortal(
        <>
          <div className="fixed inset-0 z-[99998]" onClick={() => setShowOnionSkinPanel(false)} />
          <div className="fixed z-[99999] w-64 max-w-[90vw] rounded-2xl shadow-2xl border overflow-hidden bg-gray-800 border-gray-700"
            style={{ top: btnRect.bottom + 4, left }}
            onClick={(e) => e.stopPropagation()}
          >
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/50">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              <span className="text-[11px] font-black text-gray-200 uppercase tracking-wider">洋葱皮设置</span>
            </div>
            <button onClick={() => setShowOnionSkinPanel(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">启用洋葱皮</span>
              <button onClick={toggleOnionSkin} className={`relative w-9 h-5 rounded-full transition-colors ${onionSkin ? 'bg-purple-600' : 'bg-gray-600'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${onionSkin ? 'left-[18px]' : 'left-0.5'}`}></div>
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">显示范围</span>
                <span className="text-[11px] font-mono text-purple-400">±{onionSkinSettings.range} 帧</span>
              </div>
              <input
                type="range" min="1" max="10" step="1"
                value={onionSkinSettings.range}
                onChange={(e) => updateOnionSkinSetting('range', parseInt(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-purple-500 bg-gray-600"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">着色模式</span>
              <button onClick={() => updateOnionSkinSetting('useTint', !onionSkinSettings.useTint)} className={`relative w-9 h-5 rounded-full transition-colors ${onionSkinSettings.useTint ? 'bg-purple-600' : 'bg-gray-600'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${onionSkinSettings.useTint ? 'left-[18px]' : 'left-0.5'}`}></div>
              </button>
            </div>

            <div className="border-t border-gray-700/50 pt-3">
              <div className="flex items-center gap-2 mb-2">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-red-400"><circle cx="12" cy="12" r="10"/></svg>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">前景(下方图层)</span>
                <button onClick={() => updateOnionSkinSetting('prevEnabled', !onionSkinSettings.prevEnabled)} className={`ml-auto relative w-9 h-5 rounded-full transition-colors ${onionSkinSettings.prevEnabled ? 'bg-red-500' : 'bg-gray-600'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${onionSkinSettings.prevEnabled ? 'left-[18px]' : 'left-0.5'}`}></div>
                </button>
              </div>
              {onionSkinSettings.prevEnabled && (
                <div className="space-y-2 ml-4">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-gray-500 w-12">颜色</label>
                    <div className="relative">
                      <input type="color" value={onionSkinSettings.prevColor} onChange={(e) => updateOnionSkinSetting('prevColor', e.target.value)} className="w-7 h-7 rounded-lg border border-gray-600 cursor-pointer bg-transparent" />
                    </div>
                    <span className="text-[10px] font-mono text-gray-500">{onionSkinSettings.prevColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-gray-500 w-12">透明</label>
                    <input type="range" min="5" max="100" step="1" value={onionSkinSettings.prevOpacity} onChange={(e) => updateOnionSkinSetting('prevOpacity', parseInt(e.target.value))} className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-red-500 bg-gray-600" />
                    <span className="text-[10px] font-mono text-red-400 w-8 text-right">{onionSkinSettings.prevOpacity}%</span>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-700/50 pt-3">
              <div className="flex items-center gap-2 mb-2">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400"><circle cx="12" cy="12" r="10"/></svg>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">后景(上方图层)</span>
                <button onClick={() => updateOnionSkinSetting('nextEnabled', !onionSkinSettings.nextEnabled)} className={`ml-auto relative w-9 h-5 rounded-full transition-colors ${onionSkinSettings.nextEnabled ? 'bg-blue-500' : 'bg-gray-600'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${onionSkinSettings.nextEnabled ? 'left-[18px]' : 'left-0.5'}`}></div>
                </button>
              </div>
              {onionSkinSettings.nextEnabled && (
                <div className="space-y-2 ml-4">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-gray-500 w-12">颜色</label>
                    <div className="relative">
                      <input type="color" value={onionSkinSettings.nextColor} onChange={(e) => updateOnionSkinSetting('nextColor', e.target.value)} className="w-7 h-7 rounded-lg border border-gray-600 cursor-pointer bg-transparent" />
                    </div>
                    <span className="text-[10px] font-mono text-gray-500">{onionSkinSettings.nextColor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-gray-500 w-12">透明</label>
                    <input type="range" min="5" max="100" step="1" value={onionSkinSettings.nextOpacity} onChange={(e) => updateOnionSkinSetting('nextOpacity', parseInt(e.target.value))} className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-blue-500 bg-gray-600" />
                    <span className="text-[10px] font-mono text-blue-400 w-8 text-right">{onionSkinSettings.nextOpacity}%</span>
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => {
              updateOnionSkinSetting('prevEnabled', true);
              updateOnionSkinSetting('nextEnabled', true);
              updateOnionSkinSetting('prevColor', '#FF4444');
              updateOnionSkinSetting('nextColor', '#4444FF');
              updateOnionSkinSetting('prevOpacity', 35);
              updateOnionSkinSetting('nextOpacity', 35);
              updateOnionSkinSetting('range', 3);
              updateOnionSkinSetting('useTint', true);
            }} className="w-full py-1.5 rounded-lg text-[10px] font-bold text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors">
              重置默认
            </button>
          </div>
        </div>
        </>,
        document.body
        );
      })()}

      {showHelpBook && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowHelpBook(false)} />
          <div className={`absolute top-[88px] left-[68px] z-50 w-80 max-w-[calc(100vw-68px-60px)] max-h-[75vh] drawing-popup animate-pop-in overflow-hidden`}>
            <div className="flex flex-col max-h-[75vh]">
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 shrink-0">
                <span className="text-[11px] font-black text-gray-200 tracking-wider uppercase">功能指南</span>
                <button onClick={() => setShowHelpBook(false)} className="text-gray-500 hover:text-gray-300 text-xs">✕</button>
              </div>
              <div className="p-3 space-y-3 overflow-y-auto text-[10px] text-gray-300 leading-relaxed">
                <div>
                  <div className="text-[11px] font-black text-white mb-1">绘画工具</div>
                  <ul className="space-y-1 pl-2">
                    <li><span className="text-white font-bold">画笔</span> — 自由绘画，支持多种笔刷风格（铅笔、马克笔、水彩等），点击画笔按钮打开画笔库选择</li>
                    <li><span className="text-white font-bold">橡皮</span> — 擦除画布内容，擦除范围跟随画笔粗细</li>
                    <li><span className="text-white font-bold">吸管</span> — 从画布上拾取颜色，按住拖动可放大取色区域，松手自动选色</li>
                    <li><span className="text-white font-bold">填充</span> — 点击画布区域进行颜色填充（油漆桶工具）</li>
                    <li><span className="text-white font-bold">颜色</span> — 打开调色面板，支持色相环、RGB输入、快捷色板、AI配色方案</li>
                    <li><span className="text-white font-bold">粗细</span> — 调整画笔/橡皮的线条粗细（1-500px）</li>
                    <li><span className="text-white font-bold">透明度</span> — 调整画笔透明度（1%-100%）</li>
                  </ul>
                </div>
                <div>
                  <div className="text-[11px] font-black text-white mb-1">辅助绘画</div>
                  <ul className="space-y-1 pl-2">
                    <li><span className="text-white font-bold">防抖平滑</span> — 3级防抖，减少手抖造成的线条抖动，等级越高越平滑</li>
                    <li><span className="text-white font-bold">色相抖动</span> — 绘画时自动在色相上产生随机偏移，模拟手绘色彩变化</li>
                    <li><span className="text-white font-bold">对称绘画</span> — 支持左右、上下、四向、4/6/8轴径向对称，轻松绘制对称图案</li>
                    <li><span className="text-white font-bold">透视辅助线</span> — 在画布上放置消失点，自动生成透视线辅助绘画</li>
                    <li><span className="text-white font-bold">辅助线</span> — 添加水平/垂直参考线，拖拽调整位置，辅助对齐构图</li>
                    <li><span className="text-white font-bold">参考图</span> — 导入参考图片叠加在画布上，可缩放、移动、调整透明度</li>
                  </ul>
                </div>
                <div>
                  <div className="text-[11px] font-black text-white mb-1">CAD模式</div>
                  <ul className="space-y-1 pl-2">
                    <li><span className="text-white font-bold">直线</span> — 点击起点拖拽到终点绘制直线</li>
                    <li><span className="text-white font-bold">圆</span> — 点击圆心拖拽设置半径绘制圆</li>
                    <li><span className="text-white font-bold">矩形</span> — 点击起点拖拽到终点绘制矩形</li>
                    <li><span className="text-white font-bold">弧</span> — 依次点击起点、中点、终点绘制弧线</li>
                    <li><span className="text-white font-bold">多边形</span> — 连续点击添加顶点，双击或右键完成</li>
                    <li><span className="text-white font-bold">样条</span> — 连续点击添加控制点，双击完成平滑曲线</li>
                    <li><span className="text-white font-bold">修剪</span> — 拖拽擦除不需要的线条部分</li>
                    <li><span className="text-white font-bold">标注</span> — 在图形上添加尺寸标注</li>
                  </ul>
                </div>
                <div>
                  <div className="text-[11px] font-black text-white mb-1">画板操作</div>
                  <ul className="space-y-1 pl-2">
                    <li><span className="text-white font-bold">画板尺寸</span> — 设置画布大小，提供常用尺寸预设和自定义尺寸</li>
                    <li><span className="text-white font-bold">滤镜</span> — 模糊、亮度、对比度、饱和度等8种滤镜，可应用到当前图层</li>
                    <li><span className="text-white font-bold">线稿叠加</span> — 导入线稿图片叠加在画布上作为参考描线</li>
                    <li><span className="text-white font-bold">录制</span> — 录制绘画过程，生成延时动画回放</li>
                    <li><span className="text-white font-bold">撤销/恢复</span> — 撤销和恢复绘画操作，支持多步历史记录</li>
                    <li><span className="text-white font-bold">保存</span> — 保存画作为PNG图片</li>
                  </ul>
                </div>
                <div>
                  <div className="text-[11px] font-black text-white mb-1">互动功能</div>
                  <ul className="space-y-1 pl-2">
                    <li><span className="text-white font-bold">你画我猜</span> — 多人实时联机你画我猜游戏，一人画其他人猜</li>
                    <li><span className="text-white font-bold">炸弹游戏</span> — 本地多人翻牌游戏，翻到炸弹即出局</li>
                  </ul>
                </div>
                <div>
                  <div className="text-[11px] font-black text-white mb-1">快捷操作</div>
                  <ul className="space-y-1 pl-2">
                    <li><span className="text-white font-bold">空格+拖拽</span> — 平移画布</li>
                    <li><span className="text-white font-bold">鼠标滚轮</span> — 缩放画布</li>
                    <li><span className="text-white font-bold">Ctrl+Z</span> — 撤销</li>
                    <li><span className="text-white font-bold">Ctrl+Y</span> — 恢复</li>
                    <li><span className="text-white font-bold">Ctrl+S</span> — 保存</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showGuideLines && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowGuideLines(false)} />
          <div className={`absolute top-[88px] left-[68px] z-50 w-56 max-w-[calc(100vw-68px-60px)] drawing-popup animate-pop-in overflow-hidden`}>
            <div className="flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                <span className="text-[11px] font-black text-gray-200 tracking-wider uppercase">辅助线</span>
                <button onClick={() => setShowGuideLines(false)} className="text-gray-500 hover:text-gray-300 text-xs">✕</button>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex gap-2">
                  <button onClick={() => addGuideLine('horizontal')} className="flex-1 py-2 rounded-lg text-[10px] font-bold bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-all active:scale-[0.98]">＋ 水平线</button>
                  <button onClick={() => addGuideLine('vertical')} className="flex-1 py-2 rounded-lg text-[10px] font-bold bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-all active:scale-[0.98]">＋ 垂直线</button>
                </div>
                {guideLines.length > 0 && (
                  <div className="space-y-1">
                    {guideLines.map((g) => (
                      <div key={g.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/5 text-[10px]">
                        <span className="text-gray-300">{g.type === 'horizontal' ? '水平' : '垂直'}: {Math.round(g.position)}px</span>
                        <button onClick={() => removeGuideLine(g.id)} className="text-red-400/60 hover:text-red-400 transition-colors">✕</button>
                      </div>
                    ))}
                    <button onClick={() => setGuideLines([])} className="w-full py-1.5 text-[10px] font-bold text-red-400/60 hover:text-red-400 transition-colors">清除全部</button>
                  </div>
                )}
                <div className="text-[9px] text-gray-500">拖拽辅助线调整位置，悬停显示删除按钮</div>
              </div>
            </div>
          </div>
        </>
      )}

      {showFilterPanel && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowFilterPanel(false)} />
          <div className={`absolute top-[88px] left-[68px] z-50 w-64 max-w-[calc(100vw-68px-60px)] drawing-popup animate-pop-in overflow-hidden`}>
            <div className="flex flex-col max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                <span className="text-[11px] font-black text-gray-200 tracking-wider uppercase">滤镜</span>
                <button onClick={() => setShowFilterPanel(false)} className="text-gray-500 hover:text-gray-300 text-xs">✕</button>
              </div>
              <div className="p-3 space-y-3">
                {[
                  { label: '模糊', value: filterBlur, set: setFilterBlur, min: 0, max: 20, unit: 'px', def: 0 },
                  { label: '亮度', value: filterBrightness, set: setFilterBrightness, min: 0, max: 200, unit: '%', def: 100 },
                  { label: '对比度', value: filterContrast, set: setFilterContrast, min: 0, max: 200, unit: '%', def: 100 },
                  { label: '饱和度', value: filterSaturate, set: setFilterSaturate, min: 0, max: 200, unit: '%', def: 100 },
                  { label: '色相旋转', value: filterHueRotate, set: setFilterHueRotate, min: 0, max: 360, unit: '°', def: 0 },
                  { label: '灰度', value: filterGrayscale, set: setFilterGrayscale, min: 0, max: 100, unit: '%', def: 0 },
                  { label: '反色', value: filterInvert, set: setFilterInvert, min: 0, max: 100, unit: '%', def: 0 },
                  { label: '复古', value: filterSepia, set: setFilterSepia, min: 0, max: 100, unit: '%', def: 0 },
                ].map(f => (
                  <div key={f.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-gray-300">{f.label}</span>
                      <span className="text-[9px] text-gray-500">{f.value}{f.unit}</span>
                    </div>
                    <input type="range" min={f.min} max={f.max} value={f.value} onChange={(e) => f.set(parseInt(e.target.value))} className="w-full h-1 rounded-full appearance-none bg-white/10 accent-indigo-500" />
                  </div>
                ))}
                <button onClick={applyFilter} className="w-full py-2 rounded-lg text-[10px] font-bold bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-all active:scale-[0.98]">应用滤镜到当前图层</button>
                <button onClick={() => { setFilterBlur(0); setFilterBrightness(100); setFilterContrast(100); setFilterSaturate(100); setFilterHueRotate(0); setFilterGrayscale(0); setFilterInvert(0); setFilterSepia(0); }} className="w-full py-1.5 text-[10px] font-bold text-gray-500 hover:text-gray-300 transition-colors">重置</button>
              </div>
            </div>
          </div>
        </>
      )}

      {activePanel === 'brush' && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setActivePanel(null)} />
          <div ref={panelRef} className={`absolute top-[88px] left-[68px] z-50 w-72 max-w-[calc(100vw-68px-60px)] drawing-popup animate-pop-in overflow-hidden`}>
          <div className="flex flex-col max-h-[70vh] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/></svg>
                </div>
              <span className="text-[11px] font-black text-gray-200 tracking-wider uppercase">画笔库</span>
              </div>
              <canvas ref={brushPreviewCanvasRef} width={200} height={36} className="rounded-lg bg-white/5 ring-1 ring-white/5"></canvas>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="flex h-full">
                <div className="w-28 shrink-0 border-r border-white/5 p-2 space-y-0.5 overflow-y-auto scrollbar-none">
                  {BRUSH_GROUPS.map(g => {
                    const count = brushCategories.filter(b => b.category === g.key).length;
                    const isActive = activeBrushGroup === g.key;
                    return (
                      <button
                        key={g.key}
                        onClick={() => {
                          setActiveBrushGroup(g.key);
                          const firstIdx = brushCategories.findIndex(b => b.category === g.key);
                          if (firstIdx !== -1) {
                            setActiveBrush(firstIdx);
                            setLineWidth(brushCategories[firstIdx].strokeWidth);
                          }
                        }}
                        className={`w-full flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg text-[11px] font-bold transition-all active:scale-[0.96] ${isActive ? 'bg-teal-500/20 text-teal-300 ring-1 ring-teal-500/30' : 'text-gray-500 hover:text-gray-300 hover:bg-white/4'}`}
                      >
                        <span className="text-[16px] leading-none">{g.icon}</span>
                        <span className="text-[10px] leading-tight">{g.name}</span>
                        <span className={`text-[9px] font-medium ${isActive ? 'text-teal-400/60' : 'text-gray-600'}`}>{count}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex-1 p-2 pl-3 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(filteredBrushes).map(([idx, brush]) => {
                      const i = parseInt(idx);
                      return (
                      <button
                        key={brush.id}
                        onClick={() => {
                          setActiveBrush(i);
                          setLineWidth(brush.strokeWidth);
                          setIsEraser(false);
                          setIsPaintingMode(true);
                          setIsBucket(false);
                          setIsEyedropper(false);
                          setIsCalligraphy(false);
                        }}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all active:scale-[0.97] ${activeBrush === i ? 'bg-teal-500/20 ring-1 ring-teal-500/40 shadow-lg shadow-teal-500/10' : 'bg-white/3 hover:bg-white/6 border border-white/5'}`}
                      >
                        <BrushPreview brush={brush} isActive={activeBrush === i} color={color} />
                        <span className={`text-[10px] font-bold truncate w-full text-center ${activeBrush === i ? 'text-teal-300' : 'text-gray-400'}`}>{brush.name}</span>
                      </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </>
      )}

      {showGuessGame && (guessConnected || guessDevMode) && (
        <div className={`fixed inset-0 z-[9999] bg-[#f0e6ff] flex flex-col ${guessGameExiting ? (gameSwitchAnim || 'animate-game-exit') : (gameSwitchAnim ? 'animate-game-switch-burst-in' : 'animate-game-enter')}`}>
          <div className={`flex items-center justify-between px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg shrink-0 ${guessGameExiting ? 'animate-game-exit-d1' : 'animate-game-enter animate-game-d1'}`}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center animate-game-enter animate-game-d2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2Z"/>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                  <line x1="9" y1="9" x2="9.01" y2="9"/>
                  <line x1="15" y1="9" x2="15.01" y2="9"/>
                </svg>
              </div>
              <div>
                <span className="text-xs font-bold text-white">你画我猜</span>
                <div className="flex items-center gap-1.5">
                  {guessDevMode ? (
                    <span className="text-[9px] font-mono bg-amber-400/30 text-white/90 px-1.5 py-0 rounded">🛠 开发者</span>
                  ) : (
                    <>
                      <span className="text-[9px] font-mono bg-white/20 text-white/90 px-1.5 py-0 rounded">{guessRoomId}</span>
                      <span className="text-[9px] text-white/60">{guessPlayers.length}人</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {guessGameState === 'playing' && (
                <div className="flex items-center gap-2">
                  {isGuessDrawer ? (
                    <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur px-2.5 py-1 rounded-lg">
                      <span className="text-[11px]">✏️</span>
                      <span className="text-xs font-bold text-white">{guessCurrentWord}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur px-2.5 py-1 rounded-lg">
                      <span className="text-xs font-bold text-white/80 tracking-[0.4em]">{guessWordHint}</span>
                    </div>
                  )}
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg font-mono font-bold text-xs backdrop-blur ${guessTimeLeft <= 10 ? 'bg-red-500/80 text-white animate-pulse shadow-lg shadow-red-500/30' : 'bg-white/20 text-white'}`}>
                    {guessTimeLeft}
                  </div>
                </div>
              )}
              <button onClick={() => setGuessDevMode(!guessDevMode)} className={`relative w-8 h-4 rounded-full transition-colors ${guessDevMode ? 'bg-amber-400' : 'bg-white/30'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${guessDevMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <button onClick={() => {
                setGuessGameExiting(true);
                setTimeout(() => { setShowGuessGame(false); if (!guessDevMode) guessLeaveRoom(); setGuessGameExiting(false); setGuessDevMode(false); if (onGuessGameExit) onGuessGameExit(); }, 300);
              }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white/20 text-white/90 hover:bg-white/30 active:scale-95 transition-all backdrop-blur">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                退出
              </button>
            </div>
          </div>

          {!guessDevMode && guessGameState === 'choosing' && isGuessDrawer && (
            <div className="px-4 py-4 bg-gradient-to-b from-purple-50 to-indigo-50 border-b border-purple-200/50 shrink-0 animate-game-enter animate-game-d2">
              <p className="text-xs text-purple-400 mb-3 text-center font-medium">🎨 选择你要画的词</p>
              <div className="flex items-center justify-center gap-3">
                {guessWordOptions.map((w, i) => (
                  <button
                    key={w}
                    onClick={() => guessChooseWord(w)}
                    className="px-6 py-3 rounded-2xl text-sm font-bold bg-white text-purple-600 hover:bg-purple-100 active:scale-95 transition-all shadow-md shadow-purple-200/50 border border-purple-200/60 hover:shadow-lg hover:shadow-purple-300/40"
                    style={{ animationDelay: `${i * 0.08}s` }}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          )}

          {guessGameState === 'round-end' && (
            <div className="px-4 py-4 bg-gradient-to-b from-amber-50 to-orange-50 border-b border-amber-200/50 shrink-0 flex items-center justify-center gap-4 animate-game-enter animate-game-d2">
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-amber-100">
                <span className="text-lg">👍</span>
                <span className="text-xs text-gray-500">正确答案</span>
                <span className="text-sm font-bold text-amber-600">{guessCurrentWord}</span>
              </div>
              {guessIsHost && (
                <button onClick={guessNextRound} className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white active:scale-95 transition-all shadow-md shadow-purple-300/40">
                  下一轮➡️
                </button>
              )}
            </div>
          )}

          {guessGameState === 'ended' && (
            <div className="px-4 py-5 bg-gradient-to-b from-emerald-50 to-green-50 border-b border-emerald-200/50 shrink-0 animate-game-enter animate-game-d2">
              <div className="text-center mb-4">
                <p className="text-xl font-black text-emerald-700 mb-1">🏆 游戏结束！</p>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                  {[...guessPlayers].sort((a, b) => (guessScores[b.id] || 0) - (guessScores[a.id] || 0)).map((p, i) => (
                    <div key={p.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${i === 0 ? 'bg-amber-100 text-amber-700 shadow-sm border border-amber-200' : i === 1 ? 'bg-gray-100 text-gray-600 border border-gray-200' : 'bg-gray-50 text-gray-500'}`}>
                      <span className="font-bold">{i === 0 ? '👑 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : ''}{p.name}</span>
                      <span className="text-[10px] opacity-60">{guessScores[p.id] || 0}分</span>
                    </div>
                  ))}
                </div>
              </div>
              {guessIsHost && (
                <div className="flex justify-center">
                  <button onClick={() => {
                    setGuessGameState('lobby');
                    guessGameStateRef.current = 'lobby';
                    setGuessCurrentWord('');
                    setGuessWordHint('');
                    guessCurrentWordRef.current = '';
                    guessConnectionsRef.current.forEach(c => {
                      try { c.send({ type: 'back-to-lobby' }); } catch(e) {}
                    });
                  }} className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white active:scale-95 transition-all shadow-md shadow-purple-300/40">
                    返回大厅
                  </button>
                </div>
              )}
            </div>
          )}

          {!guessDevMode && guessGameState === 'lobby' && (
            <div className="px-4 py-3 bg-gradient-to-b from-indigo-50 to-purple-50 border-b border-purple-200/50 shrink-0 animate-game-enter animate-game-d3">
              <div className="max-w-[50%] mx-auto">
              <p className="text-[10px] text-purple-400 mb-2 text-center font-medium">👥 等待开始</p>
              <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                {guessPlayers.map((p) => (
                  <div key={p.id} className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white text-purple-600 text-xs font-medium shadow-sm border border-purple-100">
                    <span>{p.name}</span>
                    <span className="text-[10px] text-purple-400">{guessScores[p.id] || 0}</span>
                  </div>
                ))}
              </div>
              {guessIsHost && (
                <div className="flex justify-center">
                  <button
                    onClick={guessStartGame}
                    disabled={guessPlayers.length < 2}
                    className="px-5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white disabled:opacity-40 disabled:from-gray-400 disabled:to-gray-400 active:scale-[0.97] transition-all shadow-md shadow-green-300/30"
                  >
                    🎮 开始{guessPlayers.length < 2 ? '(需≥³2人)' : ''}
                  </button>
                </div>
              )}
              {!guessIsHost && guessPlayers.length > 0 && (
                <p className="text-[10px] text-purple-300 text-center mt-1">等待房主开始..</p>
              )}
              </div>
            </div>
          )}

          <div className="flex-1 flex min-h-0 flex-col animate-game-enter animate-game-d3">
              <div className="flex-1 flex min-h-0">
                {(() => { const canDraw = guessDevMode || (isGuessDrawer && guessGameState === 'playing'); return (
                  <div className={`flex flex-col items-center gap-1.5 bg-white/90 backdrop-blur-md border-r border-purple-200/50 px-1.5 py-2 shrink-0 overflow-y-auto transition-opacity ${canDraw ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                    <button
                      onClick={() => { if (canDraw) { setIsPaintingMode(true); setIsEraser(false); setIsBucket(false); setIsEyedropper(false); } }}
                      disabled={!canDraw}
                      className={`p-2 rounded-xl transition-all ${canDraw ? 'active:scale-90' : ''} ${isPaintingMode && !isEraser && canDraw ? 'bg-purple-600 ring-2 ring-purple-400/50 shadow-md' : canDraw ? 'hover:bg-purple-50 text-gray-400' : 'text-gray-400'}`}
                      title="画笔"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={isPaintingMode && !isEraser && canDraw ? 'text-white' : canDraw ? 'text-gray-400' : 'text-gray-400'}>
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => { if (canDraw) { setIsEraser(!isEraser); setIsPaintingMode(true); setIsBucket(false); setIsEyedropper(false); } }}
                      disabled={!canDraw}
                      className={`p-2 rounded-xl transition-all ${canDraw ? 'active:scale-90' : ''} ${isEraser && canDraw ? 'bg-teal-600 ring-2 ring-teal-400/50 shadow-md' : canDraw ? 'hover:bg-purple-50 text-gray-400' : 'text-gray-400'}`}
                      title="橡皮擦"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={isEraser && canDraw ? 'text-white' : canDraw ? 'text-gray-400' : 'text-gray-400'}>
                        <path d="M8.086 2.207a2 2 0 0 1 2.828 0l3.879 3.879a2 2 0 0 1 0 2.828l-5.5 5.5A2 2 0 0 1 7.879 15H5.12a2 2 0 0 1-1.414-.586l-2.5-2.5a2 2 0 0 1 0-2.828zm2.121.707a1 1 0 0 0-1.414 0L4.16 7.547l5.293 5.293 4.633-4.633a1 1 0 0 0 0-1.414zM8.746 13.547 3.453 8.254 1.914 9.793a1 1 0 0 0 0 1.414l2.5 2.5a1 1 0 0 0 .707.293H7.88a1 1 0 0 0 .707-.293z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => { if (canDraw) { setIsEyedropper(!isEyedropper); setIsPaintingMode(!isEyedropper); setIsEraser(false); setIsBucket(false); } }}
                      disabled={!canDraw}
                      className={`p-2 rounded-xl transition-all ${canDraw ? 'active:scale-90' : ''} ${isEyedropper && canDraw ? 'bg-amber-600 ring-2 ring-amber-400/50 shadow-md' : canDraw ? 'hover:bg-purple-50 text-gray-400' : 'text-gray-400'}`}
                      title="吸管"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={isEyedropper && canDraw ? 'text-white' : canDraw ? 'text-gray-400' : 'text-gray-400'}>
                        <path d="M13.354 2.146a1.5 1.5 0 0 1 2.122 2.122l-3.5 3.5-.707.707-2.122 2.122-1.414 1.414-.707.707-2.475.354-.354 2.475-2.122.707.707-2.122.354-2.475 2.122-2.121.707-.707 2.121-2.122.707-.707zm-.707.707-3.5 3.5-.707.707 2.122 2.121.707-.707 3.5-3.5a.5.5 0 1 0-.707-.707z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => { if (canDraw) { clearCanvas(); guessConnectionsRef.current.forEach(c => { try { c.send({ type: 'clear-canvas' }); } catch(e) {} }); } }}
                      disabled={!canDraw}
                      className={`p-2 rounded-xl transition-all ${canDraw ? 'active:scale-90 hover:bg-red-50 text-gray-400 hover:text-red-400' : 'text-gray-400'}`}
                      title="清空画布"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={canDraw ? 'text-gray-400' : 'text-gray-400'}>
                        <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                      </svg>
                    </button>
                    <div className="w-6 h-px bg-purple-200/50 my-0.5 shrink-0"></div>
                    <div className="flex flex-col items-center gap-0.5 shrink-0">
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={lineWidth}
                        onChange={(e) => { if (canDraw) setLineWidth(Number(e.target.value)); }}
                        disabled={!canDraw}
                        className="slider-vertical"
                        style={{ writingMode: 'vertical-lr', direction: 'rtl', width: '20px', height: '80px', accentColor: '#a855f7' }}
                      />
                      <span className="text-[8px] text-gray-400 font-mono">{lineWidth}px</span>
                    </div>
                    <div className="w-6 h-px bg-gray-100 my-0.5 shrink-0"></div>
                    <div className="flex flex-col items-center gap-1 shrink-0 relative">
                      <button
                        onClick={(e) => { if (canDraw) { const rect = e.currentTarget.getBoundingClientRect(); setGuessPickerPos({ top: rect.top, left: rect.right + 8 }); const [h, s, l] = hexToHsl(color); setGuessHue(h); setGuessSat(s); setGuessLight(l); setGuessColorPickerOpen(!guessColorPickerOpen); } }}
                        disabled={!canDraw}
                        className={`w-8 h-8 rounded-full cursor-pointer border-2 shadow-inner ${canDraw ? 'border-purple-300 hover:border-purple-400' : 'border-gray-200 opacity-50'}`}
                        style={{ backgroundColor: color }}
                      />
                      {guessColorPickerOpen && canDraw && (
                        <div className="absolute left-full ml-2 top-0 z-[100] bg-white rounded-2xl shadow-2xl border border-purple-200/60 p-3 animate-pop-in" style={{ width: '200px' }}>
                          <div className="flex items-center justify-center mb-2">
                            <canvas
                              ref={guessColorWheelRef}
                              width={160}
                              height={160}
                              style={{ width: '160px', height: '160px', cursor: 'crosshair', touchAction: 'none' }}
                              onMouseDown={(e) => { handleGuessWheelDrag.current = true; handleGuessWheelClick(e); }}
                              onMouseMove={handleGuessWheelMouseMove}
                              onTouchStart={(e) => { e.preventDefault(); handleGuessWheelDrag.current = true; handleGuessWheelClick(e.touches[0]); }}
                              onTouchMove={(e) => { e.preventDefault(); if (handleGuessWheelDrag.current) handleGuessWheelClick(e.touches[0]); }}
                            />
                          </div>
                          <div className="flex items-center justify-center mb-2">
                            <canvas
                              ref={guessColorSquareRef}
                              width={120}
                              height={80}
                              style={{ width: '120px', height: '80px', cursor: 'crosshair', borderRadius: '6px', border: '1px solid #e5e7eb', touchAction: 'none' }}
                              onMouseDown={(e) => { handleGuessSquareDrag.current = true; handleGuessSquareClick(e); }}
                              onMouseMove={handleGuessSquareMouseMove}
                              onTouchStart={(e) => { e.preventDefault(); handleGuessSquareDrag.current = true; handleGuessSquareClick(e.touches[0]); }}
                              onTouchMove={(e) => { e.preventDefault(); if (handleGuessSquareDrag.current) handleGuessSquareClick(e.touches[0]); }}
                            />
                          </div>
                          <div className="grid grid-cols-5 gap-1">
                            {['#000000','#FF0000','#0066FF','#00AA00','#FF8800','#8800FF','#FF00AA','#00AAAA','#888888','#FFFFFF'].map(c => (
                              <button
                                key={c}
                                onClick={() => { setColor(c); const [h, s, l] = hexToHsl(c); setGuessHue(h); setGuessSat(s); setGuessLight(l); setIsPaintingMode(true); setIsEraser(false); }}
                                className={`w-6 h-6 rounded-full border-2 transition-all active:scale-90 ${color === c ? 'border-white scale-110 ring-2 ring-purple-400/50 shadow-md' : 'border-gray-200/50 hover:border-purple-300'}`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-1">
                        {['#000000','#FF0000','#0066FF','#00AA00','#FF8800','#8800FF','#FF00AA','#00AAAA','#888888','#FFFFFF'].map(c => (
                          <button
                            key={c}
                            onClick={() => { if (canDraw) { setColor(c); setIsPaintingMode(true); setIsEraser(false); } }}
                            disabled={!canDraw}
                            className={`w-4 h-4 rounded-md border-2 transition-all ${canDraw ? 'active:scale-90' : ''} ${color === c && canDraw ? 'border-white scale-110 ring-2 ring-purple-400/50 shadow-md' : canDraw ? 'border-gray-200/50 hover:border-purple-300' : 'border-gray-200/30'}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ); })()}
                <div data-canvas-area className="flex-1 relative w-full h-full touch-none overflow-hidden"
                  style={{
                    backgroundColor: '#f5f0ff',
                  }}
                  onWheel={handleWheel}
                >
                  {canvasReady && (
                  <div
                    ref={transformContainerRef}
                    className="absolute touch-none select-none"
                    style={{
                      position: 'absolute',
                      top: '50%', left: '50%',
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      width: canvasWidth || DEFAULT_CANVAS_W, height: canvasHeight || DEFAULT_CANVAS_H,
                    }}
                  >
                    <canvas
                      ref={canvasRef}
                      className="block touch-none bg-white shadow-inner"
                      style={{ position: 'absolute', top: 0, left: 0, width: canvasWidth || DEFAULT_CANVAS_W, height: canvasHeight || DEFAULT_CANVAS_H, cursor: isEyedropper ? 'crosshair' : cadMode ? 'crosshair' : 'default', imageRendering: 'auto' }}
                      {...canvasEvents}
                    />
                  </div>
                  )}

                  {!guessDevMode && !isGuessDrawer && guessGameState === 'playing' && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none animate-game-enter animate-game-d4">
                      <div className="flex items-center gap-2 px-4 py-1.5 bg-white/80 backdrop-blur rounded-full shadow-sm border border-purple-100 text-xs text-purple-400">
                        <span>👀</span> 观察画手作画，在下方输入你的猜测
                      </div>
                    </div>
                  )}
                </div>
              </div>

            {!guessDevMode && (<div className="bg-gradient-to-b from-gray-800 to-gray-900 border-t border-purple-500/20 shrink-0 animate-game-enter animate-game-d4 flex flex-col" style={{ height: '18vh' }}>
              <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-gray-700/50">
                <div className="flex items-center gap-1.5 overflow-x-auto flex-1">
                  {guessPlayers.map((p) => (
                    <div key={p.id} className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] shrink-0 ${p.id === guessDrawerId ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-gray-700/50 text-gray-400'}`}>
                      <span className="font-medium">{p.name}</span>
                      <span className="opacity-60">{guessScores[p.id] || 0}</span>
                      {p.id === guessDrawerId && <span className="text-[9px]">✏️</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="overflow-y-auto px-3 py-1.5 space-y-0.5 flex-1" ref={el => { if (el) el.scrollTop = el.scrollHeight; }}>
                {guessChatMessages.slice(-50).map((msg, i) => (
                  <div key={i} className={`text-xs leading-relaxed ${msg.type === 'system' ? 'text-gray-400 italic' : msg.type === 'correct' ? 'text-emerald-400 font-bold' : 'text-gray-200'}`}>
                    {msg.type === 'chat' && <span className="text-purple-400 font-medium">{msg.name}: </span>}
                    {msg.text}
                  </div>
                ))}
              </div>
              <div className="px-3 py-1.5 border-t border-gray-700/50">
                {showEmojiPicker && (
                  <div className="mb-1.5 p-2 bg-gray-800/95 rounded-xl border border-purple-500/30 grid grid-cols-8 gap-1 max-h-28 overflow-y-auto shadow-lg shadow-black/30 backdrop-blur-sm">
                    {['😀','😂','🤣','😊','😍','🥰','😘','😜','🤔','😏','😎','🥳','😢','😭','😤','😡','🤯','😱','🤗','🤩','😴','🥱','😷','🤒','👍','👎','👏','🙌','🤝','✌️','🤞','💪','❤️','💛','💚','💙','💜','🖤','💯','🔥','🌟','🎉','🎊','🏆','🎨','🖌️','✏️','📝','💡','🔍','🎯','🎲','🎳','🎮','🎵','🎶','❓','❗','‼️','🆗','🆒','🆕','🆘'].map((emoji, i) => (
                      <button
                        key={i}
                        onClick={() => { setGuessChatInput(prev => prev + emoji); setShowEmojiPicker(false); }}
                        className="text-lg hover:bg-purple-600/30 hover:scale-110 rounded-lg p-1 transition-all"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`px-2.5 py-2 rounded-xl text-base transition-all ${showEmojiPicker ? 'bg-purple-600/40 border border-purple-400 shadow-sm' : 'bg-gray-700 border border-purple-500/30 hover:border-purple-400 hover:bg-gray-600'}`}
                    title="表情"
                  >
                    😊
                  </button>
                  <input
                    type="text"
                    value={guessChatInput}
                    onChange={(e) => setGuessChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') guessSendChat(); }}
                    placeholder={isGuessDrawer && guessGameState === 'playing' ? '画手不能说话哦' : '输入猜测...'}
                    disabled={isGuessDrawer && guessGameState === 'playing'}
                    className="flex-1 px-3 py-2 rounded-xl bg-gray-700 border border-purple-500/30 text-white text-xs outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30 disabled:opacity-30 placeholder-gray-400 shadow-inner"
                  />
                  <button
                    onClick={guessSendChat}
                    disabled={(isGuessDrawer && guessGameState === 'playing') || !guessChatInput.trim()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-bold disabled:opacity-30 active:scale-95 transition-all shadow-md shadow-purple-500/30 hover:from-purple-400 hover:to-indigo-400"
                  >
                    发送
                  </button>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      )}

      {showGuessGame && !guessConnected && !guessDevMode && (
      <div className={`fixed inset-0 z-[9999] flex flex-col ${guessGameExiting ? 'animate-game-exit' : 'animate-game-enter'} ${gt.bg} transition-colors duration-500`}>
        <div className={`flex items-center justify-between px-4 py-2.5 shrink-0 ${guessGameExiting ? 'animate-game-exit-d1' : 'animate-game-enter animate-game-d1'}`}>
          <button onClick={() => { setGuessGameExiting(true); setTimeout(() => { setShowGuessGame(false); setGuessGameExiting(false); if (onGuessGameExit) onGuessGameExit(); }, 300); }}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors active:scale-95">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="flex items-center gap-1.5 ml-auto mr-2">
            <button onClick={() => setGuessDevMode(!guessDevMode)} className={`relative w-8 h-4 rounded-full transition-colors ${guessDevMode ? 'bg-amber-400' : 'bg-gray-300'}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${guessDevMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { const themes = ['light','dark','glass']; setGuessTheme(themes[(themes.indexOf(guessTheme)+1)%themes.length]); }} className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all ${gt.iconHover} group`} title="切换主题">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="0" className="transition-transform group-active:scale-90">
                <defs>
                  <linearGradient id="themeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={guessTheme==='light'?'#f59e0b':guessTheme==='dark'?'#8b5cf6':'#3b82f6'}/>
                    <stop offset="100%" stopColor={guessTheme==='light'?'#f97316':guessTheme==='dark'?'#a78bfa':'#06b6d4'}/>
                  </linearGradient>
                </defs>
                {guessTheme==='light' && <><circle cx="12" cy="12" r="5" fill="url(#themeGrad)"/><g stroke="url(#themeGrad)" strokeWidth="2" strokeLinecap="round"><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></g></>}
                {guessTheme==='dark' && <><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="url(#themeGrad)"/></>}
                {guessTheme==='glass' && <><rect x="3" y="3" width="18" height="18" rx="5" fill="url(#themeGrad)" opacity="0.15"/><rect x="3" y="3" width="18" height="18" rx="5" stroke="url(#themeGrad)" strokeWidth="2" fill="none"/><path d="M7 10l3 3 7-7" stroke="url(#themeGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></>}
              </svg>
              <span className={`text-[9px] font-bold tracking-wide ${gt.sub}`}>{guessTheme==='light'?'暖色':guessTheme==='dark'?'暗色':'晶透'}</span>
            </button>
            <button onClick={() => setShowRulesDialog(true)} className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl ${gt.iconHover} transition-all group`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${gt.icon} transition-transform group-active:scale-90`}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              <span className={`text-[9px] font-bold tracking-wide ${gt.sub}`}>玩家</span>
            </button>
            <button disabled onClick={() => {}} className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl opacity-40 cursor-not-allowed transition-all group pointer-events-none`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stroke-gray-400 transition-transform group-active:scale-90">
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
              <span className="text-[9px] font-bold tracking-wide text-gray-400">音效</span>
            </button>
          </div>
        </div>
        <div className="flex-1 flex min-h-0 overflow-y-auto px-6 pb-6">
          <div className="flex-1 max-w-4xl mx-auto w-full pt-4">
            <div className="flex items-center justify-center mb-4 sm:mb-6 relative animate-game-enter animate-game-d2">
              <div className="text-center relative z-10"><h1 className={`text-3xl sm:text-4xl font-black tracking-tight ${gt.title}`}>你画我猜</h1></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 animate-game-enter animate-game-d3">
              <div className={`${gt.card} backdrop-blur rounded-2xl p-4 sm:p-5 shadow-lg ${gt.border} border`}>
                <div className="flex items-center gap-3 mb-3 sm:mb-4"><div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gt.btn1} flex items-center justify-center shadow-md ${gt.btn1shadow}`}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></div><div><h3 className={`text-base font-bold ${gt.title}`}>创建房间</h3><p className={`text-[11px] ${gt.sub}`}>创建一个属于你的游戏房子</p></div></div>
                <div className="space-y-2.5 sm:space-y-3">
                  <div><label className={`text-[11px] font-semibold ${gt.sub} block mb-1`}>昵称</label><input type="text" value={guessNickname} onChange={(e)=>setGuessNickname(e.target.value)} placeholder="输入你的昵称" className={`w-full px-3 py-2 sm:py-2.5 ${gt.input} rounded-xl text-sm outline-none transition-all`}/></div>
                  <button onClick={guessCreateRoom} disabled={!guessNickname.trim()} className={`w-full py-2 sm:py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r ${gt.btn1} disabled:opacity-35 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md ${gt.btn1shadow} hover:shadow-lg`}>创建房间<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button>
                </div>
              </div>
              <div className={`${gt.card} backdrop-blur rounded-2xl p-4 sm:p-5 shadow-lg ${gt.border} border`}>
                <div className="flex items-center gap-3 mb-3 sm:mb-4"><div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gt.btn2} flex items-center justify-center shadow-md ${gt.btn2shadow}`}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div><h3 className={`text-base font-bold ${gt.title}`}>加入房间</h3><p className={`text-[11px] ${gt.sub}`}>输入房间号加入游戏</p></div></div>
                <div className="space-y-2.5 sm:space-y-3">
                  <div><label className={`text-[11px] font-semibold ${gt.sub} block mb-1`}>房间号</label><div className="relative"><input type="text" value={guessInputRoomId} onChange={(e)=>setGuessInputRoomId(e.target.value.toUpperCase())} placeholder="输入 5 位房间号" maxLength={5} className={`w-full pl-3 pr-9 py-2 sm:py-2.5 ${gt.input} rounded-xl text-sm outline-none tracking-[0.25em] sm:tracking-[0.4em] text-center font-mono transition-all uppercase`}/><svg className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${gt.sub}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="19" cy="17" r="2"/></svg></div></div>
                  <button onClick={guessJoinRoom} disabled={!guessNickname.trim()||!guessInputRoomId.trim()||guessIsJoining} className={`w-full py-2 sm:py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r ${gt.btn2} disabled:opacity-35 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md ${gt.btn2shadow} hover:shadow-lg`}>{guessIsJoining?(<><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>加入中...</>):(<>加入房间<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>)}</button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 my-3 animate-game-enter animate-game-d4"><div className={`flex-1 h-px bg-gradient-to-r from-transparent ${gt.divider} to-transparent`}></div><span className={`text-[11px] ${gt.sub} font-medium tracking-wider whitespace-nowrap`}>更多方式</span><div className={`flex-1 h-px bg-gradient-to-r from-transparent ${gt.divider} to-transparent`}></div></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 animate-game-enter animate-game-d4">
              <button onClick={guessScanLanRooms} disabled={!guessNickname.trim()||guessIsScanningLan} className={`flex items-center gap-3 ${gt.card} backdrop-blur rounded-xl p-3.5 sm:p-4 shadow-lg ${gt.border} border hover:shadow-xl transition-all disabled:opacity-40 active:scale-[0.98]`}><div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gt.btn1} flex items-center justify-center shrink-0`}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10M2.5 9h19M2 15h19"/></svg></div><div className="text-left min-w-0"><p className={`text-sm font-bold ${gt.title} truncate`}>搜寻局域网联机房间</p><p className={`text-[11px] ${gt.sub}`}>{guessIsScanningLan?'正在扫描...':'快速加入身边的房间'}</p></div>{guessIsScanningLan?<svg className="animate-spin h-4 w-4 ml-auto shrink-0" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke={gt.accent} strokeWidth="4" fill="none"/><path className="opacity-75" fill={gt.accent} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={gt.accent} strokeWidth="2.5" strokeLinecap="round" className="ml-auto shrink-0"><path d="M9 18l6-6-6-6"/></svg>}</button>
              <button onClick={guessScanLobbyRooms} disabled={!guessNickname.trim()||guessIsScanningLobby} className={`flex items-center gap-3 ${gt.card} backdrop-blur rounded-xl p-3.5 sm:p-4 shadow-lg ${gt.border} border hover:shadow-xl transition-all disabled:opacity-40 active:scale-[0.98]`}><div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gt.btn2} flex items-center justify-center shrink-0`}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div><div className="text-left min-w-0"><p className={`text-sm font-bold ${gt.title} truncate`}>大厅寻房</p><p className={`text-[11px] ${gt.sub}`}>{guessIsScanningLobby?'正在搜索...':'寻找服务器房间'}</p></div>{guessIsScanningLobby?<svg className="animate-spin h-4 w-4 ml-auto shrink-0" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke={gt.accent} strokeWidth="4" fill="none"/><path className="opacity-75" fill={gt.accent} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={gt.accent} strokeWidth="2.5" strokeLinecap="round" className="ml-auto shrink-0"><path d="M9 18l6-6-6-6"/></svg>}</button>
            </div>
            {guessHallMsg && (<div className="text-center text-xs py-2 text-red-400 animate-pulse">{guessHallMsg}</div>)}
            {guessDiscoveredRooms.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-[11px] font-bold text-gray-400">发现 {guessDiscoveredRooms.length} 个房子</p>
                {guessDiscoveredRooms.map(room => (
                  <button
                    key={room.roomId}
                    onClick={() => guessJoinRoom(room.roomId)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-white/80 backdrop-blur rounded-xl border border-white/60 hover:border-purple-300 active:scale-[0.99] transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-2 py-0.5 rounded-lg bg-purple-100 text-purple-600">{room.roomId}</span>
                      <span className="text-xs text-gray-400">{room.hostName}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">{room.playerCount}人</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {showRulesDialog && (
          <div className="absolute inset-0 z-[10000] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowRulesDialog(false)} />
            <div className={`relative w-[90%] max-w-md max-h-[80vh] rounded-3xl shadow-2xl overflow-hidden animate-fade-in ${gt.card} backdrop-blur-xl`}>
              <div className="flex items-center justify-between p-5 border-b border-gray-200/20">
                <h2 className={`text-xl font-black ${gt.title}`}>玩法说明</h2>
                <button onClick={() => setShowRulesDialog(false)} className={`p-2 rounded-xl ${gt.iconHover} transition-colors`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh]">
                <div className="space-y-2">
                  <h3 className={`text-sm font-bold ${gt.title} flex items-center gap-2`}><span className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs font-black">1</span>创建房间</h3>
                  <p className={`text-xs ${gt.sub} pl-8`}>输入昵称后点击“创建房间”，系统会生成一个 5 位房间号，分享给朋友即可开始游戏。</p>
                </div>
                <div className="space-y-2">
                  <h3 className={`text-sm font-bold ${gt.title} flex items-center gap-2`}><span className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-black">2</span>加入房间</h3>
                  <p className={`text-xs ${gt.sub} pl-8`}>输入房间号或搜索局域网房间，快速加入朋友的游戏。</p>
                </div>
                <div className="space-y-2">
                  <h3 className={`text-sm font-bold ${gt.title} flex items-center gap-2`}><span className="w-6 h-6 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-xs font-black">3</span>游戏规则</h3>
                  <p className={`text-xs ${gt.sub} pl-8`}>每轮由一名玩家画画，其他玩家猜词。画画的玩家可以看到提示词，用画笔在画板上画出内容。猜词的玩家在聊天框中输入答案。</p>
                </div>
                <div className="space-y-2">
                  <h3 className={`text-sm font-bold ${gt.title} flex items-center gap-2`}><span className="w-6 h-6 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-xs font-black">4</span>计分规则</h3>
                  <p className={`text-xs ${gt.sub} pl-8`}>越早猜对得分越高！画画的玩家也会根据猜对人数获得加分。游戏结束后得分最高的玩家获胜！</p>
                </div>
                <div className="space-y-2">
                  <h3 className={`text-sm font-bold ${gt.title} flex items-center gap-2`}><span className="w-6 h-6 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white text-xs font-black">5</span>小技巧</h3>
                  <p className={`text-xs ${gt.sub} pl-8`}>画画时善用不同颜色和画笔粗细，猜词时注意观察画画的顺序和细节。支持发送emoji表情互动哦！</p>
                </div>
              </div>
              <div className="p-4 border-t border-gray-200/20">
                <button onClick={() => setShowRulesDialog(false)} className={`w-full py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r ${gt.btn1} active:scale-[0.98] transition-all shadow-md ${gt.btn1shadow}`}>知道了</button>
              </div>
            </div>
          </div>
        )}

      </div>
    )}

      {!(showGuessGame && (guessConnected || guessDevMode)) && (
      <div data-canvas-area className={`flex-1 relative w-full h-full touch-none overflow-hidden ${cadMode ? 'cursor-crosshair' : isEyedropper ? 'cursor-crosshair' : isEraser ? 'cursor-cell' : isBucket ? 'cursor-crosshair' : isPaintingMode ? 'cursor-default' : 'cursor-crosshair'}`}
        style={cadMode ? {
          backgroundColor: '#0a0d14',
          backgroundImage: 'linear-gradient(rgba(6,182,212,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.12) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        } : {
          backgroundColor: '#0a0d14',
          backgroundImage: 'linear-gradient(rgba(6,182,212,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.12) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
        onWheel={handleWheel}
      >
        {isPixelMode && (
          <div className="absolute top-2 left-2 z-20 flex items-center gap-2 px-3 py-1.5 bg-gray-900/90 backdrop-blur rounded-full border border-white/10 shadow-lg">
            <span className="text-[10px] text-gray-400 font-medium">网格</span>
            <button onClick={() => setPixelGridSize(Math.max(4, pixelGridSize - 2))} className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 text-xs transition-colors">−</button>
            <span className="text-[11px] text-white font-mono font-bold w-8 text-center">{pixelGridSize}</span>
            <button onClick={() => setPixelGridSize(Math.min(128, pixelGridSize + 2))} className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 text-xs transition-colors">+</button>
            <span className="text-[10px] text-gray-500">px</span>
            <input
              type="range" min="4" max="128" step="1" value={pixelGridSize}
              onChange={(e) => setPixelGridSize(Number(e.target.value))}
              className="w-16 h-1 accent-blue-400"
            />
          </div>
        )}
        {isPixelMode && (
          <div className="absolute top-2 right-2 z-20 flex flex-col gap-1 px-3 py-2 bg-gray-900/90 backdrop-blur rounded-xl border border-white/10 shadow-lg">
            <span className="text-[10px] text-gray-400 font-medium mb-0.5">像素模式</span>
            <button
              onClick={() => setPixelModeType('full')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                pixelModeType === 'full'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200'
              }`}
            >
              纯像素
            </button>
            <button
              onClick={() => setPixelModeType('grid-only')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                pixelModeType === 'grid-only'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200'
              }`}
            >
              仅网格线
            </button>
          </div>
        )}
        {onionSkin && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-2.5 py-1 bg-purple-600/90 backdrop-blur rounded-full border border-purple-400/20 shadow-lg flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-300 animate-pulse" />
            <span className="text-[10px] text-white font-medium">洋葱皮</span>
          </div>
        )}
        {canvasReady && (
        <div
          ref={transformContainerRef}
          className="absolute touch-none"
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: `translate(-50%, -50%) translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom}) rotate(${canvasRotation}deg)`,
            transformOrigin: 'center center',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            contain: 'layout style paint',
            width: canvasWidth || DEFAULT_CANVAS_W, height: canvasHeight || DEFAULT_CANVAS_H,
          }}
        >
          <canvas
            ref={canvasRef}
            className="block touch-none"
            style={{ position: 'absolute', top: 0, left: 0, width: canvasWidth || DEFAULT_CANVAS_W, height: canvasHeight || DEFAULT_CANVAS_H, cursor: isEyedropper ? 'crosshair' : cadMode ? 'crosshair' : 'default' }}
            {...canvasEvents}
          />
          <canvas
            ref={onionSkinOverlayRef}
            className="block touch-none pointer-events-none"
            style={{
              position: 'absolute',
              top: 0, left: 0,
              width: canvasWidth || DEFAULT_CANVAS_W, height: canvasHeight || DEFAULT_CANVAS_H,
              display: onionSkin ? 'block' : 'none',
            }}
          />
          {isPixelMode && (
            <canvas
              ref={pixelGridRef}
              className="block pointer-events-none"
              style={{ position: 'absolute', top: 0, left: 0, width: canvasWidth || DEFAULT_CANVAS_W, height: canvasHeight || DEFAULT_CANVAS_H }}
            />
          )}
          {showLineArtOverlay && lineArtOverlay && (
            <img
              src={lineArtOverlay}
              alt=""
              draggable={false}
              className="block touch-none pointer-events-none"
              style={{ position: 'absolute', top: 0, left: 0, width: canvasWidth || DEFAULT_CANVAS_W, height: canvasHeight || DEFAULT_CANVAS_H, opacity: 0.7, mixBlendMode: 'multiply' }}
            />
          )}
          {symmetryMode !== 'none' && (
            <canvas
              ref={symmetryGuideRef}
              className="block pointer-events-none"
              style={{ position: 'absolute', top: 0, left: 0, width: canvasWidth || DEFAULT_CANVAS_W, height: canvasHeight || DEFAULT_CANVAS_H, zIndex: 5 }}
            />
          )}
          <canvas
            ref={willowLeafPreviewRef}
            className="block pointer-events-none"
            style={{ position: 'absolute', top: 0, left: 0, width: canvasWidth || DEFAULT_CANVAS_W, height: canvasHeight || DEFAULT_CANVAS_H, zIndex: 6 }}
          />
          {(perspectivePoints.length > 0 || isAddingPerspectivePoint) && (() => {
            const cw = canvasWidth;
            const ch = canvasHeight;
            if (!cw || !ch) return null;
            const guides = [];
            perspectivePoints.forEach((vp, vi) => {
              guides.push(<circle key={`vp-${vi}`} cx={vp.x} cy={vp.y} r="6" fill="none" stroke="rgba(239,68,68,0.7)" strokeWidth="2"/>);
              guides.push(<circle key={`vp2-${vi}`} cx={vp.x} cy={vp.y} r="3" fill="rgba(239,68,68,0.5)"/>);
              for (let a = 0; a < 12; a++) {
                const angle = (Math.PI * 2 / 12) * a;
                const len = Math.max(cw, ch) * 1.5;
                guides.push(<line key={`g-${vi}-${a}`} x1={vp.x} y1={vp.y} x2={vp.x + Math.cos(angle)*len} y2={vp.y + Math.sin(angle)*len} stroke="rgba(239,68,68,0.15)" strokeWidth="1" strokeDasharray="8 6"/>);
              }
            });
            if (isAddingPerspectivePoint && perspectivePoints.length === 0) {
              guides.push(<text key="hint" x={cw/2} y={ch/2} textAnchor="middle" fill="rgba(239,68,68,0.5)" fontSize="14" fontWeight="bold">点击画布添加消失点</text>);
            }
            return <svg xmlns="http://www.w3.org/2000/svg" style={{ position:'absolute',top:0,left:0,width:'100%',height:'100%',pointerEvents:isAddingPerspectivePoint?'auto':'none',zIndex:6 }} onClick={isAddingPerspectivePoint ? (e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              setPerspectivePoints(prev => [...prev, { x, y }]);
            } : undefined}>{guides}</svg>;
          })()}
          {guideLines.length > 0 && guideLines.map((g, idx) => (
            <div
              key={g.id}
              className="absolute z-[6] group"
              style={g.type === 'horizontal'
                ? { top: g.position, left: 0, right: 0, height: 1, cursor: 'row-resize' }
                : { left: g.position, top: 0, bottom: 0, width: 1, cursor: 'col-resize' }
              }
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); draggingGuideIdxRef.current = idx; setDraggingGuideIdx(idx); }}
              onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); draggingGuideIdxRef.current = idx; setDraggingGuideIdx(idx); }}
            >
              <div className={g.type === 'horizontal'
                ? 'w-full h-[1px] bg-cyan-400/60 group-hover:bg-cyan-300'
                : 'h-full w-[1px] bg-cyan-400/60 group-hover:bg-cyan-300'
              } />
              <div className={`absolute ${g.type === 'horizontal' ? '-top-3 left-1' : '-left-3 top-1'} opacity-0 group-hover:opacity-100 transition-opacity bg-cyan-500/80 text-white text-[8px] px-1 rounded pointer-events-none`}>
                {Math.round(g.position)}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeGuideLine(g.id); }}
                className={`absolute ${g.type === 'horizontal' ? '-top-2 right-1' : '-top-2 -left-2'} w-3 h-3 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[7px] leading-none`}
              >✕</button>
            </div>
          ))}
          {cadMode && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm text-[10px] text-white/80 pointer-events-none select-none whitespace-nowrap">
              <span className="px-1.5 py-0.5 bg-cyan-500/20 rounded text-cyan-400 font-bold text-[11px]">
                {cadTool === 'line' ? '直线' : cadTool === 'circle' ? '圆' : cadTool === 'rectangle' ? '矩形' : cadTool === 'arc' ? '弧' : cadTool === 'polygon' ? '多边形' : cadTool === 'spline' ? '样条' : cadTool === 'select' ? '选择' : cadTool === 'trim' ? '修剪' : cadTool === 'dimension' ? '标注' : cadTool}
              </span>
              {(cadTool === 'polygon' || cadTool === 'spline') && (
                <span className="text-cyan-300/80 ml-0.5">
                  {cadPolyPoints.current.length}点
                  <span className="text-white/50 ml-1">双击完成</span>
                </span>
              )}
              {cadTool === 'arc' && (
                <span className="text-cyan-300/80 ml-0.5">
                  {lineStartRef.current && !cadArcMid.current ? '拖拽设置中点' : lineStartRef.current && cadArcMid.current ? '拖拽完成弧线' : '点击设置起点'}
                </span>
              )}
              {(cadTool === 'line' || cadTool === 'circle' || cadTool === 'rectangle') && (
                <span className="text-white/50 ml-0.5">
                  {(lineStartRef.current || circleCenterRef.current || cadShapeStart.current) ? '触摸终点松手完成' : '触摸设置起点'}
                </span>
              )}
              {cadTool === 'trim' && (
                <span className="text-white/50 ml-0.5">
                  {lineStartRef.current ? '点击/拖拽修剪终点' : '点击修剪起点或拖拽擦除'}
                </span>
              )}
              {cadTool === 'dimension' && (
                <span className="text-white/50 ml-0.5">
                  {cadDimStart.current ? '松手完成标注' : '按下拖拽标注'}
                </span>
              )}
            </div>
          )}
          {cadMode && cadTouchCursor.visible && (
            <div className="absolute z-20 pointer-events-none" style={{ left: cadTouchCursor.x, top: cadTouchCursor.y, transform: 'translate(-50%, -50%)' }}>
              <svg width="40" height="40" viewBox="0 0 40 40" style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))' }}>
                <line x1="20" y1="0" x2="20" y2="16" stroke="cyan" strokeWidth="1.5" />
                <line x1="20" y1="24" x2="20" y2="40" stroke="cyan" strokeWidth="1.5" />
                <line x1="0" y1="20" x2="16" y2="20" stroke="cyan" strokeWidth="1.5" />
                <line x1="24" y1="20" x2="40" y2="20" stroke="cyan" strokeWidth="1.5" />
                <circle cx="20" cy="20" r="3" fill="none" stroke="cyan" strokeWidth="1.5" />
              </svg>
            </div>
          )}
          {refImages.map(img => { return createPortal(
            <div
              key={img.id}
              data-ref-img={img.id}
              onMouseDown={(e) => handleRefMouseDown(img.id, e)}
              onTouchStart={(e) => {
                handleRefPinchStart(e);
                if (e.touches.length === 2) return;
                const t = e.touches[0];
                handleRefMouseDown(img.id, { button: 0, preventDefault: () => e.preventDefault(), stopPropagation: () => e.stopPropagation(), currentTarget: e.currentTarget, clientX: t.clientX, clientY: t.clientY });
              }}
              onTouchMove={handleRefPinchMove}
              onTouchEnd={handleRefPinchEnd}
              className={`fixed select-none ${draggingRefId === img.id ? 'z-[10002] cursor-grabbing' : 'z-[10001] cursor-grab'}`}
              style={{ left: img.x, top: img.y, userSelect: 'none', touchAction: 'none', position: 'fixed' }}
            >
              <div className="relative group" style={{ width: img.baseW }}>
                <div className="absolute -top-14 left-0 right-0 flex items-center gap-2 px-3 py-1 bg-gray-800/80 backdrop-blur-sm rounded-t-lg z-10">
                  <span className="text-[18px] text-white/70 font-mono shrink-0">{Math.round(img.viewScale * 100)}%</span>
                  <div className="w-px h-6 bg-white/20" />
                  <button onClick={(e) => { e.stopPropagation(); resizeRefImage(img.id, -30); }} className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors" title="缩小窗口">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14"/></svg>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); resizeRefImage(img.id, 30); }} className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors" title="放大窗口">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); resetRefImageView(img.id); }} className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors ml-auto" title="重置视图">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                  </button>
                </div>
                <div className="relative rounded-lg overflow-hidden shadow-xl ring-2 ring-white/60" style={{ width: img.baseW, height: img.baseH }}>
                  <img
                    src={img.src} alt="" draggable={false}
                    className="block max-w-none"
                    style={{
                      width: img.baseW,
                      height: img.baseH,
                      transform: `scale(${img.viewScale})`,
                      transformOrigin: `${img.viewOriginX}% ${img.viewOriginY}%`,
                      transition: draggingRefId === null ? 'transform 0.15s ease-out' : 'none',
                    }}
                  />
                  <div className="absolute inset-0 border border-dashed border-emerald-400/30 pointer-events-none rounded-lg" />
                  {img.viewScale > 1 && (
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm text-[9px] text-white/80 font-mono pointer-events-none">
                      🔍 {Math.round(img.viewScale * 100)}%
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-5 left-1 flex items-center gap-1">
                  <span className="text-[9px] font-medium text-emerald-600/70 bg-emerald-500/10 px-1.5 py-0.5 rounded-full whitespace-nowrap">参考图</span>
                  <span className="text-[8px] text-gray-400">{img.baseW}×{img.baseH}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeRefImage(img.id); }}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-20"
                  title="移除参考图"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
          , document.body); })}
        </div>
        )}
        {isDragOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-teal-500/20 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 p-8 rounded-3xl bg-white/90 shadow-2xl border-2 border-dashed border-teal-400">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-teal-500">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-lg font-black text-teal-600">拖放图片导入</span>
            </div>
          </div>
        )}
      </div>
      )}

      {showWidthMenu && createPortal(
        <div className="fixed inset-0 z-[10000]" onClick={() => setShowWidthMenu(false)}>
          <div className="absolute drawing-popup animate-pop-in p-4 w-52 max-w-[90vw]"
            style={{ top: menuPos.top, left: menuPos.left }}
            onClick={(e) => e.stopPropagation()}
            data-width-menu
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-gray-300 tracking-wider uppercase">画笔粗细</span>
              <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-0.5 border border-white/5">
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={lineWidth}
                  onChange={(e) => {
                    let v = parseInt(e.target.value);
                    if (isNaN(v)) v = 1;
                    v = Math.max(1, Math.min(500, v));
                    setLineWidth(v);
                  }}
                  className="w-9 h-5 text-center text-[10px] font-black bg-transparent outline-none text-teal-400"
                />
                <span className="text-[9px] text-gray-500 font-medium">px</span>
              </div>
            </div>
            <div className="relative mb-3">
              <input
                type="range"
                min="1"
                max="500"
                value={lineWidth}
                onChange={(e) => setLineWidth(parseInt(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, #14b8a6 0%, #14b8a6 ${(lineWidth/500)*100}%, rgba(255,255,255,0.1) ${(lineWidth/500)*100}%, rgba(255,255,255,0.1) 100%)` }}
              />
            </div>
            <div className="drawing-popup-divider" />
            <div className="grid grid-cols-7 gap-1.5 mt-2">
              {[1, 3, 8, 15, 30, 80, 200].map(w => (
                <button
                  key={w}
                  onClick={() => setLineWidth(w)}
                  className={`flex flex-col items-center gap-1 py-1.5 drawing-popup-item ${lineWidth === w ? 'bg-teal-500/20 ring-1 ring-teal-500/40' : ''}`}
                >
                  <div className="flex items-center justify-center h-5">
                    <div className="rounded-full bg-teal-400" style={{ width: Math.max(Math.min(w * 0.12, 14), 2), height: Math.max(Math.min(w * 0.12, 14), 2) }}></div>
                  </div>
                  <span className="text-[8px] text-gray-500 font-bold">{w}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      , document.body)}

      {showSaveMenu && createPortal(
        <div className="fixed inset-0 z-[10000]" onClick={() => { setShowSaveMenu(false); setShowAutoSaveSettings(false); }}>
          <div className="absolute drawing-popup animate-pop-in overflow-hidden w-56 max-w-[90vw]"
            style={{ top: menuPos.top, left: menuPos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-1.5">
              <button
                onClick={() => { saveCanvas(); setShowSaveMenu(false); }}
                className="w-full px-3 py-2.5 text-xs font-semibold text-left flex items-center gap-2.5 drawing-popup-item text-gray-200"
              >
                <div className="w-7 h-7 rounded-lg bg-green-500/15 flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                </div>
                <div>
                  <div>手动保存</div>
                  <div className="text-[9px] text-gray-500 font-normal mt-0.5">保存到本地存储</div>
                </div>
              </button>

              <div className="drawing-popup-divider" />

              <div className="flex items-center px-3 py-2">
                <button
                  onClick={() => { setAutoSave(!autoSave); }}
                  className="flex-1 flex items-center gap-2.5 drawing-popup-item -mx-1 px-1 py-1 rounded-lg"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <span className={`text-xs font-semibold ${autoSave ? 'text-blue-400' : 'text-gray-400'}`}>自动保存</span>
                </button>
                <div className={`relative w-10 h-5 rounded-full transition-all duration-300 cursor-pointer ${autoSave ? 'bg-blue-500' : 'bg-white/10'}`} onClick={() => setAutoSave(!autoSave)}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300 ${autoSave ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <button
                  onClick={() => setShowAutoSaveSettings(!showAutoSaveSettings)}
                  className={`p-1.5 ml-1 rounded-lg transition-all ${showAutoSaveSettings ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-gray-400'}`}
                  title="保存间隔设置"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </button>
              </div>
              {showAutoSaveSettings && (
                <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-gray-500 font-medium block mb-1.5">保存间隔</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 5, 10].map(m => (
                      <button
                        key={m}
                        onClick={() => { setAutoSaveInterval(m); localStorage.setItem('drawing_autosave_interval', m.toString()); }}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-all ${autoSaveInterval === m ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}
                      >
                        {m}分钟
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="drawing-popup-divider" />

              <button
                onClick={() => { fileInputRef.current?.click(); setShowSaveMenu(false); }}
                className="w-full px-3 py-2.5 text-xs font-semibold text-left flex items-center gap-2.5 drawing-popup-item text-gray-200"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </div>
                <div>
                  <div>导入图片</div>
                  <div className="text-[9px] text-gray-500 font-normal mt-0.5">支持 PNG, JPG, BMP 格式</div>
                </div>
              </button>

              <div className="drawing-popup-divider" />

              <button
                onClick={() => { handleExportImage('png'); setShowSaveMenu(false); }}
                className="w-full px-3 py-2.5 text-xs font-semibold text-left flex items-center gap-2.5 drawing-popup-item text-gray-200"
              >
                <div className="w-7 h-7 rounded-lg bg-yellow-500/15 flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <div>
                  <div>导出 PNG</div>
                  <div className="text-[9px] text-gray-500 font-normal mt-0.5">无损透明背景</div>
                </div>
              </button>
              <button
                onClick={() => { handleExportImage('jpg'); setShowSaveMenu(false); }}
                className="w-full px-3 py-2.5 text-xs font-semibold text-left flex items-center gap-2.5 drawing-popup-item text-gray-200"
              >
                <div className="w-7 h-7 rounded-lg bg-orange-500/15 flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <div>
                  <div>导出 JPG</div>
                  <div className="text-[9px] text-gray-500 font-normal mt-0.5">压缩体积更小</div>
                </div>
              </button>

              {lastSaveTime && (
                <>
                  <div className="drawing-popup-divider" />
                  <div className="px-3 py-1.5 text-[9px] text-gray-600 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    上次保存: {lastSaveTime.toLocaleTimeString()}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      , document.body)}
    </div>
    </div>
  );
};

export default DrawingTab;
