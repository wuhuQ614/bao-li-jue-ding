﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Peer from 'peerjs';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';


import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import Tesseract from 'tesseract.js';
import katex from 'katex';
import MarioGame from './MarioGame';
import HandheldTetris from './HandheldTetris';
import { DicesIcon, XIcon, PlusIcon, RotateCcwIcon, CheckIcon, HashIcon, ChevronDownIcon, TrashIcon, ListIcon, MoonIcon, SunIcon, BombIcon, PokerCardIcon, BrushIcon, WheelIcon, EraserIcon, PoisonIcon } from './components/icons';
import { initAudio, playTone, setVibrationEnabledGlobal, vibrate, playTick, playWheelTick, playDing, playNumberDing, playDiceRoll, playThud } from './utils/audio';
import { SIGNAL_SERVER_HOST, SIGNAL_SERVER_PORT, PEERJS_API_BASE, TURN_USER, TURN_PASS, PEER_SERVER_CONFIG, proxyFetchUrl, COLORS, PROVINCE_PRESETS, PROVINCE_PRESET_IDS, aiPresetModels, relayPresetModels } from './utils/constants';






import DiceFace from './components/DiceFace.jsx';

import WheelSettings from './components/WheelSettings.jsx';

import WheelTab from './components/WheelTab.jsx';

import DiceTab from './components/DiceTab.jsx';

import NumberTab from './components/NumberTab.jsx';

import BombTab from './components/BombTab.jsx';

import WitchPoisonTab from './components/WitchPoisonTab.jsx';

import GamesTab from './components/GamesTab.jsx';

