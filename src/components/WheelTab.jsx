import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { COLORS, PROVINCE_PRESETS, PROVINCE_PRESET_IDS, aiPresetModels, proxyFetchUrl, SIGNAL_SERVER_HOST } from '../utils/constants';
import { initAudio, playTone, setVibrationEnabledGlobal, vibrate, playTick, playWheelTick, playDing, playNumberDing, playDiceRoll, playThud } from '../utils/audio';
import { DicesIcon, XIcon, PlusIcon, RotateCcwIcon, CheckIcon, HashIcon, ChevronDownIcon, TrashIcon, ListIcon, MoonIcon, SunIcon, BombIcon, PokerCardIcon, BrushIcon, WheelIcon, EraserIcon, PoisonIcon } from '../components/icons';
import WheelSettings from './WheelSettings';

// ==================== 转盘组件 ====================

const WheelTab = ({ collections, activeCollectionId, onSetActive, onUpdateCollections, saveAll, darkMode, glassMode, PROVINCE_PRESETS, PROVINCE_PRESET_IDS }) => {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [resultIndex, setResultIndex] = useState(-1);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsClosing, setSettingsClosing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const [expandedProvinceMenu, setExpandedProvinceMenu] = useState(false);
  const [showAiAdd, setShowAiAdd] = useState(false);
  const [aiAddClosing, setAiAddClosing] = useState(false);
  const [aiAddMode, setAiAddMode] = useState('keyboard');
  const [aiAddAction, setAiAddAction] = useState('extract');
  const [aiAddInput, setAiAddInput] = useState('');
  const [aiAddListening, setAiAddListening] = useState(false);
  const [aiAddLoading, setAiAddLoading] = useState(false);
  const aiAddSubmittingRef = useRef(false);
  const [aiAddResult, setAiAddResult] = useState('');
  const [aiAddTranscript, setAiAddTranscript] = useState('');
  const aiAddRecRef = useRef(null);
  const canvasRef = useRef(null);

  const requestMicPermission = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        return true;
      } catch (e) {
        try {
          const permResult = await navigator.permissions.query({ name: 'microphone' });
          if (permResult.state === 'granted') return true;
        } catch (_) {}
        return 'maybe';
      }
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch (e) {
      try {
        const permResult = await navigator.permissions.query({ name: 'microphone' });
        if (permResult.state === 'granted') return true;
      } catch (_) {}
      return 'maybe';
    }
  };

  const lastTickAngleRef = useRef(0);
  const animationFrameRef = useRef(null);

  const currentCollection = collections.find(c => c.id === activeCollectionId) || collections[0];
  const items = currentCollection.items;

  useEffect(() => {
    setResult(null);
    setResultIndex(-1);
  }, [activeCollectionId]);

  const closeMenu = (cb) => {
    setMenuClosing(true);
    setTimeout(() => { setShowMenu(false); setMenuClosing(false); if (cb) cb(); }, 200);
  };

  const aiAddVoiceStart = () => {
    if (aiAddListening) {
      if (aiAddRecRef.current) aiAddRecRef.current.stop();
      setAiAddListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('当前浏览器不支持语音识别'); return; }
    requestMicPermission().then(granted => {
      if (granted === false) { alert('麦克风权限被拒绝，请在设置中允许麦克风访问'); return; }
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.interimResults = true;
      recognition.continuous = false;
      let final = '';
      setAiAddTranscript('');
      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) final += event.results[i][0].transcript;
          else interim += event.results[i][0].transcript;
        }
        setAiAddTranscript(final + interim);
      };
      recognition.onerror = (e) => {
        setAiAddListening(false);
        if (e.error === 'not-allowed' || e.error === 'permission-denied') {
          alert('麦克风权限被拒绝，请在系统设置中允许麦克风访问');
        }
      };
      recognition.onend = () => {
        setAiAddListening(false);
        if (final.trim()) setAiAddInput(final.trim());
      };
      recognition.start();
      aiAddRecRef.current = recognition;
      setAiAddListening(true);
    }).catch(() => { alert('语音识别启动失败，请检查麦克风权限'); });
  };

  const aiAddSubmit = () => {
    const text = (aiAddMode === 'voice' ? aiAddInput : aiAddInput).trim();
    if (!text || aiAddSubmittingRef.current) return;
    aiAddSubmittingRef.current = true;
    setAiAddLoading(true);
    setAiAddResult('');
    const apiKey = localStorage.getItem('aiApiKey') || '';
    if (!apiKey) { setAiAddLoading(false); aiAddSubmittingRef.current = false; alert('请先在AI助手中配置API Key'); return; }
    fetch(proxyFetchUrl(localStorage.getItem('aiToolEndpoint') || 'https://api.deepseek.com/chat/completions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: localStorage.getItem('aiToolModel') || 'deepseek-v4-flash',
        messages: [
          { role: "system", content: aiAddAction === "generate" ? "你是一个场景项目生成助手。用户会描述一个主题和需要的项目数量，你需要根据主题生成对应数量的具体项目名称。要求：1.项目名称要具体、真实、有代表性。2.根据主题生成一个简短的场景标题（2-4个字）。3.严格按照用户要求的数量生成项目，不多不少。输出格式：第一行为场景标题，第二行开始为生成的项目名称，每个名称用逗号分隔，不要换行。例如用户说\"西安小吃转盘，50个项目\"，你输出：\n西安小吃\n肉夹馍,凉皮,羊肉泡馍,biangbiang面,...（共50个）\n\n例如用户说\"适合周末做的20件事\"，你输出：\n周末计划\n爬山,看电影,逛公园,...（共20个）\n\n注意：只输出标题和项目名称，不要输出任何解释或多余文字。" : "你是一个关键词提取和分类助手。用户会给你一段文字，你需要：1.精准提炼出用户想要的词汇/项目名称。2.根据提取出的词汇类别生成一个简短的场景标题（2-4个字）。输出格式：第一行为场景标题，第二行开始为提取的词汇，每个词汇用逗号分隔。例如用户说\"我想加入火锅烤肉和奶茶\"，你输出：\n食物抉择\n火锅,烤肉,奶茶\n\n例如用户说\"周末去打篮球还是踢足球\"，你输出：\n运动选择\n打篮球,踢足球\n\n例如用户说\"看哪部电影好呢，流浪地球还是满江红还是长津湖\"，你输出：\n电影选择\n流浪地球,满江红,长津湖" },
          { role: 'user', content: text }
        ],
        temperature: aiAddAction === "generate" ? 0.7 : 0.1,
        max_tokens: aiAddAction === "generate" ? 2000 : 500
      })
    }).then(r => r.json()).then(data => {
      const aiText = data.choices?.[0]?.message?.content || '';
      setAiAddResult(aiText);
      const lines = aiText.split('\n').filter(l => l.trim());
      const sceneName = lines.length > 1 ? lines[0].trim() : '';
      const itemsText = lines.length > 1 ? lines.slice(1).join(',') : aiText;
      const newItems = itemsText.split(/[,，、\n]+/).map(s => s.trim()).filter(s => s.length > 0);
      if (newItems.length > 0) {
        const newId = Date.now().toString();
        const newScene = {
          id: newId,
          name: sceneName || (text.length > 8 ? text.substring(0, 8) + '...' : text),
          items: newItems.map((label, i) => ({ label, weight: 1, color: COLORS[i % 10] }))
        };
        const newCollections = [...collections, newScene];
        onUpdateCollections(newCollections);
        saveAll({ collections: newCollections });
      }
      setAiAddLoading(false);
      aiAddSubmittingRef.current = false;
    }).catch(() => { setAiAddLoading(false); aiAddSubmittingRef.current = false; setAiAddResult('⚠️请求失败'); });
  };

  const shadeColor = (color, percent) => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `rgb(${R},${G},${B})`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = 320;
    canvas.width = size * dpr; canvas.height = size * dpr;
    canvas.style.width = `${size}px`; canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const centerX = size / 2, centerY = size / 2, radius = size / 2 - 10;
    const totalWeight = items.reduce((s, i) => s + (Number(i.weight) || 1), 0);
    const hasResult = result !== null && resultIndex !== -1 && resultIndex < items.length;
    
    const premiumColors = [
      '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', 
      '#f43f5e', '#ef4444', '#f97316', '#f59e0b', '#eab308', 
      '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6'
    ];
    
    let curAngle = 0;
    items.forEach((item, idx) => {
      const angle = (Number(item.weight || 1) / totalWeight) * 2 * Math.PI;
      const color = premiumColors[idx % premiumColors.length];
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, curAngle, curAngle + angle);
      ctx.closePath();
      
      ctx.fillStyle = color;
      ctx.fill();
      
      if (hasResult && idx !== resultIndex) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fill();
      }

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.8)';
      ctx.stroke();

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(curAngle + angle / 2);
      ctx.globalAlpha = (hasResult && idx !== resultIndex) ? 0.3 : 1;
      ctx.fillStyle = darkMode ? 'rgba(255,255,255,0.95)' : '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'right';
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 3;
      ctx.fillText(item.label, radius - 18, 4);
      ctx.restore();
      curAngle += angle;
    });
    if (hasResult) {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fill();
    }
  }, [items, activeCollectionId, darkMode, result, resultIndex]);

  const spin = () => {
    if (isSpinning) return;
    initAudio(); setIsSpinning(true); setResult(null); setResultIndex(-1);
    const target = rotation + 2160 + Math.random() * 360;

    const startTime = performance.now();
    const duration = 4000;
    const startRotation = rotation;
    lastTickAngleRef.current = startRotation;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = (t) => 1 - Math.pow(1 - t, 3);
      const currentVisualRotation = startRotation + (target - startRotation) * easeOut(progress);

      const tickStep = 360 / Math.max(items.length, 8);
      if (Math.abs(currentVisualRotation - lastTickAngleRef.current) >= tickStep) {
        playWheelTick(); vibrate(10);
        lastTickAngleRef.current = currentVisualRotation;
      }

      setRotation(currentVisualRotation);
      if (progress < 1) animationFrameRef.current = requestAnimationFrame(animate);
      else {
        setIsSpinning(false);
        playDing(); vibrate([50, 50, 100]);
        const norm = target % 360;
        const angle = (360 - norm + 270) % 360;
        const total = items.reduce((s, i) => s + (Number(i.weight) || 1), 0);
        let acc = 0;
        let foundIdx = -1;
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          acc += (Number(it.weight || 1) / total) * 360;
          if (angle <= acc) { setResult(it); foundIdx = i; break; }
        }
        setResultIndex(foundIdx);
      }
    };
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className={`flex flex-col h-full items-center justify-center p-4`} style={glassMode ? { background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)' } : undefined}>
      <div className="absolute top-4 left-0 right-0 flex justify-end px-4 z-20">
        <div className="relative">
          <button
            onClick={() => { if (isSpinning) return; if (showMenu) { setMenuClosing(true); setTimeout(() => { setShowMenu(false); setMenuClosing(false); }, 200); } else { setShowMenu(true); } }}
            className={`${glassMode ? 'aurora-glass-pill text-slate-700 hover:bg-white/40' : 'bg-white dark:bg-gray-800'} px-6 py-2.5 rounded-full shadow-lg ${glassMode ? 'border-white/30' : 'border border-gray-100 dark:border-gray-700'} flex items-center gap-2 font-black ${glassMode ? 'text-slate-700' : 'text-gray-700 dark:text-gray-200'} active:scale-95 transition-all`}
          >
            <ListIcon size={18} className="text-red-500" />
            <span className="flex-1 text-right">场景：{currentCollection.name}</span>
            <ChevronDownIcon size={16} className={`transition-transform ${showMenu ? 'rotate-180' : ''}`} />
          </button>
          {(showMenu || menuClosing) && (
            <div className={`absolute top-full right-0 mt-2 rounded-2xl shadow-2xl border min-w-[180px] max-h-[60vh] flex flex-col ${glassMode ? 'aurora-glass-card border-white/30' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'} ${menuClosing ? 'animate-menu-out' : 'animate-menu-in'}`} style={glassMode ? { background: 'rgba(255,255,255,0.95)' } : undefined}>
              <div className="overflow-y-auto overscroll-contain py-2 flex-1">
                {collections.filter(c => !PROVINCE_PRESET_IDS.has(c.id) && c.id !== 'truth').map(c => (
                  <div key={c.id} className={`flex items-center ${c.id === activeCollectionId ? (glassMode ? 'text-red-500 bg-red-100/30' : 'text-red-600 bg-red-50/50 dark:bg-red-900/20') : (glassMode ? 'text-slate-600' : 'text-gray-600 dark:text-gray-400')}`}>
                    <button
                      onClick={() => { onSetActive(c.id); closeMenu(); saveAll({ activeCollectionId: c.id }); }}
                      className={`flex-1 text-left px-5 py-3 font-bold text-sm flex items-center justify-between ${glassMode ? 'hover:bg-white/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                      {c.name}
                      {c.id === activeCollectionId && <CheckIcon size={14} />}
                    </button>
                    {collections.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); const newList = collections.filter(x => x.id !== c.id); onUpdateCollections(newList); if (c.id === activeCollectionId) { onSetActive(newList[0].id); saveAll({ collections: newList, activeCollectionId: newList[0].id }); } else { saveAll({ collections: newList }); } }}
                        className="px-3 py-3 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <TrashIcon size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <div className={`${expandedProvinceMenu ? (glassMode ? 'bg-white/20' : 'bg-gray-50/50 dark:bg-gray-700/30') : ''}`}>
                  <button
                    onClick={() => setExpandedProvinceMenu(!expandedProvinceMenu)}
                    className={`w-full text-left px-5 py-3 font-bold text-sm flex items-center justify-between ${glassMode ? 'hover:bg-white/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    <span className="text-gray-500">全国大胃袋</span>
                    <ChevronDownIcon size={14} className={`transition-transform ${expandedProvinceMenu ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedProvinceMenu && (
                    <div className={`border-t ${glassMode ? 'border-white/20' : 'border-gray-100 dark:border-gray-600'} py-1`}>
                      {PROVINCE_PRESETS.map(p => {
                        const isActive = p.id === activeCollectionId;
                        return (
                          <button
                            key={p.id}
                            onClick={() => {
                              onSetActive(p.id);
                              closeMenu();
                              setExpandedProvinceMenu(false);
                              saveAll({ activeCollectionId: p.id });
                            }}
                            className={`w-full text-left pl-8 pr-5 py-2.5 font-bold text-xs flex items-center justify-between transition-colors ${
                              isActive
                                ? (glassMode ? 'text-red-500 bg-red-100/30' : 'text-red-600 bg-red-50/50 dark:bg-red-900/20')
                                : (glassMode ? 'text-slate-500 hover:bg-white/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700')
                            }`}
                          >
                            {p.name}
                            {isActive && <CheckIcon size={12} />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {collections.filter(c => c.id === 'truth').map(c => (
                  <div key={c.id} className={`flex items-center ${c.id === activeCollectionId ? (glassMode ? 'text-red-500 bg-red-100/30' : 'text-red-600 bg-red-50/50 dark:bg-red-900/20') : (glassMode ? 'text-slate-600' : 'text-gray-600 dark:text-gray-400')}`}>
                    <button
                      onClick={() => { onSetActive(c.id); closeMenu(); saveAll({ activeCollectionId: c.id }); }}
                      className={`flex-1 text-left px-5 py-3 font-bold text-sm flex items-center justify-between ${glassMode ? 'hover:bg-white/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                      {c.name}
                      {c.id === activeCollectionId && <CheckIcon size={14} />}
                    </button>
                  </div>
                ))}
              </div>
              <div className={`border-t ${glassMode ? 'border-white/30' : 'border-gray-100 dark:border-gray-700'} py-2`}>
                <button
                  onClick={() => {
                    const newId = Date.now().toString();
                    const newList = [...collections, { id: newId, name: '新决定', items: [{ label: '选项', weight: 1, color: COLORS[0] }] }];
                    onUpdateCollections(newList);
                    onSetActive(newId);
                    closeMenu();
                    saveAll({ collections: newList, activeCollectionId: newId });
                  }}
                  className={`w-full text-left px-5 py-3 font-bold text-sm text-blue-600 flex items-center gap-2 ${glassMode ? 'hover:bg-white/30' : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
                >
                  <PlusIcon size={14} /> 创建新场景
                </button>
                <button
                  onClick={() => { closeMenu(); setShowAiAdd(true); setAiAddInput(''); setAiAddResult(''); setAiAddTranscript(''); setAiAddMode('keyboard'); }}
                  className={`w-full text-left px-5 py-3 font-bold text-sm text-purple-600 flex items-center gap-2 ${glassMode ? 'hover:bg-white/30' : 'hover:bg-purple-50 dark:hover:bg-purple-900/20'}`}
                >
                  AI智能创建
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative mb-10 w-full flex justify-center mt-12" style={{ width: 320, height: 320 }}>
        <canvas ref={canvasRef} style={{ transform: `rotate(${rotation}deg)`, backgroundColor: glassMode ? 'rgba(255,255,255,0.6)' : darkMode ? '#374151' : '#f3f4f6', ...(glassMode ? { backdropFilter: 'blur(16px)' } : {}) }} className="rounded-full" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{
          filter: darkMode ? 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))' : 'drop-shadow(0 3px 6px rgba(0,0,0,0.2))'
        }}>
          <svg width="60" height="60" viewBox="0 0 60 60" className="absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <path d="M30 2 C44 16, 46 24, 46 30 A16 16 0 0 1 14 30 C14 24, 16 16, 30 2Z" fill={glassMode ? 'rgba(255,255,255,0.7)' : darkMode ? '#e5e7eb' : '#ffffff'} stroke={glassMode ? 'rgba(99,102,241,0.3)' : darkMode ? '#6b7280' : '#d1d5db'} strokeWidth="1.5"/>
            <circle cx="30" cy="30" r="14" fill={glassMode ? 'rgba(255,255,255,0.6)' : darkMode ? '#374151' : '#ffffff'} stroke={glassMode ? 'rgba(99,102,241,0.25)' : darkMode ? '#4b5563' : '#e5e7eb'} strokeWidth="2"/>
            <circle cx="30" cy="30" r="8" fill={glassMode ? 'rgba(255,255,255,0.4)' : darkMode ? '#1f2937' : '#f3f4f6'} stroke={glassMode ? 'rgba(99,102,241,0.2)' : darkMode ? '#4b5563' : '#d1d5db'} strokeWidth="1.5"/>
          </svg>
        </div>
      </div>

      <div className="h-12 mb-6 flex items-center justify-center">
        {result && !isSpinning && <div className={`px-8 py-3 rounded-full font-black text-xl shadow-lg transition-colors duration-300 ${glassMode ? 'aurora-glass-pill text-indigo-700' : darkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white'}`}>结果：{result.label}</div>}
      </div>

      <div className="flex gap-4 w-full max-w-xs">
        <button onClick={() => setShowSettings(true)} className={`flex-1 py-4 rounded-2xl font-black active:scale-95 text-sm ${glassMode ? 'aurora-glass-pill text-slate-700 hover:bg-white/40' : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200'}`}>编辑项目</button>
        <button onClick={spin} disabled={isSpinning} className={`flex-[2] py-4 rounded-2xl font-black text-xl transition-all duration-200 ${isSpinning ? 'bg-gray-400 text-white/70 cursor-not-allowed shadow-none' : glassMode ? 'aurora-glass-pill text-slate-700 hover:bg-white/40 active:scale-[0.97]' : 'relative overflow-hidden text-white shadow-[0_8px_30px_-6px_rgba(168,85,247,0.5),0_4px_15px_-3px_rgba(251,146,60,0.4)] active:scale-[0.97] hover:shadow-[0_12px_40px_-4px_rgba(168,85,247,0.6),0_6px_20px_-3px_rgba(251,146,60,0.5)] hover:scale-[1.02]'}`} style={isSpinning ? {} : glassMode ? {} : { background: 'linear-gradient(135deg, #fb923c 0%, #f472b6 45%, #a855f7 100%)' }}>
          {!isSpinning && !glassMode && <span className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-transparent pointer-events-none" />}
          {isSpinning ? '狂转中...' : <span className={glassMode ? 'text-black' : ''}>暴力转</span>}
        </button>
      </div>

      {showSettings && (
        <WheelSettings
          collection={currentCollection}
          darkMode={darkMode}
          glassMode={glassMode}
          onSave={updated => {
            const newList = collections.map(c => c.id === activeCollectionId ? updated : c);
            onUpdateCollections(newList);
            setShowSettings(false);
            saveAll({ collections: newList });
          }}
          onDelete={() => {
            if (collections.length <= 1) return;
            const newList = collections.filter(c => c.id !== activeCollectionId);
            onUpdateCollections(newList);
            onSetActive(newList[0].id);
            setShowSettings(false);
            saveAll({ collections: newList, activeCollectionId: newList[0].id });
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {(showAiAdd || aiAddClosing) && (
        <>
          <div className={`absolute inset-0 z-40 bg-black/40 backdrop-blur-md ${aiAddClosing ? 'animate-fade-out' : 'animate-fade-in'}`} onClick={() => { setAiAddClosing(true); if (aiAddListening && aiAddRecRef.current) aiAddRecRef.current.stop(); setAiAddListening(false); setTimeout(() => { setShowAiAdd(false); setAiAddClosing(false); }, 250); }} />
          <div className={`absolute bottom-0 left-0 right-0 z-50 ${glassMode ? 'aurora-glass-card border-white/30' : darkMode ? 'bg-gray-900' : 'bg-white'} backdrop-blur-xl rounded-t-3xl shadow-2xl ${aiAddClosing ? 'animate-slide-down' : 'animate-slide-up'} overflow-hidden`} style={{ maxHeight: '85vh' }}>
            <div className={`w-10 h-1 rounded-full mx-auto mt-3 mb-2 ${glassMode ? 'bg-white/40' : 'bg-gray-300/60'}`} />
            <div className="px-5 pb-5 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 20px)' }}>
              <div className="flex justify-between items-center mb-3">
                <div>
                    <h2 className={`text-base font-black ${glassMode ? 'text-slate-800' : ''}`}>AI 智能创建</h2>
                    <p className={`text-[10px] ${glassMode ? 'text-slate-500' : darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{(() => { try { const m = localStorage.getItem('aiToolModel') || 'deepseek-v4-flash'; return aiPresetModels.find(p => p.model === m)?.name || m; } catch { return 'deepseek-v4-flash'; } })()} 驱动，⚠️务必先在设置内配好API</p>
                  </div>
                <button onClick={() => { setAiAddClosing(true); if (aiAddListening && aiAddRecRef.current) aiAddRecRef.current.stop(); setAiAddListening(false); setTimeout(() => { setShowAiAdd(false); setAiAddClosing(false); }, 250); }} className={`p-2 ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} rounded-xl transition-colors`}><XIcon size={18} /></button>
              </div>

              <div className={`flex gap-1 p-1 rounded-xl mb-3 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <button onClick={() => setAiAddAction('extract')} className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${aiAddAction === 'extract' ? `${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} shadow-sm` : `${darkMode ? 'text-gray-500' : 'text-gray-500'}`}`}>
                  <span className="flex items-center justify-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    提取关键词
                  </span>
                </button>
                <button onClick={() => setAiAddAction('generate')} className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${aiAddAction === 'generate' ? `${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} shadow-sm` : `${darkMode ? 'text-gray-500' : 'text-gray-500'}`}`}>
                  <span className="flex items-center justify-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                    AI 生成
                  </span>
                </button>
              </div>

              <div className={`flex gap-1 p-1 rounded-xl mb-3 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <button onClick={() => setAiAddMode('keyboard')} className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${aiAddMode === 'keyboard' ? `${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} shadow-sm` : `${darkMode ? 'text-gray-500' : 'text-gray-500'}`}`}>
                  <span className="flex items-center justify-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/></svg>
                    键盘输入
                  </span>
                </button>
                <button onClick={() => setAiAddMode('voice')} className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${aiAddMode === 'voice' ? `${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'} shadow-sm` : `${darkMode ? 'text-gray-500' : 'text-gray-500'}`}`}>
                  <span className="flex items-center justify-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3m-4 7a.5.5 0 0 1 .5.5 3.5 3.5 0 0 0 7 0 .5.5 0 0 1 1 0 4.5 4.5 0 0 1-4 4.473V15a.5.5 0 0 1-1 0v-2.027A4.5 4.5 0 0 1 3.5 8.5.5.5 0 0 1 4 8"/></svg>
                    语音输入
                  </span>
                </button>
              </div>

              {aiAddMode === 'keyboard' ? (
                <div className="space-y-2.5">
                  <textarea
                    value={aiAddInput}
                    onChange={e => setAiAddInput(e.target.value)}
                    placeholder={aiAddAction === 'generate' ? '描述主题和数量，如：西安小吃转盘，50个项目' : '我今天想吃火锅烤肉和奶茶'}
                    className={`w-full h-24 p-3 rounded-xl border outline-none resize-none text-sm leading-relaxed ${darkMode ? 'bg-gray-800/60 border-gray-700/50 text-white placeholder-gray-600' : 'bg-gray-50/80 border-gray-200/60 placeholder-gray-400'} focus:border-purple-400/50 transition-colors`}
                  />
                  <button onClick={aiAddSubmit} disabled={!aiAddInput.trim() || aiAddLoading} className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-bold text-sm disabled:opacity-30 active:scale-[0.98] transition-all shadow-lg shadow-purple-500/20">
                    {aiAddLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                        AI 分析中...
                      </span>
                    ) : aiAddAction === 'generate' ? 'AI 生成场景' : 'AI 提取并创建场景'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className={`w-full min-h-[72px] p-3 rounded-xl border text-sm ${darkMode ? 'bg-gray-800/60 border-gray-700/50' : 'bg-gray-50/80 border-gray-200/60'}`}>
                    {aiAddListening ? (
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          <span className="w-1 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                          <span className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                          <span className="w-1 h-2 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                          <span className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '450ms' }} />
                          <span className="w-1 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '600ms' }} />
                        </div>
                        <span className="text-gray-400 text-xs">{aiAddTranscript || '正在聆听...'}</span>
                      </div>
                    ) : aiAddInput ? (
                      <span className={darkMode ? 'text-gray-200' : 'text-gray-800'}>{aiAddInput}</span>
                    ) : (
                      <span className={`${darkMode ? 'text-gray-600' : 'text-gray-400'} text-xs`}>点击下方麦克风开始录音</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={aiAddVoiceStart} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${aiAddListening ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : `${darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}`}>
                      {aiAddListening ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                          停止录音
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3m-4 7a.5.5 0 0 1 .5.5 3.5 3.5 0 0 0 7 0 .5.5 0 0 1 1 0 4.5 4.5 0 0 1-4 4.473V15a.5.5 0 0 1-1 0v-2.027A4.5 4.5 0 0 1 3.5 8.5.5.5 0 0 1 4 8"/></svg>
                          开始录音
                        </>
                      )}
                    </button>
                    <button onClick={aiAddSubmit} disabled={!aiAddInput.trim() || aiAddLoading} className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-bold text-sm disabled:opacity-30 active:scale-[0.98] transition-all shadow-lg shadow-purple-500/20">
                      {aiAddLoading ? '分析中...' : aiAddAction === 'generate' ? '生成场景' : '提取创建'}
                    </button>
                  </div>
                </div>
              )}

              {aiAddResult && (
                <div className={`mt-3 p-3 rounded-xl border ${darkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-gray-50/80 border-gray-200/60'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className={`text-[11px] font-bold ${glassMode ? 'text-slate-400/70' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>已创建新场景</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {aiAddResult.split(/[,，、\n]+/).filter(s => s.trim()).map((word, i) => (
                      <span key={i} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${darkMode ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-50 text-purple-600'}`}>{word.trim()}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WheelTab;
