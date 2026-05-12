import { useRef, useEffect, useState, useCallback } from 'react';

const BASE = '/assets/syobon';
const T = 29;
const COLS = 17;
const SW = 480;
const SH = 420;
const GRAVITY = 1200;
const JUMP_VEL = -1200;
const MAX_WALK = 700;
const MAX_AIR = 500;
const WALK_ACCEL = 40;
const FRICTION = 2;
const FPS = 30;
const FRAME_MS = 1000 / FPS;

const S = {
  player_stand:   { sheet:'player', sx:124,sy:0,sw:30,sh:36 },
  player_walk1:   { sheet:'player', sx:31, sy:0,sw:30,sh:36 },
  player_walk2:   { sheet:'player', sx:62, sy:0,sw:30,sh:36 },
  player_jump:    { sheet:'player', sx:62, sy:0,sw:30,sh:36 },
  player_death:   { sheet:'player', sx:93, sy:0,sw:30,sh:36 },
  player_special: { sheet:'player', sx:0,  sy:0,sw:30,sh:36 },
  player_giant:   { sheet:'omake',  sx:50, sy:0,sw:51,sh:73 },

  brock_0:  { sheet:'brock', sx:0,  sy:0,sw:30,sh:30 },
  brock_1:  { sheet:'brock', sx:33, sy:0,sw:30,sh:30 },
  brock_2:  { sheet:'brock', sx:66, sy:0,sw:30,sh:30 },
  brock_3:  { sheet:'brock', sx:99, sy:0,sw:30,sh:30 },
  brock_4:  { sheet:'brock', sx:132,sy:0,sw:30,sh:30 },
  brock_5:  { sheet:'brock', sx:165,sy:0,sw:30,sh:30 },
  brock_6:  { sheet:'brock', sx:198,sy:0,sw:30,sh:30 },
  brock_7:  { sheet:'brock', sx:231,sy:0,sw:30,sh:30 },
  brock_8:  { sheet:'brock', sx:231,sy:0,sw:30,sh:30 },
  brock_row1_0: { sheet:'brock', sx:0,  sy:33,sw:30,sh:30 },
  brock_row1_1: { sheet:'brock', sx:33, sy:33,sw:30,sh:30 },
  brock_row1_2: { sheet:'brock', sx:66, sy:33,sw:30,sh:30 },
  brock_row1_6: { sheet:'brock', sx:198,sy:33,sw:30,sh:30 },
  brock_row2_0: { sheet:'brock', sx:0,  sy:66,sw:30,sh:30 },
  brock_row3_9: { sheet:'brock', sx:297,sy:99,sw:30,sh:30 },
  brock2_dropblock: { sheet:'brock2', sx:33,sy:0,sw:30,sh:30 },
  brock2_10:  { sheet:'brock2', sx:33, sy:33,sw:30,sh:30 },
  brock2_11:  { sheet:'brock2', sx:66, sy:33,sw:30,sh:30 },
  brock2_12:  { sheet:'brock2', sx:0,  sy:66,sw:30,sh:30 },
  brock2_13:  { sheet:'brock2', sx:33, sy:66,sw:30,sh:30 },
  brock2_14:  { sheet:'brock2', sx:66, sy:66,sw:30,sh:30 },

  item_mushroom: { sheet:'item', sx:0,  sy:0,sw:30,sh:30 },
  item_2:        { sheet:'item', sx:33, sy:0,sw:30,sh:30 },
  item_star:     { sheet:'item', sx:66, sy:0,sw:30,sh:30 },
  item_4:        { sheet:'item', sx:99, sy:0,sw:30,sh:30 },
  item_flower:   { sheet:'item', sx:132,sy:0,sw:30,sh:30 },
  item_6:        { sheet:'item', sx:165,sy:0,sw:30,sh:30 },
  item_coin:     { sheet:'item', sx:198,sy:0,sw:24,sh:27 },
  item_mushroomBlock: { sheet:'item', sx:33, sy:0,sw:30,sh:30 },
  item_flowerBlock:   { sheet:'item', sx:231,sy:0,sw:30,sh:30 },
  item_starBlock:     { sheet:'item', sx:99, sy:0,sw:30,sh:30 },
  item_coin10block:   { sheet:'item', sx:132,sy:0,sw:30,sh:30 },

  teki_goomba:   { sheet:'teki', sx:0,  sy:0,sw:30,sh:30 },
  teki_koopa:    { sheet:'teki', sx:33, sy:0,sw:30,sh:43 },
  teki_flykoopa: { sheet:'teki', sx:66, sy:0,sw:30,sh:30 },
  teki_squish:   { sheet:'teki', sx:99, sy:0,sw:30,sh:44 },
  teki_piranha:  { sheet:'teki', sx:132,sy:0,sw:33,sh:35 },
  teki_hammer:   { sheet:'teki', sx:199,sy:0,sw:32,sh:32 },
  teki_upside:   { sheet:'teki', sx:232,sy:0,sw:26,sh:30 },
  teki_spawn:    { sheet:'teki', sx:165,sy:0,sw:30,sh:30 },

  haikei_bgTile: { sheet:'haikei', sx:0,  sy:0, sw:150,sh:90 },
  haikei_cloud:  { sheet:'haikei', sx:151,sy:31,sw:70, sh:40 },
  haikei_bush:   { sheet:'haikei', sx:151,sy:72,sw:70, sh:40 },
  haikei_hill:   { sheet:'haikei', sx:0,  sy:91,sw:100,sh:90 },
  haikei_small1: { sheet:'haikei', sx:151,sy:0, sw:65, sh:29 },
  haikei_pipe:   { sheet:'haikei', sx:222,sy:0, sw:28, sh:60 },
  haikei_castle: { sheet:'haikei', sx:151,sy:143,sw:90,sh:40 },
  haikei_bgAlt:  { sheet:'haikei', sx:293,sy:0, sw:149,sh:90 },
  haikei_flag:   { sheet:'haikei', sx:40, sy:182,sw:40,sh:60 },

  omake_hiddenBlock: { sheet:'omake', sx:0,  sy:0, sw:49,sh:48 },
  omake_gameOverTxt: { sheet:'omake', sx:214,sy:0, sw:46,sh:16 },
  omake_flag:        { sheet:'omake', sx:50, sy:74,sw:49,sh:79 },
  omake_bossScene:   { sheet:'omake', sx:102,sy:66,sw:49,sh:59 },
  omake_bossEffect:  { sheet:'omake', sx:102,sy:0, sw:64,sh:63 },
  omake_star:        { sheet:'omake', sx:167,sy:0, sw:45,sh:45 },
  omake2_midBoss:    { sheet:'omake2',sx:0,  sy:0, sw:37,sh:55 },
  omake2_bigBoss:    { sheet:'omake2',sx:76, sy:0, sw:36,sh:50 },
  omake2_finalBoss:  { sheet:'omake2',sx:150,sy:0, sw:37,sh:47 },
};