import DrawingTab from './components/DrawingTab.jsx';
import DrawingWorkspace from './components/DrawingWorkspace.jsx';
import { otsuThreshold, preprocessForOCR, prepareOCRImage } from './utils/ocr';

    export default function App() {
      try {
        const ep = localStorage.getItem('aiToolEndpoint');
        if (ep && ep.includes('longcat.chat')) { localStorage.removeItem('aiToolEndpoint'); }
        const ep2 = localStorage.getItem('aiEndpoint');
        if (ep2 && ep2.includes('longcat.chat')) { localStorage.setItem('aiEndpoint', 'https://api.deepseek.com/chat/completions'); }
      } catch {}
      const [tab, setTab] = useState('dice');
      const [wheelKey, setWheelKey] = useState(0);
      const [darkMode, setDarkMode] = useState(false);
      const [glassMode, setGlassMode] = useState(() => { try { const v = localStorage.getItem('violentGlassMode'); return v === null ? true : v === 'true'; } catch(e) { return true; } });
      const [glassUnlocked, setGlassUnlocked] = useState(() => { try { const v = localStorage.getItem('violentGlassUnlocked'); return v === null ? true : v === 'true'; } catch(e) { return true; } });
      const [showGlassKeyDialog, setShowGlassKeyDialog] = useState(false);
      const [glassKeyInput, setGlassKeyInput] = useState('');
      const [glassKeyError, setGlassKeyError] = useState(false);
      const glassClickCount = useRef(0);
      const glassClickTimer = useRef(null);
      const [cadMode, setCadMode] = useState(() => { try { return JSON.parse(localStorage.getItem('cadMode') || 'false'); } catch { return false; } });
      const [showDrawingWorkspace, setShowDrawingWorkspace] = useState(true);
      const [pendingCanvasSize, setPendingCanvasSize] = useState(null);
      const [pendingArtwork, setPendingArtwork] = useState(null);
      const drawingSessionActiveRef = useRef(false);
      const forceDrawingRef = useRef(false);
      const [inGameMode, setInGameMode] = useState(false);
      const guessGameActivatorRef = useRef(null);
      const guessGameFromGamesRef = useRef(false);
      const [diceCount, setDiceCount] = useState(1);
      const [bombPlayerCount, setBombPlayerCount] = useState(3);
      const [activeCollectionId, setActiveCollectionId] = useState('bigstomach');
      const [collections, setCollections] = useState([
        { id: 'bigstomach', name: '大胃袋', items: [
          '咖喱饭','炸鸡','鸡腿','冰可乐','肉夹馍','凉皮加辣','蓝鳍金枪鱼','三文鱼','红魔虾','奶茶','脆皮五花肉','火腿','鸡翅包饭','无骨鸡爪','肠粉','广式叉烧','猪脚姜','虾饺','白切鸡','萝卜牛腩','炒河粉','煲仔饭','洛米粉','云吞面','烤乳鸽','烧鹅','冬菇滑鸡','牛肉丸','艇仔粥','糖葫芦','双皮奶','马蹄糕','姜撞奶','钵仔糕','猪脚姜','萝卜糕','鸡仔饼','凉拌鱼皮','烤乳猪','咕噜肉','老火靓汤','文昌鸡','椰子鸡','猪肚鸡','濑粉','猪杂粥','广式腊肠','紫菜汤','番薯粥','肯德基','必胜客','麦当劳','过桥米线','番茄炒蛋','佛跳墙','白灼虾','盐焙鸡','芝士龙虾','烤猪排','法式焘蜗牛','惠灵顿牛排','雪花肉','披萨','意大利面','热干面','蟹黄面','三文鱼面','炸酱面','冰淇淋','冰汤圆','南昌拌粉','生煎包','小笼包','章鱼小丸子','鸡排','肥牛盖饭','手枪腿','北京烤鸭','脏脏包','草莓蛋糕','三明治','玉米棒','蓝莓蛋糕','西瓜','牛油果','椰子汁','面包','热狗','奶茶','炒栗子','鸡肉卷','爆米花','饺子','三文鱼寿司','螃蟹','甜甜圈','布丁','棒棒糖','轻乳酪','猪脚粉','螺蛳粉','羊肉串','麻辣烫','牛肉粉丝','烤鱿鱼','馄馍','肉末粉丝','龙不老','鸭脖','可乐','烤鱼','火锅','汉堡','薯条','臭豆腐','马卡龙','红烧肉','白灼芥蓝','玉子烧卖','烤全羊','苹果派','涮羊肉','方便面','羊肉泡馍','巧克力','咖喱猪排','柠檬茶','蒸羊肉','蒸熊掌','蒸鹿尾儿','烧花鸭','烧雏鸡','烧子鹅','卤鸡','卤鸭','酱鸡','腊肉','松花鸡','小肚','涼肉','香肠','什锦苏盘儿','熏鸡白肚','清蒸八宝鸭','江米酿鸭','罐儿野鸡','罐儿鹍鹑','卤什件儿','卤子鸭','山鸡','兔肉','菜蛇','银鱼','清蒸哈什蚁','卤鸭腰儿','烩鸭排','清拌腰丝','黄心管儿','卤白肉','焖黄鱼','豆豉鲢鱼','锅烧鲢鱼','卤烂甲鱼','抓炒鲢鱼','抓炒对虾','软炸里脊','软炸鸡','什锦套肠儿','卤煮寒鸭','麻酥油卷','溜鲜肉','溜鱼片','溜鱼块','溜鱼片儿','醋溜肉片','溜三鲜儿','溜鸽子的','溜白肉','溜什件儿','炒银丝儿','溜刀鱼','清蒸火腿','炒白肉','卤青鱼','炒面筋','熖竹笋','芙蓉燕菜','炒虾仁儿','溜腰花儿','烩海参','炒蹄筋儿','锅烧海参','锅烧白菜','卤木耳','炒肝尖儿','桂花翅子','清蒸翅子','炸飞鱼','炸汁儿','炸排骨','清蒸江瑶柱','糖溜芡仁','拌鸡丝','卤肚儿','什锦豆腐','什锦丁儿','糟鱼','糟鱼段'
        ].map((label, i) => ({ label, weight: 1, color: COLORS[i % COLORS.length] }))},
        { id: 'examguess', name: '考试蒙题', items: [
          'A','B','C','D'
        ].map((label, i) => ({ label, weight: 1, color: COLORS[i % COLORS.length] }))},
        ...PROVINCE_PRESETS
      ]);
      const [showSettings, setShowSettings] = useState(false);
      const [settingsClosing, setSettingsClosing] = useState(false);
      const [vibrationEnabled, setVibrationEnabled] = useState(true);
      const vibrationEnabledRef = useRef(true);
      const [errorLogs, setErrorLogs] = useState([]);
      const [showErrorLogs, setShowErrorLogs] = useState(false);
      const [showApiGuide, setShowApiGuide] = useState(false);
      const [apiGuideTab, setApiGuideTab] = useState('deepseek');

      const requestMicPermission = async () => {
        if (Capacitor.isNativePlatform()) {
          try {
            const { Permissions: AndroidPermissions } = Capacitor.Plugins || {};
            if (AndroidPermissions && typeof AndroidPermissions.request === 'function') {
              const result = await AndroidPermissions.request({ name: 'microphone' });
              if (result.granted) return true;
            }
          } catch (e) { console.log('Capacitor Permissions plugin not available, fallback to getUserMedia'); }
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(t => t.stop());
            return true;
          } catch (e) {
            return false;
          }
        }
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(t => t.stop());
          return true;
        } catch (e) {
          return false;
        }
      };
      const [showUpdateLog, setShowUpdateLog] = useState(false);
      const [showOpenSource, setShowOpenSource] = useState(false);
      const [showBackupPanel, setShowBackupPanel] = useState(false);
      const [backupImporting, setBackupImporting] = useState(false);
      const backupFileInputRef = useRef(null);
      const [toastMessage, setToastMessage] = useState('');
      const [showToast, setShowToast] = useState(false);
      const toastTimerRef = useRef(null);
      const [devMode, setDevMode] = useState(() => localStorage.getItem('devMode') === 'true');
      const [devClickCount, setDevClickCount] = useState(0);
      const [showDevKeyInput, setShowDevKeyInput] = useState(false);
      const [devKeyInput, setDevKeyInput] = useState('');
      const devClickTimerRef = useRef(null);
      const displayToast = useCallback((message) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToastMessage(message);
        setShowToast(true);
        toastTimerRef.current = setTimeout(() => setShowToast(false), 2500);
      }, []);
      const [showAiChat, setShowAiChat] = useState(false);
      const [aiApiKey, setAiApiKey] = useState(() => localStorage.getItem('aiApiKey') || '');
      const [aiEndpoint, setAiEndpoint] = useState(() => {
        const saved = localStorage.getItem('aiEndpoint');
        if (!saved) return 'https://api.deepseek.com/chat/completions';
        if (saved.includes('deepseek.com/v1/chat')) {
          const fixed = saved.replace('deepseek.com/v1/chat', 'deepseek.com/chat');
          localStorage.setItem('aiEndpoint', fixed);
          return fixed;
        }
        return saved;
      });
      const [aiModel, setAiModel] = useState(() => localStorage.getItem('aiModel') || 'deepseek-v4-flash');
      const [aiToolEndpoint, setAiToolEndpoint] = useState(() => localStorage.getItem('aiToolEndpoint') || 'https://api.deepseek.com/chat/completions');
      const [aiToolModel, setAiToolModel] = useState(() => localStorage.getItem('aiToolModel') || 'deepseek-v4-flash');
      const [aiToolMenuClosing, setAiToolMenuClosing] = useState(false);
      const [aiShowToolModelMenu, setAiShowToolModelMenu] = useState(false);
      const [aiMessages, setAiMessages] = useState([]);
      const [aiInput, setAiInput] = useState('');
      const [aiLoading, setAiLoading] = useState(false);
      const [aiListening, setAiListening] = useState(false);
      const aiRecognitionRef = useRef(null);
      const [aiShowSettings, setAiShowSettings] = useState(false);
      const [aiSettingsClosing, setAiSettingsClosing] = useState(false);
      const [aiShowModelMenu, setAiShowModelMenu] = useState(false);
      const [aiModelMenuClosing, setAiModelMenuClosing] = useState(false);
      const [aiShowSearch, setAiShowSearch] = useState(false);
      const [aiShowSidebar, setAiShowSidebar] = useState(false);
      const [aiSearchQuery, setAiSearchQuery] = useState('');
      const [aiSearchResults, setAiSearchResults] = useState([]);
      const [aiDarkMode, setAiDarkMode] = useState(() => {
        const saved = localStorage.getItem('aiDarkMode');
        if (saved !== null) return saved === 'true';
        return true;
      });
      const [aiConversations, setAiConversations] = useState(() => {
        try { return JSON.parse(localStorage.getItem('aiConversations') || '[]'); } catch { return []; }
      });
      const [aiCurrentConvId, setAiCurrentConvId] = useState(() => localStorage.getItem('aiCurrentConvId') || 'default');
      const [aiThinkingEnabled, setAiThinkingEnabled] = useState(() => localStorage.getItem('aiThinkingEnabled') === 'true');
      const [aiReasoningEffort, setAiReasoningEffort] = useState(() => localStorage.getItem('aiReasoningEffort') || 'high');
      const [aiShowEffortMenu, setAiShowEffortMenu] = useState(false);
      const [aiEffortMenuClosing, setAiEffortMenuClosing] = useState(false);
      const [aiStreamingEnabled, setAiStreamingEnabled] = useState(() => localStorage.getItem('aiStreamingEnabled') !== 'false');
      const [aiStreamingContent, setAiStreamingContent] = useState('');
      const [aiStreamingReasoning, setAiStreamingReasoning] = useState('');
      const [aiWebSearchEnabled, setAiWebSearchEnabled] = useState(() => localStorage.getItem('aiWebSearchEnabled') === 'true');
      const [aiImages, setAiImages] = useState([]);
      const [aiSavedConfigs, setAiSavedConfigs] = useState(() => {
        try { return JSON.parse(localStorage.getItem('aiSavedConfigs') || '[]'); } catch { return []; }
      });
      const [editingConfigIdx, setEditingConfigIdx] = useState(-1);
      const [aiConfigName, setAiConfigName] = useState('');
      const aiChatEndRef = useRef(null);
      const aiChatContainerRef = useRef(null);
      const aiUserAtBottomRef = useRef(true);
      const aiAbortRef = useRef(null);
      const aiImageInputRef = useRef(null);
      const aiFileInputRef = useRef(null);
      const aiModelBtnRef = useRef(null);
      const [aiFiles, setAiFiles] = useState([]);
      const [aiDragOver, setAiDragOver] = useState(false);
      const aiLoadingRef = useRef(false);
      const [aiOcrProcessing, setAiOcrProcessing] = useState(false);
      const [aiOcrProgress, setAiOcrProgress] = useState(0);
      const [aiOcrStatus, setAiOcrStatus] = useState('');
      const [aiRelayEnabled, setAiRelayEnabled] = useState(() => localStorage.getItem('aiRelayEnabled') === 'true');
      const [aiRelayApiKey, setAiRelayApiKey] = useState(() => localStorage.getItem('aiRelayApiKey') || '');
      const [aiRelayEndpoint, setAiRelayEndpoint] = useState(() => localStorage.getItem('aiRelayEndpoint') || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions');
      const [aiRelayModel, setAiRelayModel] = useState(() => localStorage.getItem('aiRelayModel') || 'qwen3.6-plus');
      const [aiRelayProcessing, setAiRelayProcessing] = useState(false);
      const [aiRelayStatus, setAiRelayStatus] = useState('');

      useEffect(() => { if (aiApiKey) localStorage.setItem('aiApiKey', aiApiKey); else localStorage.removeItem('aiApiKey'); }, [aiApiKey]);
      useEffect(() => { if (aiEndpoint) localStorage.setItem('aiEndpoint', aiEndpoint); else localStorage.removeItem('aiEndpoint'); }, [aiEndpoint]);
      useEffect(() => { if (aiModel) localStorage.setItem('aiModel', aiModel); else localStorage.removeItem('aiModel'); }, [aiModel]);
      useEffect(() => { localStorage.setItem('aiThinkingEnabled', String(aiThinkingEnabled)); }, [aiThinkingEnabled]);
      useEffect(() => { localStorage.setItem('aiReasoningEffort', aiReasoningEffort); }, [aiReasoningEffort]);
      useEffect(() => { localStorage.setItem('aiStreamingEnabled', String(aiStreamingEnabled)); }, [aiStreamingEnabled]);
      useEffect(() => { localStorage.setItem('aiWebSearchEnabled', String(aiWebSearchEnabled)); }, [aiWebSearchEnabled]);
      useEffect(() => { localStorage.setItem('aiRelayEnabled', String(aiRelayEnabled)); }, [aiRelayEnabled]);
      useEffect(() => { if (aiRelayApiKey) localStorage.setItem('aiRelayApiKey', aiRelayApiKey); else localStorage.removeItem('aiRelayApiKey'); }, [aiRelayApiKey]);
      useEffect(() => { localStorage.setItem('aiRelayEndpoint', aiRelayEndpoint); }, [aiRelayEndpoint]);
      useEffect(() => { localStorage.setItem('aiRelayModel', aiRelayModel); }, [aiRelayModel]);
      useEffect(() => { localStorage.setItem('aiSavedConfigs', JSON.stringify(aiSavedConfigs)); }, [aiSavedConfigs]);
      useEffect(() => {
        if (aiSavedConfigs.length === 0) {
          if (aiApiKey) { setAiApiKey(''); localStorage.removeItem('aiApiKey'); }
          if (aiEndpoint) { setAiEndpoint(''); localStorage.removeItem('aiEndpoint'); }
          if (aiModel) { setAiModel(''); localStorage.removeItem('aiModel'); }
          setAiToolEndpoint('');
          setAiToolModel('');
          localStorage.removeItem('aiToolEndpoint');
          localStorage.removeItem('aiToolModel');
        }
      }, [aiSavedConfigs]);
      useEffect(() => { localStorage.setItem('aiDarkMode', String(aiDarkMode)); }, [aiDarkMode]);
      useEffect(() => { localStorage.setItem('aiConversations', JSON.stringify(aiConversations)); }, [aiConversations]);
      useEffect(() => { localStorage.setItem('aiCurrentConvId', aiCurrentConvId); }, [aiCurrentConvId]);
      useEffect(() => { localStorage.setItem('devMode', String(devMode)); }, [devMode]);

      const handleDevClick = useCallback(() => {
        if (devMode) return;
        setDevClickCount(prev => {
          const next = prev + 1;
          if (next >= 3) {
            setShowDevKeyInput(true);
            return 0;
          }
          return next;
        });
        if (devClickTimerRef.current) clearTimeout(devClickTimerRef.current);
        devClickTimerRef.current = setTimeout(() => setDevClickCount(0), 2000);
      }, [devMode]);

      const activateDevMode = useCallback(() => {
        if (devKeyInput !== '1379') { displayToast('⚠️密钥错误'); return; }
        const devConfigs = [
          { name: 'DeepSeek V4 Pro', endpoint: 'https://api.deepseek.com/chat/completions', model: 'deepseek-v4-pro', apiKey: 'sk-d53988789ab346dc94020e606a9e408c', dev: true },
          { name: 'DeepSeek V4 Flash', endpoint: 'https://api.deepseek.com/chat/completions', model: 'deepseek-v4-flash', apiKey: 'sk-d53988789ab346dc94020e606a9e408c', dev: true },
        ];
        setAiSavedConfigs(prev => {
          const merged = [...prev];
          devConfigs.forEach(dc => {
            const idx = merged.findIndex(c => c.model === dc.model);
            if (idx >= 0) merged[idx] = { ...merged[idx], ...dc };
            else merged.push(dc);
          });
          return merged;
        });
        setAiApiKey('sk-d53988789ab346dc94020e606a9e408c');
        setAiEndpoint('https://api.deepseek.com/chat/completions');
        setAiModel('deepseek-v4-flash');
        setAiToolEndpoint('https://api.deepseek.com/chat/completions');
        setAiToolModel('deepseek-v4-flash');
        localStorage.setItem('aiToolEndpoint', 'https://api.deepseek.com/chat/completions');
        localStorage.setItem('aiToolModel', 'deepseek-v4-flash');
        setAiRelayEnabled(true);
        setAiRelayApiKey('e536e7bdf1a743c5999e18b5a2a55455.YWfL0pj1WcRBPBlS');
        setAiRelayEndpoint('https://open.bigmodel.cn/api/paas/v4/chat/completions');
        setAiRelayModel('glm-5v-turbo');
        setDevMode(true);
        setShowDevKeyInput(false);
        setDevKeyInput('');
        displayToast('✅开发者模式已激活，已配置 DeepSeek V4 + 接力模型 GLM-5V-Turbo');
      }, [devKeyInput, displayToast]);

      const saveCurrentConversation = useCallback((messagesOverride) => {
        const messagesToSave = messagesOverride || aiMessages;
        if (messagesToSave.length > 0) {
          const firstUserMsg = messagesToSave.find(m => m.role === 'user');
          const title = firstUserMsg ? (typeof firstUserMsg.content === 'string' ? firstUserMsg.content.substring(0, 30) : '图片对话') : '空对话';
          setAiConversations(prev => [{
            id: aiCurrentConvId,
            title,
            messages: messagesToSave,
            model: aiModel,
            timestamp: Date.now()
          }, ...prev.filter(c => c.id !== aiCurrentConvId)].slice(0, 50));
        }
      }, [aiMessages, aiCurrentConvId, aiModel]);
      useEffect(() => {
        if (aiUserAtBottomRef.current && aiChatEndRef.current) {
          aiChatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, [aiMessages, aiStreamingContent, aiStreamingReasoning]);

      const renderMarkdown = (text) => {
        if (!text) return '';
        let html = text;
        const mathBlocks = [];

        const extractMath = (pattern, type) => {
          html = html.replace(pattern, (match, latex) => {
            if (typeof latex !== 'string' || !latex.trim()) return match;
            const i = mathBlocks.length;
            mathBlocks.push({ type, latex: latex.trim() });
            return `%%MATHBLOCK${i}%%`;
          });
        };

        extractMath(/\$\$([\s\S]+?)\$\$/g, 'display');
        extractMath(/\\\[([\s\S]*?)\\\]/g, 'display');
        extractMath(/\$([^\$\n]+?)\$/g, 'inline');
        extractMath(/\\\(([\s\S]*?)\\\)/g, 'inline');

        if (mathBlocks.length > 0 && html.includes('\\\\(')) {
          const fallbackPattern = /\\\\\(([\s\S]*?)\\\\\)/g;
          html = html.replace(fallbackPattern, (match, latex) => {
            if (typeof latex !== 'string' || !latex.trim()) return match;
            try {
              const rendered = katex.renderToString(latex.trim(), { displayMode: false, throwOnError: false, trust: true, strict: false });
              return rendered;
            } catch {
              return match;
            }
          });
        }

        html = html
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
          return `<pre class="rounded-lg p-3 text-xs overflow-x-auto my-2 ${glassMode ? 'aurora-glass-input text-indigo-900' : aiDarkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-100 text-gray-800'}"><code>${code.trim()}</code></pre>`;
        });
        html = html.replace(/`([^`]+)`/g, `<code class="px-1.5 py-0.5 rounded text-xs ${glassMode ? 'bg-pink-100/60 text-pink-700' : aiDarkMode ? 'bg-gray-900 text-green-400' : 'bg-gray-100 text-red-600'}">$1</code>`);
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = html.replace(/^### (.+)$/gm, `<h3 class="text-sm font-bold mt-3 mb-1 ${glassMode ? 'text-blue-800' : aiDarkMode ? 'text-white' : 'text-gray-900'}">$1</h3>`);
        html = html.replace(/^## (.+)$/gm, `<h2 class="text-base font-bold mt-3 mb-1 ${glassMode ? 'text-blue-800' : aiDarkMode ? 'text-white' : 'text-gray-900'}">$1</h2>`);
        html = html.replace(/^# (.+)$/gm, `<h1 class="text-lg font-bold mt-3 mb-1 ${glassMode ? 'text-blue-800' : aiDarkMode ? 'text-white' : 'text-gray-900'}">$1</h1>`);
        html = html.replace(/^\|(.+)\|$/gm, (match) => {
          const cells = match.split('|').filter(c => c.trim());
          const isSep = cells.every(c => /^[\s-:]+$/.test(c));
          if (isSep) return '';
          const tds = cells.map(c => `<td class="px-2 py-1 border ${glassMode ? 'border-blue-200/40' : aiDarkMode ? 'border-gray-600' : 'border-gray-300'}">${c.trim()}</td>`).join('');
          return `<tr>${tds}</tr>`;
        });
        html = html.replace(/((?:<tr>.*<\/tr>\n?)+)/g, `<table class="border-collapse my-2 text-xs w-full ${glassMode ? 'border-blue-200/40' : aiDarkMode ? 'border-gray-600' : 'border-gray-300'} border">$1</table>`);
        html = html.replace(/^[-*] (.+)$/gm, `<li class="ml-4 list-disc">${'$1'}</li>`);
        html = html.replace(/^\d+\. (.+)$/gm, `<li class="ml-4 list-decimal">${'$1'}</li>`);
        html = html.replace(/\n/g, '<br/>');
        html = html.replace(/<br\/><br\/><(h[1-3]|pre|table|ul|ol|li)/g, '<$1');
        html = html.replace(/%%MATHBLOCK(\d+)%%/g, (_, idx) => {
          const block = mathBlocks[parseInt(idx)];
          if (!block) return '';
          try {
            const rendered = katex.renderToString(block.latex, {
              displayMode: block.type === 'display',
              throwOnError: false,
              trust: true,
              strict: false
            });
            return rendered;
          } catch (e) {
            console.warn('LaTeX render error:', e, 'for:', block.latex);
            return `<span class="text-red-500">[公式]</span>`;
          }
        });
        return html;
      };

      const toggleVoiceInput = () => {
        if (aiListening) {
          if (aiRecognitionRef.current) {
            aiRecognitionRef.current.stop();
          }
          setAiListening(false);
          return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          setAiMessages(prev => [...prev, { role: 'assistant', content: '⚠️当前浏览器不支持语音识别，请使用 Chrome 浏览器' }]);
          return;
        }
        requestMicPermission().then(granted => {
          if (granted === false) {
            setAiMessages(prev => [...prev, { role: 'assistant', content: '⚠️麦克风权限被拒绝，请在设置中允许麦克风访问' }]);
            return;
          }
          const recognition = new SpeechRecognition();
          recognition.lang = 'zh-CN';
          recognition.interimResults = true;
          recognition.continuous = true;
          let finalTranscript = '';
          recognition.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
              } else {
                interim += event.results[i][0].transcript;
              }
            }
            setAiInput(finalTranscript + interim);
          };
          recognition.onerror = (e) => {
            setAiListening(false);
            if (e.error === 'not-allowed' || e.error === 'permission-denied') {
              setAiMessages(prev => [...prev, { role: 'assistant', content: '⚠️麦克风权限被拒绝，请在系统设置中允许麦克风访问' }]);
            }
          };
          recognition.onend = () => {
            setAiListening(false);
          };
          recognition.start();
          aiRecognitionRef.current = recognition;
          setAiListening(true);
        }).catch(() => {
          setAiMessages(prev => [...prev, { role: 'assistant', content: '⚠️语音识别启动失败，请检查麦克风权限' }]);
        });
      };

      const aiSendMessage = async () => {
        if ((!aiInput.trim() && aiImages.length === 0 && aiFiles.length === 0) || aiLoadingRef.current) return;
        if (!aiApiKey.trim()) { setAiShowSettings(true); return; }
        aiUserAtBottomRef.current = true;
        const currentPreset = aiPresetModels.find(p => p.model === aiModel && p.endpoint === aiEndpoint);
        const mainSupportsImage = currentPreset?.supportsImage || false;
        const needsRelay = aiImages.length > 0 && aiRelayEnabled && aiRelayApiKey.trim() && (!mainSupportsImage || aiEndpoint.includes('deepseek'));
        if (needsRelay) {
          aiLoadingRef.current = true;
          setAiRelayProcessing(true);
          setAiRelayStatus('正在通过接力模型分析图片...');
          setAiLoading(true);
          const relayDescriptions = [];
          for (let i = 0; i < aiImages.length; i++) {
            setAiRelayStatus(`接力模型正在分析第${i + 1}/${aiImages.length} 张图片...`);
            try {
              const contentParts = [];
              contentParts.push({ type: 'image_url', image_url: { url: aiImages[i].base64 } });
              contentParts.push({ type: 'text', text: '你是一个图片信息提取助手。请根据图片内容判断类型并提取：\n1. 如果是题目/试卷/作业：只原样提取题目文字和选项，不要解答、不要分析、不要额外说明\n2. 如果是代码截图：只还原代码内容，不加解释\n3. 如果是图表/数据图：提取数据数值和图例含义\n4. 如果是场景/实物/人物照片：描述场景、物体、人物、文字、颜色、氛围等关键信息\n5. 如果是文档/文章：提取全文文字内容\n只输出提取结果，不加任何前缀或说明。' });
              const relayRes = await fetch(proxyFetchUrl(aiRelayEndpoint), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiRelayApiKey}` },
                body: JSON.stringify({
                  model: aiRelayModel,
                  messages: [{ role: 'user', content: contentParts }],
                  stream: false,
                }),
              });
              if (!relayRes.ok) {
                let errText = '';
                try { const errJson = await relayRes.json(); errText = errJson.error?.message || JSON.stringify(errJson); } catch { errText = await relayRes.text(); }
                throw new Error(`接力模型错误(${relayRes.status}): ${errText}`);
              }
              const relayJson = await relayRes.json();
              const desc = relayJson.choices?.[0]?.message?.content || '（图片分析失败）';
              relayDescriptions.push(`【图${i + 1}内容描述】\n${desc}`);
            } catch (err) {
              relayDescriptions.push(`【图${i + 1}】接力分析失败: ${err.message}`);
            }
          }
          setAiRelayProcessing(false);
          setAiRelayStatus('');
          const relayContext = relayDescriptions.join('\n\n');
          const userMsg = { role: 'user', content: aiInput.trim(), relayContext, images: aiImages.map(img => img.preview), relay: true };
          const newMessages = [...aiMessages, userMsg];
          setAiMessages(newMessages);
          setAiInput('');
          setAiImages([]);
          setAiStreamingContent('');
          setAiStreamingReasoning('');
          const abortController = new AbortController();
          aiAbortRef.current = abortController;
          const isDeepSeekReasoner = aiModel.includes('deepseek-reasoner') || aiModel.includes('deepseek-r1');
          const useThinking = aiThinkingEnabled || isDeepSeekReasoner;
          const contextMessages = newMessages.map(m => ({ role: m.role, content: m.relayContext ? `${m.relayContext}\n\n${m.content}`.trim() : m.content }));
          let headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiApiKey}` };
          const requestBody = {
            model: aiModel,
            messages: contextMessages,
            stream: aiStreamingEnabled,
          };
          if (useThinking) {
            requestBody.thinking = { type: 'enabled', budget_tokens: aiReasoningEffort === 'max' ? 16000 : 8000 };
          }
          if (aiWebSearchEnabled) requestBody.web_search = true;
          try {
            const apiEndpoint = proxyFetchUrl(aiEndpoint);
            const response = await fetch(apiEndpoint, { method: 'POST', headers, body: JSON.stringify(requestBody), signal: abortController.signal });
            if (!response.ok) {
              let errText = '';
              try { const errJson = await response.json(); errText = errJson.error?.message || JSON.stringify(errJson); } catch { errText = await response.text(); }
              throw new Error(`API 错误(${response.status}): ${errText}`);
            }
            if (aiStreamingEnabled) {
              const reader = response.body.getReader();
              const decoder = new TextDecoder();
              let buffer = '';
              let fullContent = '';
              let fullReasoning = '';
              let tokenUsage = null;
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                  if (!line.startsWith('data: ')) continue;
                  const data = line.slice(6).trim();
                  if (data === '[DONE]') continue;
                  try {
                    const json = JSON.parse(data);
                    const delta = json.choices?.[0]?.delta;
                    if (delta) {
                      if (delta.reasoning_content) { fullReasoning += delta.reasoning_content; setAiStreamingReasoning(fullReasoning); }
                      if (delta.content) { fullContent += delta.content; setAiStreamingContent(fullContent); }
                    }
                    if (json.usage) tokenUsage = json.usage;
                  } catch {}
                }
              }
              const finalMsg = { role: 'assistant', content: fullContent, reasoning: fullReasoning || undefined, tokens: tokenUsage };
              const updated = [...newMessages, finalMsg];
              setAiMessages(updated);
              setAiStreamingContent('');
              setAiStreamingReasoning('');
              saveCurrentConversation(updated);
            } else {
              const json = await response.json();
              const content = json.choices?.[0]?.message?.content || '';
              const reasoning = json.choices?.[0]?.message?.reasoning_content;
              const finalMsg = { role: 'assistant', content, reasoning: reasoning || undefined, tokens: json.usage };
              const updated = [...newMessages, finalMsg];
              setAiMessages(updated);
              saveCurrentConversation(updated);
            }
          } catch (err) {
            if (err.name === 'AbortError') return;
            const errorMsg = [...newMessages, { role: 'assistant', content: `❌${err.message}` }];
            setAiMessages(errorMsg);
            saveCurrentConversation(errorMsg);
          } finally {
            setAiLoading(false);
            aiLoadingRef.current = false;
            aiAbortRef.current = null;
          }
          return;
        }
        if (aiImages.length > 0 && aiEndpoint.includes('deepseek') && !aiRelayEnabled) {
          displayToast('🔍正在进行 OCR 图片文字识别...');
          aiLoadingRef.current = true;
          setAiOcrProcessing(true);
          setAiOcrProgress(0);
          setAiOcrStatus('正在预处理图片...');
          setAiLoading(true);
          const ocrTexts = [];
          for (let i = 0; i < aiImages.length; i++) {
            setAiOcrStatus(`正在预处理第${i + 1}/${aiImages.length} 张图片...`);
            const ocrSrc = aiImages[i].ocrBase64 || aiImages[i].base64;
            let processedImage;
            try {
              processedImage = await preprocessForOCR(ocrSrc);
            } catch {
              processedImage = ocrSrc;
            }
            setAiOcrStatus(`正在识别第${i + 1}/${aiImages.length} 张图片...`);
            try {
              const result = await Tesseract.recognize(processedImage, 'chi_sim+eng', {
                tessedit_pageseg_mode: '6',
                logger: m => {
                  if (m.status === 'recognizing text') {
                    const pct = Math.round((m.progress + i) / aiImages.length * 100);
                    setAiOcrProgress(pct);
                  }
                }
              });
              const text = result.data.text.trim();
              if (text) ocrTexts.push(`【图${i + 1}文字内容】\n${text}`);
              else ocrTexts.push(`【图${i + 1}】未识别到文字`);
            } catch (err) {
              ocrTexts.push(`【图${i + 1}】识别失败: ${err.message}`);
            }
          }
          setAiOcrProcessing(false);
          setAiOcrProgress(100);
          setAiOcrStatus('');
          const ocrContext = ocrTexts.join('\n\n');
          const userText = [ocrContext, aiInput.trim()].filter(Boolean).join('\n\n');
          const userMsg = { role: 'user', content: userText, images: aiImages.map(img => img.preview), ocr: true };
          const newMessages = [...aiMessages, userMsg];
          setAiMessages(newMessages);
          setAiInput('');
          setAiImages([]);
          setAiStreamingContent('');
          setAiStreamingReasoning('');
          const abortController = new AbortController();
          aiAbortRef.current = abortController;
          const isDeepSeekReasoner = aiModel.includes('deepseek-reasoner') || aiModel.includes('deepseek-r1');
          const useThinking = aiThinkingEnabled || isDeepSeekReasoner;
          const contextMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
          let headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiApiKey}` };
          const requestBody = {
            model: aiModel,
            messages: contextMessages,
            stream: aiStreamingEnabled,
          };
          if (useThinking) {
            requestBody.thinking = { type: 'enabled', budget_tokens: aiReasoningEffort === 'max' ? 16000 : 8000 };
          }
          if (aiWebSearchEnabled) requestBody.web_search = true;
          try {
            const apiEndpoint = proxyFetchUrl(aiEndpoint);
            const response = await fetch(apiEndpoint, { method: 'POST', headers, body: JSON.stringify(requestBody), signal: abortController.signal });
            if (!response.ok) {
              let errText = '';
              try { const errJson = await response.json(); errText = errJson.error?.message || JSON.stringify(errJson); } catch { errText = await response.text(); }
              throw new Error(`API 错误(${response.status}): ${errText}`);
            }
            if (aiStreamingEnabled) {
              const reader = response.body.getReader();
              const decoder = new TextDecoder();
              let buffer = '';
              let fullContent = '';
              let fullReasoning = '';
              let tokenUsage = null;
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                  if (!line.startsWith('data: ')) continue;
                  const data = line.slice(6).trim();
                  if (data === '[DONE]') continue;
                  try {
                    const json = JSON.parse(data);
                    const delta = json.choices?.[0]?.delta;
                    if (delta) {
                      if (delta.reasoning_content) { fullReasoning += delta.reasoning_content; setAiStreamingReasoning(fullReasoning); }
                      if (delta.content) { fullContent += delta.content; setAiStreamingContent(fullContent); }
                    }
                    if (json.usage) tokenUsage = json.usage;
                  } catch {}
                }
              }
              const finalMsg = { role: 'assistant', content: fullContent, reasoning: fullReasoning || undefined, tokens: tokenUsage };
              const updated = [...newMessages, finalMsg];
              setAiMessages(updated);
              setAiStreamingContent('');
              setAiStreamingReasoning('');
              saveCurrentConversation(updated);
            } else {
              const json = await response.json();
              const content = json.choices?.[0]?.message?.content || '';
              const reasoning = json.choices?.[0]?.message?.reasoning_content;
              const finalMsg = { role: 'assistant', content, reasoning: reasoning || undefined, tokens: json.usage };
              const updated = [...newMessages, finalMsg];
              setAiMessages(updated);
              saveCurrentConversation(updated);
            }
          } catch (err) {
            if (err.name === 'AbortError') return;
            const errorMsg = [...newMessages, { role: 'assistant', content: `❌${err.message}` }];
            setAiMessages(errorMsg);
            saveCurrentConversation(errorMsg);
          } finally {
            setAiLoading(false);
            aiLoadingRef.current = false;
            aiAbortRef.current = null;
          }
          return;
        }
        aiLoadingRef.current = true;
        const hasImages = aiImages.length > 0;
        const hasFiles = aiFiles.length > 0;
        let userMsg;
        const fileContext = hasFiles ? aiFiles.map(f => `[文件: ${f.name}]\n${f.content}`).join('\n\n') : '';
        const userText = [fileContext, aiInput.trim()].filter(Boolean).join('\n\n');
        if (hasImages) {
          const contentParts = [];
          aiImages.forEach(img => {
            contentParts.push({ type: 'image_url', image_url: { url: img.base64 } });
          });
          contentParts.push({ type: 'text', text: userText || '请描述这张图片' });
          userMsg = { role: 'user', content: contentParts, images: aiImages.map(img => img.preview), files: hasFiles ? aiFiles.map(f => f.name) : undefined };
        } else {
          userMsg = { role: 'user', content: userText, files: hasFiles ? aiFiles.map(f => f.name) : undefined };
        }
        const newMessages = [...aiMessages, userMsg];
        setAiMessages(newMessages);
        setAiInput('');
        setAiImages([]);
        setAiFiles([]);
        setAiLoading(true);
        setAiStreamingContent('');
        setAiStreamingReasoning('');
        const abortController = new AbortController();
        aiAbortRef.current = abortController;
        const isDeepSeekReasoner = aiModel.includes('deepseek-reasoner') || aiModel.includes('deepseek-r1');
        const useThinking = aiThinkingEnabled || isDeepSeekReasoner;
        const isAnthropic = aiEndpoint.includes('anthropic');
        const contextMessages = newMessages.map(m => {
          let msgContent = m.content;
          if (isAnthropic && Array.isArray(m.content)) {
            msgContent = m.content.map(part => {
              if (part.type === 'image_url' && part.image_url?.url?.startsWith('data:')) {
                const match = part.image_url.url.match(/^data:(image\/\w+);base64,(.+)$/);
                if (match) {
                  return { type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } };
                }
              }
              return part;
            });
          }
          const msg = { role: m.role, content: msgContent };
          if (m.role === 'assistant' && m.reasoning && useThinking && !isAnthropic) {
            msg.reasoning_content = m.reasoning;
          }
          return msg;
        });
        let headers = { 'Content-Type': 'application/json' };
        let requestBody;
        if (isAnthropic) {
          headers['x-api-key'] = aiApiKey;
          headers['anthropic-version'] = '2023-06-01';
          const anthropicMessages = contextMessages.filter(m => m.role !== 'system');
          requestBody = {
            model: aiModel,
            max_tokens: useThinking ? 65536 : 4096,
            messages: anthropicMessages,
            stream: aiStreamingEnabled,
          };
          if (aiEndpoint.includes('deepseek')) {
            if (useThinking) {
              requestBody.thinking = { type: 'enabled', budget_tokens: aiReasoningEffort === 'max' ? 16000 : 8000 };
              requestBody.output_config = { effort: aiReasoningEffort };
            } else {
              requestBody.thinking = { type: 'disabled' };
            }
          } else if (useThinking) {
            requestBody.thinking = { type: 'enabled', budget_tokens: 10000 };
          }
          const systemMsg = contextMessages.find(m => m.role === 'system');
          if (systemMsg) requestBody.system = systemMsg.content;
        } else {
          headers['Authorization'] = `Bearer ${aiApiKey}`;
          requestBody = {
            model: aiModel,
            messages: contextMessages,
            stream: aiStreamingEnabled,
            max_tokens: useThinking ? 65536 : 4096,
          };
          if (aiEndpoint.includes('deepseek')) {
            if (useThinking) {
              requestBody.thinking = { type: 'enabled' };
              requestBody.reasoning_effort = aiReasoningEffort;
            } else {
              requestBody.thinking = { type: 'disabled' };
            }
          }
          if (aiWebSearchEnabled && aiEndpoint.includes('deepseek')) {
            requestBody.web_search = true;
          }
          if (aiWebSearchEnabled && !aiEndpoint.includes('deepseek')) {
            requestBody.tools = [{ type: 'web_search', web_search: {} }];
          }
        }
        let fetchUrl = aiEndpoint;
        let timeoutId = null;
        try {
          timeoutId = setTimeout(() => {
            abortController.abort(new Error('timeout'));
          }, 120000);
          let res = await fetch(proxyFetchUrl(aiEndpoint), {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
            signal: abortController.signal,
          });
          if (!res.ok) {
            if (aiEndpoint.includes('deepseek') && res.status === 404) {
              const altEndpoints = [];
              if (aiEndpoint.includes('/v1/')) altEndpoints.push(aiEndpoint.replace('/v1/', '/'));
              else if (!aiEndpoint.includes('/v1/')) altEndpoints.push(aiEndpoint.replace('api.deepseek.com/chat', 'api.deepseek.com/v1/chat'));
              for (const altUrl of altEndpoints) {
                if (altUrl === aiEndpoint) continue;
                const retryRes = await fetch(proxyFetchUrl(altUrl), {
                  method: 'POST', headers,
                  body: JSON.stringify(requestBody),
                  signal: abortController.signal,
                });
                if (retryRes.ok) {
                  res = retryRes;
                  fetchUrl = altUrl;
                  setAiEndpoint(altUrl);
                  break;
                }
                if (retryRes.status !== 404) {
                  res = retryRes;
                  fetchUrl = altUrl;
                  break;
                }
              }
            }
            if (!res.ok) {
              const errText = await res.text().catch(() => '');
              throw new Error(`HTTP ${res.status}${errText ? ': ' + errText.substring(0, 200) : ''}`);
            }
          }
          if (aiStreamingEnabled && res.body) {
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';
            let fullReasoning = '';
            let tokenUsage = null;
            let buffer = '';
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                if (isAnthropic) {
                  if (trimmed === 'event: message_stop' || trimmed.startsWith('event:')) continue;
                  if (!trimmed.startsWith('data: ')) continue;
                  try {
                    const json = JSON.parse(trimmed.slice(6));
                    if (json.type === 'content_block_delta') {
                      if (json.delta?.type === 'thinking_delta') {
                        fullReasoning += json.delta.thinking || '';
                        setAiStreamingReasoning(fullReasoning);
                      } else if (json.delta?.type === 'text_delta') {
                        fullContent += json.delta.text || '';
                        setAiStreamingContent(fullContent);
                      }
                    }
                    if (json.type === 'message_delta' && json.usage) {
                      tokenUsage = { output_tokens: json.usage.output_tokens };
                    }
                    if (json.type === 'message_start' && json.message?.usage) {
                      tokenUsage = tokenUsage || {};
                      tokenUsage.input_tokens = json.message.usage.input_tokens;
                    }
                  } catch {}
                } else {
                  if (trimmed === 'data: [DONE]') continue;
                  if (!trimmed.startsWith('data: ')) continue;
                  try {
                    const json = JSON.parse(trimmed.slice(6));
                    if (json.error) {
                      fullContent += `\n❌API错误: ${json.error.message || JSON.stringify(json.error)}`;
                      setAiStreamingContent(fullContent);
                      continue;
                    }
                    const delta = json.choices?.[0]?.delta;
                    if (delta) {
                      if (delta.reasoning_content) {
                        fullReasoning += delta.reasoning_content;
                        setAiStreamingReasoning(fullReasoning);
                      }
                      if (delta.content) {
                        fullContent += delta.content;
                        setAiStreamingContent(fullContent);
                      }
                    }
                    if (json.usage) {
                      tokenUsage = json.usage;
                    }
                  } catch {}
                }
              }
            }
            if (timeoutId) clearTimeout(timeoutId);
            setAiMessages(prev => [...prev, { role: 'assistant', content: fullContent || '（无回复）', reasoning: fullReasoning || undefined, tokens: tokenUsage || undefined }]);
            setAiStreamingContent('');
            setAiStreamingReasoning('');
          } else {
            if (timeoutId) clearTimeout(timeoutId);
            const data = await res.json();
            if (data.error) {
              setAiMessages(prev => [...prev, { role: 'assistant', content: `❌API错误: ${data.error.message || JSON.stringify(data.error)}` }]);
            } else if (isAnthropic) {
              const contentBlocks = data.content || [];
              let reply = '';
              let reasoning = '';
              for (const block of contentBlocks) {
                if (block.type === 'text') reply += block.text;
                if (block.type === 'thinking') reasoning += block.thinking;
              }
              const nonStreamTokens = data.usage ? { input_tokens: data.usage.input_tokens, output_tokens: data.usage.output_tokens } : undefined;
              setAiMessages(prev => [...prev, { role: 'assistant', content: reply || '（无回复）', reasoning: reasoning || undefined, tokens: nonStreamTokens }]);
            } else {
              const choice = data.choices?.[0]?.message;
              const reply = choice?.content || '（无回复）';
              const reasoning = choice?.reasoning_content || undefined;
              const nonStreamTokens = data.usage || undefined;
              setAiMessages(prev => [...prev, { role: 'assistant', content: reply, reasoning, tokens: nonStreamTokens }]);
            }
          }
        } catch (err) {
          if (err.name === 'AbortError') {
            const isTimeout = err.cause?.message === 'timeout' || err.message?.includes('timeout');
            if (isTimeout) {
              setAiMessages(prev => [...prev, { role: 'assistant', content: '❌请求超时（20秒），图片可能过大，请尝试更小的图片' }]);
            }
            return;
          }
          let errorMsg = err.message;
          if (err.message?.includes('Failed to fetch') || err.message?.includes('ERR_ABORTED') || err.message?.includes('NetworkError')) {
            errorMsg = '网络连接失败，请检查：\n1. 网络连接是否正常\n2. API密钥是否已配置\n3. API端点是否正常';
          }
          setAiMessages(prev => [...prev, { role: 'assistant', content: `❌请求失败: ${errorMsg}` }]);
        } finally {
          if (timeoutId) clearTimeout(timeoutId);
          aiLoadingRef.current = false;
          setAiLoading(false);
          if (aiAbortRef.current === abortController) {
            aiAbortRef.current = null;
          }
        }
      };

      const aiStopGeneration = () => {
        if (aiAbortRef.current) {
          aiAbortRef.current.abort();
          aiLoadingRef.current = false;
          if (aiStreamingContent || aiStreamingReasoning) {
            setAiMessages(prev => [...prev, { role: 'assistant', content: aiStreamingContent || '（已中断）', reasoning: aiStreamingReasoning || undefined }]);
            setAiStreamingContent('');
            setAiStreamingReasoning('');
          }
          setAiLoading(false);
        }
      };

      const aiClearChat = () => {
        setAiMessages([]);
        setAiStreamingContent('');
        setAiStreamingReasoning('');
      };
      const errorLogsRef = useRef([]);

      useEffect(() => {
        if (darkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      }, [darkMode]);

      useEffect(() => {
        const savedLogs = localStorage.getItem('violentErrorLogs');
        if (savedLogs) {
          try {
            const parsed = JSON.parse(savedLogs);
            setErrorLogs(parsed);
            errorLogsRef.current = parsed;
          } catch (e) { console.error('Failed to load error logs:', e); }
        }

        const handleError = (event) => {
          const errorInfo = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toLocaleString('zh-CN'),
            type: event.type === 'error' ? '运行时错误' : '未捕获异常',
            message: event.message || event.reason?.message || '未知错误',
            stack: event.error?.stack || event.reason?.stack || '',
            url: event.filename || '',
            line: event.lineno || '',
            col: event.colno || ''
          };
          const newLogs = [...errorLogsRef.current, errorInfo].slice(-100);
          errorLogsRef.current = newLogs;
          setErrorLogs(newLogs);
          try {
            localStorage.setItem('violentErrorLogs', JSON.stringify(newLogs));
          } catch (e) { console.error('Failed to save error logs:', e); }
        };

        const handleUnhandledRejection = (event) => {
          const errorInfo = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toLocaleString('zh-CN'),
            type: 'Promise拒绝',
            message: event.reason?.message || String(event.reason) || '未处理的Promise拒绝',
            stack: event.reason?.stack || '',
            url: '',
            line: '',
            col: ''
          };
          const newLogs = [...errorLogsRef.current, errorInfo].slice(-100);
          errorLogsRef.current = newLogs;
          setErrorLogs(newLogs);
          try {
            localStorage.setItem('violentErrorLogs', JSON.stringify(newLogs));
          } catch (e) { console.error('Failed to save error logs:', e); }
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
          window.removeEventListener('error', handleError);
          window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
      }, []);

      const logError = (message, error) => {
        const errorInfo = {
          id: Date.now() + Math.random(),
          timestamp: new Date().toLocaleString('zh-CN'),
          type: '手动记录',
          message: message,
          stack: error?.stack || error?.message || '',
          url: '',
          line: '',
          col: ''
        };
        const newLogs = [...errorLogsRef.current, errorInfo].slice(-100);
        errorLogsRef.current = newLogs;
        setErrorLogs(newLogs);
        try {
          localStorage.setItem('violentErrorLogs', JSON.stringify(newLogs));
        } catch (e) { console.error('Failed to save error logs:', e); }
      };

      const clearErrorLogs = () => {
        setErrorLogs([]);
        errorLogsRef.current = [];
        localStorage.removeItem('violentErrorLogs');
      };

      const vibrate = (pattern) => {
        if (!vibrationEnabled) return;
        if (navigator.vibrate) navigator.vibrate(pattern);
      };

      const loadSettings = () => {
        try {
          const saved = localStorage.getItem('violentDecision');
          if (saved) {
            const data = JSON.parse(saved);
            if (data.collections) {
              const defaultIds = ['bigstomach', 'examguess', 'truth', ...PROVINCE_PRESETS.map(p => p.id)];
              const savedIds = data.collections.map(c => c.id);
              const merged = data.collections.filter(c => !defaultIds.includes(c.id));
              const builtinDefaults = [
                { id: 'bigstomach', name: '大胃袋', items: [
                  '咖喱饭','炸鸡','鸡腿','冰可乐','肉夹馍','凉皮加辣','蓝鳍金枪鱼','三文鱼','红魔虾','奶茶','脆皮五花肉','火腿','鸡翅包饭','无骨鸡爪','肠粉','广式叉烧','猪脚姜','虾饺','白切鸡','萝卜牛腩','炒河粉','煲仔饭','洛米粉','云吞面','烤乳鸽','烧鹅','冬菇滑鸡','牛肉丸','艇仔粥','糖葫芦','双皮奶','马蹄糕','姜撞奶','钵仔糕','猪脚姜','萝卜糕','鸡仔饼','凉拌鱼皮','烤乳猪','咕噜肉','老火靓汤','文昌鸡','椰子鸡','猪肚鸡','濑粉','猪杂粥','广式腊肠','紫菜汤','番薯粥','肯德基','必胜客','麦当劳','过桥米线','番茄炒蛋','佛跳墙','白灼虾','盐焙鸡','芝士龙虾','烤猪排','法式焘蜗牛','惠灵顿牛排','雪花肉','披萨','意大利面','热干面','蟹黄面','三文鱼面','炸酱面','冰淇淋','冰汤圆','南昌拌粉','生煎包','小笼包','章鱼小丸子','鸡排','肥牛盖饭','手枪腿','北京烤鸭','脏脏包','草莓蛋糕','三明治','玉米棒','蓝莓蛋糕','西瓜','牛油果','椰子汁','面包','热狗','奶茶','炒栗子','鸡肉卷','爆米花','饺子','三文鱼寿司','螃蟹','甜甜圈','布丁','棒棒糖','轻乳酪','猪脚粉','螺蛳粉','羊肉串','麻辣烫','牛肉粉丝','烤鱿鱼','馄馍','肉末粉丝','龙不老','鸭脖','可乐','烤鱼','火锅','汉堡','薯条','臭豆腐','马卡龙','红烧肉','白灼芥蓝','玉子烧卖','烤全羊','苹果派','涮羊肉','方便面','羊肉泡馍','巧克力','咖喱猪排','柠檬茶','蒸羊肉','蒸熊掌','蒸鹿尾儿','烧花鸭','烧雏鸡','烧子鹅','卤鸡','卤鸭','酱鸡','腊肉','松花鸡','小肚','涼肉','香肠','什锦苏盘儿','熏鸡白肚','清蒸八宝鸭','江米酿鸭','罐儿野鸡','罐儿鹍鹑','卤什件儿','卤子鸭','山鸡','兔肉','菜蛇','银鱼','清蒸哈什蚁','卤鸭腰儿','烩鸭排','清拌腰丝','黄心管儿','卤白肉','焖黄鱼','豆豉鲢鱼','锅烧鲢鱼','卤烂甲鱼','抓炒鲢鱼','抓炒对虾','软炸里脊','软炸鸡','什锦套肠儿','卤煮寒鸭','麻酥油卷','溜鲜肉','溜鱼片','溜鱼块','溜鱼片儿','醋溜肉片','溜三鲜儿','溜鸽子的','溜白肉','溜什件儿','炒银丝儿','溜刀鱼','清蒸火腿','炒白肉','卤青鱼','炒面筋','熖竹笋','芙蓉燕菜','炒虾仁儿','溜腰花儿','烩海参','炒蹄筋儿','锅烧海参','锅烧白菜','卤木耳','炒肝尖儿','桂花翅子','清蒸翅子','炸飞鱼','炸汁儿','炸排骨','清蒸江瑶柱','糖溜芡仁','拌鸡丝','卤肚儿','什锦豆腐','什锦丁儿','糟鱼','糟鱼段'
                ].map((label, i) => ({ label, weight: 1, color: COLORS[i % COLORS.length] }))
                },
                { id: 'examguess', name: '考试蒙题', items: [
                  'A','B','C','D'
                ].map((label, i) => ({ label, weight: 1, color: COLORS[i % COLORS.length] }))},
                ...PROVINCE_PRESETS
              ];
              setCollections([...builtinDefaults, ...merged]);
            }
            if (data.activeCollectionId) setActiveCollectionId(data.activeCollectionId);
            if (data.diceCount) setDiceCount(data.diceCount);
            if (data.bombPlayerCount) setBombPlayerCount(data.bombPlayerCount);
            if (data.lastTab) setTab(data.lastTab);
            if (typeof data.darkMode === 'boolean') {
              setDarkMode(data.darkMode);
              if (data.darkMode) {
                setGlassMode(false);
                try { localStorage.setItem('violentGlassMode', false); } catch(err) {}
              }
            }
            if (typeof data.vibrationEnabled === 'boolean') {
              setVibrationEnabled(data.vibrationEnabled);
              vibrationEnabledRef.current = data.vibrationEnabled;
              setVibrationEnabledGlobal(data.vibrationEnabled);
            }
          }
        } catch (e) { console.error(e); }
      };

      useEffect(() => {
        loadSettings();
      }, []);

      const saveAll = (updates) => {
        try {
          const current = {
            collections,
            activeCollectionId,
            diceCount,
            bombPlayerCount,
            lastTab: tab,
            darkMode,
            vibrationEnabled,
            ...updates
          };
          localStorage.setItem('violentDecision', JSON.stringify(current));
        } catch (e) { console.error(e); }
      };

      const darkModeBtnRef = useRef(null);
      const toggleDarkMode = (e) => {
        vibrate(15);
        const nextMode = !darkMode;
        const btn = darkModeBtnRef.current || e?.currentTarget;
        const isGlassToDark = nextMode && glassMode;

        if (document.startViewTransition) {
          const x = nextMode ? window.innerWidth : 0;
          const y = nextMode ? 0 : window.innerHeight;
          const maxRadius = Math.hypot(window.innerWidth, window.innerHeight);
          const transition = document.startViewTransition(() => {
            if (isGlassToDark) {
              setGlassMode(false);
              try { localStorage.setItem('violentGlassMode', false); } catch(err) {}
            }
            setDarkMode(nextMode);
            saveAll({ darkMode: nextMode });
          });
          transition.ready.then(() => {
            document.documentElement.animate(
              {
                clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${maxRadius}px at ${x}px ${y}px)`],
              },
              {
                duration: isGlassToDark ? 1083 : 1250,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                pseudoElement: '::view-transition-new(root)',
              }
            );
          });
        } else {
          if (isGlassToDark) {
            document.documentElement.classList.add('glass-transition');
            setGlassMode(false);
            try { localStorage.setItem('violentGlassMode', false); } catch(err) {}
          }
          document.documentElement.classList.add('dark-transition');
          setDarkMode(nextMode);
          saveAll({ darkMode: nextMode });
          setTimeout(() => {
            document.documentElement.classList.remove('dark-transition', 'glass-transition');
          }, 1250);
        }
      };

      const toggleGlassMode = () => {
        vibrate(15);
        const next = !glassMode;
        const isDarkToGlass = next && darkMode;

        if (document.startViewTransition) {
          const x = next ? 0 : window.innerWidth;
          const y = next ? 0 : window.innerHeight;
          const maxRadius = Math.hypot(window.innerWidth, window.innerHeight);
          const transition = document.startViewTransition(() => {
            if (isDarkToGlass) {
              setDarkMode(false);
              saveAll({ darkMode: false });
            }
            setGlassMode(next);
            try { localStorage.setItem('violentGlassMode', next); } catch(e) {}
          });
          transition.ready.then(() => {
            document.documentElement.animate(
              {
                clipPath: [
                  `circle(0px at ${x}px ${y}px)`,
                  `circle(${maxRadius}px at ${x}px ${y}px)`,
                ],
              },
              {
                duration: 1000,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                pseudoElement: '::view-transition-new(root)',
              }
            );
          });
        } else {
          if (isDarkToGlass) {
            document.documentElement.classList.add('glass-transition');
            setDarkMode(false);
            saveAll({ darkMode: false });
          } else {
            document.documentElement.classList.add('glass-transition');
          }
          setGlassMode(next);
          try { localStorage.setItem('violentGlassMode', next); } catch(e) {}
          setTimeout(() => {
            document.documentElement.classList.remove('glass-transition');
          }, 917);
        }
      };

      const handleGlassBtnClick = () => {
        if (glassUnlocked) return;
        glassClickCount.current += 1;
        if (glassClickTimer.current) clearTimeout(glassClickTimer.current);
        if (glassClickCount.current >= 3) {
          glassClickCount.current = 0;
          setShowGlassKeyDialog(true);
          setGlassKeyInput('');
          setGlassKeyError(false);
        } else {
          glassClickTimer.current = setTimeout(() => { glassClickCount.current = 0; }, 800);
        }
      };

      const verifyGlassKey = () => {
        if (glassKeyInput === '2778') {
          setGlassUnlocked(true);
          setShowGlassKeyDialog(false);
          setGlassKeyInput('');
          setGlassKeyError(false);
          try { localStorage.setItem('violentGlassUnlocked', 'true'); } catch(e) {}
        } else {
          setGlassKeyError(true);
          setTimeout(() => setGlassKeyError(false), 1500);
        }
      };

      const toggleVibration = () => {
        const next = !vibrationEnabled;
        setVibrationEnabled(next);
        vibrationEnabledRef.current = next;
        setVibrationEnabledGlobal(next);
        saveAll({ vibrationEnabled: next });
      };

      const ALL_BACKUP_KEYS = [
        'aiApiKey', 'aiToolEndpoint', 'aiToolModel', 'aiEndpoint', 'aiModel',
        'aiDarkMode', 'aiConversations', 'aiCurrentConvId',
        'aiThinkingEnabled', 'aiReasoningEffort', 'aiStreamingEnabled',
        'aiWebSearchEnabled', 'aiSavedConfigs',
        'witchPoisonHighScore', 'tetrisSoloHighScore',
        'tetrisSoloGhost', 'tetrisSoloLevelSpeed',
        'violentTetrisNickname', 'violentGuessNickname', 'violentGuessTheme',
        'violentGlassMode', 'violentGlassUnlocked', 'cadMode', 'devMode',
        'drawing_two_finger_undo', 'drawing_dark_mode',
        'drawingOnionSkin', 'drawingOnionSkinSettings',
        'drawing_saved_canvases', 'drawing_autosave_history',
        'drawing_canvas_w', 'drawing_canvas_h',
        'drawing_autosave', 'drawing_autosave_interval',
        'drawingSavedColors', 'drawingEyedropperColors',
        'drawingRecentColors', 'drawingAiColors', 'drawingCanvas',
        'REACT_TETRIS',
      ];

      const handleExportBackup = () => {
        const backup = {};
        for (const key of ALL_BACKUP_KEYS) {
          try {
            const val = localStorage.getItem(key);
            if (val !== null && val !== undefined) {
              backup[key] = val;
            }
          } catch (e) {}
        }
        backup['__backup_version__'] = '1.3.0';
        backup['__backup_time__'] = new Date().toISOString();
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `暴力工具备份_${new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        displayToast('✅ 存档已导出');
      };

      const handleImportBackup = () => {
        backupFileInputRef.current?.click();
      };

      const handleBackupFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setBackupImporting(true);
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const backup = JSON.parse(evt.target.result);
            if (!backup.__backup_version__) {
              displayToast('⚠️ 无效的存档文件');
              setBackupImporting(false);
              return;
            }
            let restored = 0;
            for (const key of ALL_BACKUP_KEYS) {
              if (backup[key] !== undefined) {
                try {
                  localStorage.setItem(key, backup[key]);
                  restored++;
                } catch (e) {}
              }
            }
            displayToast(`✅ 已恢复 ${restored} 项设置，即将刷新页面...`);
            setShowBackupPanel(false);
            setTimeout(() => { window.location.reload(); }, 1500);
          } catch (err) {
            displayToast('⚠️ 文件解析失败，请检查文件格式');
            setBackupImporting(false);
          }
        };
        reader.onerror = () => {
          displayToast('⚠️ 文件读取失败');
          setBackupImporting(false);
        };
        reader.readAsText(file);
        e.target.value = '';
      };

      const cycleTheme = () => {
        vibrate(15);
        let nextDark, nextGlass;
        let originX, originY;

        if (!darkMode && !glassMode) {
          nextDark = true; nextGlass = false;
          originX = window.innerWidth; originY = 0;
        } else if (darkMode && !glassMode) {
          nextDark = false; nextGlass = true;
          originX = 0; originY = 0;
        } else {
          nextDark = false; nextGlass = false;
          originX = window.innerWidth; originY = window.innerHeight;
        }

        if (document.startViewTransition) {
          const maxRadius = Math.hypot(window.innerWidth, window.innerHeight);
          const transition = document.startViewTransition(() => {
            setDarkMode(nextDark);
            setGlassMode(nextGlass);
            saveAll({ darkMode: nextDark });
            try { localStorage.setItem('violentGlassMode', nextGlass); } catch(e) {}
          });
          transition.ready.then(() => {
            document.documentElement.animate(
              {
                clipPath: [
                  `circle(0px at ${originX}px ${originY}px)`,
                  `circle(${maxRadius}px at ${originX}px ${originY}px)`,
                ],
              },
              {
                duration: 1000,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                pseudoElement: '::view-transition-new(root)',
              }
            );
          });
        } else {
          document.documentElement.classList.add('dark-transition', 'glass-transition');
          setDarkMode(nextDark);
          setGlassMode(nextGlass);
          saveAll({ darkMode: nextDark });
          try { localStorage.setItem('violentGlassMode', nextGlass); } catch(e) {}
          setTimeout(() => {
            document.documentElement.classList.remove('dark-transition', 'glass-transition');
          }, 1083);
        }
      };

      return (
        <div className={`flex flex-col h-[100dvh] h-screen w-full ${inGameMode ? 'max-w-none mx-0 border-x-0' : 'max-w-md mx-auto border-x'} overflow-hidden shadow-2xl relative transition-colors duration-500 ${glassMode ? 'bg-gradient-to-br from-[#E8F4FD] via-[#F0F8FF] to-[#E6F3FC] border-sky-200/50 text-slate-700' : darkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-gray-50 border-gray-100 text-gray-900'}`}>
          {glassMode && (
            <svg className="absolute" style={{ width: 0, height: 0, position: 'absolute' }}>
              <defs>
                <filter id="liquid-glass-filter" x="0%" y="0%" width="100%" height="100%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.015 0.015" numOctaves={2} seed={3} result="noise" />
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale={12} xChannelSelector="R" yChannelSelector="G" />
                </filter>
              </defs>
            </svg>
          )}

          {!inGameMode && tab !== 'drawing' && (
            <div className={`p-5 border-b flex justify-between items-center z-10 transition-colors duration-500 ${glassMode ? '' : darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`} style={glassMode ? { background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(20px) saturate(1.8)', borderBottom: '1px solid rgba(255,255,255,0.3)' } : undefined}>
              <div className="flex flex-col">
                <h1 className="leading-none flex items-baseline gap-1">
                  <span className="text-[22px] font-black tracking-tight" style={glassMode ? { backgroundImage: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : { backgroundImage: 'linear-gradient(135deg, #e11d48 0%, #7c3aed 50%, #2563eb 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>暴力决定</span>
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  ref={darkModeBtnRef}
                  onClick={cycleTheme}
                  title={!darkMode && !glassMode ? '白色模式 · 点击切换深色' : darkMode ? '深色模式 · 点击切换玻璃' : '玻璃主题 · 点击切换白色'}
                  className={`p-2.5 rounded-2xl transition-all active:scale-90 shadow-sm ${darkMode ? 'bg-gray-800 text-yellow-400' : glassMode ? 'aurora-glass-pill text-slate-600' : 'bg-gray-100 text-gray-600'}`}
                >
                  {!darkMode && !glassMode ? <SunIcon size={20} /> : darkMode ? <MoonIcon size={20} /> : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3L19 8.5V15.5L12 21L5 15.5V8.5Z" opacity="0.5" />
                      <path d="M12 3V21" opacity="0.25" />
                      <path d="M5 8.5L19 8.5" opacity="0.25" />
                      <path d="M5 15.5L19 15.5" opacity="0.25" />
                      <path d="M5 8.5L12 12L19 8.5" opacity="0.4" />
                      <path d="M5 15.5L12 12L19 15.5" opacity="0.4" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className={`p-2.5 rounded-2xl transition-all active:scale-90 relative shadow-sm ${glassMode ? 'aurora-glass-pill text-slate-600' : darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                  {errorLogs.length > 0 && <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></div>}
                </button>
              </div>
            </div>
          )}

          {showSettings && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${settingsClosing ? 'animate-fade-out' : 'animate-fade-in'}`} onClick={() => { setSettingsClosing(true); setTimeout(() => { setShowSettings(false); setSettingsClosing(false); }, 250); }} />
              <div className={`relative w-full h-full shadow-2xl p-6 overflow-y-auto ${settingsClosing ? 'animate-fade-out' : 'animate-fade-in'} ${glassMode ? 'aurora-glass-card' : darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className={`text-xl font-black ${glassMode ? 'text-slate-700' : ''}`}>设置</h2>
                  <button onClick={() => { setSettingsClosing(true); setTimeout(() => { setShowSettings(false); setSettingsClosing(false); }, 250); }} className={`p-2 rounded-xl transition-colors ${glassMode ? 'hover:bg-sky-100/60 text-slate-600' : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                <div className="space-y-4">
                  <div className={`flex items-center justify-between p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      {darkMode ? <SunIcon size={22} /> : <MoonIcon size={22} />}
                      <div>
                        <div className={`font-bold ${glassMode ? 'text-slate-700' : ''}`}>深色模式</div>
                        <div className={`text-xs ${glassMode ? 'text-slate-500' : 'text-gray-500'}`}>切换界面主题</div>
                      </div>
                    </div>
                    <button
                      onClick={toggleDarkMode}
                      className={`relative w-12 h-7 rounded-full transition-colors shadow-sm ${darkMode ? (glassMode ? 'bg-gradient-to-r from-sky-400 to-blue-500' : 'bg-indigo-500') : glassMode ? 'bg-slate-300' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${darkMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  <div className={`flex items-center justify-between p-4 rounded-2xl ${glassUnlocked ? '' : 'opacity-50'} ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <div>
                        <div className={`font-bold ${glassMode ? 'text-slate-700' : ''}`}>玻璃主题</div>
                        <div className={`text-xs ${glassMode ? 'text-slate-500' : 'text-gray-500'}`}>{glassUnlocked ? '毛玻璃质感界面' : '毛玻璃质感界面(未解锁)'}</div>
                      </div>
                    </div>
                    <button
                      onClick={glassUnlocked ? toggleGlassMode : handleGlassBtnClick}
                      disabled={!glassUnlocked}
                      className={`relative w-12 h-7 rounded-full transition-colors shadow-sm ${glassUnlocked ? '' : 'cursor-not-allowed'} ${glassMode ? (glassUnlocked ? 'bg-gradient-to-r from-sky-400 to-blue-500' : 'bg-gray-400') : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${glassMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  <div className={`flex items-center justify-between p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 10v4M6 8v8M10 6v12M14 4v16M18 8v8M22 10v4"/></svg>
                      <div>
                        <div className={`font-bold ${glassMode ? 'text-slate-700' : ''}`}>震动效果</div>
                        <div className={`text-xs ${glassMode ? 'text-slate-500' : 'text-gray-500'}`}>操作时的震动反馈</div>
                      </div>
                    </div>
                    <button
                      onClick={toggleVibration}
                      className={`relative w-12 h-7 rounded-full transition-colors shadow-sm ${vibrationEnabled ? (glassMode ? 'bg-gradient-to-r from-sky-400 to-blue-500' : 'bg-indigo-500') : glassMode ? 'bg-slate-300' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${vibrationEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  <div className={`flex items-center justify-between p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                      <div>
                        <div className={`font-bold ${glassMode ? 'text-slate-700' : ''}`}>CAD 模式</div>
                        <div className={`text-xs ${glassMode ? 'text-slate-500' : 'text-gray-500'}`}>键盘指令绘图 L/C/R/A/P...</div>
                      </div>
                    </div>
                    <button
                      onClick={() => { const v = !cadMode; setCadMode(v); localStorage.setItem('cadMode', JSON.stringify(v)); }}
                      className={`relative w-12 h-7 rounded-full transition-colors shadow-sm ${cadMode ? (glassMode ? 'bg-gradient-to-r from-cyan-400 to-blue-500' : 'bg-cyan-500') : glassMode ? 'bg-slate-300' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${cadMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  <button
                    onClick={() => { setSettingsClosing(true); setTimeout(() => { setShowSettings(false); setSettingsClosing(false); setShowErrorLogs(true); }, 250); }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      <div className="text-left">
                        <div className={`font-bold ${glassMode ? 'text-slate-700' : ''}`}>错误日志</div>
                        <div className={`text-xs ${glassMode ? 'text-slate-500' : 'text-gray-500'}`}>{errorLogs.length > 0 ? `${errorLogs.length} 条记录` : '暂无错误'}</div>
                      </div>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`${glassMode ? 'text-slate-400' : 'text-gray-400'}`}><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                  <button
                    onClick={() => { setSettingsClosing(true); setTimeout(() => { setShowSettings(false); setSettingsClosing(false); setShowBackupPanel(true); }, 250); }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      <div className="text-left">
                        <div className={`font-bold ${glassMode ? 'text-slate-700' : ''}`}>存档备份</div>
                        <div className={`text-xs ${glassMode ? 'text-slate-500' : 'text-gray-500'}`}>导入/导出全部设置</div>
                      </div>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`${glassMode ? 'text-slate-400' : 'text-gray-400'}`}><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                  <input type="file" ref={backupFileInputRef} accept=".json" onChange={handleBackupFileChange} className="hidden" />
                  <button
                    onClick={() => { setSettingsClosing(true); setTimeout(() => { setShowSettings(false); setSettingsClosing(false); setShowOpenSource(true); }, 250); }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <div className={`font-bold ${glassMode ? 'text-slate-700' : ''}`}>开源使用说明</div>
                      </div>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`${glassMode ? 'text-slate-400' : 'text-gray-400'}`}><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                  <button
                    onClick={() => { setSettingsClosing(true); setTimeout(() => { setShowSettings(false); setSettingsClosing(false); setShowUpdateLog(true); }, 250); }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      <div className="text-left">
                        <div className="font-bold">更新日志</div>
                        <div className="text-xs text-gray-500">查看最新功能与优化</div>
                      </div>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-400"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                  <button
                    onClick={() => { setSettingsClosing(true); setTimeout(() => { setShowSettings(false); setSettingsClosing(false); setShowAiChat(true); }, 250); }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <div className="font-bold">AI 助手</div>
                        <div className="text-xs text-gray-500">接入API实现对话</div>
                      </div>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-400"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                  <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2a4 4 0 0 1 4 4c0 1.95-2 4-4 6-2-2-4-4.05-4-6a4 4 0 0 1 4-4z"/><path d="M6.5 9.5L2 14l4.5 4.5"/><path d="M17.5 9.5L22 14l-4.5 4.5"/><circle cx="12" cy="18" r="3"/></svg>
                        <div>
                          <div className="font-bold">AI 工具模块</div>
                          <div className="text-xs text-gray-500">转盘智能创建、调色盘AI调色</div>
                        </div>
                      </div>
                    </div>
                    <div className="relative mb-2">
                      {(() => {
                        const configuredModels = aiSavedConfigs.length > 0 ? aiSavedConfigs : [];
                        if (!aiApiKey || configuredModels.length === 0) {
                          return (
                            <button onClick={() => { setSettingsClosing(true); setTimeout(() => { setShowSettings(false); setSettingsClosing(false); setShowAiChat(true); }, 250); }}
                              className={`w-full px-3 py-2 rounded-xl text-xs font-medium text-left transition-all ${darkMode ? 'bg-gray-600 text-gray-400 border border-gray-500' : 'bg-gray-50 text-gray-400 border border-gray-200'}`}>
                              尚未接入API
                            </button>
                          );
                        }
                        const currentName = configuredModels.find(p => p.model === aiToolModel)?.name || aiToolModel;
                        return (
                          <>
                            <button onClick={() => setAiShowToolModelMenu(!aiShowToolModelMenu)}
                              className={`w-full px-3 py-2 rounded-xl text-xs font-medium text-left transition-all ${darkMode ? 'bg-gray-600 text-gray-200 border border-gray-500 hover:border-purple-400' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-purple-400'}`}>
                              {currentName}
                            </button>
                            {aiShowToolModelMenu && (
                              <div className={`absolute top-full left-0 right-0 mt-1 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto border ${aiToolMenuClosing ? 'animate-fade-out' : 'animate-fade-in'} ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                                {configuredModels.map((cfg, i) => (
                                  <button key={i} onClick={() => {
                                    setAiToolEndpoint(cfg.endpoint);
                                    setAiToolModel(cfg.model);
                                    localStorage.setItem('aiToolEndpoint', cfg.endpoint);
                                    localStorage.setItem('aiToolModel', cfg.model);
                                    setAiToolMenuClosing(true);
                                    setTimeout(() => { setAiShowToolModelMenu(false); setAiToolMenuClosing(false); }, 200);
                                  }}
                                    className={`w-full px-3 py-2 text-xs text-left transition-colors ${darkMode ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-purple-50 text-gray-600'} ${aiToolModel === cfg.model ? (darkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-50 text-purple-600') : ''}`}
                                  >{cfg.name || cfg.model}</button>
                                ))}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    <p className="text-[10px] text-gray-400">推荐flash模型以节约token</p>
                  </div>
                  <button
                    onClick={() => { setSettingsClosing(true); setTimeout(() => { setShowSettings(false); setSettingsClosing(false); setShowApiGuide(true); }, 250); }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      <div className="text-left">
                        <div className="font-bold">API 配置教程</div>
                      </div>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-400"><path d="m9 18 6-6-6-6"/></svg>
                  </button>

                  <div className="mt-2 pt-4 border-t border-gray-200/50">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={handleDevClick}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all ${devMode ? 'bg-green-500/20 text-green-600 border border-green-300' : 'bg-gray-100 text-gray-400 border border-gray-200 hover:bg-gray-200'}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/></svg>
                        {devMode ? '开发者模式已激活' : '开发者模式'}
                      </button>
                      {devMode && (
                        <button
                          onClick={() => { setDevMode(false); setAiSavedConfigs(prev => prev.filter(c => !c.dev)); }}
                          className="text-[10px] text-red-400 hover:text-red-500 transition-colors"
                        >
                          关闭
                        </button>
                      )}
                    </div>
                    {devClickCount > 0 && !devMode && (
                      <p className="text-[10px] text-gray-400 mt-1 ml-1">再点{3 - devClickCount} 次激活</p>
                    )}
                  </div>

                  {showDevKeyInput && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowDevKeyInput(false); setDevKeyInput(''); }} />
                      <div className={`relative w-full max-w-xs p-5 rounded-2xl shadow-2xl ${glassMode ? 'aurora-glass-card border-white/30' : darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        <h3 className={`text-sm font-bold mb-3 text-center ${glassMode ? 'text-slate-800' : ''}`}>🔑 输入开发者密钥</h3>
                        <input
                          type="password"
                          value={devKeyInput}
                          onChange={(e) => setDevKeyInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') activateDevMode(); }}
                          placeholder="请输入密钥"
                          autoFocus
                          className={`w-full px-3 py-2 rounded-xl border text-sm outline-none focus:border-purple-500 mb-3 ${glassMode ? 'aurora-glass-input text-slate-800 placeholder-slate-400' : darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`}
                        />
                        <div className="flex gap-2">
                          <button onClick={() => { setShowDevKeyInput(false); setDevKeyInput(''); }} className={`flex-1 py-2 rounded-xl text-xs font-bold active:scale-95 transition-all ${glassMode ? 'aurora-glass-pill text-slate-600' : 'bg-gray-100 text-gray-500'}`}>取消</button>
                          <button onClick={activateDevMode} className={`flex-1 py-2 rounded-xl text-xs font-bold active:scale-95 transition-all ${glassMode ? 'aurora-glass-pill text-purple-600 hover:bg-white/35' : 'bg-purple-600 text-white'}`}>确认</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {showErrorLogs && (
            <div className="absolute inset-0 z-50 flex items-end justify-center">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowErrorLogs(false)} />
              <div className={`relative w-full rounded-t-3xl shadow-2xl p-6 pb-8 transition-all max-h-[85vh] flex flex-col ${glassMode ? 'aurora-glass-card rounded-t-3xl' : darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-black flex items-center gap-2">
                    错误日志
                    {errorLogs.length > 0 && <span className="text-sm font-normal text-red-500">{errorLogs.length}个</span>}
                  </h2>
                  <div className="flex items-center gap-2">
                    {errorLogs.length > 0 && (
                      <button
                        onClick={() => { if (confirm('确定要清空所有错误日志吗？')) clearErrorLogs(); }}
                        className="px-3 py-1.5 text-xs font-bold text-red-500 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-colors"
                      >
                        清空日志
                      </button>
                    )}
                    <button onClick={() => setShowErrorLogs(false)} className={`p-2 rounded-xl ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2">
                  {errorLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="mb-4 opacity-50">
                        <path d="M9 12l2 2 4-4"/>
                        <circle cx="12" cy="12" r="10"/>
                      </svg>
                      <p className="text-sm font-medium">暂无错误日志</p>
                      <p className="text-xs mt-1">应用运行状态良好</p>
                    </div>
                  ) : (
                    [...errorLogs].reverse().map((log) => (
                      <div key={log.id} className={`p-3 rounded-xl border-l-4 ${
                        log.type === '运行时错误' ? 'border-red-500' :
                        log.type === 'Promise拒绝' ? 'border-orange-500' :
                        log.type === '未捕获异常' ? 'border-yellow-500' :
                        'border-blue-500'
                      } ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                log.type === '运行时错误' ? 'bg-red-500/20 text-red-500' :
                                log.type === 'Promise拒绝' ? 'bg-orange-500/20 text-orange-500' :
                                log.type === '未捕获异常' ? 'bg-yellow-500/20 text-yellow-500' :
                                'bg-blue-500/20 text-blue-500'
                              }`}>
                                {log.type}
                              </span>
                              <span className="text-[10px] text-gray-400">{log.timestamp}</span>
                            </div>
                            <p className="text-sm font-medium truncate">{log.message}</p>
                            {log.stack && (
                              <details className="mt-1">
                                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">查看详情</summary>
                                <pre className={`mt-1 p-2 rounded-lg text-[10px] overflow-x-auto whitespace-pre-wrap font-mono ${darkMode ? 'bg-gray-900/50' : 'bg-gray-100'}`}>
                                  {log.stack}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {showAiChat && (
            <div className="fixed inset-0 z-[10001] flex items-center justify-center">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => {
                if (!aiLoading) {
                  saveCurrentConversation();
                  setShowAiChat(false);
                }
              }} />
              <div className={`relative w-full h-full shadow-2xl animate-ai-enter ${glassMode ? 'aurora-bg' : aiDarkMode ? 'bg-gray-800' : 'bg-white'} flex flex-col`} style={{ transition: 'background-color 0.78s, color 0.78s, border-color 0.78s' }}>
                <div className={`flex justify-between items-center px-4 py-2.5 shrink-0 ${glassMode ? 'border-b border-white/15' : aiDarkMode ? 'border-b border-gray-700/40' : 'border-b border-gray-100'}`} style={glassMode ? { backdropFilter: 'blur(12px)', background: 'rgba(255,255,255,0.15)' } : undefined}>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setAiShowSidebar(!aiShowSidebar)} className={`p-2 rounded-xl transition-colors ${aiShowSidebar ? (glassMode ? 'bg-white/30 text-slate-600' : aiDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900') : (glassMode ? 'hover:bg-white/25 text-slate-500' : aiDarkMode ? 'hover:bg-gray-700/60 text-gray-400' : 'hover:bg-gray-100 text-gray-500')}`}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-1 relative">
                    <button
                      ref={aiModelBtnRef}
                      onClick={() => {
                        if (aiShowModelMenu) {
                          setAiModelMenuClosing(true);
                          setTimeout(() => { setAiShowModelMenu(false); setAiModelMenuClosing(false); }, 200);
                        } else {
                          setAiShowModelMenu(true);
                        }
                      }}
                      className={`text-[13px] font-medium cursor-pointer transition-all flex items-center gap-1.5 px-4 py-1.5 rounded-full ${glassMode ? 'aurora-glass-pill text-slate-700' : aiDarkMode ? 'bg-gray-700/50 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                    >
                      <span className="max-w-[120px] truncate">{aiSavedConfigs.find(c => c.model === aiModel && c.endpoint === aiEndpoint)?.name || aiModel}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16" className={`transition-transform shrink-0 opacity-40 ${aiShowModelMenu ? 'rotate-180' : ''}`}><path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/></svg>
                    </button>
                    {(aiShowModelMenu || aiModelMenuClosing) && createPortal(
                      <>
                        <div className="fixed inset-0 z-[10010]" onClick={() => { setAiModelMenuClosing(true); setTimeout(() => { setAiShowModelMenu(false); setAiModelMenuClosing(false); }, 200); }} />
                        <div className={`fixed min-w-[200px] max-w-[280px] rounded-xl shadow-xl border z-[10011] py-1 ${aiModelMenuClosing ? 'animate-menu-drop-out' : 'animate-menu-drop'} ${glassMode ? 'aurora-glass-card' : aiDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`} style={{ top: aiModelBtnRef.current ? aiModelBtnRef.current.getBoundingClientRect().bottom + 8 : 60, left: aiModelBtnRef.current ? Math.min(aiModelBtnRef.current.getBoundingClientRect().left + aiModelBtnRef.current.offsetWidth / 2, window.innerWidth - 220) : '50%', transform: 'translateX(-50%)' }}>
                          {aiSavedConfigs.length === 0 ? (
                            <div className={`px-4 py-4 text-xs text-center ${glassMode ? 'text-slate-500' : aiDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              <div className="mb-1.5">暂无已配置模型</div>
                              <div className="text-[10px]">请在设置中添加模型配置</div>
                            </div>
                          ) : (
                            aiSavedConfigs.map((cfg, idx) => (
                              <button key={idx} onClick={() => { setAiModel(cfg.model); setAiEndpoint(cfg.endpoint); setAiApiKey(cfg.apiKey); setAiModelMenuClosing(true); setTimeout(() => { setAiShowModelMenu(false); setAiModelMenuClosing(false); }, 200); }} className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between transition-colors ${aiModel === cfg.model && aiEndpoint === cfg.endpoint ? (glassMode ? 'bg-sky-100/70 text-sky-800' : aiDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-50 text-purple-600') : (glassMode ? 'text-slate-700 hover:bg-sky-50/80' : aiDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50')}`}>
                                <span className="truncate flex-1 mr-2">{cfg.name || cfg.model}</span>
                                <div className="flex items-center gap-1 shrink-0">
                                  {cfg.supportsImage && <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${glassMode ? 'bg-blue-400/30 text-blue-600' : aiDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-500'}`}>图片</span>}
                                  {aiModel === cfg.model && aiEndpoint === cfg.endpoint && <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${glassMode ? 'bg-green-400/30 text-green-600' : aiDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-50 text-green-500'}`}>当前</span>}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </>,
                      document.body
                    )}
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => setAiShowSettings(!aiShowSettings)} className={`p-2 rounded-xl transition-colors ${aiShowSettings ? (glassMode ? 'bg-white/30 text-slate-600' : aiDarkMode ? 'bg-gray-700 text-purple-400' : 'bg-gray-200 text-purple-500') : (glassMode ? 'hover:bg-white/25 text-slate-400' : aiDarkMode ? 'hover:bg-gray-700/60 text-gray-400' : 'hover:bg-gray-100 text-gray-500')}`} title="设置">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                    </button>
                  </div>
                </div>
                {aiShowSidebar && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => { saveCurrentConversation(); setAiShowSidebar(false); }} />
                    <div className={`absolute top-0 left-0 bottom-0 w-72 z-20 shadow-2xl flex flex-col ${glassMode ? 'aurora-glass-card' : aiDarkMode ? 'bg-gray-900' : 'bg-gray-50'} animate-ai-enter`} style={{ animationDuration: '0.25s' }}>
                      <div className={`flex items-center justify-between px-4 py-3 border-b ${glassMode ? 'border-white/20' : aiDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <span className={`text-sm font-bold ${glassMode ? 'text-slate-700' : aiDarkMode ? 'text-white' : 'text-gray-900'}`}>对话记录</span>
                        <button onClick={() => { saveCurrentConversation(); setAiShowSidebar(false); }} className={`p-1.5 rounded-lg ${glassMode ? 'hover:bg-white/30 text-slate-500' : aiDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/></svg>
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          saveCurrentConversation();
                          setAiMessages([]);
                          setAiCurrentConvId(String(Date.now()));
                          setAiShowSidebar(false);
                        }}
                        className={`mx-3 mt-3 mb-2 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors ${glassMode ? 'aurora-glass-pill text-slate-700 hover:bg-white/35' : aiDarkMode ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-purple-500 hover:bg-purple-400 text-white'}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/></svg>
                        新建对话
                      </button>
                      <div className="flex-1 overflow-y-auto px-3 space-y-1">
                        {aiConversations.length === 0 ? (
                          <div className={`text-center py-8 text-xs ${glassMode ? 'text-slate-400/70' : aiDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>暂无历史对话</div>
                        ) : (
                          aiConversations.map(conv => (
                            <button
                              key={conv.id}
                              onClick={() => {
                                saveCurrentConversation();
                                setAiMessages(conv.messages || []);
                                setAiCurrentConvId(conv.id);
                                setAiShowSidebar(false);
                              }}
                              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-colors group relative ${conv.id === aiCurrentConvId ? (glassMode ? 'aurora-glass-pill text-slate-700' : aiDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-50 text-purple-600') : (glassMode ? 'text-slate-600 hover:bg-white/20' : aiDarkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100')}`}
                            >
                                {conv.model} · {new Date(conv.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              <div className={`mt-0.5 text-[10px] ${glassMode ? 'text-slate-400/60' : aiDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                                {conv.model} · {new Date(conv.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={e => { e.stopPropagation(); setAiConversations(prev => prev.filter(c => c.id !== conv.id)); }}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded cursor-pointer ${glassMode ? 'hover:bg-red-400/20 text-red-400' : aiDarkMode ? 'hover:bg-gray-700 text-gray-500' : 'hover:bg-gray-200 text-gray-400'}`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 1 1 0-2h3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1h3a1 1 0 0 1 1 1"/></svg>
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                      <div className="px-3 pt-3 pb-1 shrink-0">
                        <button
                          onClick={() => { saveCurrentConversation(); setAiShowSidebar(false); setShowAiChat(false); }}
                          className={`w-full py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${glassMode ? 'aurora-glass-pill text-slate-600 hover:bg-white/30' : aiDarkMode ? 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-300' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-600'}`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                          退出对话
                        </button>
                      </div>
                    </div>
                  </>
                )}
                {(aiShowSettings || aiSettingsClosing) && (
                  <>
                    <div className={`absolute inset-0 z-29 ${aiSettingsClosing ? 'animate-settings-overlay-exit' : 'animate-settings-overlay-enter'}`} style={{ backgroundColor: glassMode ? 'rgba(150, 180, 220, 0.15)' : aiDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)' }} />
                    <div className={`absolute inset-0 z-30 p-4 space-y-4 overflow-y-auto ${glassMode ? 'aurora-glass-card' : aiDarkMode ? 'bg-gray-800' : 'bg-white'} ${aiSettingsClosing ? 'animate-settings-exit' : 'animate-settings-enter'}`}>
                    {editingConfigIdx >= 0 && (
                      <div className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs ${glassMode ? 'aurora-glass-pill' : aiDarkMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>
                        <span className="font-medium">正在编辑: {aiSavedConfigs[editingConfigIdx]?.name || aiSavedConfigs[editingConfigIdx]?.model}</span>
                        <button onClick={() => { setEditingConfigIdx(-1); setAiConfigName(''); }} className={`p-1 rounded-lg ${glassMode ? 'hover:bg-slate-400/30' : aiDarkMode ? 'hover:bg-blue-500/30' : 'hover:bg-blue-100'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/></svg>
                        </button>
                      </div>
                    )}
                    <div>
                      <label className={`text-xs font-bold block mb-1.5 ${glassMode ? 'text-slate-600' : aiDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>模型预设</label>
                      <div className="grid grid-cols-2 gap-2">
                        {aiPresetModels.map((preset, i) => (
                          <button key={i} onClick={() => { setAiEndpoint(preset.endpoint); setAiModel(preset.model); setEditingConfigIdx(-1); setAiConfigName(preset.name); }} className={`px-3 py-2 rounded-xl text-xs font-medium text-left transition-all ${aiModel === preset.model && aiEndpoint === preset.endpoint ? (glassMode ? 'aurora-glass-pill text-slate-700' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30') : glassMode ? 'aurora-glass-input text-slate-600 hover:border-white/50' : aiDarkMode ? 'bg-gray-700/50 text-gray-300 border border-gray-600/50 hover:border-purple-500/30' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-purple-400'}`}>
                            {preset.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className={`text-xs font-bold block mb-1.5 ${glassMode ? 'text-slate-600' : aiDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>API 端点</label>
                      <input type="text" value={aiEndpoint} onChange={e => setAiEndpoint(e.target.value)} placeholder="https://api.deepseek.com/chat/completions" className={`w-full px-3 py-2 rounded-xl text-sm outline-none border ${glassMode ? 'aurora-glass-input text-slate-800 placeholder-slate-400' : aiDarkMode ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-500 focus:border-purple-500' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 focus:border-purple-400'}`}/>
                      <div className={`text-[10px] mt-1 ${glassMode ? 'text-slate-400/70' : aiDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                        DeepSeek: https://api.deepseek.com/chat/completions
                        <br />DeepSeek (Anthropic): https://api.deepseek.com/anthropic/v1/messages
                        <br />OpenAI: https://api.openai.com/v1/chat/completions
                        <br />Anthropic: https://api.anthropic.com/v1/messages
                      </div>
                    </div>
                    <div>
                      <label className={`text-xs font-bold block mb-1.5 ${glassMode ? 'text-slate-600' : aiDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>API Key</label>
                      <input type="password" value={aiApiKey} onChange={e => setAiApiKey(e.target.value)} placeholder="sk-..." className={`w-full px-3 py-2 rounded-xl text-sm outline-none border ${glassMode ? 'aurora-glass-input text-slate-800 placeholder-slate-400' : aiDarkMode ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-500 focus:border-purple-500' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 focus:border-purple-400'}`}/>
                    </div>
                    <div>
                      <label className={`text-xs font-bold block mb-1.5 ${glassMode ? 'text-slate-600' : aiDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>模型名称</label>
                      <input type="text" value={aiModel} onChange={e => setAiModel(e.target.value)} placeholder="deepseek-chat" className={`w-full px-3 py-2 rounded-xl text-sm outline-none border ${glassMode ? 'aurora-glass-input text-slate-800 placeholder-slate-400' : aiDarkMode ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-500 focus:border-purple-500' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 focus:border-purple-400'}`}/>
                    </div>
                    <div>
                      <label className={`text-xs font-bold block mb-1.5 ${glassMode ? 'text-slate-600' : aiDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>配置名称</label>
                      <input type="text" value={aiConfigName} onChange={e => setAiConfigName(e.target.value)} placeholder="自定义名称（可选）" className={`w-full px-3 py-2 rounded-xl text-sm outline-none border ${glassMode ? 'aurora-glass-input text-slate-800 placeholder-slate-400' : aiDarkMode ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-500 focus:border-purple-500' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 focus:border-purple-400'}`}/>
                    </div>
                    <div className="space-y-2">
                      <div className={`flex items-center justify-between p-3 rounded-xl border ${glassMode ? 'aurora-glass-input' : 'border-gray-200/20'}`}>
                        <div>
                          <div className={`text-xs font-bold ${glassMode ? 'text-slate-700' : aiDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>流式输出</div>
                          <div className={`text-[10px] ${glassMode ? 'text-slate-400/70' : aiDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>实时显示AI回复内容</div>
                        </div>
                        <button onClick={() => setAiStreamingEnabled(!aiStreamingEnabled)} className={`relative w-10 h-5 rounded-full transition-colors ${aiStreamingEnabled ? (glassMode ? 'bg-emerald-500' : 'bg-purple-500') : glassMode ? 'bg-slate-300/60' : aiDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}>
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${aiStreamingEnabled ? 'translate-x-5' : 'translate-x-0.5'}`}/>
                        </button>
                      </div>
                      <div className={`flex items-center justify-between p-3 rounded-xl border ${glassMode ? 'aurora-glass-input' : 'border-gray-200/20'}`}>
                        <div>
                          <div className={`text-xs font-bold ${glassMode ? 'text-slate-700' : aiDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>思考模式</div>
                          <div className={`text-[10px] ${glassMode ? 'text-slate-400/70' : aiDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>显示AI推理过程（DeepSeek）</div>
                        </div>
                        <button onClick={() => setAiThinkingEnabled(!aiThinkingEnabled)} className={`relative w-10 h-5 rounded-full transition-colors ${aiThinkingEnabled ? (glassMode ? 'bg-emerald-500' : 'bg-purple-500') : glassMode ? 'bg-slate-300/60' : aiDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}>
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${aiThinkingEnabled ? 'translate-x-5' : 'translate-x-0.5'}`}/>
                        </button>
                      </div>
                      <div className={`flex items-center justify-between p-3 rounded-xl border ${glassMode ? 'aurora-glass-input' : 'border-gray-200/20'}`}>
                        <div>
                          <div className={`text-xs font-bold ${glassMode ? 'text-slate-700' : aiDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>模型接力</div>
                          <div className={`text-[10px] ${glassMode ? 'text-slate-400/70' : aiDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>图片先由视觉模型分析再传给主力模型</div>
                        </div>
                        <button onClick={() => setAiRelayEnabled(!aiRelayEnabled)} className={`relative w-10 h-5 rounded-full transition-colors ${aiRelayEnabled ? (glassMode ? 'bg-emerald-500' : 'bg-purple-500') : glassMode ? 'bg-slate-300/60' : aiDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}>
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${aiRelayEnabled ? 'translate-x-5' : 'translate-x-0.5'}`}/>
                        </button>
                      </div>
                    </div>
                    {aiRelayEnabled && (
                      <div className={`space-y-3 p-3 rounded-xl border ${glassMode ? 'aurora-glass-input' : aiDarkMode ? 'border-purple-500/20 bg-purple-500/5' : 'border-purple-200 bg-purple-50/50'}`}>
                        <div className={`text-xs font-bold ${glassMode ? 'text-slate-700' : aiDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>🔗 接力模型配置</div>
                        <div>
                          <label className={`text-[10px] font-bold block mb-1 ${glassMode ? 'text-slate-500' : aiDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>接力模型预设</label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {relayPresetModels.map((preset, i) => (
                              <button key={i} onClick={() => { setAiRelayEndpoint(preset.endpoint); setAiRelayModel(preset.model); }} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-left transition-all ${aiRelayModel === preset.model && aiRelayEndpoint === preset.endpoint ? (glassMode ? 'aurora-glass-pill text-slate-700' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30') : glassMode ? 'aurora-glass-input text-slate-600' : aiDarkMode ? 'bg-gray-700/50 text-gray-400 border border-gray-600/50' : 'bg-white text-gray-500 border border-gray-200'}`}>
                                {preset.name}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className={`text-[10px] font-bold block mb-1 ${glassMode ? 'text-slate-500' : aiDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>接力 API Key</label>
                          <input type="password" value={aiRelayApiKey} onChange={e => setAiRelayApiKey(e.target.value)} placeholder="接力模型的API Key（独立配置）" className={`w-full px-3 py-1.5 rounded-lg text-xs outline-none border ${glassMode ? 'aurora-glass-input text-slate-800 placeholder-slate-400' : aiDarkMode ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'}`}/>
                        </div>
                        <div>
                          <label className={`text-[10px] font-bold block mb-1 ${glassMode ? 'text-slate-500' : aiDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>接力 API 端点</label>
                          <input type="text" value={aiRelayEndpoint} onChange={e => setAiRelayEndpoint(e.target.value)} placeholder="https://dashscope.aliyuncs.com/..." className={`w-full px-3 py-1.5 rounded-lg text-xs outline-none border ${glassMode ? 'aurora-glass-input text-slate-800 placeholder-slate-400' : aiDarkMode ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'}`}/>
                        </div>
                        <div>
                          <label className={`text-[10px] font-bold block mb-1 ${glassMode ? 'text-slate-500' : aiDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>接力模型名称</label>
                          <input type="text" value={aiRelayModel} onChange={e => setAiRelayModel(e.target.value)} placeholder="qwen3-plus" className={`w-full px-3 py-1.5 rounded-lg text-xs outline-none border ${glassMode ? 'aurora-glass-input text-slate-800 placeholder-slate-400' : aiDarkMode ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'}`}/>
                        </div>
                        <div className={`text-[10px] ${glassMode ? 'text-slate-400/70' : aiDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                          当主力模型不支持图片时，图片会先发送给接力模型进行视觉分析，分析结果再传给主力模型生成回复
                        </div>
                      </div>
                    )}
                    <div className={`text-[10px] p-3 rounded-xl ${glassMode ? 'aurora-glass-input text-slate-500' : aiDarkMode ? 'bg-gray-700/30 text-gray-500' : 'bg-gray-50 text-gray-400'}`}>
                      <p className="mt-1">点击「保存并完成」将当前配置添加到模型列表</p>
                      <p className="mt-1">DeepSeek Reasoner 模型自动启用思考模式</p>
                    </div>
                    {aiSavedConfigs.filter(c => !c.dev).length > 0 && (
                      <div>
                        <label className={`text-xs font-bold block mb-1.5 ${glassMode ? 'text-slate-600' : aiDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>已保存的模型</label>
                        <div className="space-y-1.5">
                          {aiSavedConfigs.filter(c => !c.dev).map((cfg, idx) => (
                            <div key={cfg.model + cfg.endpoint + idx} className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs ${aiModel === cfg.model && aiEndpoint === cfg.endpoint ? (glassMode ? 'aurora-glass-pill text-slate-700' : aiDarkMode ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-purple-50 text-purple-600 border border-purple-200') : (glassMode ? 'aurora-glass-input text-slate-600' : aiDarkMode ? 'bg-gray-700/50 text-gray-300 border border-gray-600/50' : 'bg-gray-50 text-gray-600 border border-gray-200')}`}>
                              <button onClick={() => { setAiModel(cfg.model); setAiEndpoint(cfg.endpoint); setAiApiKey(cfg.apiKey); }} className="text-left flex-1">
                                <span className="font-medium">{cfg.name || cfg.model}</span>
                                <span className={`ml-1.5 text-[9px] ${glassMode ? 'text-slate-400/70' : aiDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{cfg.model}</span>
                              </button>
                              <div className="flex items-center gap-1">
                                <button onClick={() => { setAiModel(cfg.model); setAiEndpoint(cfg.endpoint); setAiApiKey(cfg.apiKey); setAiConfigName(cfg.name || ''); setEditingConfigIdx(aiSavedConfigs.indexOf(cfg)); }} className={`p-1 rounded-lg ${glassMode ? 'hover:bg-blue-400/20 text-blue-400' : aiDarkMode ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-400'}`} title="编辑">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-4.5 1.5a.5.5 0 0 1-.62-.62l1.5-4.5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5z"/></svg>
                                </button>
                                <button onClick={() => setAiSavedConfigs(prev => prev.filter((c, i) => !(c.model === cfg.model && c.endpoint === cfg.endpoint && i === aiSavedConfigs.indexOf(cfg))))} className={`p-1 rounded-lg ${glassMode ? 'hover:bg-red-400/20 text-red-400' : aiDarkMode ? 'hover:bg-gray-600 text-gray-500' : 'hover:bg-gray-200 text-gray-400'}`} title="删除">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/></svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        if (aiApiKey.trim() && aiModel.trim()) {
                          const preset = aiPresetModels.find(p => p.model === aiModel && p.endpoint === aiEndpoint);
                          const name = aiConfigName.trim() || (preset ? preset.name : aiModel);
                          setAiSavedConfigs(prev => {
                            if (editingConfigIdx >= 0 && editingConfigIdx < prev.length) {
                              const updated = [...prev];
                              updated[editingConfigIdx] = { name, model: aiModel, endpoint: aiEndpoint, apiKey: aiApiKey, supportsImage: preset?.supportsImage || false };
                              return updated;
                            }
                            const filtered = prev.filter(c => !(c.model === aiModel && c.endpoint === aiEndpoint));
                            return [...filtered, { name, model: aiModel, endpoint: aiEndpoint, apiKey: aiApiKey, supportsImage: preset?.supportsImage || false }];
                          });
                          setEditingConfigIdx(-1);
                          setAiConfigName('');
                        }
                        setAiSettingsClosing(true);
                        setTimeout(() => { setAiShowSettings(false); setAiSettingsClosing(false); }, 350);
                      }}
                      className="w-full py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-purple-500 to-indigo-500 active:scale-[0.98] transition-all"
                    >
                      {editingConfigIdx >= 0 ? '更新配置' : '保存并完成'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingConfigIdx(-1);
                        setAiConfigName('');
                        setAiSettingsClosing(true);
                        setTimeout(() => { setAiShowSettings(false); setAiSettingsClosing(false); }, 350);
                      }}
                      className={`w-full py-2.5 rounded-xl font-bold text-sm active:scale-[0.98] transition-all ${glassMode ? 'aurora-glass-pill text-slate-600 hover:bg-white/30' : aiDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      关闭
                    </button>
                  </div>
                  </>
                )}
                  <>
                    {aiShowSearch && (
                      <div className={`px-4 py-2 border-b shrink-0 ${glassMode ? 'border-white/15' : aiDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={aiSearchQuery}
                            onChange={e => {
                              const q = e.target.value;
                              setAiSearchQuery(q);
                              if (!q.trim()) { setAiSearchResults([]); return; }
                              const lower = q.trim().toLowerCase();
                              const results = [];
                              aiMessages.forEach((m, i) => {
                                const text = typeof m.content === 'string' ? m.content : Array.isArray(m.content) ? m.content.filter(c => c.type === 'text').map(c => c.text).join('') : '';
                                if (text.toLowerCase().includes(lower)) {
                                  results.push({ index: i, role: m.role, text: text.substring(0, 80) + (text.length > 80 ? '...' : '') });
                                }
                              });
                              setAiSearchResults(results);
                            }}
                            placeholder="搜索对话记录..."
                            className={`flex-1 px-3 py-1.5 rounded-lg text-xs outline-none border ${glassMode ? 'aurora-glass-input text-slate-800 placeholder-slate-400' : aiDarkMode ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'}`}
                            autoFocus
                          />
                          <button onClick={() => { setAiShowSearch(false); setAiSearchQuery(''); setAiSearchResults([]); }} className={`p-1.5 rounded-lg ${glassMode ? 'hover:bg-white/30 text-slate-500' : aiDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/></svg>
                          </button>
                        </div>
                        {aiSearchResults.length > 0 && (
                          <div className={`mt-1.5 max-h-32 overflow-y-auto rounded-lg border ${glassMode ? 'aurora-glass-input' : aiDarkMode ? 'bg-gray-800/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                            {aiSearchResults.map((r, idx) => (
                              <button
                                key={idx}
                                onClick={() => { setAiShowSearch(false); setAiSearchQuery(''); setAiSearchResults([]); }}
                                className={`w-full text-left px-3 py-1.5 text-[11px] border-b last:border-b-0 transition-colors ${glassMode ? 'border-white/30 hover:bg-white/20 text-slate-600' : aiDarkMode ? 'border-gray-700 hover:bg-gray-700 text-gray-300' : 'border-gray-100 hover:bg-gray-100 text-gray-600'}`}
                              >
                                <span className={`font-medium ${r.role === 'user' ? (glassMode ? 'text-indigo-600' : 'text-purple-400') : (glassMode ? 'text-emerald-600' : 'text-green-400')}`}>{r.role === 'user' ? '你' : 'AI'}</span>
                                <span className="ml-1.5">{r.text}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {aiSearchQuery.trim() && aiSearchResults.length === 0 && (
                          <p className={`text-[11px] mt-1.5 ${glassMode ? 'text-slate-400/70' : aiDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>未找到匹配的对话记录</p>
                        )}
                      </div>
                    )}
                    <div ref={aiChatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3" onScroll={() => {
                      const el = aiChatContainerRef.current;
                      if (!el) return;
                      aiUserAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
                    }}>
                      {aiMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-msg-in`}>
                          <div className={`max-w-[85%] ${msg.role === 'user' ? '' : 'space-y-1.5'}`}>
                            {msg.reasoning && (
                              <details className={`px-3 py-2 rounded-xl text-xs ${glassMode ? 'aurora-glass-bubble-ai border-gray-300/40' : aiDarkMode ? 'bg-gray-800/40 border border-gray-600/30' : 'bg-gray-50 border border-gray-200/60'}`}>
                                <summary className={`cursor-pointer font-medium flex items-center gap-1 ${glassMode ? 'text-gray-500' : aiDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  思考过程
                                </summary>
                                <pre className={`mt-1.5 text-[11px] whitespace-pre-wrap break-words font-sans ${glassMode ? 'text-gray-500/80' : aiDarkMode ? 'text-gray-400/70' : 'text-gray-500'}`}>{msg.reasoning}</pre>
                              </details>
                            )}
                            <div className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${msg.role === 'user' ? 'aurora-glass-bubble-user text-slate-800 rounded-br-sm' : glassMode ? 'aurora-glass-bubble-ai text-slate-800 rounded-bl-sm' : aiDarkMode ? 'bg-gray-700 text-gray-200 rounded-bl-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                              {msg.images && msg.images.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-1.5">
                                  {msg.images.map((src, idx) => (
                                    <img key={idx} src={src} alt="" className="max-w-[120px] max-h-[120px] object-cover rounded-lg" />
                                  ))}
                                </div>
                              )}
                              {msg.ocr && (
                                <div className="flex items-center gap-1 mb-1.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-white/20 backdrop-blur-sm">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/></svg>
                                    OCR 识别
                                  </span>
                                </div>
                              )}
                              {msg.relay && (
                                <div className="flex items-center gap-1 mb-1.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-blue-500/20 backdrop-blur-sm text-blue-300">
                                    🔍 图片分析
                                  </span>
                                </div>
                              )}
                              {msg.files && msg.files.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-1.5">
                                  {msg.files.map((name, idx) => (
                                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-white/20 backdrop-blur-sm">
                                      <svg width="10" height="10" fill="currentColor" viewBox="0 0 16 16"><path d="M4.5 3a2.5 2.5 0 0 1 5 0v9a1.5 1.5 0 0 1-3 0V5a.5.5 0 0 1 1 0v7a.5.5 0 0 0 1 0V3a1.5 1.5 0 0 0-3 0v9a2.5 2.5 0 0 0 5 0V5a.5.5 0 0 1 1 0v7a3.5 3.5 0 1 1-7 0z"/></svg>
                                      {name}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {typeof msg.content === 'string' ? (
                                msg.role === 'assistant' ? (
                                  <div className="prose-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                                ) : (
                                  msg.content
                                )
                              ) : Array.isArray(msg.content) ? msg.content.filter(c => c.type === 'text').map(c => c.text).join('') : ''}
                            </div>
                            {msg.role === 'assistant' && msg.tokens && (() => {
                              const t = (msg.tokens.prompt_tokens ?? msg.tokens.input_tokens ?? 0) + (msg.tokens.completion_tokens ?? msg.tokens.output_tokens ?? 0);
                              const runningTotal = aiMessages.filter((m, j) => j <= i && m.role === 'assistant' && m.tokens).reduce((s, m) => s + ((m.tokens.prompt_tokens ?? m.tokens.input_tokens ?? 0) + (m.tokens.completion_tokens ?? m.tokens.output_tokens ?? 0)), 0);
                              return (
                                <div className={`mt-1 text-[10px] ${glassMode ? 'text-slate-400' : aiDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                  token：{t.toLocaleString()}，总token：{runningTotal.toLocaleString()}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      ))}
                      {aiLoading && (aiStreamingContent || aiStreamingReasoning) && (
                        <div className="flex justify-start">
                          <div className="max-w-[85%] space-y-1.5">
                            {aiStreamingReasoning && (
                              <details open className={`px-3 py-2 rounded-xl text-xs ${glassMode ? 'aurora-glass-bubble-ai border-gray-300/40' : aiDarkMode ? 'bg-gray-800/40 border border-gray-600/30' : 'bg-gray-50 border border-gray-200/60'}`}>
                                <summary className={`cursor-pointer font-medium flex items-center gap-1 ${glassMode ? 'text-gray-500' : aiDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  正在思考...
                                </summary>
                                <pre className={`mt-1.5 text-[11px] whitespace-pre-wrap break-words font-sans ${glassMode ? 'text-gray-500/80' : aiDarkMode ? 'text-gray-400/70' : 'text-gray-500'}`}>{aiStreamingReasoning}</pre>
                              </details>
                            )}
                            {aiStreamingContent && (
                              <div className={`px-3 py-2 rounded-2xl rounded-bl-sm text-sm break-words ${glassMode ? 'aurora-glass-bubble-ai text-slate-800' : aiDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}`} dangerouslySetInnerHTML={{ __html: renderMarkdown(aiStreamingContent) }} />
                            )}
                          </div>
                        </div>
                      )}
                      {aiOcrProcessing && (
                        <div className="flex justify-start">
                          <div className={`px-4 py-3 rounded-2xl rounded-bl-sm text-sm max-w-[85%] ${glassMode ? 'aurora-glass-bubble-ai' : aiDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`animate-pulse ${glassMode ? 'text-blue-500' : aiDarkMode ? 'text-blue-400' : 'text-blue-500'}`}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
                              <span className={`font-medium ${glassMode ? 'text-blue-700' : aiDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>OCR 文字识别中</span>
                            </div>
                            <div className={`text-xs mb-1.5 ${glassMode ? 'text-blue-600/70' : aiDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{aiOcrStatus}</div>
                            <div className={`w-full h-1.5 rounded-full overflow-hidden ${glassMode ? 'bg-blue-200/30' : aiDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300" style={{ width: `${aiOcrProgress}%` }} />
                            </div>
                            <div className={`text-[10px] mt-1 text-right ${glassMode ? 'text-blue-500/50' : aiDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{aiOcrProgress}%</div>
                          </div>
                        </div>
                      )}
                      {aiRelayProcessing && (
                        <div className="flex justify-start">
                          <div className={`px-3 py-2 rounded-2xl rounded-bl-sm text-sm ${glassMode ? 'aurora-glass-bubble-ai text-slate-500' : aiDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                            分析图片中
                          </div>
                        </div>
                      )}
                      {aiLoading && !aiStreamingContent && !aiStreamingReasoning && !aiOcrProcessing && !aiRelayProcessing && (
                        <div className="flex justify-start">
                          <div className={`px-3 py-2 rounded-2xl rounded-bl-sm text-sm ${glassMode ? 'aurora-glass-bubble-ai text-slate-500' : aiDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                            <span className="inline-flex gap-1"><span className="animate-bounce" style={{animationDelay:'0ms'}}>●</span><span className="animate-bounce" style={{animationDelay:'150ms'}}>●</span><span className="animate-bounce" style={{animationDelay:'300ms'}}>●</span></span>
                          </div>
                        </div>
                      )}
                      <div ref={aiChatEndRef} />
                    </div>
                    <div className="px-4 pb-3 shrink-0 sm:scale-[1.4] sm:origin-bottom">
                      <div
                        className={`rounded-2xl border transition-all relative ${aiDragOver ? (glassMode ? 'aurora-glass-input-box border-blue-400 ring-2 ring-blue-400/50' : aiDarkMode ? 'bg-gray-800/70 border-blue-500 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/10' : 'bg-white border-blue-400 ring-2 ring-blue-400/30 shadow-lg shadow-blue-200/60') : (glassMode ? 'aurora-glass-input-box border-white/50' : aiDarkMode ? 'bg-gray-800/70 border-gray-700/40 shadow-lg shadow-black/20' : 'bg-white border-gray-200/80 shadow-lg shadow-gray-200/60')}`}
                        onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                        onDragEnter={e => { e.preventDefault(); e.stopPropagation(); setAiDragOver(true); }}
                        onDragLeave={e => { e.preventDefault(); e.stopPropagation(); if (!e.currentTarget.contains(e.relatedTarget)) setAiDragOver(false); }}
                        onDrop={e => {
                          e.preventDefault(); e.stopPropagation(); setAiDragOver(false);
                          const files = Array.from(e.dataTransfer?.files || []);
                          if (files.length === 0) return;
                          const imageFiles = files.filter(f => f.type.startsWith('image/'));
                          const textFiles = files.filter(f => !f.type.startsWith('image/'));
                          const maxImages = 4;
                          const maxFiles = 5;
                          if (imageFiles.length > 0) {
                            const remaining = maxImages - aiImages.length;
                            imageFiles.slice(0, remaining).forEach(file => {
                              const reader = new FileReader();
                              reader.onload = ev => {
                                const img = new Image();
                                img.onload = () => {
                                  const maxDim = 2048;
                                  let w = img.width, h = img.height;
                                  if (w > maxDim || h > maxDim) {
                                    const scale = Math.min(maxDim / w, maxDim / h);
                                    w = Math.round(w * scale);
                                    h = Math.round(h * scale);
                                  }
                                  const canvas = document.createElement('canvas');
                                  canvas.width = w;
                                  canvas.height = h;
                                  const ctx = canvas.getContext('2d');
                                  ctx.drawImage(img, 0, 0, w, h);
                                  const ocrBase64 = canvas.toDataURL('image/png');
                                  const compressed = canvas.toDataURL('image/jpeg', 0.8);
                                  setAiImages(prev => {
                                    if (prev.length >= maxImages) return prev;
                                    return [...prev, { base64: compressed, preview: compressed, name: file.name, ocrBase64 }];
                                  });
                                };
                                img.src = ev.target.result;
                              };
                              reader.readAsDataURL(file);
                            });
                          }
                          if (textFiles.length > 0) {
                            const remaining = maxFiles - aiFiles.length;
                            textFiles.slice(0, remaining).forEach(file => {
                              if (file.size > 512 * 1024) {
                                setAiMessages(prev => [...prev, { role: 'assistant', content: `⚠️文件${file.name} 超过 512KB 限制` }]);
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = ev => {
                                setAiFiles(prev => {
                                  if (prev.length >= maxFiles) return prev;
                                  return [...prev, { name: file.name, content: ev.target.result, size: file.size }];
                                });
                              };
                              reader.readAsText(file);
                            });
                          }
                        }}
                      >
                        {aiDragOver && (
                          <div className="absolute inset-0 rounded-2xl z-10 flex items-center justify-center pointer-events-none bg-blue-500/10 backdrop-blur-[2px]">
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${glassMode ? 'bg-white/70 text-blue-600 shadow' : aiDarkMode ? 'bg-gray-800/90 text-blue-400 shadow-lg' : 'bg-white/90 text-blue-600 shadow-lg'}`}>
                              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                              释放以添加文件
                            </div>
                          </div>
                        )}
                        {(aiFiles.length > 0 || aiImages.length > 0) && (
                          <div className="flex gap-2 px-3 pt-2.5 overflow-x-auto">
                            {aiImages.map((img, idx) => (
                              <div key={`img-${idx}`} className="relative shrink-0">
                                <img src={img.preview} alt="" className="w-12 h-12 object-cover rounded-xl border shadow-sm" />
                                <button
                                  onClick={() => setAiImages(prev => prev.filter((_, i) => i !== idx))}
                                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs leading-none shadow"
                                >×</button>
                              </div>
                            ))}
                            {aiFiles.map((file, idx) => (
                              <div key={`file-${idx}`} className={`relative shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center border ${glassMode ? 'bg-violet-400/10 border-violet-400/30' : aiDarkMode ? 'bg-violet-900/20 border-violet-700/30' : 'bg-violet-50 border-violet-200'}`}>
                                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className={glassMode ? 'text-violet-500' : aiDarkMode ? 'text-violet-400' : 'text-violet-500'}><path d="M4.5 3a2.5 2.5 0 0 1 5 0v9a1.5 1.5 0 0 1-3 0V5a.5.5 0 0 1 1 0v7a.5.5 0 0 0 1 0V3a1.5 1.5 0 0 0-3 0v9a2.5 2.5 0 0 0 5 0V5a.5.5 0 0 1 1 0v7a3.5 3.5 0 1 1-7 0z"/></svg>
                                <span className={`text-[8px] mt-0.5 truncate max-w-[44px] px-0.5 ${glassMode ? 'text-violet-600' : aiDarkMode ? 'text-violet-300' : 'text-violet-600'}`}>{file.name.split('.').pop()}</span>
                                <button
                                  onClick={() => setAiFiles(prev => prev.filter((_, i) => i !== idx))}
                                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs leading-none shadow"
                                >×</button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1">
                          <button
                            onClick={() => aiImageInputRef.current?.click()}
                            className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                              aiImages.length > 0
                                ? (glassMode ? 'bg-emerald-400/20 text-emerald-600' : aiDarkMode ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-600')
                                : (glassMode ? 'text-slate-400 hover:bg-white/25' : aiDarkMode ? 'text-gray-500 hover:bg-gray-700/40' : 'text-gray-400 hover:bg-gray-100')
                            }`}
                            title={aiEndpoint.includes('deepseek') ? '添加图片（将自动识别文字）' : '添加图片'}
                          >
                            <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/><path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1z"/></svg>
                            {aiImages.length > 0 && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">{aiImages.length}</span>
                            )}
                          </button>
                          <input
                            type="text"
                            value={aiInput}
                            onChange={e => setAiInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); aiSendMessage(); } }}
                            onPaste={e => {
                              const items = e.clipboardData?.items;
                              if (!items) return;
                              for (let i = 0; i < items.length; i++) {
                                if (items[i].type.indexOf('image') !== -1) {
                                  e.preventDefault();
                                  const file = items[i].getAsFile();
                                  if (!file) continue;
                                  const reader = new FileReader();
                                  reader.onload = ev => {
                                    const base64 = ev.target.result;
                                    const preview = base64;
                                    setAiImages(prev => {
                                      if (prev.length >= 4) return prev;
                                      return [...prev, { base64, preview, name: file.name || 'pasted-image.png', ocrBase64: base64 }];
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                  break;
                                }
                              }
                            }}
                            placeholder={aiApiKey ? "发送消息... (Ctrl+V 粘贴图片，支持拖拽)" : "请先设置 API Key"}
                            className={`flex-1 bg-transparent outline-none text-[15px] py-1 min-w-0 ${glassMode ? 'text-slate-800 placeholder-slate-400/60' : aiDarkMode ? 'text-white placeholder-gray-500' : 'text-gray-800 placeholder-gray-400'}`}
                          />
                          {aiLoading ? (
                            <button onClick={() => { vibrate(20); aiStopGeneration(); }} className="w-9 h-9 rounded-xl bg-red-500 text-white flex items-center justify-center active:scale-95 transition-all shrink-0 shadow-sm" title="停止生成">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                            </button>
                          ) : (
                            <>
                              <div className="relative shrink-0">
                                {aiListening && (
                                  <>
                                    <span className="absolute inset-0 rounded-xl bg-red-400/40 animate-voice-ring-1" />
                                    <span className="absolute inset-0 rounded-xl bg-red-400/25 animate-voice-ring-2" />
                                    <span className="absolute inset-0 rounded-xl bg-red-400/10 animate-voice-ring-3" />
                                  </>
                                )}
                                <button onClick={toggleVoiceInput} className={`relative w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-all z-10 ${aiListening ? 'bg-red-500 text-white shadow-sm' : glassMode ? 'text-slate-400 hover:bg-white/25' : aiDarkMode ? 'text-gray-500 hover:bg-gray-700/40' : 'text-gray-400 hover:bg-gray-100'}`} title="语音输入">
                                  <svg width="17" height="17" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3m-4 7a.5.5 0 0 1 .5.5 3.5 3.5 0 0 0 7 0 .5.5 0 0 1 1 0 4.5 4.5 0 0 1-4 4.473V15a.5.5 0 0 1-1 0v-2.027A4.5 4.5 0 0 1 3.5 8.5.5.5 0 0 1 4 8"/></svg>
                                </button>
                              </div>
                              <button onClick={() => { vibrate(15); aiSendMessage(); }} disabled={!aiInput.trim() && aiImages.length === 0 && aiFiles.length === 0} className={`w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-25 active:scale-95 transition-all shrink-0 ${glassMode ? 'aurora-glass-pill text-slate-600 shadow-sm' : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm shadow-blue-500/25'}`}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>
                              </button>
                            </>
                          )}
                        </div>
                        <div className={`mx-3 my-1 h-px ${glassMode ? 'bg-gradient-to-r from-transparent via-white/30 to-transparent' : aiDarkMode ? 'bg-gradient-to-r from-transparent via-gray-600/30 to-transparent' : 'bg-gradient-to-r from-transparent via-gray-200 to-transparent'}`} />
                        <div className={`flex items-center gap-0.5 px-2 pb-1.5 ${!aiApiKey ? 'opacity-40 pointer-events-none' : ''}`}>
                          <button
                            onClick={() => setAiThinkingEnabled(!aiThinkingEnabled)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${aiThinkingEnabled ? (glassMode ? 'bg-amber-400/20 text-amber-600' : aiDarkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-600') : (glassMode ? 'text-slate-400 hover:bg-white/25 hover:text-slate-600' : aiDarkMode ? 'text-gray-500 hover:bg-gray-700/30 hover:text-gray-400' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-500')}`}
                          >
                            <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M2 6a6 6 0 1 1 10.174 4.31c-.203.196-.359.4-.453.619l-.762 1.769A.5.5 0 0 1 10.5 13a.5.5 0 0 1 0 1 .5.5 0 0 1 0 1l-.224.447a1 1 0 0 1-.894.553H6.618a1 1 0 0 1-.894-.553L5.5 15a.5.5 0 0 1 0-1 .5.5 0 0 1 0-1 .5.5 0 0 1-.46-.302l-.761-1.77a2 2 0 0 0-.453-.618A5.98 5.98 0 0 1 2 6m6-5a5 5 0 0 0-3.479 8.592c.263.254.514.564.676.941L5.83 12h4.342l.632-1.467c.162-.377.413-.687.676-.941A5 5 0 0 0 8 1"/></svg>
                            深度思考
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => {
                                if (!aiThinkingEnabled) return;
                                if (aiShowEffortMenu) {
                                  setAiEffortMenuClosing(true);
                                  setTimeout(() => { setAiShowEffortMenu(false); setAiEffortMenuClosing(false); }, 200);
                                } else {
                                  setAiShowEffortMenu(true);
                                }
                              }}
                              className={`flex items-center gap-0.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${aiThinkingEnabled ? (glassMode ? 'text-amber-600/70 hover:bg-amber-400/10' : aiDarkMode ? 'text-amber-400/60 hover:bg-amber-900/20' : 'text-amber-500/70 hover:bg-amber-50') : (glassMode ? 'text-slate-300' : aiDarkMode ? 'text-gray-600' : 'text-gray-300')}`}
                            >
                              {aiReasoningEffort === 'high' ? '深' : '最'}
                              <svg width="10" height="10" fill="currentColor" viewBox="0 0 16 16" className={`transition-transform ${aiShowEffortMenu ? 'rotate-180' : ''}`}><path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/></svg>
                            </button>
                            {aiThinkingEnabled && (aiShowEffortMenu || aiEffortMenuClosing) && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => { setAiEffortMenuClosing(true); setTimeout(() => { setAiShowEffortMenu(false); setAiEffortMenuClosing(false); }, 200); }} />
                                <div className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 min-w-[140px] rounded-xl shadow-xl border z-20 py-1 ${aiEffortMenuClosing ? 'animate-effort-menu-out' : 'animate-effort-menu-in'} ${glassMode ? 'aurora-glass-card' : aiDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                                  <button
                                    onClick={() => { setAiReasoningEffort('high'); setAiEffortMenuClosing(true); setTimeout(() => { setAiShowEffortMenu(false); setAiEffortMenuClosing(false); }, 200); }}
                                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${aiReasoningEffort === 'high' ? (glassMode ? 'bg-amber-400/30 text-amber-700' : aiDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-600') : (glassMode ? 'text-blue-700 hover:bg-white/90' : aiDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50')}`}
                                  >
                                    <span>深</span>
                                    <span className={`text-[12px] ${glassMode ? 'text-blue-500/70' : aiDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>普通请求</span>
                                  </button>
                                  <button
                                    onClick={() => { setAiReasoningEffort('max'); setAiEffortMenuClosing(true); setTimeout(() => { setAiShowEffortMenu(false); setAiEffortMenuClosing(false); }, 200); }}
                                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${aiReasoningEffort === 'max' ? (glassMode ? 'bg-amber-400/30 text-amber-700' : aiDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-600') : (glassMode ? 'text-blue-700 hover:bg-white/90' : aiDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50')}`}
                                  >
                                    <span>最深</span>
                                    <span className={`text-[12px] ${glassMode ? 'text-blue-500/70' : aiDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>复杂推理</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                          <div className={`w-px h-4 mx-0.5 ${glassMode ? 'aurora-glass-input' : aiDarkMode ? 'bg-gray-700/50' : 'bg-gray-200/60'}`} />
                          <button
                            onClick={() => aiFileInputRef.current?.click()}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${aiFiles.length > 0 ? (glassMode ? 'bg-violet-400/20 text-violet-600' : aiDarkMode ? 'bg-violet-900/30 text-violet-400' : 'bg-violet-50 text-violet-600') : (glassMode ? 'text-slate-400 hover:bg-white/25 hover:text-slate-600' : aiDarkMode ? 'text-gray-500 hover:bg-gray-700/30 hover:text-gray-400' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-500')}`}
                          >
                            <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M4.5 3a2.5 2.5 0 0 1 5 0v9a1.5 1.5 0 0 1-3 0V5a.5.5 0 0 1 1 0v7a.5.5 0 0 0 1 0V3a1.5 1.5 0 0 0-3 0v9a2.5 2.5 0 0 0 5 0V5a.5.5 0 0 1 1 0v7a3.5 3.5 0 1 1-7 0z"/></svg>
                            附件{aiFiles.length > 0 && `(${aiFiles.length})`}
                          </button>
                        </div>
                      </div>
                    </div>
                    <input
                      ref={aiImageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      multiple
                      className="hidden"
                      onChange={e => {
                        const files = Array.from(e.target.files || []);
                        if (files.length === 0) return;
                        const maxImages = 4;
                        const remaining = maxImages - aiImages.length;
                        const toProcess = files.slice(0, remaining);
                        toProcess.forEach(file => {
                          const reader = new FileReader();
                          reader.onload = ev => {
                            const img = new Image();
                            img.onload = () => {
                              const maxDim = 2048;
                              let w = img.width, h = img.height;
                              if (w > maxDim || h > maxDim) {
                                const scale = Math.min(maxDim / w, maxDim / h);
                                w = Math.round(w * scale);
                                h = Math.round(h * scale);
                              }
                              const canvas = document.createElement('canvas');
                              canvas.width = w;
                              canvas.height = h;
                              const ctx = canvas.getContext('2d');
                              ctx.drawImage(img, 0, 0, w, h);
                              const ocrBase64 = canvas.toDataURL('image/png');
                              const compressed = canvas.toDataURL('image/jpeg', 0.8);
                              setAiImages(prev => {
                                if (prev.length >= maxImages) return prev;
                                return [...prev, { base64: compressed, preview: compressed, name: file.name, ocrBase64 }];
                              });
                            };
                            img.src = ev.target.result;
                          };
                          reader.readAsDataURL(file);
                        });
                        e.target.value = '';
                      }}
                    />
                    <input
                      ref={aiFileInputRef}
                      type="file"
                      accept=".txt,.md,.json,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.css,.html,.xml,.yaml,.yml,.csv,.log,.sh,.bat,.sql,.rb,.go,.rs,.swift,.kt,.php,.lua,.r,.m,.mm,.vue,.svelte,.astro,.toml,.ini,.cfg,.conf,.env,.gitignore,.dockerfile,.makefile"
                      multiple
                      className="hidden"
                      onChange={e => {
                        const files = Array.from(e.target.files || []);
                        if (files.length === 0) return;
                        const maxFiles = 5;
                        const remaining = maxFiles - aiFiles.length;
                        const toProcess = files.slice(0, remaining);
                        toProcess.forEach((file) => {
                          if (file.size > 512 * 1024) {
                            setAiMessages(prev => [...prev, { role: 'assistant', content: `⚠️文件${file.name} 超过 512KB 限制` }]);
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = ev => {
                            setAiFiles(prev => {
                              if (prev.length >= maxFiles) return prev;
                              return [...prev, { name: file.name, content: ev.target.result, size: file.size }];
                            });
                          };
                          reader.readAsText(file);
                        });
                        e.target.value = '';
                      }}
                    />
                  </>
              </div>
            </div>
          )}

          {showApiGuide && (
            <div className="absolute inset-0 z-50 flex items-end justify-center">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowApiGuide(false)} />
              <div className={`relative w-full rounded-t-3xl shadow-2xl p-6 pb-8 transition-all max-h-[85vh] flex flex-col ${glassMode ? 'aurora-glass-card border-white/30' : darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-3">
                  <h2 className={`text-xl font-black ${glassMode ? 'text-slate-800' : ''}`}>API 配置教程</h2>
                  <button onClick={() => setShowApiGuide(false)} className={`p-2 rounded-xl ${glassMode ? 'hover:bg-white/25 text-slate-500' : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                <div className="flex gap-2 mb-4">
                  {[
                    { id: 'deepseek', label: 'DeepSeek', color: 'text-blue-500 border-blue-500' },
                    { id: 'openai', label: 'OpenAI', color: 'text-green-500 border-green-500' },
                    { id: 'anthropic', label: 'Claude', color: 'text-orange-500 border-orange-500' },
                    { id: 'qwen', label: '通义千问', color: 'text-purple-500 border-purple-500' },
                    { id: 'mimo', label: '小米MiMo', color: 'text-orange-400 border-orange-400' },
                  ].map(tab => (
                    <button key={tab.id} onClick={() => setApiGuideTab(tab.id)} className={`px-4 py-2 text-xs font-bold whitespace-nowrap transition-all relative ${apiGuideTab === tab.id ? `${tab.color}` : darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
                      {tab.label}
                      {apiGuideTab === tab.id && <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full ${tab.color.split(' ')[0].replace('text-', 'bg-')}`} />}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto space-y-4">
                  {apiGuideTab === 'deepseek' && (
                    <>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-500">官方指南</span>
                        </div>
                        <h3 className="font-bold mb-2 text-base">1. 注册 DeepSeek 账号</h3>
                        <p className={`text-sm mb-2 ${glassMode ? 'text-slate-600' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>访问 DeepSeek 开放平台注册账号：</p>
                        <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          platform.deepseek.com
                        </a>
                      </div>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <h3 className="font-bold mb-2 text-base">2. 创建 API Key</h3>
                        <p className={`text-sm mb-2 ${glassMode ? 'text-slate-600' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>登录后进入 API 密钥管理页面：</p>
                        <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors mb-3">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          API 密钥管理
                        </a>
                        <ol className={`text-sm space-y-1.5 list-decimal pl-4 ${glassMode ? 'text-slate-600' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <li>点击「创建 API Key」按钮</li>
                          <li>复制生成的密钥（以 <code className="px-1 py-0.5 rounded text-xs bg-gray-200/50 dark:bg-gray-600/50">sk-</code> 开头）</li>
                          <li>⚠️密钥仅显示一次，请妥善保存</li>
                        </ol>
                      </div>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <h3 className="font-bold mb-2 text-base">3. 配置应用</h3>
                        <ol className={`text-sm space-y-1.5 list-decimal pl-4 ${glassMode ? 'text-slate-600' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <li>打开设置 → AI 助手</li>
                          <li>在「API Key」输入框中粘贴你的密钥</li>
                          <li>选择模型预设或手动填写端点和模型名称</li>
                          <li>点击「保存并完成」</li>
                        </ol>
                      </div>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <h3 className="font-bold mb-2 text-base">4. 支持的模型</h3>
                        <div className="space-y-2">
                          <div className={`flex items-center justify-between p-3 rounded-xl ${glassMode ? 'bg-white/25' : darkMode ? 'bg-gray-600/50' : 'bg-white'}`}>
                            <div>
                              <div className="font-bold text-sm">DeepSeek V4 Flash</div>
                              <div className={`text-[11px] ${glassMode ? 'text-slate-400/70' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>快速响应，非思考模式</div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 font-bold">推荐</span>
                          </div>
                          <div className={`flex items-center justify-between p-3 rounded-xl ${glassMode ? 'bg-white/25' : darkMode ? 'bg-gray-600/50' : 'bg-white'}`}>
                            <div>
                              <div className="font-bold text-sm">DeepSeek V4 Pro</div>
                              <div className={`text-[11px] ${glassMode ? 'text-slate-400/70' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>深度推理，思考模式，2.5折优惠中</div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-500 font-bold">高级</span>
                          </div>
                          <p className={`text-[11px] mt-2 ${glassMode ? 'text-slate-500' : darkMode ? 'text-gray-500' : 'text-gray-400'}`}>⚠️ deepseek-chat 和 deepseek-reasoner 将于 2026/07/24 弃用</p>
                        </div>
                      </div>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <h3 className="font-bold mb-2 text-base">5. API 端点配置</h3>
                        <div className={`text-sm space-y-2 ${glassMode ? 'text-slate-600' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <div className={`p-2.5 rounded-lg font-mono text-xs ${darkMode ? 'bg-gray-600/50 text-green-400' : 'bg-gray-100 text-green-600'}`}>
                            OpenAI 格式：https://api.deepseek.com
                          </div>
                          <div className={`p-2.5 rounded-lg font-mono text-xs ${darkMode ? 'bg-gray-600/50 text-green-400' : 'bg-gray-100 text-green-600'}`}>
                            Anthropic 格式：https://api.deepseek.com/anthropic
                          </div>
                          <p className={`text-[11px] ${glassMode ? 'text-slate-500' : darkMode ? 'text-gray-500' : 'text-gray-400'}`}>本应用端点填写：<code className="px-1 py-0.5 rounded text-[10px] bg-gray-200/50 dark:bg-gray-600/50">https://api.deepseek.com/v1/chat/completions</code></p>
                        </div>
                      </div>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <h3 className="font-bold mb-2 text-base">6. 价格参考</h3>
                        <div className={`text-sm ${glassMode ? 'text-slate-600' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className={`border-b ${glassMode ? 'border-white/20' : darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                <th className="text-left py-2 font-bold">项目</th>
                                <th className="text-right py-2 font-bold">V4 Flash</th>
                                <th className="text-right py-2 font-bold">V4 Pro</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className={`border-b ${glassMode ? 'border-white/15' : darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                                <td className="py-1.5">输入</td>
                                <td className="text-right">0.02/M</td>
                                <td className="text-right">0.025/M</td>
                              </tr>
                              <tr className={`border-b ${glassMode ? 'border-white/15' : darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                                <td className="py-1.5">输出</td>
                                <td className="text-right">2/M</td>
                                <td className="text-right">3/M</td>
                              </tr>
                              <tr>
                                <td className="py-1.5">缓存输入</td>
                                <td className="text-right">3/M</td>
                                <td className="text-right">6/M</td>
                              </tr>
                            </tbody>
                          </table>
                          <p className={`text-[11px] mt-2 ${glassMode ? 'text-slate-500' : darkMode ? 'text-gray-500' : 'text-gray-400'}`}>价格以百万 tokens 为单位；缓存命中仅首发价 1/10；V4 Pro 2.5折优惠截止 2026/05/31；全局 1M 上下文，最大输出 384K</p>
                        </div>
                      </div>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <h3 className="font-bold mb-2 text-base">7. 官方文档</h3>
                        <div className="space-y-2">
                          <a href="https://api-docs.deepseek.com/zh-cn/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                            DeepSeek API 官方文档
                          </a>
                          <a href="https://api-docs.deepseek.com/zh-cn/quick_start/pricing" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                            模型价格说明
                          </a>
                        </div>
                      </div>
                    </>
                  )}
                  {apiGuideTab === 'openai' && (
                    <>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-500/20 text-green-500">官方指南</span>
                        </div>
                        <h3 className="font-bold mb-2 text-base">1. 注册 OpenAI 账号</h3>
                        <p className={`text-sm mb-2 ${glassMode ? 'text-slate-600' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>访问 OpenAI 官网注册账号（需海外网络环境）：</p>
                        <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          platform.openai.com
                        </a>
                      </div>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <h3 className="font-bold mb-2 text-base">2. 创建 API Key</h3>
                        <p className={`text-sm mb-2 ${glassMode ? 'text-slate-600' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>登录后进入 API 密钥管理页面：</p>
                        <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors mb-3">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          API Keys 管理
                        </a>
                        <ol className={`text-sm space-y-1.5 list-decimal pl-4 ${glassMode ? 'text-slate-600' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <li>复制生成的密钥（以 <code className="px-1 py-0.5 rounded text-xs bg-gray-200/50 dark:bg-gray-600/50">sk-</code> 开头）</li>
                          <li>⚠️密钥仅显示一次，请妥善保存</li>
                          <li>需绑定付款方式才能使用 API</li>
                        </ol>
                      </div>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <h3 className="font-bold mb-2 text-base">3. 配置应用</h3>
                        <ol className={`text-sm space-y-1.5 list-decimal pl-4 ${glassMode ? 'text-slate-600' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <li>打开设置 → AI 助手</li>
                          <li>API 端点填写 <code className="px-1 py-0.5 rounded text-[10px] bg-gray-200/50 dark:bg-gray-600/50">https://api.openai.com/v1/chat/completions</code></li>
                          <li>在「API Key」输入框中粘贴你的密钥</li>
                          <li>模型名称填写对应模型 ID（如 gpt-4o）</li>
                          <li>点击「保存并完成」</li>
                        </ol>
                      </div>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <h3 className="font-bold mb-2 text-base">4. 支持的模型</h3>
                        <div className="space-y-2">
                          <div className={`flex items-center justify-between p-3 rounded-xl ${glassMode ? 'bg-white/25' : darkMode ? 'bg-gray-600/50' : 'bg-white'}`}>
                            <div>
                              <div className="font-bold text-sm">GPT-5</div>
                              <div className={`text-[11px] ${glassMode ? 'text-slate-400/70' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>最新旗舰，多模态，128K上下文</div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 font-bold">推荐</span>
                          </div>
                          <div className={`flex items-center justify-between p-3 rounded-xl ${glassMode ? 'bg-white/25' : darkMode ? 'bg-gray-600/50' : 'bg-white'}`}>
                            <div>
                              <div className="font-bold text-sm">GPT-4o</div>
                              <div className={`text-[11px] ${glassMode ? 'text-slate-400/70' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>多模态，128K上下文，性价比高</div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500 font-bold">均衡</span>
                          </div>
                          <div className={`flex items-center justify-between p-3 rounded-xl ${glassMode ? 'bg-white/25' : darkMode ? 'bg-gray-600/50' : 'bg-white'}`}>
                            <div>
                              <div className="font-bold text-sm">GPT-4o mini</div>
                              <div className={`text-[11px] ${glassMode ? 'text-slate-400/70' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>高性价比，快速响应，128K上下文</div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-500 font-bold">经济</span>
                          </div>
                          <div className={`flex items-center justify-between p-3 rounded-xl ${glassMode ? 'bg-white/25' : darkMode ? 'bg-gray-600/50' : 'bg-white'}`}>
                            <div>
                              <div className="font-bold text-sm">o3 / o3-mini</div>
                              <div className={`text-[11px] ${glassMode ? 'text-slate-400/70' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>推理模型，数学、编程，200K上下文</div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-500 font-bold">推荐</span>
                          </div>
                        </div>
                      </div>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <h3 className="font-bold mb-2 text-base">5. 价格参考</h3>
                        <div className={`text-sm ${glassMode ? 'text-slate-600' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className={`border-b ${glassMode ? 'border-white/20' : darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                <th className="text-left py-2 font-bold">模型</th>
                                <th className="text-right py-2 font-bold">输入</th>
                                <th className="text-right py-2 font-bold">输出</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className={`border-b ${glassMode ? 'border-white/15' : darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                                <td className="py-1.5">GPT-5</td>
                                <td className="text-right">$1.25/M</td>
                                <td className="text-right">$10/M</td>
                              </tr>
                              <tr className={`border-b ${glassMode ? 'border-white/15' : darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                                <td className="py-1.5">GPT-4o</td>
                                <td className="text-right">$2.5/M</td>
                                <td className="text-right">$10/M</td>
                              </tr>
                              <tr className={`border-b ${glassMode ? 'border-white/15' : darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                                <td className="py-1.5">GPT-4o mini</td>
                                <td className="text-right">$0.15/M</td>
                                <td className="text-right">$0.6/M</td>
                              </tr>
                              <tr>
                                <td className="py-1.5">o3-mini</td>
                                <td className="text-right">$1.1/M</td>
                                <td className="text-right">$4.4/M</td>
                              </tr>
                            </tbody>
                          </table>
                          <p className={`text-[11px] mt-2 ${glassMode ? 'text-slate-500' : darkMode ? 'text-gray-500' : 'text-gray-400'}`}>价格为美元计费；缓存输入享50% 折扣；Batch API 再享50%</p>
                        </div>
                      </div>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <h3 className="font-bold mb-2 text-base">6. 官方文档</h3>
                        <div className="space-y-2">
                          <a href="https://platform.openai.com/docs" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                            OpenAI API 官方文档
                          </a>
                          <a href="https://openai.com/api/pricing/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                            OpenAI 价格页面
                          </a>
                        </div>
                      </div>
                    </>
                  )}
                  {apiGuideTab === 'anthropic' && (
                    <>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-500/20 text-orange-500">官方指南</span>
                        </div>
                        <h3 className="font-bold mb-2 text-base">1. 注册 Anthropic 账号</h3>
                        <p className={`text-sm mb-2 ${glassMode ? 'text-slate-600' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>访问 Anthropic Console 注册账号：</p>
                        <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          console.anthropic.com
                        </a>
                      </div>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <h3 className="font-bold mb-2 text-base">2. 创建 API Key</h3>
                        <p className={`text-sm mb-2 ${glassMode ? 'text-slate-600' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>登录后进入 API 密钥管理页面：</p>
                        <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 transition-colors mb-3">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          API Keys 管理
                        </a>
                        <ol className={`text-sm space-y-1.5 list-decimal pl-4 ${glassMode ? 'text-slate-600' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <li>复制生成的密钥（以 <code className="px-1 py-0.5 rounded text-xs bg-gray-200/50 dark:bg-gray-600/50">sk-ant-</code> 开头）</li>
                          <li>⚠️密钥仅显示一次，请妥善保存</li>
                        </ol>
                      </div>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <h3 className="font-bold mb-2 text-base">3. 配置应用</h3>
                        <div className={`p-3 rounded-xl mb-3 text-xs ${darkMode ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
                          ⚠️Anthropic 使用独立的 Messages API 格式，本应用当前仅支持 OpenAI 兼容格式。如需使用 Claude，建议通过第三方中转服务（如 OpenRouter）接入。
                        </div>
                        <ol className={`text-sm space-y-1.5 list-decimal pl-4 ${glassMode ? 'text-slate-600' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <li>使用中转服务时，API 端点填写中转服务提供的地址</li>
                          <li>在「API Key」输入框中粘贴中转服务的密钥</li>
                          <li>模型名称填写 <code className="px-1 py-0.5 rounded text-[10px] bg-gray-200/50 dark:bg-gray-600/50">claude-sonnet-4-20250514</code> 等</li>
                          <li>点击「保存并完成」</li>
                        </ol>
                      </div>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <h3 className="font-bold mb-2 text-base">4. Claude 模型系列</h3>
                        <div className="space-y-2">
                          <div className={`flex items-center justify-between p-3 rounded-xl ${glassMode ? 'bg-white/25' : darkMode ? 'bg-gray-600/50' : 'bg-white'}`}>
                            <div>
                              <div className="font-bold text-sm">Claude Sonnet 4.6</div>
                              <div className={`text-[11px] ${glassMode ? 'text-slate-400/70' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>平衡性能与速度，200K上下文</div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-500 font-bold">推荐</span>
                          </div>
                          <div className={`flex items-center justify-between p-3 rounded-xl ${glassMode ? 'bg-white/25' : darkMode ? 'bg-gray-600/50' : 'bg-white'}`}>
                            <div>
                              <div className="font-bold text-sm">Claude Opus 4.6</div>
                              <div className={`text-[11px] ${glassMode ? 'text-slate-400/70' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>最强推理，编程、分析，200K上下文</div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-500 font-bold">旗舰</span>
                          </div>
                          <div className={`flex items-center justify-between p-3 rounded-xl ${glassMode ? 'bg-white/25' : darkMode ? 'bg-gray-600/50' : 'bg-white'}`}>
                            <div>
                              <div className="font-bold text-sm">Claude Haiku 3.5</div>
                              <div className={`text-[11px] ${glassMode ? 'text-slate-400/70' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>极速响应，性价比高，200K上下文</div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500 font-bold">经济</span>
                          </div>
                        </div>
                      </div>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <h3 className="font-bold mb-2 text-base">5. 价格参考</h3>
                        <div className={`text-sm ${glassMode ? 'text-slate-600' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className={`border-b ${glassMode ? 'border-white/20' : darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                <th className="text-left py-2 font-bold">模型</th>
                                <th className="text-right py-2 font-bold">输入</th>
                                <th className="text-right py-2 font-bold">输出</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className={`border-b ${glassMode ? 'border-white/15' : darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                                <td className="py-1.5">Claude Opus 4</td>
                                <td className="text-right">$15/M</td>
                                <td className="text-right">$75/M</td>
                              </tr>
                              <tr className={`border-b ${glassMode ? 'border-white/15' : darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                                <td className="py-1.5">Claude Sonnet 4</td>
                                <td className="text-right">$3/M</td>
                                <td className="text-right">$15/M</td>
                              </tr>
                              <tr>
                                <td className="py-1.5">Claude Haiku 3.5</td>
                                <td className="text-right">$0.8/M</td>
                                <td className="text-right">$4/M</td>
                              </tr>
                            </tbody>
                          </table>
                          <p className={`text-[11px] mt-2 ${glassMode ? 'text-slate-500' : darkMode ? 'text-gray-500' : 'text-gray-400'}`}>价格为美元计费；提示缓存输入可享 90% 折扣；支持 Batch API</p>
                        </div>
                      </div>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <h3 className="font-bold mb-2 text-base">6. 官方文档</h3>
                        <div className="space-y-2">
                          <a href="https://docs.anthropic.com/en/docs" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                            Anthropic API 官方文档
                          </a>
                          <a href="https://docs.anthropic.com/en/docs/about-claude/models" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                            Claude 模型与价格
                          </a>
                        </div>
                      </div>
                    </>
                  )}
                  {apiGuideTab === 'qwen' && (
                    <>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-500/20 text-purple-500">官方指南</span>
                          <span className="text-[10px] text-gray-400">通义千问 API (阿里云百炼)</span>
                        </div>
                        <h3 className="font-bold mb-2 text-base">1. 注册阿里云账号</h3>
                        <p className={`text-sm mb-2 ${glassMode ? 'text-slate-600' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>访问阿里云百炼平台注册并开通服务：</p>
                        <a href="https://bailian.console.aliyun.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          百炼控制台
                        </a>
                      </div>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <h3 className="font-bold mb-2 text-base">2. 创建 API Key</h3>
                        <ol className={`text-sm space-y-1.5 list-decimal pl-4 ${glassMode ? 'text-slate-600' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <li>点击左侧菜单「API-KEY 管理」</li>
                          <li>点击「创建 API Key」</li>
                          <li>复制生成的密钥并妥善保存</li>
                        </ol>
                      </div>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <h3 className="font-bold mb-2 text-base">3. 配置应用</h3>
                        <ol className={`text-sm space-y-1.5 list-decimal pl-4 ${glassMode ? 'text-slate-600' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <li>打开设置 → AI 助手</li>
                          <li>API 端点填写 <code className="px-1 py-0.5 rounded text-[10px] bg-gray-200/50 dark:bg-gray-600/50">https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions</code></li>
                          <li>在「API Key」输入框中粘贴你的密钥</li>
                          <li>模型名称填写对应模型 ID（如 qwen3-plus、qwen3-max）</li>
                          <li>点击「保存并完成」</li>
                        </ol>
                        <div className={`p-3 rounded-xl mt-3 text-xs ${darkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                          💡 通义千问兼容 OpenAI API 格式，使用 compatible-mode 端点即可直接接入
                        </div>
                      </div>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <h3 className="font-bold mb-2 text-base">4. 支持的模型</h3>
                        <div className="space-y-2">
                          <div className={`flex items-center justify-between p-3 rounded-xl ${glassMode ? 'bg-white/25' : darkMode ? 'bg-gray-600/50' : 'bg-white'}`}>
                            <div>
                              <div className="font-bold text-sm">Qwen3-Max</div>
                              <div className={`text-[11px] ${glassMode ? 'text-slate-400/70' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>旗舰模型，128K上下文，复杂推理</div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-500 font-bold">旗舰</span>
                          </div>
                          <div className={`flex items-center justify-between p-3 rounded-xl ${glassMode ? 'bg-white/25' : darkMode ? 'bg-gray-600/50' : 'bg-white'}`}>
                            <div>
                              <div className="font-bold text-sm">Qwen3-Plus</div>
                              <div className={`text-[11px] ${glassMode ? 'text-slate-400/70' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>均衡模型，128K上下文，性价比高</div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 font-bold">推荐</span>
                          </div>
                          <div className={`flex items-center justify-between p-3 rounded-xl ${glassMode ? 'bg-white/25' : darkMode ? 'bg-gray-600/50' : 'bg-white'}`}>
                            <div>
                              <div className="font-bold text-sm">Qwen3.5-Flash</div>
                              <div className={`text-[11px] ${glassMode ? 'text-slate-400/70' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>极速响应，1M上下文，非思考/思考模式</div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500 font-bold">经济</span>
                          </div>
                        </div>
                      </div>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <h3 className="font-bold mb-2 text-base">5. 价格参考</h3>
                        <div className={`text-sm ${glassMode ? 'text-slate-600' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className={`border-b ${glassMode ? 'border-white/20' : darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                <th className="text-left py-2 font-bold">模型</th>
                                <th className="text-right py-2 font-bold">输入</th>
                                <th className="text-right py-2 font-bold">输出</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className={`border-b ${glassMode ? 'border-white/15' : darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                                <td className="py-1.5">Qwen3-Max</td>
                                <td className="text-right">2.5/M</td>
                                <td className="text-right">10/M</td>
                              </tr>
                              <tr className={`border-b ${glassMode ? 'border-white/15' : darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                                <td className="py-1.5">Qwen3-Plus</td>
                                <td className="text-right">0.8/M</td>
                                <td className="text-right">3/M</td>
                              </tr>
                              <tr>
                                <td className="py-1.5">Qwen3.5-Flash</td>
                                <td className="text-right">0.2/M</td>
                                <td className="text-right">0.6/M</td>
                              </tr>
                            </tbody>
                          </table>
                          <p className={`text-[11px] mt-2 ${glassMode ? 'text-slate-500' : darkMode ? 'text-gray-500' : 'text-gray-400'}`}>价格以人民币计费，缓存输入享 50% 折扣</p>
                        </div>
                      </div>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <h3 className="font-bold mb-2 text-base">6. 官方文档</h3>
                        <div className="space-y-2">
                          <a href="https://help.aliyun.com/zh/model-studio/developer-reference/use-qwen-by-calling-api" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                            通义千问 API 文档
                          </a>
                          <a href="https://help.aliyun.com/zh/model-studio/getting-started/models" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                            模型列表与价格
                          </a>
                        </div>
                      </div>
                    </>
                  )}
                  {apiGuideTab === 'mimo' && (
                    <>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-400/20 text-orange-400">官方指南</span>
                          <span className="text-[10px] text-gray-400">Xiaomi MiMo API</span>
                        </div>
                        <h3 className="font-bold mb-2 text-base">1. 注册小米账号</h3>
                        <p className={`text-sm mb-2 ${glassMode ? 'text-slate-600' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>访问 Xiaomi MiMo API 开放平台，使用小米账号登录：</p>
                        <a href="https://platform.xiaomimimo.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-orange-400/10 text-orange-400 hover:bg-orange-400/20 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          platform.xiaomimimo.com
                        </a>
                      </div>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <h3 className="font-bold mb-2 text-base">2. 创建 API Key</h3>
                        <p className={`text-sm mb-2 ${glassMode ? 'text-slate-600' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>登录后进入控制台创建 API Key：</p>
                        <a href="https://platform.xiaomimimo.com/console/api-keys" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-orange-400/10 text-orange-400 hover:bg-orange-400/20 transition-colors mb-3">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          API Keys 管理
                        </a>
                        <ol className={`text-sm space-y-1.5 list-decimal pl-4 ${glassMode ? 'text-slate-600' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <li>在控制台 → API Keys 页面创建 API Key</li>
                          <li>⚠️密钥仅显示一次，请妥善保存，避免泄露</li>
                        </ol>
                      </div>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <h3 className="font-bold mb-2 text-base">3. 配置应用</h3>
                        <ol className={`text-sm space-y-1.5 list-decimal pl-4 ${glassMode ? 'text-slate-600' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <li>打开设置 → AI 助手</li>
                          <li>API 端点填写 <code className="px-1 py-0.5 rounded text-[10px] bg-gray-200/50 dark:bg-gray-600/50">https://api.xiaomimimo.com/v1/chat/completions</code></li>
                          <li>在「API Key」输入框中粘贴你的密钥</li>
                          <li>选择模型预设或手动填写模型名称</li>
                          <li>点击「保存并完成」</li>
                        </ol>
                        <div className={`p-3 rounded-xl mt-3 text-xs ${darkMode ? 'bg-orange-400/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
                          💡 MiMo 兼容 OpenAI API 格式，可直接使用 OpenAI SDK 调用
                        </div>
                      </div>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <h3 className="font-bold mb-2 text-base">4. 支持的模型</h3>
                        <div className="space-y-2">
                          <div className={`flex items-center justify-between p-3 rounded-xl ${glassMode ? 'bg-white/25' : darkMode ? 'bg-gray-600/50' : 'bg-white'}`}>
                            <div>
                              <div className="font-bold text-sm">MiMo V2.5 Pro</div>
                              <div className={`text-[11px] ${glassMode ? 'text-slate-400/70' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>旗舰模型，131K上下文，思考模式</div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-400/20 text-orange-400 font-bold">旗舰</span>
                          </div>
                          <div className={`flex items-center justify-between p-3 rounded-xl ${glassMode ? 'bg-white/25' : darkMode ? 'bg-gray-600/50' : 'bg-white'}`}>
                            <div>
                              <div className="font-bold text-sm">MiMo V2.5</div>
                              <div className={`text-[11px] ${glassMode ? 'text-slate-400/70' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>均衡模型，32K上下文，思考模式</div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 font-bold">推荐</span>
                          </div>
                          <div className={`flex items-center justify-between p-3 rounded-xl ${glassMode ? 'bg-white/25' : darkMode ? 'bg-gray-600/50' : 'bg-white'}`}>
                            <div>
                              <div className="font-bold text-sm">MiMo V2 Flash</div>
                              <div className={`text-[11px] ${glassMode ? 'text-slate-400/70' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>极速响应，65K上下文，性价比高</div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500 font-bold">经济</span>
                          </div>
                        </div>
                      </div>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <h3 className="font-bold mb-2 text-base">5. API 端点配置</h3>
                        <div className={`text-sm space-y-2 ${glassMode ? 'text-slate-600' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          <div className={`p-2.5 rounded-lg font-mono text-xs ${darkMode ? 'bg-gray-600/50 text-green-400' : 'bg-gray-100 text-green-600'}`}>
                            OpenAI 格式：https://api.xiaomimimo.com/v1
                          </div>
                          <div className={`p-2.5 rounded-lg font-mono text-xs ${darkMode ? 'bg-gray-600/50 text-green-400' : 'bg-gray-100 text-green-600'}`}>
                            Anthropic 格式：https://api.xiaomimimo.com/anthropic
                          </div>
                          <p className={`text-[11px] ${glassMode ? 'text-slate-500' : darkMode ? 'text-gray-500' : 'text-gray-400'}`}>本应用端点填写：<code className="px-1 py-0.5 rounded text-[10px] bg-gray-200/50 dark:bg-gray-600/50">https://api.xiaomimimo.com/v1/chat/completions</code></p>
                        </div>
                      </div>
                      <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        <h3 className="font-bold mb-2 text-base">6. 官方文档</h3>
                        <div className="space-y-2">
                          <a href="https://platform.xiaomimimo.com/docs/zh-CN/quick-start/first-api-call" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-orange-400/10 text-orange-400 hover:bg-orange-400/20 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                            MiMo API 快速接入
                          </a>
                          <a href="https://platform.xiaomimimo.com/docs/zh-CN/api/chat/openai-api" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-orange-400/10 text-orange-400 hover:bg-orange-400/20 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                            OpenAI API 格式文档
                          </a>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {showUpdateLog && (
            <div className="absolute inset-0 z-50 flex items-end justify-center">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowUpdateLog(false)} />
              <div className={`relative w-full rounded-t-3xl shadow-2xl p-6 pb-8 transition-all max-h-[85vh] flex flex-col ${glassMode ? 'aurora-glass-card border-white/30' : darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className={`text-xl font-black ${glassMode ? 'text-slate-800' : ''}`}>更新日志</h2>
                  <button onClick={() => setShowUpdateLog(false)} className={`p-2 rounded-xl ${glassMode ? 'hover:bg-white/25 text-slate-500' : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4">
                  <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-500/20 text-purple-500">v1.4</span>
                      <span className="text-[10px] text-gray-400">最新版本</span>
                    </div>
                    <h3 className="font-bold mb-2">1.4 更新内容</h3>
                    <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
                      <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">●</span>新增AI自动调色功能，支持描RGB模式生成配色方案</li>
                      <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">●</span>新增AI工具模型独立配置，工具AI与助手AI可使用不同模型</li>
                      <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">●</span>新增开发者模式，一键配置测试模型</li>
                      <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">●</span>优化你画我猜局内UI：渐变顶栏、美化选项、结果、聊天界面</li>
                      <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">●</span>优化AI调色面板：支持组合色相最佳搭配、色号显示</li>
                      <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">●</span>优化颜色选取实时同步：拖动时预览和RGB数值实时更新</li>
                      <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">●</span>优化AI调色面板：支持组合色相最佳搭配、色号显示</li>
                      <li className="flex items-start gap-2"><span className="text-yellow-500 mt-0.5">●</span>修复AI调色需多次生成才显示结果的问题</li>
                      <li className="flex items-start gap-2"><span className="text-yellow-500 mt-0.5">●</span>修复删除所有API配置后工具模型选择器仍显示模型的问题</li>
                      <li className="flex items-start gap-2"><span className="text-yellow-500 mt-0.5">●</span>修复AI工具模型跨组件作用域引用错误</li>
                    </ul>
                  </div>
                  <div className={`p-4 rounded-2xl ${glassMode ? 'aurora-glass-input' : darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gray-500/20 text-gray-500">v1.3</span>
                    </div>
                    <h3 className="font-bold mb-2">1.3 更新内容</h3>
                    <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
                      <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">●</span>新增「你画我猜」多人联机模式，支持局域网房间创建与加入</li>
                      <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">●</span>新增画板自动保存功能，支持自定义保存间隔</li>
                      <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">●</span>新增「大胃袋」转盘预设，包含100+美食选项</li>
                      <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">●</span>新增深色模式切换动画，从按钮位置圆形扩散</li>
                      <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">●</span>新增更新日志功能，方便了解最新变化</li>
                      <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">●</span>优化画笔工具栏：竖向滑动条调节粗细(1-100px)</li>
                      <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">●</span>优化颜色选择：集成调色盘+快捷色板</li>
                      <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">●</span>优化骰子3D动画与纹理效果</li>
                      <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">●</span>优化加入房间按钮加载状态显示</li>
                      <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">●</span>优化昵称输入记忆功能</li>
                      <li className="flex items-start gap-2"><span className="text-yellow-500 mt-0.5">●</span>修复你画我猜回合结束与下一轮状态不同步问题</li>
                      <li className="flex items-start gap-2"><span className="text-yellow-500 mt-0.5">●</span>修复非房主画手选词后无法通知房主的问题</li>
                      <li className="flex items-start gap-2"><span className="text-yellow-500 mt-0.5">●</span>修复画手猜测判定错误的bug</li>
                      <li className="flex items-start gap-2"><span className="text-yellow-500 mt-0.5">●</span>修复移动端画布缩放颤动问题</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showOpenSource && (
            <div className="absolute inset-0 z-50 flex items-end justify-center">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowOpenSource(false)} />
              <div className={`relative w-full rounded-t-3xl shadow-2xl p-6 pb-8 transition-all max-h-[85vh] flex flex-col ${glassMode ? 'aurora-glass-card border-white/30' : darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className={`text-xl font-black ${glassMode ? 'text-slate-800' : ''}`}>开源使用说明</h2>
                  <button onClick={() => setShowOpenSource(false)} className={`p-2 rounded-xl ${glassMode ? 'hover:bg-white/25 text-slate-500' : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2.5">
                  {[
                    {
                      name: 'React',
                      author: 'Meta (Facebook)',
                      license: 'MIT',
                      url: 'https://react.dev',
                      color: '#61dafb'
                    },
                    {
                      name: 'Vite',
                      author: 'Evan You & Vite Team',
                      license: 'MIT',
                      url: 'https://vitejs.dev',
                      color: '#646cff'
                    },
                    {
                      name: 'Tailwind CSS',
                      author: 'Adam Wathan & Steve Schoger',
                      license: 'MIT',
                      url: 'https://tailwindcss.com',
                      color: '#06b6d4'
                    },
                    {
                      name: 'PeerJS',
                      author: 'PeerJS Community / Michelle Bu',
                      license: 'MIT',
                      url: 'https://peerjs.com',
                      color: '#ff6b00'
                    },
                    {
                      name: 'Tesseract.js',
                      author: 'Tesseract.js Community',
                      license: 'Apache-2.0',
                      url: 'https://tesseract.projectnaptha.com',
                      color: '#4a90d9'
                    },
                    {
                      name: 'Capacitor',
                      author: 'Ionic Team',
                      desc: '跨平台原生运行时，可Web 应用打包含4iOS/Android 原生应用。提供文件系统、分享、偏好设置等原生 API 桥接',
                      license: 'MIT',
                      url: 'https://capacitorjs.com',
                      color: '#119eff'
                    },
                    {
                      name: 'Lucide Icons',
                      author: 'Lucide Authors',
                      license: 'ISC',
                      url: 'https://lucide.dev',
                      color: '#a855f7'
                    },
                    {
                      name: 'backdrop-filter',
                      author: 'Apple / W3C CSS Working Group',
                      license: 'W3C Open Standard',
                      url: 'https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter',
                      color: '#ec4899'
                    },
                    {
                      name: 'react-liquid-glass-kit',
                      author: 'Divin DVM',
                      license: 'MIT',
                      url: 'https://www.npmjs.com/package/react-liquid-glass-kit',
                      color: '#06b6d4'
                    },
                    {
                      name: 'Mario-Level-1',
                      author: 'Justin Meister',
                      desc: '超级马里奥兄弟 Level 1 的 Python/pygame 实现，提供了关卡布局、碰撞检测和游戏逻辑参考',
                      license: 'MIT',
                      url: 'https://github.com/justinmeister/Mario-Level-1',
                      color: '#e52521'
                    },
                    {
                      name: 'react-tetris',
                      author: 'chvin',
                      desc: '基于 React/Redux 实现的俄罗斯方块，提供了方块旋转系统(SRS)、碰撞检测和游戏逻辑参考',
                      license: 'MIT',
                      url: 'https://github.com/chvin/react-tetris',
                      color: '#f0db4f'
                    }
                  ].map((lib, i) => (
                    <a key={i} href={lib.url} target="_blank" rel="noopener noreferrer" className={`block p-4 rounded-2xl transition-all ${darkMode ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'} group`}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm" style={{ backgroundColor: lib.color }}>
                          {lib.name.slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{lib.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-500'}`}>{lib.license}</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}><path d="M7 17L17 7M7 7l10 10"/></svg>
                          </div>
                          <div className={`text-[11px] mt-0.5 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`}>{lib.author}</div>
                          <p className={`text-[12px] mt-1.5 leading-relaxed ${glassMode ? 'text-slate-400/70' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{lib.desc}</p>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
                <div className={`mt-4 pt-3 border-t text-center text-[11px] ${darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                  本应用尊重并感谢所有开源贡献者的辛勤工作
                </div>
              </div>
            </div>
          )}

          {showBackupPanel && (
            <div className="absolute inset-0 z-50 flex items-end justify-center">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowBackupPanel(false)} />
              <div className={`relative w-full rounded-t-3xl shadow-2xl p-6 pb-8 transition-all max-h-[85vh] flex flex-col ${glassMode ? 'aurora-glass-card border-white/30' : darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-5">
                  <h2 className={`text-xl font-black ${glassMode ? 'text-slate-800' : ''}`}>存档备份</h2>
                  <button onClick={() => setShowBackupPanel(false)} className={`p-2 rounded-xl ${glassMode ? 'hover:bg-white/25 text-slate-500' : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                <div className="space-y-4">
                  <button
                    onClick={handleExportBackup}
                    className={`w-full flex items-center gap-4 p-5 rounded-2xl transition-all active:scale-[0.98] ${glassMode ? 'bg-sky-100/40 hover:bg-sky-100/60' : darkMode ? 'bg-gray-700/50 hover:bg-gray-600/50' : 'bg-gray-50 hover:bg-gray-100'}`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${glassMode ? 'bg-sky-400/20' : darkMode ? 'bg-sky-500/20' : 'bg-sky-100'}`}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={glassMode ? 'text-sky-600' : darkMode ? 'text-sky-400' : 'text-sky-500'}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </div>
                    <div className="text-left flex-1">
                      <div className={`font-bold text-base ${glassMode ? 'text-slate-800' : darkMode ? 'text-white' : 'text-gray-900'}`}>导出存档</div>
                      <div className={`text-xs mt-0.5 ${glassMode ? 'text-slate-500' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>将所有设置和游戏数据保存为备份文件</div>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={glassMode ? 'text-slate-400' : 'text-gray-400'}><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                  <button
                    onClick={handleImportBackup}
                    disabled={backupImporting}
                    className={`w-full flex items-center gap-4 p-5 rounded-2xl transition-all active:scale-[0.98] ${glassMode ? 'bg-emerald-100/40 hover:bg-emerald-100/60' : darkMode ? 'bg-gray-700/50 hover:bg-gray-600/50' : 'bg-gray-50 hover:bg-gray-100'}`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${glassMode ? 'bg-emerald-400/20' : darkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={glassMode ? 'text-emerald-600' : darkMode ? 'text-emerald-400' : 'text-emerald-500'}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                    <div className="text-left flex-1">
                      <div className={`font-bold text-base ${glassMode ? 'text-slate-800' : darkMode ? 'text-white' : 'text-gray-900'}`}>导入存档</div>
                      <div className={`text-xs mt-0.5 ${glassMode ? 'text-slate-500' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{backupImporting ? '正在导入...' : '从备份文件中恢复所有设置和游戏数据'}</div>
                    </div>
                    {backupImporting ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin text-emerald-500"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={glassMode ? 'text-slate-400' : 'text-gray-400'}><path d="m9 18 6-6-6-6"/></svg>
                    )}
                  </button>
                </div>
                <div className={`mt-4 pt-3 border-t text-center text-[11px] ${darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                  ⚠️ 导入存档将覆盖当前所有设置，并自动刷新页面
                </div>
              </div>
            </div>
          )}

          <div key={tab} className="flex-1 relative overflow-hidden animate-tab-fade">
            {tab === 'dice' && <DiceTab diceCount={diceCount} setDiceCount={setDiceCount} saveAll={saveAll} darkMode={darkMode} glassMode={glassMode} vibrate={vibrate} />}
            {tab === 'wheel' && (
              <WheelTab
                key={wheelKey}
                collections={collections}
                activeCollectionId={activeCollectionId}
                onSetActive={setActiveCollectionId}
                onUpdateCollections={setCollections}
                saveAll={saveAll}
                darkMode={darkMode}
                glassMode={glassMode}
                vibrate={vibrate}
                PROVINCE_PRESETS={PROVINCE_PRESETS}
                PROVINCE_PRESET_IDS={PROVINCE_PRESET_IDS}
              />
            )}
            {tab === 'number' && <NumberTab darkMode={darkMode} glassMode={glassMode} vibrate={vibrate} />}
            {tab === 'bomb' && <BombTab darkMode={darkMode} glassMode={glassMode} bombPlayerCount={bombPlayerCount} saveAll={saveAll} vibrate={vibrate} />}
            {tab === 'drawing' && showDrawingWorkspace && !forceDrawingRef.current && <DrawingWorkspace darkMode={darkMode} glassMode={glassMode} onNewCanvas={(w, h) => { setPendingCanvasSize({ w, h }); setPendingArtwork(null); drawingSessionActiveRef.current = true; forceDrawingRef.current = true; setShowDrawingWorkspace(false); }} onOpenArtwork={(art) => { setPendingArtwork(art); setPendingCanvasSize(null); drawingSessionActiveRef.current = true; forceDrawingRef.current = true; setShowDrawingWorkspace(false); }} />}
            {tab === 'drawing' && (!showDrawingWorkspace || forceDrawingRef.current) && <DrawingTab darkMode={darkMode} glassMode={glassMode} onGameModeChange={setInGameMode} showAiChat={showAiChat} setShowAiChat={setShowAiChat} cadMode={cadMode} setCadMode={setCadMode} onSwitchToGuessGame={() => {}} guessGameActivatorRef={guessGameActivatorRef} onGuessGameExit={() => { if (guessGameFromGamesRef.current) { guessGameFromGamesRef.current = false; setTab('games'); saveAll({ lastTab: 'games' }); } }} initialCanvasSize={pendingCanvasSize} artworkToLoad={pendingArtwork} onBackToWorkspace={() => { setPendingCanvasSize(null); setPendingArtwork(null); drawingSessionActiveRef.current = false; forceDrawingRef.current = false; setShowDrawingWorkspace(true); }} />}
            {tab === 'games' && <GamesTab darkMode={darkMode} glassMode={glassMode} onSwitchToDrawingGuess={() => { guessGameFromGamesRef.current = true; drawingSessionActiveRef.current = true; forceDrawingRef.current = true; setShowDrawingWorkspace(false); setPendingCanvasSize(null); setPendingArtwork(null); setTab('drawing'); saveAll({ lastTab: 'drawing' }); setTimeout(() => { if (guessGameActivatorRef.current) guessGameActivatorRef.current(true); }, 100); }} onGameModeChange={setInGameMode} />}
          </div>

          {!inGameMode && (
          <div className={`border-t flex pb-safe z-10 transition-colors duration-500 ${glassMode ? '' : darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`} style={glassMode ? { background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(24px) saturate(1.6)', borderTop: '1px solid rgba(255,255,255,0.2)' } : undefined}>
            <button onClick={() => { vibrate(10); setTab('dice'); saveAll({ lastTab: 'dice' }); }} className="flex-1 py-2.5 flex flex-col items-center gap-0.5 transition-all">
              <DicesIcon size={20} className={tab === 'dice' ? (glassMode ? 'text-sky-400' : 'text-blue-500') : 'text-gray-400'} />
              <span className={`text-[9px] font-semibold ${tab === 'dice' ? (glassMode ? 'text-sky-400' : 'text-blue-500') : 'text-gray-400 dark:text-gray-600'}`}>暴力骰子</span>
            </button>
            <button onClick={() => { vibrate(10); setTab('wheel'); setWheelKey(k => k + 1); saveAll({ lastTab: 'wheel' }); }} className="flex-1 py-2.5 flex flex-col items-center gap-0.5 transition-all">
              <WheelIcon size={20} className={tab === 'wheel' ? (glassMode ? 'text-purple-400' : 'text-purple-500') : 'text-gray-400'} />
              <span className={`text-[9px] font-semibold ${tab === 'wheel' ? (glassMode ? 'text-purple-400' : 'text-purple-500') : 'text-gray-400 dark:text-gray-600'}`}>暴力转盘</span>
            </button>
            <button onClick={() => { vibrate(10); setTab('bomb'); saveAll({ lastTab: 'bomb' }); }} className="flex-1 py-2.5 flex flex-col items-center gap-0.5 transition-all">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${tab === 'bomb' ? (glassMode ? 'text-orange-400' : 'text-orange-500') : 'text-gray-400'}`}>
                <rect transform="rotate(90 12 12)" x="3" y="5" width="18" height="14" rx="2"/>
                <line x1="8" y1="6" x2="8.01" y2="6"/>
                <line x1="16" y1="18" x2="16.01" y2="18"/>
                <path d="M12 16l-3-4 3-4 3 4z" fill="currentColor"/>
              </svg>
              <span className={`text-[9px] font-semibold ${tab === 'bomb' ? (glassMode ? 'text-orange-400' : 'text-orange-500') : 'text-gray-400 dark:text-gray-600'}`}>暴力翻牌</span>
            </button>
            <button onClick={() => { vibrate(10); setTab('number'); saveAll({ lastTab: 'number' }); }} className="flex-1 py-2.5 flex flex-col items-center gap-0.5 transition-all">
              <HashIcon size={20} className={tab === 'number' ? (glassMode ? 'text-violet-400' : 'text-purple-600') : 'text-gray-400'} />
              <span className={`text-[9px] font-semibold ${tab === 'number' ? (glassMode ? 'text-violet-400' : 'text-purple-600') : 'text-gray-400 dark:text-gray-600'}`}>暴力数字</span>
            </button>
            <button onClick={() => { vibrate(10); if (drawingSessionActiveRef.current) { setShowDrawingWorkspace(false); } else { setShowDrawingWorkspace(true); forceDrawingRef.current = false; setPendingCanvasSize(null); setPendingArtwork(null); } setTab('drawing'); saveAll({ lastTab: 'drawing' }); }} className="flex-1 py-2.5 flex flex-col items-center gap-0.5 transition-all relative">
              <BrushIcon size={20} className={tab === 'drawing' ? (glassMode ? 'text-teal-400' : 'text-teal-500') : 'text-gray-400'} />
              <span className={`text-[9px] font-semibold ${tab === 'drawing' ? (glassMode ? 'text-teal-400' : 'text-teal-500') : 'text-gray-400 dark:text-gray-600'}`}>暴力画板</span>
            </button>
            <button onClick={() => { vibrate(10); setTab('games'); saveAll({ lastTab: 'games' }); }} className="flex-1 py-2.5 flex flex-col items-center gap-0.5 transition-all">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={tab === 'games' ? (glassMode ? 'text-rose-400' : 'text-rose-500') : 'text-gray-400'}><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M12 8v4"/><path d="M10 10h4"/><circle cx="12" cy="16" r="1"/></svg>
              <span className={`text-[9px] font-semibold ${tab === 'games' ? (glassMode ? 'text-rose-400' : 'text-rose-500') : 'text-gray-400 dark:text-gray-600'}`}>游戏</span>
            </button>
          </div>
          )}

          {showGlassKeyDialog && (
            <div className="absolute inset-0 z-[60] flex items-center justify-center">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowGlassKeyDialog(false)} />
              <div className={`relative w-72 rounded-3xl shadow-2xl p-6 animate-fade-in ${glassMode ? 'aurora-glass-card border-white/30' : darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
                <div className="text-center mb-5">
                  <div className={`w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center ${glassMode ? 'bg-sky-100/40' : darkMode ? 'bg-gray-700' : 'bg-sky-50'}`}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={glassMode ? 'text-sky-600' : darkMode ? 'text-sky-400' : 'text-sky-500'}>
                      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                    </svg>
                  </div>
                  <h3 className={`text-lg font-black ${glassMode ? 'text-slate-800' : darkMode ? 'text-white' : 'text-gray-900'}`}>输入激活密钥</h3>
                  <p className={`text-xs mt-1 ${glassMode ? 'text-slate-500' : glassMode ? 'text-slate-400/70' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>请输入密钥以解锁隐藏功能</p>
                </div>
                <input
                  type="text"
                  value={glassKeyInput}
                  placeholder="请输入密钥..."
                  onKeyDown={(e) => { if (e.key === 'Enter') verifyGlassKey(); }}
                                    autoFocus
                  className={`w-full px-4 py-3 rounded-xl text-center text-lg font-mono tracking-widest outline-none transition-all ${glassKeyError ? 'animate-shake' : ''} ${glassMode ? 'aurora-glass-input text-slate-800 placeholder-slate-400' : darkMode ? 'bg-gray-700 border-2 border-gray-600 text-white placeholder-gray-500 focus:border-sky-500' : 'bg-gray-50 border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-sky-500'}`}
                />
                {glassKeyError && (
                  <p className="text-red-500 text-xs text-center mt-2 font-medium">密钥错误，请重试</p>
                )}
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => setShowGlassKeyDialog(false)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${glassMode ? 'aurora-glass-pill text-slate-600 hover:bg-white/35' : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    取消
                  </button>
                  <button
                    onClick={verifyGlassKey}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${glassMode ? 'aurora-glass-pill text-sky-600 hover:bg-white/40' : 'bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-600 hover:to-blue-700'}`}
                  >
                    确定
                  </button>
                </div>
              </div>
            </div>
          )}

          {showToast && (
            <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[250] px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold max-w-[80%] text-center animate-toast-in ${glassMode ? 'aurora-glass-card text-slate-800 border-white/30' : darkMode ? 'bg-gray-700 text-white border border-gray-600' : 'bg-white text-gray-900 border border-gray-100'}`}>
              {toastMessage}
            </div>
          )}

        </div>
      );
    }
