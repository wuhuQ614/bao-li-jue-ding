import React, { useState, useEffect } from 'react';

const CANVAS_PRESETS = [
  { label: '默认', w: 1920, h: 1080 },
  { label: '正方形', w: 1080, h: 1080 },
  { label: 'A4竖版', w: 3508, h: 2480 },
  { label: 'A4横版', w: 2480, h: 3508 },
  { label: '16:9', w: 1080, h: 1920 },
  { label: '4:3', w: 1600, h: 1200 },
  { label: '手机竖屏', w: 1080, h: 1920 },
  { label: '方型小', w: 512, h: 512 },
  { label: '超宽', w: 1080, h: 3840 },
];

const STORAGE_KEY = 'drawing_artworks';

const loadArtworks = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
};

const saveArtworks = (list) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
};

const loadAllArtworks = () => {
  const all = [];
  const seenIds = new Set();
  const seenData = new Set();

  const addArt = (art) => {
    if (art.id && seenIds.has(art.id)) return;
    if (art.dataURL && seenData.has(art.dataURL)) return;
    if (art.id) seenIds.add(art.id);
    if (art.dataURL) seenData.add(art.dataURL);
    all.push(art);
  };

  try {
    const artworks = JSON.parse(localStorage.getItem('drawing_artworks') || '[]');
    artworks.forEach(addArt);
  } catch {}

  try {
    const saved = JSON.parse(localStorage.getItem('drawing_saved_canvases') || '[]');
    saved.forEach(s => {
      addArt({
        id: 'saved_' + (s.time || Date.now()),
        name: s.name || '手动保存',
        w: 0,
        h: 0,
        dataURL: s.data,
        thumbnail: s.thumb,
        date: s.time || '',
        timestamp: new Date(s.time).getTime() || Date.now(),
        isSaved: true,
      });
    });
  } catch {}

  try {
    const auto = JSON.parse(localStorage.getItem('drawing_autosave_history') || '[]');
    auto.forEach(a => {
      addArt({
        id: 'auto_' + (a.time || Date.now()),
        name: '自动保存',
        w: 0,
        h: 0,
        dataURL: a.data,
        thumbnail: a.thumb,
        date: a.time || '',
        timestamp: a.timestamp || new Date(a.time).getTime() || Date.now(),
        isAutoSave: true,
      });
    });
  } catch {}

  all.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return all.slice(0, 80);
};