const STAGE_1_1 = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,82,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,98,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,98,98,98,1,1,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,98,0,0,0,0,0,0,0,0,0,0,0,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,30,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,98,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,4,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,98,0,0,0,1,98,1,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,1,98,1,0,0,0,0,0,0,0,0,0,0,98,0,0,0,0,0,0,1,98,0,0,0,2,0,0,2,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,2,1,0,0,0,0,0,0,0,0,0,4,4,4,4,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,80,0,0,0,0,0,0,0,0,0,0,0,7,0,0,0,0,0,0,40,0,0,0,0,0,0,0,0,0,0,0,0,80,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,4,0,7,7,7,7,7,40,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,4,4,4,4,4,0,0,0,0,0,0,0,0,0,0,0,83,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,41,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,0,0,0,4,4,0,0,0,0,0,41,0,0,0,0,0,0,0,0,0,0,0,40,0,0,4,4,4,4,4,4,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,50,0,0,0,0,0,50,0,0,81,41,0,0,0,0,0,81,98,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,81,0,0,0,0,0,0,0,0,0,0,0,0,0,0,50,0,50,0,0,51,0,0,0,0,0,0,0,0,0,0,0,81,0,0,0,4,4,4,0,0,0,4,4,0,0,0,0,0,41,0,0,0,0,0,50,0,50,0,0,41,0,4,4,4,4,4,4,4,4,4,0,0,0,0,0,0,4,81,0,0,0,0,0,0,0,0,0],
  [5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,0,0,0,5,5,5,5,5,5,5,5,5,5,5,0,0,0,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,0,0,0,0,0,5,5,5,5,5,5,5,5,0,0,0,5,5,5,5,5,5,0,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,0,5,5,5,5,5,5,5],
  [6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,0,0,0,6,6,6,6,6,6,6,6,6,6,6,0,0,0,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,0,0,0,0,0,6,6,6,6,6,6,6,6,0,0,0,6,6,6,6,6,6,0,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,0,6,6,6,6,6,6,6,6,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

export default function SyobonGame({ onBack, darkMode }) {
  const canvasRef = useRef(null);
  const [gameScreen, setGameScreen] = useState('title');
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const gRef = useRef(null);
  const keysRef = useRef({});
  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);

  const initGame = useCallback(() => {
    const g = {
      px: 3 * T, py: 9 * T - 12,
      pvx: 0, pvy: 0,
      pw: 30, ph: 36,
      pDir: 1,
      pState: 'stand',
      pFrame: 0,
      pFrameTm: 0,
      pGrounded: false,
      pJumpTm: 0,
      pType: 0,
      pDead: false,
      pDeadTm: 0,
      pInvTm: 0,
      pGiant: false,
      scrollX: 0,
      blocks: [],
      enemies: [],
      items: [],
      effects: [],
      platforms: [],
      bgElements: [],
      pipes: [],
      score: 0,
      coins: 0,
      lives: 3,
      cameraX: 0,
      time: 400,
      timeTm: 0,
      levelComplete: false,
      deathAnim: 0,
      deathWait: 0,
      respawnTm: 0,
      stageColor: 0,
      currentBgm: null,
      loaded: false,
    };

    const stage = STAGE_1_1;
    for (let row = 0; row < stage.length; row++) {
      for (let col = 0; col < stage[row].length; col++) {
        const v = stage[row][col];
        const x = col * T;
        const y = row * T - 12;
        if (v >= 1 && v <= 8 && v !== 9) {
          g.blocks.push({ x, y, w: T, h: T, type: v, alive: true, hitTm: 0, btype: v });
        }
        if (v === 9) {
          g.items.push({ x, y, w: 24, h: 27, type: 'coin', alive: true, vy: -300, lifeTm: 30 });
        }
        if (v === 30) {
          g.blocks.push({ x, y: row * T - 12, w: T, h: T * 2, type: 'step', alive: true, btype: 30 });
        }
        if (v === 40) {
          g.bgElements.push({ x, y, w: 70, h: 40, type: 'cloud' });
        }
        if (v === 41) {
          g.platforms.push({ x, y, w: 70, h: 40, type: 'cloud_solid', alive: true });
        }
        if (v === 44) {
          g.blocks.push({ x, y: y + 7, w: T, h: T, type: 'ramp', alive: true, btype: 44 });
        }
        if (v === 50) {
          g.enemies.push({ x, y, w: 30, h: 30, type: 'goomba', vx: -150, alive: true, frame: 0, frameTm: 0, squishTm: 0 });
        }
        if (v === 51) {
          g.enemies.push({ x, y, w: 30, h: 30, type: 'spring', alive: true, triggered: false });
        }
        if (v === 80) {
          g.bgElements.push({ x, y, w: 70, h: 40, type: 'cloud' });
        }
        if (v === 81) {
          g.bgElements.push({ x, y, w: 70, h: 40, type: 'bush' });
        }
        if (v === 82) {
          g.blocks.push({ x, y, w: T, h: T, type: 'dropblock', alive: true, btype: 82, dropTm: 0, dropping: false, vy: 0 });
        }
        if (v === 83) {
          g.blocks.push({ x, y, w: 49, h: 48, type: 'hidden', alive: false, triggered: false, btype: 83 });
        }
        if (v === 98) {
          g.blocks.push({ x, y, w: T, h: T, type: 'coinbox', alive: true, btype: 98, hitTm: 0, coinCount: 1 });
        }
        if (v === 99) {
          g.blocks.push({ x, y, w: T, h: T * (COLS - row), type: 'wall', alive: true, btype: 99 });
        }
      }
    }

    g.blocks.push({ x: 8 * T, y: 9 * T - 12, w: T, h: T, type: 'mushroombox', alive: true, btype: 100, hitTm: 0 });
    g.blocks.push({ x: 13 * T, y: 9 * T - 12, w: T, h: T, type: 'starbox', alive: true, btype: 102, hitTm: 0 });
    g.blocks.push({ x: 14 * T, y: 5 * T - 12, w: T, h: T, type: 'coinbox', alive: true, btype: 101, hitTm: 0, coinCount: 1 });
    g.blocks.push({ x: 35 * T, y: 8 * T - 12, w: T, h: T, type: 'coinbox', alive: true, btype: 110, hitTm: 0, coinCount: 10 });
    g.blocks.push({ x: 47 * T, y: 9 * T - 12, w: T, h: T, type: 'brickcoin', alive: true, btype: 114, hitTm: 0 });
    g.blocks.push({ x: 59 * T, y: 9 * T - 12, w: T, h: T, type: 'coinbox', alive: true, btype: 112, hitTm: 0, coinCount: 10 });
    g.blocks.push({ x: 67 * T, y: 9 * T - 12, w: T, h: T, type: 'mushroombox', alive: true, btype: 104, hitTm: 0 });

    g.enemies.push({ x: 29 * T + 5, y: 9 * T - 12, w: 30, h: 30, type: 'goomba', vx: -150, alive: true, frame: 0, frameTm: 0, squishTm: 0 });
    g.enemies.push({ x: 49 * T, y: 5 * T - 12, w: 30, h: 30, type: 'koopa', vx: -150, alive: true, frame: 0, frameTm: 0, shell: false, shellVx: 0 });
    g.enemies.push({ x: 72 * T, y: 13 * T - 12, w: 30, h: 30, type: 'goomba', vx: -150, alive: true, frame: 0, frameTm: 0, squishTm: 0 });

    g.blocks.push({ x: 27 * T, y: 9 * T - 12, w: T, h: T, type: 'brick', alive: true, btype: 0, hitTm: 0 });
    g.blocks.push({ x: 103 * T, y: 5 * T - 12 + 10, w: 70, h: 40, type: 'bgcloud', alive: true, btype: 80 });

    return g;
  }, []);

  useEffect(() => {
    const g = initGame();
    gRef.current = g;
    setLives(g.lives);
    setScore(g.score);
    setCoins(g.coins);
  }, [initGame]);

  useEffect(() => {
    const handleDown = (e) => {
      keysRef.current[e.key] = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    };
    const handleUp = (e) => { keysRef.current[e.key] = false; };
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => { window.removeEventListener('keydown',handleDown); window.removeEventListener('keyup',handleUp); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const imgs = {};
    const auds = {};

    const imgFiles = ['player','brock','brock2','haikei','item','omake','omake2','teki','syobon3'];
    imgFiles.forEach(name => {
      const img = new Image();
      img.src = `${BASE}/res/${name}.PNG`;
      imgs[name] = img;
    });

    const seFiles = ['jump','brockbreak','coin','humi','koura','dokan','powerup','kirra','goal','death','brockcoin','brockkinoko','Pswitch','jumpBlock','hintBlock','4-clear','allclear','gameover'];
    seFiles.forEach(name => {
      auds[name] = { src: `${BASE}/se/${name}.ogg`, audio: null };
    });

    const bgmFiles = ['field','dungeon','star4','castle','puyo'];
    bgmFiles.forEach(name => {
      auds[`bgm_${name}`] = { src: `${BASE}/bgm/${name}.ogg`, audio: null, loop: true };
    });

    function getAudio(name) {
      const entry = auds[name];
      if (!entry) return null;
      if (!entry.audio) {
        entry.audio = new Audio(entry.src);
        entry.audio.volume = entry.loop ? 0.3 : 0.4;
        entry.audio.loop = !!entry.loop;
      }
      return entry.audio;
    }

    function playSE(name) {
      const a = getAudio(name);
      if (a) { try { a.currentTime=0; a.play(); } catch(e){} }
    }
    function playBGM(name) {
      const g = gRef.current; if(!g) return;
      const key=`bgm_${name}`;
      if(g.currentBgm===key) return;
      Object.keys(auds).forEach(k=>{
        if(k.startsWith('bgm_')){
          const a=getAudio(k);
          if(a){try{a.pause();a.currentTime=0;}catch(e){}}
        }
      });
      const a=getAudio(key);
      if(a){try{a.currentTime=0;a.play();}catch(e){}}
      g.currentBgm=key;
    }
    function stopBGM() {
      Object.keys(auds).forEach(k=>{
        if(k.startsWith('bgm_')){
          const a=getAudio(k);
          if(a){try{a.pause();a.currentTime=0;}catch(e){}}
        }
      });
      if(gRef.current) gRef.current.currentBgm=null;
    }

    function drawSprite(ctx, sprName, dx, dy, opts={}) {
      const s = S[sprName];
      if (!s) return false;
      const sheet = imgs[s.sheet];
      if (!sheet || !sheet.complete || sheet.naturalWidth===0) return false;
      ctx.save();
      if (opts.flip) {
        ctx.translate(dx+(opts.dw||s.sw), dy);
        ctx.scale(-1,1);
        ctx.drawImage(sheet, s.sx, s.sy, s.sw, s.sh, 0, 0, opts.dw||s.sw, opts.dh||s.sh);
      } else {
        ctx.drawImage(sheet, s.sx, s.sy, s.sw, s.sh, dx, dy, opts.dw||s.sw, opts.dh||s.sh);
      }
      ctx.restore();
      return true;
    }

    function rectsOverlap(a,b) { return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y; }

    function update(g, dt) {
      if (g.levelComplete || g.pDead) {
        if (g.pDead) {
          g.deathAnim += dt;
          if (g.deathAnim < 0.5) { g.pvy = -600; }
          else { g.pvy += GRAVITY*dt; }
          g.py += g.pvy * dt / 100;
          g.deathWait += dt;
          if (g.deathWait > 2.5) {
            g.lives--; setLives(g.lives);
            if (g.lives<=0) { setGameScreen('gameover'); stopBGM(); playSE('gameover'); }
            else { Object.assign(g,initGame()); g.lives=g.lives; }
          }
        }
        return;
      }

      const keys=keysRef.current;
      const left=keys['ArrowLeft']||keys['a']; const right=keys['ArrowRight']||keys['d'];
      const jump=keys['ArrowUp']||keys['z']||keys['Z']||keys[' '];

      if(left){g.pvx-=WALK_ACCEL;g.pDir=-1;} if(right){g.pvx+=WALK_ACCEL;g.pDir=1;}
      if(!left&&!right){
        if(g.pvx>0)g.pvx=Math.max(0,g.pvx-FRICTION*10); if(g.pvx<0)g.pvx=Math.min(0,g.pvx+FRICTION*10);
      }
      const maxSpd=g.pGrounded?MAX_WALK:MAX_AIR;
      g.pvx=Math.max(-maxSpd,Math.min(maxSpd,g.pvx));

      if(jump&&g.pGrounded&&g.pJumpTm<=0){g.pvy=JUMP_VEL;g.pGrounded=false;g.pJumpTm=10;playSE('jump');}
      if(jump&&g.pJumpTm>0&&g.pJumpTm<=8){g.pvy=JUMP_VEL*0.8;}
      if(!jump)g.pJumpTm=0;if(g.pJumpTm>0)g.pJumpTm--;

      g.pvy+=GRAVITY*dt;if(g.pvy>1200)g.pvy=1200;
      g.px+=g.pvx*dt/100;g.py+=g.pvy*dt/100;
      if(g.px<0)g.px=0;
      g.pGrounded=false;
      const pRect={x:g.px+2,y:g.py+2,w:g.pw-4,h:g.ph-4};

      for(const b of g.blocks){
        if(!b.alive)continue;
        const bRect={x:b.x,y:b.y,w:b.w,h:b.h};
        if(!rectsOverlap(pRect,bRect))continue;
        const ox=Math.min(pRect.x+pRect.w,bRect.x+bRect.w)-Math.max(pRect.x,bRect.x);
        const oy=Math.min(pRect.y+pRect.h,bRect.y+bRect.h)-Math.max(pRect.y,bRect.y);
        if(oy>0&&ox>0){
          if(g.pvy>0&&g.py+g.ph-b.y<15&&oy<ox){g.py=b.y-g.ph;g.pvy=0;g.pGrounded=true;
            if(b.type==='dropblock'&&!b.dropping){b.dropping=true;b.dropTm=15;}
          }else if(g.pvy<0&&b.y-g.py<15&&oy<ox){g.py=b.y+b.h;g.pvy=200;hitBlock(g,b);}
          else if(ox<oy){if(g.pvx>0)g.px=b.x-g.pw;if(g.pvx<0)g.px=b.x+b.w;g.pvx=0;}
        }
      }

      for(const p of g.platforms){
        if(!p.alive)continue;
        const pr={x:p.x,y:p.y,w:p.w,h:p.h};
        if(!rectsOverlap(pRect,pr))continue;
        if(g.pvy>=0&&g.py+g.ph-p.y<15){g.py=p.y-g.ph;g.pvy=0;g.pGrounded=true;}
      }

      for(const b of g.blocks){
        if(b.dropping){if(b.dropTm>0)b.dropTm--;else{b.vy=(b.vy||0)+GRAVITY*dt;b.y+=b.vy*dt/100;if(b.y>SH+100)b.alive=false;}}
      }

      for(const h of g.blocks){
        if(h.type==='hidden'&&!h.triggered&&!h.alive){
          const hr={x:h.x,y:h.y,w:h.w,h:h.h};
          if(rectsOverlap(pRect,hr)){h.triggered=true;h.alive=true;g.pvy=200;g.py=h.y+h.h;playSE('jumpBlock');}
        }
      }

      for(const e of g.enemies){
        if(!e.alive)continue;
        if(e.squishTm>0){e.squishTm-=dt*60;if(e.squishTm<=0)e.alive=false;continue;}
        e.x+=e.vx*dt/100;e.frameTm+=dt;if(e.frameTm>0.3){e.frameTm=0;e.frame=(e.frame+1)%2;}
        const er={x:e.x,y:e.y,w:e.w,h:e.h};
        if(rectsOverlap(pRect,er)){
          if(g.pvy>0&&g.py+g.ph-e.y<15){e.squishTm=20;e.vx=0;g.pvy=JUMP_VEL*0.6;g.score+=100;setScore(g.score);playSE('humi');}
          else if(g.pInvTm<=0)killPlayer(g);
        }
      }

      for(const it of g.items){
        if(!it.alive)continue;
        it.lifeTm-=dt*60;if(it.lifeTm<=0){it.alive=false;continue;}
        it.y+=it.vy*dt/100;it.vy+=800*dt;
        const ir={x:it.x,y:it.y,w:it.w,h:it.h};
        if(rectsOverlap(pRect,ir)){
          it.alive=false;
          if(it.type==='coin'){g.coins++;g.score+=200;setCoins(g.coins);setScore(g.score);playSE('coin');}
          if(it.type==='mushroom'){g.pGiant=true;g.ph=73;g.py-=37;g.score+=1000;setScore(g.score);playSE('powerup');}
          if(it.type==='star'){g.pInvTm=600;playSE('powerup');}
        }
      }

      for(const fx of g.effects){fx.lifeTm-=dt*60;fx.x+=fx.vx*dt/100;fx.y+=fx.vy*dt/100;fx.vy+=800*dt;}
      g.effects=g.effects.filter(fx=>fx.lifeTm>0);

      if(g.pInvTm>0)g.pInvTm-=dt*60;
      if(g.py>SH+50)killPlayer(g);
      g.timeTm+=dt;if(g.timeTm>=1){g.timeTm=0;g.time--;if(g.time<=0)killPlayer(g);}

      const targetCam=g.px-SW/3;
      g.cameraX=Math.max(g.cameraX,targetCam);g.cameraX=Math.max(0,g.cameraX);

      if(g.pGrounded){if(Math.abs(g.pvx)>10)g.pState='walk';else g.pState='stand';}
      else{g.pState=g.pvy<0?'jump':'fall';}
      g.pFrameTm+=dt;if(g.pFrameTm>0.15){g.pFrameTm=0;g.pFrame=(g.pFrame+1)%4;}
    }

    function hitBlock(g,b){
      if(b.hitTm>0)return;b.hitTm=10;
      if(b.type==='mushroombox'||b.type==='coinbox'||b.type==='starbox'){
        if(b.type==='mushroombox'){g.items.push({x:b.x,y:b.y-30,w:30,h:30,type:'mushroom',alive:true,vy:-200,lifeTm:300});playSE('brockkinoko');}
        else if(b.type==='starbox'){g.items.push({x:b.x,y:b.y-30,w:30,h:30,type:'star',alive:true,vy:-400,lifeTm:600});playSE('powerup');}
        else{g.items.push({x:b.x+7,y:b.y-16,w:24,h:27,type:'coin',alive:true,vy:-400,lifeTm:30});g.coins++;g.score+=200;setCoins(g.coins);setScore(g.score);playSE('brockcoin');}
        b.type='emptybox';
      }else if(b.type==='brick'||b.type==='brickcoin'){
        b.alive=false;
        for(let i=0;i<4;i++)g.effects.push({x:b.x+(i%2)*15,y:b.y+Math.floor(i/2)*15,w:8,h:8,vx:(i%2===0?-100:100)+Math.random()*50,vy:-300-Math.random()*200,lifeTm:40,color:'#C84C0C'});
        playSE('brockbreak');
      }else{playSE('jumpBlock');}
    }

    function killPlayer(g){if(g.pDead)return;if(g.pInvTm>0)return;g.pDead=true;g.pvy=-600;g.deathAnim=0;g.deathWait=0;g.pState='death';stopBGM();playSE('death');}

    function render(ctx,g){
      const cam=g.cameraX;
      ctx.fillStyle='#5C94FC';ctx.fillRect(0,0,SW,SH);

      // Background tile from haikei.png at (0,0,150,90)
      const bgS=S.haikei_bgTile;
      if(imgs.haikei&&imgs.haikei.complete&&imgs.haikei.naturalWidth>0){
        for(let bx=-1;bx<SW/bgS.sw+3;bx++){
          const off=(cam*0.25)%(bgS.sw*0.8);
          ctx.drawImage(imgs.haikei,bgS.sx,bgS.sy,bgS.sw,bgS.sh,bx*bgS.sw*0.8-off,SH-bgS.sh-60-bgS.sh*0.8,bgS.sw*0.8,bgS.sh*0.8);
        }
      }

      // Background elements (clouds/bushes/hills from haikei.png)
      for(const bg of g.bgElements){
        const sx=bg.x-cam;
        if(sx>SW+100||sx+bg.w<-100)continue;
        if(bg.type==='cloud'){drawSprite(ctx,'haikei_cloud',sx,bg.y);}
        else if(bg.type==='bush'){drawSprite(ctx,'haikei_bush',sx,bg.y);}
      }

      // Blocks - use correct sprite frames
      for(const b of g.blocks){
        if(!b.alive&&b.type!=='hidden')continue;
        const sx=b.x-cam;
        if(sx>SW+50||sx+b.w<-50)continue;
        const by=b.y+(b.hitTm>0?-4:0);
        if(b.hitTm>0)b.hitTm--;

        let drew=false;
        if(b.type==='emptybox'){drew=drawSprite(ctx,'brock_row1_6',sx,by);}
        else if(b.type==='mushroombox'){drew=drawSprite(ctx,'brock_7',sx,by);}
        else if(b.type==='starbox'){drew=drawSprite(ctx,'brock_5',sx,by);}
        else if(b.type==='coinbox'){drew=drawSprite(ctx,'brock_4',sx,by);}
        else if(b.type==='brick'||b.type==='brickcoin'){drew=drawSprite(ctx,'brock_0',sx,by);}
        else if(b.type==='dropblock'){drew=drawSprite(ctx,'brock2_dropblock',sx,by);}
        else if(b.type==='hidden'&&b.triggered){drew=drawSprite(ctx,'omake_hiddenBlock',sx,by,{dw:49,dh:48});}
        else if(b.type==='step'){drew=drawSprite(ctx,'brock_row2_0',sx,by);}
        else if(b.type==='wall'){drew=drawSprite(ctx,'brock_0',sx,by);}
        else if(b.type==='bgcloud'){drew=drawSprite(ctx,'haikei_cloud',sx,b.y);}
        else if(b.type>=1&&b.type<=8){drew=drawSprite(ctx,`brock_${Math.min(b.type,7)}`,sx,by);}

        if(!drew){
          ctx.fillStyle='#886644';ctx.fillRect(sx,by,b.w,b.h);ctx.strokeStyle='#664422';ctx.strokeRect(sx,by,b.w,b.h);
        }
      }

      // Platforms (solid clouds)
      for(const p of g.platforms){
        if(!p.alive)continue;
        const sx=p.x-cam;
        if(sx>SW+50||sx+p.w<-50)continue;
        drawSprite(ctx,'haikei_cloud',sx,p.y);
      }

      // Enemies - use teki.png sprites
      for(const e of g.enemies){
        if(!e.alive)continue;
        const sx=e.x-cam;
        if(sx>SW+50||sx+e.w<-50)continue;

        if(e.squishTm>0){
          drawSprite(ctx,'teki_squish',sx,e.y+e.h-44);
          continue;
        }

        if(e.type==='goomba'){
          const f=e.frame===0?'teki_goomba':'teki_goomba';
          drawSprite(ctx,f,sx,e.y,{flip:e.vx<0});
        }else if(e.type==='koopa'){
          drawSprite(ctx,'teki_koopa',sx,e.y,{flip:e.vx<0});
        }else if(e.type==='spring'){
          ctx.fillStyle='#FFD700';ctx.fillRect(sx,e.y+10,30,20);ctx.fillStyle='#FF4444';ctx.fillRect(sx+5,e.y,20,15);
        }
      }

      // Items - use item.png sprites
      for(const it of g.items){
        if(!it.alive)continue;
        const sx=it.x-cam;
        if(sx>SW+50||sx+it.w<-50)continue;
        if(it.type==='coin'){drawSprite(ctx,'item_coin',sx,it.y);}
        else if(it.type==='mushroom'){drawSprite(ctx,'item_mushroom',sx,it.y);}
        else if(it.type==='star'){drawSprite(ctx,'item_star',sx,it.y);}
      }

      // Effects (brick particles)
      for(const fx of g.effects){ctx.fillStyle=fx.color;ctx.fillRect(fx.x-cam,fx.y,fx.w,fx.h);}

      // Player - use player.png sprites
      if(!g.pDead||g.deathWait<2.5){
        const sx=g.px-cam;
        const flip=g.pDir<0;
        let sprName='player_stand';
        if(g.pState==='walk')sprName=g.pFrame%2===0?'player_stand':'player_walk1';
        else if(g.pState==='jump'||g.pState==='fall')sprName='player_jump';
        else if(g.pState==='death')sprName='player_death';

        if(g.pInvTm>0&&Math.floor(g.pInvTm)%4<2){}
        else if(g.pGiant){drawSprite(ctx,'player_giant',sx,g.py,{flip});}
        else{
          const drew=drawSprite(ctx,sprName,sx,g.py,{flip});
          if(!drew){
            ctx.fillStyle=g.pInvTm>0?'#FFD700':'#FF4444';ctx.fillRect(sx+4,g.py+2,g.pw-8,g.ph-4);
            ctx.fillStyle='#FFE4B5';ctx.fillRect(sx+8,g.py+4,14,12);
            ctx.fillStyle='#000';const ex=g.pDir>0?sx+16:sx+10;ctx.fillRect(ex,g.py+8,4,4);
          }
        }
      }

      // HUD
      ctx.fillStyle='#fff';ctx.font='bold 14px monospace';ctx.textAlign='left';
      ctx.fillText(`SCORE ${String(g.score).padStart(6,'0')}`,10,20);
      ctx.fillText(`COINS ×${String(g.coins).padStart(2,'0')}`,170,20);
      ctx.fillText(`WORLD 1-1`,310,20);
      ctx.fillText(`TIME ${g.time}`,420,20);
      ctx.fillText(`LIVES ×${g.lives}`,10,38);
    }

    function renderTitle(ctx){
      ctx.fillStyle='#5C94FC';ctx.fillRect(0,0,SW,SH);
      if(imgs.syobon3&&imgs.syobon3.complete&&imgs.syobon3.naturalWidth>0){
        const sc=Math.min(SW/imgs.syobon3.naturalWidth,SH/imgs.syobon3.naturalHeight)*0.75;
        ctx.drawImage(imgs.syobon3,(SW-imgs.syobon3.naturalWidth*sc)/2,(SH-imgs.syobon3.naturalHeight*sc)/2-30,imgs.syobon3.naturalWidth*sc,imgs.syobon3.naturalHeight*sc);
      }
      ctx.fillStyle='#fff';ctx.font='bold 18px monospace';ctx.textAlign='center';
      ctx.fillText('しょぼんのアクション',SW/2,55);
      ctx.font='13px monospace';ctx.fillText('猫里奥 / Syobon Action',SW/2,78);
      ctx.font='bold 15px monospace';ctx.fillStyle='#FFD700';
      ctx.fillText('按 Z / 空格 开始游戏',SW/2,SH-55);
      ctx.fillStyle='#aaa';ctx.font='11px monospace';ctx.fillText('← → 移动  ↑/Z 跳跃',SW/2,SH-28);
    }

    function renderGameOver(ctx){
      ctx.fillStyle='#000';ctx.fillRect(0,0,SW,SH);
      ctx.fillStyle='#fff';ctx.font='bold 24px monospace';ctx.textAlign='center';
      ctx.fillText('GAME OVER',SW/2,SH/2-20);
      ctx.font='14px monospace';ctx.fillStyle='#aaa';
      ctx.fillText('按 Z / 空格 重新开始',SW/2,SH/2+30);
    }

    function gameLoop(timestamp){
      if(!lastTimeRef.current)lastTimeRef.current=timestamp;
      const elapsed=timestamp-lastTimeRef.current;
      if(elapsed>=FRAME_MS){
        lastTimeRef.current=timestamp-(elapsed%FRAME_MS);
        const dt=FRAME_MS/1000;
        const g=gRef.current;
        ctx.imageSmoothingEnabled=false;
        if(gameScreen==='title'){renderTitle(ctx);if(keysRef.current['z']||keysRef.current['Z']||keysRef.current[' ']){setGameScreen('playing');playBGM('field');}}
        else if(gameScreen==='playing'){update(g,dt);render(ctx,g);}
        else if(gameScreen==='gameover'){renderGameOver(ctx);if(keysRef.current['z']||keysRef.current['Z']||keysRef.current[' ']){Object.assign(g,initGame());setGameScreen('playing');playBGM('field');}}
      }
      rafRef.current=requestAnimationFrame(gameLoop);
    }

    rafRef.current=requestAnimationFrame(gameLoop);
    return ()=>{if(rafRef.current)cancelAnimationFrame(rafRef.current);stopBGM();}
  },[gameScreen,initGame]);

  const handleTouchBtn=useCallback((key,down)=>{keysRef.current[key]=down;},[]);

  return (
    <div className="flex flex-col items-center w-full h-full bg-black select-none">
      <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden" style={{maxHeight:'calc(100%-120px)'}}>
        <canvas ref={canvasRef} width={SW} height={SH} className="block" style={{imageRendering:'pixelated',maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}}/>
        <button onClick={onBack} className="absolute top-2 left-2 z-10 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-black/50 hover:bg-black/70 active:scale-95 transition-all">← 返回</button>
      </div>
      <div className="w-full flex-shrink-0 bg-gray-900/90 backdrop-blur-sm border-t border-white/10 px-4 py-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex gap-2">
            <button onPointerDown={()=>handleTouchBtn('ArrowLeft',true)} onPointerUp={()=>handleTouchBtn('ArrowLeft',false)} onPointerLeave={()=>handleTouchBtn('ArrowLeft',false)} className="w-14 h-14 rounded-xl bg-gray-700/80 text-white text-2xl font-bold flex items-center justify-center active:bg-gray-600 active:scale-95 transition-all">◀</button>
            <button onPointerDown={()=>handleTouchBtn('ArrowRight',true)} onPointerUp={()=>handleTouchBtn('ArrowRight',false)} onPointerLeave={()=>handleTouchBtn('ArrowRight',false)} className="w-14 h-14 rounded-xl bg-gray-700/80 text-white text-2xl font-bold flex items-center justify-center active:bg-gray-600 active:scale-95 transition-all">▶</button>
          </div>
          <div className="flex gap-2">
            <button onPointerDown={()=>handleTouchBtn('z',true)} onPointerUp={()=>handleTouchBtn('z',false)} onPointerLeave={()=>handleTouchBtn('z',false)} className="w-14 h-14 rounded-full bg-red-600/80 text-white text-sm font-bold flex items-center justify-center active:bg-red-500 active:scale-95 transition-all">A</button>
            <button onPointerDown={()=>handleTouchBtn('ArrowUp',true)} onPointerUp={()=>handleTouchBtn('ArrowUp',false)} onPointerLeave={()=>handleTouchBtn('ArrowUp',false)} className="w-14 h-14 rounded-full bg-blue-600/80 text-white text-sm font-bold flex items-center justify-center active:bg-blue-500 active:scale-95 transition-all">B</button>
          </div>
        </div>
      </div>
    </div>
  );
}
