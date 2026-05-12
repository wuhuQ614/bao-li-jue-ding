import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { COLORS, PROVINCE_PRESETS, PROVINCE_PRESET_IDS, aiPresetModels, proxyFetchUrl, SIGNAL_SERVER_HOST } from '../utils/constants';
import { initAudio, playTone, setVibrationEnabledGlobal, vibrate, playTick, playWheelTick, playDing, playNumberDing, playDiceRoll, playThud } from '../utils/audio';
import { DicesIcon, XIcon, PlusIcon, RotateCcwIcon, CheckIcon, HashIcon, ChevronDownIcon, TrashIcon, ListIcon, MoonIcon, SunIcon, BombIcon, PokerCardIcon, BrushIcon, WheelIcon, EraserIcon, PoisonIcon } from '../components/icons';

// ==================== 转盘设置组件====================
const WheelSettings = ({ collection, onSave, onClose, onDelete, darkMode, glassMode }) => {
  const [name, setName] = useState(collection.name);
  const [items, setItems] = useState([...collection.items]);
  const [editValues, setEditValues] = useState({});
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceResult, setVoiceResult] = useState('');
  const [voiceShowPanel, setVoiceShowPanel] = useState(false);
  const voiceRecRef = useRef(null);

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

  const totalWeight = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  }, [items]);

  const handlePctChange = (idx, rawValue) => {
    setEditValues({ ...editValues, [idx]: rawValue });
  };

  const handlePctBlur = (idx) => {
    const raw = editValues[idx];
    if (raw === undefined || raw === '') return;
    const newPct = Math.max(0, Math.min(100, parseFloat(raw) || 0));
    const otherWeight = items.reduce((s, i, k) => k === idx ? s : s + (Number(i.weight) || 0), 0);
    const newWeight = otherWeight === 0 ? newPct : (newPct * otherWeight) / (100 - newPct);
    setItems(items.map((i, k) => k === idx ? {...i, weight: Math.max(0.1, newWeight)} : i));
    setEditValues(prev => { const next = { ...prev }; delete next[idx]; return next; });
  };

  const handlePctKeyDown = (e, idx) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  const voiceAddItems = () => {
    if (voiceListening) {
      if (voiceRecRef.current) voiceRecRef.current.stop();
      setVoiceListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('当前浏览器不支持语音识别，请使用 Chrome'); return; }
    requestMicPermission().then(granted => {
      if (granted === false) { alert('麦克风权限被拒绝，请在设置中允许麦克风访问'); return; }
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.interimResults = true;
      recognition.continuous = false;
      let finalTranscript = '';
      setVoiceTranscript('');
      setVoiceResult('');
      setVoiceShowPanel(true);
      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setVoiceTranscript(finalTranscript + interim);
      };
      recognition.onerror = (e) => {
        setVoiceListening(false);
        if (e.error === 'not-allowed' || e.error === 'permission-denied') {
          alert('麦克风权限被拒绝，请在系统设置中允许麦克风访问');
        }
      };
      recognition.onend = () => {
        setVoiceListening(false);
        const text = finalTranscript.trim();
        if (!text) { setVoiceShowPanel(false); return; }
        setVoiceLoading(true);
        const apiKey = localStorage.getItem('aiApiKey') || 'ak_2M90Ab1Kx2Cx6308xX2ln4BS9IU2S';
        if (!apiKey) { setVoiceLoading(false); alert('请先在AI助手中配置API Key'); return; }
        fetch(proxyFetchUrl(localStorage.getItem('aiToolEndpoint') || 'https://api.deepseek.com/chat/completions'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: localStorage.getItem('aiToolModel') || 'LongCat-Flash-Chat',
            messages: [
              { role: 'system', content: '你是一个关键词提取助手。用户会给你一段语音转文字的内容，你需要从中精准提炼出用户想要的词汇/项目名称。只输出提取到的词汇，每个词汇用逗号分隔，不要输出任何其他内容、解释或标点。例如用户说"我想加入火锅烤肉和奶茶"，你输出"火锅,烤肉,奶茶"' },
              { role: 'user', content: text }
            ],
            temperature: 0.1,
            max_tokens: 500
          })
        }).then(r => r.json()).then(data => {
          const aiText = data.choices?.[0]?.message?.content || '';
          setVoiceResult(aiText);
          const newItems = aiText.split(/[,，、\n]+/).map(s => s.trim()).filter(s => s.length > 0);
          if (newItems.length > 0) {
            setItems(prev => [...prev, ...newItems.map((label, i) => ({ label, weight: 1, color: COLORS[(prev.length + i) % 10] }))]);
          }
          setVoiceLoading(false);
        }).catch(() => { setVoiceLoading(false); setVoiceResult('⚠️请求失败'); });
      };
      recognition.start();
      voiceRecRef.current = recognition;
      setVoiceListening(true);
    }).catch(() => { alert('语音识别启动失败，请检查麦克风权限'); });
  };

  return (
    <div className={`absolute inset-0 z-50 flex flex-col ${glassMode ? 'aurora-bg' : darkMode ? 'bg-gray-900/95' : 'bg-white/95'} backdrop-blur-xl`} style={{ animation: 'slide-in-from-bottom 0.3s ease-out' }}>
      <div className={`shrink-0 flex justify-between items-center px-4 py-2.5 ${glassMode ? 'border-b border-white/15' : darkMode ? 'border-b border-gray-800' : 'border-b border-gray-100'}`} style={glassMode ? { backdropFilter: 'blur(12px)', background: 'rgba(255,255,255,0.15)' } : undefined}>
        <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${glassMode ? 'hover:bg-white/25 text-slate-500' : darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <input value={name} onChange={e => setName(e.target.value)} className={`text-sm font-bold tracking-tight outline-none bg-transparent text-center max-w-[180px] ${glassMode ? 'text-slate-700 placeholder-slate-400/60' : darkMode ? 'text-white' : 'text-gray-900'}`} placeholder="场景名称" />
        <button onClick={() => onSave({ ...collection, name, items })} className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 ${glassMode ? 'aurora-glass-pill text-slate-700 hover:bg-white/40' : darkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white'}`}>保存</button>
      </div>

      <div className={`flex items-center justify-center gap-3 px-4 py-2 shrink-0 ${glassMode ? 'border-b border-white/10' : darkMode ? 'border-b border-gray-800/50' : 'border-b border-gray-100/80'}`}>
        <span className={`text-[10px] font-bold ${glassMode ? 'text-slate-400/70' : glassMode ? 'text-slate-500' : darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{items.length} 个项目</span>
        <span className={glassMode ? 'text-slate-300/50' : 'text-gray-300'}>·</span>
        <span className={`text-[10px] font-bold ${glassMode ? 'text-slate-400/70' : glassMode ? 'text-slate-500' : darkMode ? 'text-gray-500' : 'text-gray-400'}`}>总权重 {totalWeight.toFixed(1)}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
        {items.map((it, idx) => {
          const weight = Number(it.weight) || 0;
          const percentage = totalWeight > 0 ? ((weight / totalWeight) * 100) : 0;
          const displayValue = editValues[idx] !== undefined ? editValues[idx] : percentage.toFixed(1);

          return (
            <div key={idx} className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors ${glassMode ? 'hover:bg-white/20' : darkMode ? 'bg-gray-800/60 hover:bg-gray-800' : 'bg-gray-50/80 hover:bg-white'}`}>
              <div className={`w-2.5 h-7 rounded-full shrink-0`} style={glassMode ? { backgroundColor: it.color, boxShadow: `0 0 10px ${it.color}50` } : { backgroundColor: it.color }} />
              <input
                value={it.label}
                onChange={e => setItems(items.map((i, k) => k === idx ? {...i, label: e.target.value} : i))}
                className={`flex-1 bg-transparent outline-none text-sm font-medium ${glassMode ? 'text-slate-700 placeholder-slate-400/50' : darkMode ? 'text-white' : 'text-gray-800'}`}
                placeholder="项目名称"
              />
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-white border border-gray-200/80'}`}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={displayValue}
                  onChange={e => handlePctChange(idx, e.target.value)}
                  onBlur={() => handlePctBlur(idx)}
                  onKeyDown={e => handlePctKeyDown(e, idx)}
                  className={`w-12 font-bold bg-transparent outline-none text-right text-xs ${glassMode ? 'text-indigo-600' : 'text-blue-600'}`}
                />
                <span className={`text-[9px] font-bold ${glassMode ? 'text-slate-400/60' : 'text-gray-400'}`}>%</span>
              </div>
              <button onClick={() => setItems(items.filter((_, k) => k !== idx))} className={`p-1 opacity-0 group-hover:opacity-100 transition-all ${glassMode ? 'text-slate-300 hover:text-red-400' : 'text-gray-300 hover:text-red-400'}`}><XIcon size={14}/></button>
            </div>
          );
        })}
        <button
          onClick={() => setItems([...items, { label: '新项目', weight: 1, color: COLORS[items.length % 10] }])}
          className={`w-full py-2.5 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${glassMode ? 'aurora-glass-pill text-slate-500 hover:bg-white/35 hover:text-slate-700' : darkMode ? 'bg-gray-800/60 text-gray-500 hover:bg-gray-700 hover:text-indigo-400' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-indigo-500'}`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          添加项目
        </button>
      </div>

      {voiceShowPanel && (
        <div className={`mx-3 mb-2 p-3 rounded-xl ${glassMode ? 'aurora-glass-card' : darkMode ? 'bg-gray-800/90 border border-gray-700' : 'bg-white/90 border border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${voiceListening ? 'bg-red-500 animate-pulse' : glassMode ? 'bg-emerald-400' : 'bg-green-500'}`} />
              <span className={`text-xs font-bold ${glassMode ? 'text-slate-600' : glassMode ? 'text-slate-600' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>语音识别</span>
            </div>
            <button onClick={() => setVoiceShowPanel(false)} className={`p-1 rounded-lg ${glassMode ? 'hover:bg-white/25 text-slate-400' : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}><XIcon size={14}/></button>
          </div>
          <div className={`text-sm mb-2 ${voiceListening ? 'text-gray-400' : glassMode ? 'text-slate-700' : darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            {voiceTranscript || (voiceListening ? '正在聆听...' : '')}
          </div>
          {voiceLoading && (
            <div className={`text-xs flex items-center gap-1.5 ${glassMode ? 'text-amber-500' : darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              AI 提取中...
            </div>
          )}
          {voiceResult && (
            <div className={`mt-2 pt-2 border-t ${glassMode ? 'border-white/20' : 'border-gray-200/50 dark:border-gray-700/50'}`}>
              <div className={`text-[10px] font-bold mb-1.5 ${glassMode ? 'text-slate-400/70' : glassMode ? 'text-slate-500' : darkMode ? 'text-gray-500' : 'text-gray-400'}`}>AI 提取结果</div>
              <div className="flex flex-wrap gap-1">
                {voiceResult.split(/[,，、\n]+/).filter(s => s.trim()).map((word, i) => (
                  <span key={i} className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${glassMode ? 'bg-sky-100/50 text-sky-700' : darkMode ? 'bg-indigo-900/30 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>{word.trim()}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className={`flex gap-2 px-3 py-2.5 shrink-0 ${glassMode ? 'border-t border-white/15' : darkMode ? 'border-t border-gray-800' : 'border-t border-gray-100'}`}>
        <button onClick={onDelete} className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${glassMode ? 'aurora-glass-pill text-rose-400 hover:bg-rose-100/30' : darkMode ? 'bg-red-900/20 text-red-400 hover:bg-red-900/30' : 'bg-red-50 text-red-500 hover:bg-red-100'}`} title="删除场景"><TrashIcon size={14}/><span>删除</span></button>
        <button onClick={voiceAddItems} disabled={voiceLoading} className={`relative flex-1 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 ${voiceListening ? 'bg-red-500 text-white' : voiceLoading ? `${glassMode ? 'bg-amber-100/30 text-amber-500' : darkMode ? 'bg-amber-900/20 text-amber-400' : 'bg-amber-50 text-amber-500'}` : `${glassMode ? 'aurora-glass-pill text-blue-500 hover:bg-blue-100/30' : darkMode ? 'bg-blue-900/20 text-blue-400 hover:bg-blue-900/30' : 'bg-blue-50 text-blue-500 hover:bg-blue-100'}`} ${voiceLoading ? 'animate-pulse' : ''}`} title="语音添加">
          {voiceListening && <span className="absolute inset-0 rounded-xl bg-red-400/30 animate-ping" />}
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3m-4 7a.5.5 0 0 1 .5.5 3.5 3.5 0 0 0 7 0 .5.5 0 0 1 1 0 4.5 4.5 0 0 1-4 4.473V15a.5.5 0 0 1-1 0v-2.027A4.5 4.5 0 0 1 3.5 8.5.5.5 0 0 1 4 8"/></svg>
          <span>语音</span>
        </button>
      </div>
    </div>
  );
};

export default WheelSettings;