const DrawingWorkspace = ({ onNewCanvas, onOpenArtwork, darkMode, glassMode }) => {
  const [artworks, setArtworks] = useState(loadAllArtworks);
  const [showSizeDialog, setShowSizeDialog] = useState(false);
  const [customW, setCustomW] = useState('1920');
  const [customH, setCustomH] = useState('1080');
  const [contextMenu, setContextMenu] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const hasSessionData = (() => { try { const d = localStorage.getItem('drawingCanvas'); return d && d.startsWith('data:image'); } catch { return false; } })();

  const filteredArtworks = (() => {
    if (activeTab === 'saved') return artworks.filter(a => a.isSaved);
    if (activeTab === 'auto') return artworks.filter(a => a.isAutoSave);
    return artworks.filter(a => !a.isSaved && !a.isAutoSave);
  })();

  const savedCount = artworks.filter(a => a.isSaved).length;
  const autoCount = artworks.filter(a => a.isAutoSave).length;
  const mainCount = artworks.filter(a => !a.isSaved && !a.isAutoSave).length;

  useEffect(() => {
    const handleUpdate = () => setArtworks(loadAllArtworks());
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('artwork-updated', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('artwork-updated', handleUpdate);
    };
  }, []);

  const deleteArtwork = (id) => {
    if (typeof id === 'string' && id.startsWith('saved_')) {
      try {
        const saved = JSON.parse(localStorage.getItem('drawing_saved_canvases') || '[]');
        const timestamp = id.replace('saved_', '');
        const filtered = saved.filter(s => String(s.time) !== timestamp);
        localStorage.setItem('drawing_saved_canvases', JSON.stringify(filtered));
      } catch {}
    } else if (typeof id === 'string' && id.startsWith('auto_')) {
      try {
        const auto = JSON.parse(localStorage.getItem('drawing_autosave_history') || '[]');
        const timestamp = id.replace('auto_', '');
        const filtered = auto.filter(a => String(a.time) !== timestamp && String(a.timestamp) !== timestamp);
        localStorage.setItem('drawing_autosave_history', JSON.stringify(filtered));
      } catch {}
    } else {
      try {
        const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const filtered = list.filter(a => a.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      } catch {}
    }
    setArtworks(loadAllArtworks());
    setContextMenu(null);
  };

  const bg = glassMode
    ? 'rgba(255,255,255,0.06)'
    : darkMode ? '#111827' : '#f8fafc';

  const cardBg = glassMode
    ? 'rgba(255,255,255,0.1)'
    : darkMode ? '#1f2937' : '#ffffff';

  const textColor = glassMode
    ? '#9ca3af'
    : darkMode ? '#9ca3af' : '#6b7280';

  const subColor = glassMode
    ? '#6b7280'
    : darkMode ? '#6b7280' : '#9ca3af';

  return (
    <div className="flex flex-col h-full relative" style={{ background: bg }}>
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold" style={{ color: textColor }}>
            {activeTab === 'all' ? '我的画作' : activeTab === 'saved' ? '历史保存' : '自动保存'}
          </h2>
          <span className="text-xs" style={{ color: subColor }}>{filteredArtworks.length} 幅</span>
        </div>

        <div className="flex gap-1.5 mb-4 p-1 rounded-xl" style={{ background: glassMode ? 'rgba(255,255,255,0.05)' : darkMode ? '#1f2937' : '#f1f5f9' }}>
          {[
            { key: 'all', label: '全部画作', count: mainCount },
            { key: 'saved', label: '历史保存', count: savedCount },
            { key: 'auto', label: '自动保存', count: autoCount },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                background: activeTab === tab.key
                  ? (glassMode ? 'rgba(99,102,241,0.3)' : darkMode ? '#6366f1' : '#ffffff')
                  : 'transparent',
                color: activeTab === tab.key
                  ? (glassMode || darkMode ? '#e0e7ff' : '#4f46e5')
                  : subColor,
                boxShadow: activeTab === tab.key && !glassMode && !darkMode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
        {hasSessionData && (
          <button
            onClick={() => {
              const data = localStorage.getItem('drawingCanvas');
              const w = parseInt(localStorage.getItem('drawingCanvasWidth') || '1920') || 1920;
              const h = parseInt(localStorage.getItem('drawingCanvasHeight') || '1080') || 1080;
              onOpenArtwork({ id: 'recover_session', name: '恢复的画作', w, h, dataURL: data, thumbnail: data, date: '刚刚', timestamp: Date.now() });
            }}
            className="w-full mb-4 p-3 rounded-xl flex items-center gap-3 transition-all active:scale-[0.98]"
            style={{
              background: glassMode ? 'rgba(99,102,241,0.15)' : darkMode ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.3)',
            }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(99,102,241,0.2)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4v6h6M23 20v-6h-6" />
                <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-bold" style={{ color: '#a5b4fc' }}>恢复未保存的画作</p>
              <p className="text-[10px]" style={{ color: subColor }}>上次退出前未保存的内容</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        )}
        {filteredArtworks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: subColor }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="mb-4 opacity-40">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <p className="text-sm font-medium">
              {activeTab === 'all' ? '还没有作品' : activeTab === 'saved' ? '暂无历史保存' : '暂无自动保存'}
            </p>
            <p className="text-xs mt-1">
              {activeTab === 'all' ? '点击下方 + 创建新画布' : '切换标签查看其他画作'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredArtworks.map((art) => (
              <div
                key={art.id}
                className="relative group cursor-pointer rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-200 active:scale-[0.97]"
                style={{ background: cardBg, border: glassMode ? '1px solid rgba(255,255,255,0.1)' : darkMode ? '1px solid #374151' : '1px solid #e2e8f0' }}
                onClick={() => {
                  if (!art.dataURL || typeof art.dataURL !== 'string' || !art.dataURL.startsWith('data:image')) {
                    return;
                  }
                  onOpenArtwork(art);
                }}
                onContextMenu={(e) => { e.preventDefault(); setContextMenu({ id: art.id, x: e.clientX, y: e.clientY }); }}
              >
                <div className="aspect-video relative overflow-hidden" style={{ background: '#e5e7eb' }}>
                  {art.thumbnail ? (
                    <img src={art.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea22, #764ba222)' }} />
                  )}
                </div>
                <div className="p-2.5">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold truncate flex-1" style={{ color: textColor }}>{art.name || '未命名'}</p>
                    {art.isSaved && <span className="text-[9px] px-1 py-0.5 rounded font-medium shrink-0" style={{ background: '#3b82f620', color: '#60a5fa' }}>手动</span>}
                    {art.isAutoSave && <span className="text-[9px] px-1 py-0.5 rounded font-medium shrink-0" style={{ background: '#f59e0b20', color: '#fbbf24' }}>自动</span>}
                  </div>
                  <p className="text-[10px] mt-0.5" style={{ color: subColor }}>{art.w && art.h ? `${art.w}×${art.h}` : ''}{art.w && art.h && art.date ? ' · ' : ''}{art.date || ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {contextMenu && (
        <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)}>
          <div
            className="absolute rounded-xl shadow-2xl py-1.5 min-w-[120px] animate-fade-in"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 140),
              top: Math.min(contextMenu.y, window.innerHeight - 100),
              background: glassMode ? 'rgba(30,30,40,0.95)' : darkMode ? '#1f2937' : '#ffffff',
              border: glassMode ? '1px solid rgba(255,255,255,0.15)' : darkMode ? '1px solid #374151' : '1px solid #e2e8f0',
            }}
          >
            <button
              className="w-full px-4 py-2 text-xs text-left hover:bg-red-500/10 text-red-400 font-medium transition-colors"
              onClick={(e) => { e.stopPropagation(); deleteArtwork(contextMenu.id); }}
            >
              删除
            </button>
          </div>
        </div>
      )}

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
        <button
          onClick={() => setShowSizeDialog(true)}
          className="w-14 h-14 rounded-2xl shadow-xl flex items-center justify-center transition-all duration-200 active:scale-90 hover:shadow-2xl"
          style={{ background: glassMode ? 'linear-gradient(135deg, #6366f1cc, #8b5cf6cc)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {showSizeDialog && (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSizeDialog(false)} />
          <div
            className="relative w-full sm:w-96 max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 animate-slide-up"
            style={{ background: glassMode ? 'rgba(30,30,45,0.95)' : darkMode ? '#1f2937' : '#ffffff' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold" style={{ color: textColor }}>新建画布</h3>
              <button
                onClick={() => setShowSizeDialog(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                style={{ color: subColor }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {CANVAS_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => { onNewCanvas(p.w, p.h); setShowSizeDialog(false); }}
                  className="py-3 rounded-xl text-center transition-all active:scale-[0.95]"
                  style={{
                    background: glassMode ? 'rgba(255,255,255,0.08)' : darkMode ? '#374151' : '#f1f5f9',
                    color: textColor,
                    border: glassMode ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  }}
                >
                  <div className="text-xs font-bold">{p.label}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: subColor }}>{p.w}×{p.h}</div>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 mb-3">
              <input
                type="number"
                value={customW}
                onChange={(e) => setCustomW(e.target.value)}
                placeholder="宽"
                className="flex-1 px-3 py-2.5 rounded-xl text-sm text-center outline-none transition-colors"
                style={{
                  background: glassMode ? 'rgba(255,255,255,0.06)' : darkMode ? '#374151' : '#f1f5f9',
                  color: textColor,
                  border: glassMode ? '1px solid rgba(255,255,255,0.1)' : darkMode ? '1px solid #4b5563' : '1px solid #e2e8f0',
                }}
              />
              <span style={{ color: subColor }} className="text-lg font-light">×</span>
              <input
                type="number"
                value={customH}
                onChange={(e) => setCustomH(e.target.value)}
                placeholder="高"
                className="flex-1 px-3 py-2.5 rounded-xl text-sm text-center outline-none transition-colors"
                style={{
                  background: glassMode ? 'rgba(255,255,255,0.06)' : darkMode ? '#374151' : '#f1f5f9',
                  color: textColor,
                  border: glassMode ? '1px solid rgba(255,255,255,0.1)' : darkMode ? '1px solid #4b5563' : '1px solid #e2e8f0',
                }}
              />
            </div>

            <button
              onClick={() => {
                const w = parseInt(customW) || 1920;
                const h = parseInt(customH) || 1080;
                onNewCanvas(Math.max(1, Math.min(8192, w)), Math.max(1, Math.min(8192, h)));
                setShowSizeDialog(false);
              }}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              使用自定义尺寸
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export { STORAGE_KEY, loadArtworks, saveArtworks };
export default DrawingWorkspace;
