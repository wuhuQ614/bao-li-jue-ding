import React, { useEffect, useRef, useState, useCallback } from 'react';

const SCREEN_W = 800;
const SCREEN_H = 600;
const GROUND_HEIGHT = SCREEN_H - 62;
const SIZE_MULT = 2.5;
const BRICK_MULT = 2.69;
const BG_MULT = 2.679;

const GRAVITY = 1.01;
const JUMP_GRAVITY = 0.31;
const JUMP_VEL = -10;
const MAX_Y_VEL = 11;
const WALK_ACCEL = 0.15;
const RUN_ACCEL = 0.3;
const SMALL_TURNAROUND = 0.35;
const MAX_WALK_SPEED = 6;
const MAX_RUN_SPEED = 10;

const STAND = 'standing';
const WALK = 'walk';
const JUMP = 'jump';
const FALL = 'fall';
const DEATH_JUMP = 'death jump';
const SMALL_TO_BIG = 'small to big';
const BIG_TO_FIRE = 'big to fire';
const BIG_TO_SMALL = 'big to small';
const FLAGPOLE = 'flag pole';
const BOTTOM_OF_POLE = 'bottom of pole';
const WALKING_TO_CASTLE = 'walking to castle';
const END_OF_LEVEL_FALL = 'end of level fall';

const JUMPED_ON = 'jumped on';
const SHELL_SLIDE = 'shell slide';

const NOT_FROZEN = 'not frozen';
const FROZEN = 'frozen';
const IN_CASTLE = 'in castle';
const FLAG_AND_FIREWORKS = 'flag and fireworks';

const GOOMBA = 'goomba';
const KOOPA = 'koopa';
const LEFT = 'left';
const RIGHT = 'right';
const MUSHROOM = 'mushroom';
const FIREFLOWER = 'fireflower';
const STAR = 'star';
const COIN = 'coin';
const LIFE_MUSHROOM = '1up_mushroom';
const FIREBALL = 'fireball';
const SIXCOINS = '6coins';

const BASE_PATH = 'assets/mario';
const COLORKEY = [92, 148, 252];

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function getFrame(img, x, y, w, h, mult) {
  const c = document.createElement('canvas');
  c.width = Math.round(w * mult);
  c.height = Math.round(h * mult);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, x, y, w, h, 0, 0, c.width, c.height);
  return c;
}

function flipFrameH(canvas) {
  const c = document.createElement('canvas');
  c.width = canvas.width;
  c.height = canvas.height;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.translate(c.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(canvas, 0, 0);
  return c;
}

function makeTextChar(img, x, y, w, h) {
  const c = document.createElement('canvas');
  c.width = Math.round(w * 2.9);
  c.height = Math.round(h * 2.9);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, x, y, w, h, 0, 0, c.width, c.height);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  const ndata = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] === COLORKEY[0] && data[i + 1] === COLORKEY[1] && data[i + 2] === COLORKEY[2]) {
      ndata[i] = 0; ndata[i + 1] = 0; ndata[i + 2] = 0; ndata[i + 3] = 0;
    } else { ndata[i] = data[i]; ndata[i + 1] = data[i + 1]; ndata[i + 2] = data[i + 2]; ndata[i + 3] = 255; }
  }
  ctx.putImageData(new ImageData(ndata, c.width, c.height), 0, 0);
  return c;
}

function MarioGame({ onBack, darkMode }) {
  const canvasRef = useRef(null);
  const levelRef = useRef(null);
  const animRef = useRef(null);
  const assetsRef = useRef(null);
  const loopStarterRef = useRef(null);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [lives, setLives] = useState(3);
  const [time, setTime] = useState(400);
  const [gameState, setGameState] = useState('loading');
  const [message, setMessage] = useState('');
  const stateRef = useRef('loading');

  const loadAssets = useCallback(async () => {
    const names = [
      'mario_bros', 'tile_set', 'smb_enemies_sheet', 'item_objects',
      'level_1', 'text_images', 'title_screen',
    ];
    const imgs = {};
    for (const n of names) {
      imgs[n] = await loadImage(`${BASE_PATH}/graphics/${n}.png`);
    }

    const mImg = imgs.mario_bros;
    const mkF = (x, y, w, h) => ({ canvas: getFrame(mImg, x, y, w, h, SIZE_MULT), w: Math.round(w * SIZE_MULT), h: Math.round(h * SIZE_MULT) });
    const mkFL = (frames) => frames.map(f => ({ canvas: flipFrameH(f.canvas), w: f.w, h: f.h }));

    const rSmallNorm = [
      mkF(178, 32, 12, 16), mkF(80, 32, 15, 16), mkF(96, 32, 16, 16),
      mkF(112, 32, 16, 16), mkF(144, 32, 16, 16), mkF(130, 32, 14, 16),
      mkF(160, 32, 15, 16), mkF(320, 8, 16, 24), mkF(241, 33, 16, 16),
      mkF(194, 32, 12, 16), mkF(210, 33, 12, 16),
    ];
    const rBigNorm = [
      mkF(176, 0, 16, 32), mkF(81, 0, 16, 32), mkF(97, 0, 15, 32),
      mkF(113, 0, 15, 32), mkF(144, 0, 16, 32), mkF(128, 0, 16, 32),
      mkF(336, 0, 16, 32), mkF(160, 10, 16, 22), mkF(272, 2, 16, 29),
      mkF(193, 2, 16, 30), mkF(209, 2, 16, 29),
    ];
    const rFire = [
      mkF(176, 48, 16, 32), mkF(81, 48, 16, 32), mkF(97, 48, 15, 32),
      mkF(113, 48, 15, 32), mkF(144, 48, 16, 32), mkF(128, 48, 16, 32),
      mkF(336, 48, 16, 32), mkF(160, 58, 16, 22), mkF(0, 0, 1, 1),
      mkF(193, 50, 16, 29), mkF(209, 50, 16, 29),
    ];
    const rSmallGreen = [
      mkF(178, 224, 12, 16), mkF(80, 224, 15, 16), mkF(96, 224, 16, 16),
      mkF(112, 224, 15, 16), mkF(144, 224, 16, 16), mkF(130, 224, 14, 16),
    ];
    const rSmallRed = [
      mkF(178, 272, 12, 16), mkF(80, 272, 15, 16), mkF(96, 272, 16, 16),
      mkF(112, 272, 15, 16), mkF(144, 272, 16, 16), mkF(130, 272, 14, 16),
    ];
    const rSmallBlack = [
      mkF(178, 176, 12, 16), mkF(80, 176, 15, 16), mkF(96, 176, 16, 16),
      mkF(112, 176, 15, 16), mkF(144, 176, 16, 16), mkF(130, 176, 14, 16),
    ];
    const rBigGreen = [
      mkF(176, 192, 16, 32), mkF(81, 192, 16, 32), mkF(97, 192, 15, 32),
      mkF(113, 192, 15, 32), mkF(144, 192, 16, 32), mkF(128, 192, 16, 32),
      mkF(336, 192, 16, 32), mkF(160, 202, 16, 22),
    ];
    const rBigRed = [
      mkF(176, 240, 16, 32), mkF(81, 240, 16, 32), mkF(97, 240, 15, 32),
      mkF(113, 240, 15, 32), mkF(144, 240, 16, 32), mkF(128, 240, 16, 32),
      mkF(336, 240, 16, 32), mkF(160, 250, 16, 22),
    ];
    const rBigBlack = [
      mkF(176, 144, 16, 32), mkF(81, 144, 16, 32), mkF(97, 144, 15, 32),
      mkF(113, 144, 15, 32), mkF(144, 144, 16, 32), mkF(128, 144, 16, 32),
      mkF(336, 144, 16, 32), mkF(160, 154, 16, 22),
    ];

    const tImg = imgs.tile_set;
    const tiles = {
      brick: getFrame(tImg, 16, 0, 16, 16, BRICK_MULT),
      brick_opened: getFrame(tImg, 432, 0, 16, 16, BRICK_MULT),
      coin_box_0: getFrame(tImg, 384, 0, 16, 16, BRICK_MULT),
      coin_box_1: getFrame(tImg, 400, 0, 16, 16, BRICK_MULT),
      coin_box_2: getFrame(tImg, 416, 0, 16, 16, BRICK_MULT),
      coin_box_3: getFrame(tImg, 432, 0, 16, 16, BRICK_MULT),
    };

    const eImg = imgs.smb_enemies_sheet;
    const enemies = {
      goomba_0: getFrame(eImg, 0, 4, 16, 16, SIZE_MULT),
      goomba_1: getFrame(eImg, 30, 4, 16, 16, SIZE_MULT),
      goomba_flat: getFrame(eImg, 61, 0, 16, 16, SIZE_MULT),
      koopa_0: getFrame(eImg, 150, 0, 16, 24, SIZE_MULT),
      koopa_1: getFrame(eImg, 180, 0, 16, 24, SIZE_MULT),
      koopa_shell: getFrame(eImg, 360, 5, 16, 15, SIZE_MULT),
    };

    const itImg = imgs.item_objects;
    const items = {
      mushroom: getFrame(itImg, 184, 34, 16, 16, SIZE_MULT),
      star_0: getFrame(itImg, 1, 1, 14, 14, SIZE_MULT),
      star_1: getFrame(itImg, 30, 0, 16, 16, SIZE_MULT),
      star_2: getFrame(itImg, 47, 0, 16, 16, SIZE_MULT),
      star_3: getFrame(itImg, 64, 0, 16, 16, SIZE_MULT),
      fireflower_0: getFrame(itImg, 0, 30, 16, 16, SIZE_MULT),
      fireflower_1: getFrame(itImg, 17, 30, 16, 16, SIZE_MULT),
      fireflower_2: getFrame(itImg, 34, 30, 16, 16, SIZE_MULT),
      fireflower_3: getFrame(itImg, 51, 30, 16, 16, SIZE_MULT),
      coin_0: getFrame(itImg, 3, 115, 10, 14, SIZE_MULT),
      coin_1: getFrame(itImg, 20, 114, 8, 14, SIZE_MULT),
      coin_2: getFrame(itImg, 35, 114, 8, 14, SIZE_MULT),
      coin_3: getFrame(itImg, 50, 114, 8, 14, SIZE_MULT),
      oneup: getFrame(itImg, 55, 50, 16, 16, SIZE_MULT),
      fireball_0: getFrame(itImg, 96, 145, 8, 8, SIZE_MULT),
      fireball_1: getFrame(itImg, 104, 145, 8, 8, SIZE_MULT),
      brick_piece_left: getFrame(itImg, 68, 20, 8, 8, SIZE_MULT),
      brick_piece_right: getFrame(itImg, 76, 20, 8, 8, SIZE_MULT),
    };

    const bgScale = (() => {
      const c = document.createElement('canvas');
      c.width = Math.round(imgs.level_1.width * BG_MULT);
      c.height = Math.round(imgs.level_1.height * BG_MULT);
      const cc = c.getContext('2d');
      cc.imageSmoothingEnabled = false;
      cc.drawImage(imgs.level_1, 0, 0, c.width, c.height);
      return c;
    })();

    const txImg = imgs.text_images;
    const text = {};
    const charPositions = [
      [3,230,7,7],[12,230,7,7],[19,230,7,7],[27,230,7,7],[35,230,7,7],[43,230,7,7],[51,230,7,7],[59,230,7,7],[67,230,7,7],[75,230,7,7],
      [83,230,7,7],[91,230,7,7],[99,230,7,7],[107,230,7,7],[115,230,7,7],[123,230,7,7],[3,238,7,7],[11,238,7,7],[20,238,7,7],[27,238,7,7],
      [35,238,7,7],[44,238,7,7],[51,238,7,7],[59,238,7,7],[67,238,7,7],[75,238,7,7],[83,238,7,7],[91,238,7,7],[99,238,7,7],[108,238,7,7],
      [115,238,7,7],[123,238,7,7],[3,246,7,7],[11,246,7,7],[20,246,7,7],[27,246,7,7],[48,248,7,7],[68,249,6,2],[75,247,6,6],
    ];
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ -*';
    for (let i = 0; i < chars.length; i++) {
      const [x, y, w, h] = charPositions[i];
      text[chars[i]] = makeTextChar(txImg, x, y, w, h);
    }

    const sfx = {};
    const soundFiles = {
      coin:'coin.ogg', bump:'bump.ogg', stomp:'stomp.ogg', kick:'kick.ogg',
      brick_smash:'brick_smash.ogg', powerup:'powerup.ogg', powerup_appears:'powerup_appears.ogg',
      small_jump:'small_jump.ogg', big_jump:'big_jump.ogg', fireball:'fireball.ogg',
      pipe:'pipe.ogg', one_up:'one_up.ogg', count_down:'count_down.ogg',
    };
    for (const [k, v] of Object.entries(soundFiles)) {
      const pool = [];
      for (let i = 0; i < 2; i++) {
        const a = new Audio(`${BASE_PATH}/sound/${v}`);
        a.preload = 'metadata';
        a.volume = 0.5;
        pool.push(a);
      }
      sfx[k] = pool;
    }

    return {
      mario: {
        right_small_normal_canvas: rSmallNorm,
        right_small_normal_left: mkFL(rSmallNorm),
        right_big_normal_canvas: rBigNorm,
        right_big_normal_left: mkFL(rBigNorm),
        right_fire_canvas: rFire,
        right_fire_left: mkFL(rFire),
        right_small_green_canvas: rSmallGreen,
        right_small_green_left: mkFL(rSmallGreen),
        right_small_red_canvas: rSmallRed,
        right_small_red_left: mkFL(rSmallRed),
        right_small_black_canvas: rSmallBlack,
        right_small_black_left: mkFL(rSmallBlack),
        right_big_green_canvas: rBigGreen,
        right_big_green_left: mkFL(rBigGreen),
        right_big_red_canvas: rBigRed,
        right_big_red_left: mkFL(rBigRed),
        right_big_black_canvas: rBigBlack,
        right_big_black_left: mkFL(rBigBlack),
      },
      tiles, enemies, items, bg: bgScale, text, sfx
    };
  }, []);

  const initLevel = useCallback(() => {
    const a = assetsRef.current;
    const im = a ? a.mario : null;
    return {
      mario: {
        rect: { x: 110, y: GROUND_HEIGHT - 40, w: 30, h: 40 },
        x_vel: 0, y_vel: 0, max_x_vel: MAX_WALK_SPEED, x_accel: WALK_ACCEL,
        gravity: GRAVITY, state: STAND, facing_right: true, allow_jump: true,
        big: false, fire: false, dead: false, invincible: false, invincible_start_timer: 0,
        in_transition_state: false, hurt_invincible: false, crouching: false,
        frame_index: 0, walking_timer: 0, transition_timer: 0, hurt_invisible_timer: 0,
        hurt_invisible_timer2: 0, fire_transition_timer: 0, last_fireball_time: 0,
        invincible_index: 0, invincible_animation_timer: 0, death_timer: 0,
        flag_pole_right: 0, flag_pole_timer: 0, in_castle: false,
        right_frames: im ? im.right_small_normal_canvas : null,
        left_frames: im ? im.right_small_normal_left : null,
        frame_list: im ? 'normal_small' : null,
      },
      viewport: { x: 0, right: SCREEN_W },
      state: NOT_FROZEN, info_state: 'level', current_time: 0,
      score: 0, coin_total: 0, lives: 3, time_count: 401,
      moving_scores: [], flag_score: null, flag_score_total: 0,
      grounds: [
        { x: 0, y: GROUND_HEIGHT, w: 2953, h: 60 },
        { x: 3048, y: GROUND_HEIGHT, w: 635, h: 60 },
        { x: 3819, y: GROUND_HEIGHT, w: 2735, h: 60 },
        { x: 6647, y: GROUND_HEIGHT, w: 2300, h: 60 },
      ],
      pipes: [
        { x: 1202, y: 452, w: 83, h: 82 }, { x: 1631, y: 409, w: 83, h: 140 },
        { x: 1973, y: 366, w: 83, h: 170 }, { x: 2445, y: 366, w: 83, h: 170 },
        { x: 6989, y: 452, w: 83, h: 82 }, { x: 7675, y: 452, w: 83, h: 82 },
      ],
      steps: [
        { x: 5745, y: 495, w: 40, h: 44 },{ x: 5788, y: 452, w: 40, h: 44 },{ x: 5831, y: 409, w: 40, h: 44 },{ x: 5874, y: 366, w: 40, h: 176 },
        { x: 6001, y: 366, w: 40, h: 176 },{ x: 6044, y: 408, w: 40, h: 40 },{ x: 6087, y: 452, w: 40, h: 40 },{ x: 6130, y: 495, w: 40, h: 40 },
        { x: 6345, y: 495, w: 40, h: 40 },{ x: 6388, y: 452, w: 40, h: 40 },{ x: 6431, y: 409, w: 40, h: 40 },{ x: 6474, y: 366, w: 40, h: 40 },
        { x: 6517, y: 366, w: 40, h: 176 },{ x: 6644, y: 366, w: 40, h: 176 },{ x: 6687, y: 408, w: 40, h: 40 },{ x: 6728, y: 452, w: 40, h: 40 },
        { x: 6771, y: 495, w: 40, h: 40 },{ x: 7760, y: 495, w: 40, h: 40 },{ x: 7803, y: 452, w: 40, h: 40 },{ x: 7845, y: 409, w: 40, h: 40 },
        { x: 7888, y: 366, w: 40, h: 40 },{ x: 7931, y: 323, w: 40, h: 40 },{ x: 7974, y: 280, w: 40, h: 40 },{ x: 8017, y: 237, w: 40, h: 40 },
        { x: 8060, y: 194, w: 40, h: 40 },{ x: 8103, y: 194, w: 40, h: 360 },{ x: 8488, y: 495, w: 40, h: 40 },
      ],
      bricks: [
        { x: 858, y: 365, contents: null },{ x: 944, y: 365, contents: null },{ x: 1030, y: 365, contents: null },
        { x: 3299, y: 365, contents: null },{ x: 3385, y: 365, contents: null },
        { x: 3430, y: 193, contents: null },{ x: 3473, y: 193, contents: null },{ x: 3516, y: 193, contents: null },
        { x: 3559, y: 193, contents: null },{ x: 3602, y: 193, contents: null },{ x: 3645, y: 193, contents: null },
        { x: 3688, y: 193, contents: null },{ x: 3731, y: 193, contents: null },{ x: 3901, y: 193, contents: null },
        { x: 3944, y: 193, contents: null },{ x: 3987, y: 193, contents: null },
        { x: 4030, y: 365, contents: SIXCOINS, coin_total: 6 },{ x: 4287, y: 365, contents: null },
        { x: 4330, y: 365, contents: STAR },{ x: 5058, y: 365, contents: null },
        { x: 5187, y: 193, contents: null },{ x: 5230, y: 193, contents: null },{ x: 5273, y: 193, contents: null },
        { x: 5488, y: 193, contents: null },{ x: 5574, y: 193, contents: null },{ x: 5617, y: 193, contents: null },
        { x: 5531, y: 365, contents: null },{ x: 5574, y: 365, contents: null },
        { x: 7202, y: 365, contents: null },{ x: 7245, y: 365, contents: null },{ x: 7331, y: 365, contents: null },
      ].map(b => ({ ...b, state: 'resting', rest_height: b.y, y_vel: 0, powerup_released: false, frame: 0 })),
      coin_boxes: [
        { x: 685, y: 365, contents: COIN },{ x: 901, y: 365, contents: MUSHROOM },
        { x: 987, y: 365, contents: COIN },{ x: 943, y: 193, contents: COIN },
        { x: 3342, y: 365, contents: MUSHROOM },{ x: 4030, y: 193, contents: COIN },
        { x: 4544, y: 365, contents: COIN },{ x: 4672, y: 365, contents: COIN },
        { x: 4672, y: 193, contents: MUSHROOM },{ x: 4800, y: 365, contents: COIN },
        { x: 5531, y: 193, contents: COIN },{ x: 7288, y: 365, contents: COIN },
      ].map(cb => ({ ...cb, state: 'resting', rest_height: cb.y, y_vel: 0, frame: 0, anim_timer: 0, first_half: true })),
      enemies: [], shells: [], sprites_about_to_die: [], powerups: [], coins_sprite: [], brick_pieces: [],
      checkpoints: [
        { x: 510, name: '1' },{ x: 1400, name: '2' },{ x: 1740, name: '3' },{ x: 3080, name: '4' },
        { x: 3750, name: '5' },{ x: 4150, name: '6' },{ x: 4470, name: '7' },{ x: 4950, name: '8' },
        { x: 5100, name: '9' },{ x: 6800, name: '10' },{ x: 8504, name: '11' },{ x: 8775, name: '12' },
        { x: 2740, name: 'secret_mushroom', w: 360, h: 40 },
      ].map(c => ({ ...c, alive: true })),
      enemy_groups: (() => {
        const mk = (y) => ({ name: GOOMBA, rect: { x: 0, y: y || GROUND_HEIGHT - 30, w: 30, h: 30 }, x_vel: -1.5, y_vel: 0, direction: LEFT, state: WALK, death_timer: 0, frame: 0, anim_timer: 0 });
        return [[mk()],[mk()],[mk(),mk()],[mk(193),mk(193)],[mk(),mk()],
          [{ name: KOOPA, rect: { x: 0, y: GROUND_HEIGHT - 50, w: 42, h: 60 }, x_vel: -1.5, y_vel: 0, direction: LEFT, state: WALK, death_timer: 0, frame: 0, anim_timer: 0 }],
          [mk(),mk()],[mk(),mk()],[mk(),mk()],[mk(),mk()]];
      })(),
      flag: { y: 100, state: 'resting' },
      castle: { x: 8775 },
      castle_flag_y: -1, end_timer: 0,
      last_time_update: 0,
    };
  }, []);

  const startGame = useCallback(() => {
    const lv = initLevel();
    levelRef.current = lv;
    setScore(0); setCoins(0); setTime(400); setLives(3);
    setGameState('playing'); stateRef.current = 'playing';
    setMessage('');
    loopStarterRef.current?.();
  }, [initLevel]);

  useEffect(() => {
    loadAssets().then(assets => {
      assetsRef.current = assets;
      const lv = initLevel();
      levelRef.current = lv;
      setGameState('ready'); stateRef.current = 'ready';
    });
  }, [loadAssets, initLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !assetsRef.current || stateRef.current === 'loading') return;
    canvas.width = SCREEN_W; canvas.height = SCREEN_H;
    const ctx = canvas.getContext('2d');

    const keys = {};
    const kd = e => {
      e.preventDefault();
      keys[e.code] = true;
      if (e.code === 'Space' && (stateRef.current === 'ready' || stateRef.current === 'gameover' || stateRef.current === 'win')) {
        setLives(3); startGame(); return;
      }
      if (e.code === 'Enter' && stateRef.current === 'ready') { startGame(); return; }
    };
    const ku = e => { e.preventDefault(); keys[e.code] = false; };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    const rectsOverlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    const allObstacles = (lv) => [...lv.grounds, ...lv.pipes, ...lv.steps];
    const A = () => assetsRef.current;
    const playSfx = (name) => { try { const a = A(); if (a && a.sfx[name]) { const pool = a.sfx[name]; const s = pool.find(p => p.paused || p.ended); if (s) { s.currentTime = 0; s.play().catch(()=>{}); } else { pool[0].currentTime = 0; pool[0].play().catch(()=>{}); } } } catch {} };

    let musicState = 'NONE';
    let musicStarted = false;
    const musicEl = new Audio();
    musicEl.loop = true;
    musicEl.volume = 0.5;
    musicEl.preload = 'metadata';
    const musicSrc = {
      main_theme: `${BASE_PATH}/music/main_theme.ogg`,
      main_theme_sped_up: `${BASE_PATH}/music/main_theme_sped_up.ogg`,
      invincible: `${BASE_PATH}/music/invincible.ogg`,
      death: `${BASE_PATH}/music/death.wav`,
      flagpole: `${BASE_PATH}/music/flagpole.wav`,
      stage_clear: `${BASE_PATH}/music/stage_clear.wav`,
      game_over: `${BASE_PATH}/music/game_over.ogg`,
      out_of_time: `${BASE_PATH}/music/out_of_time.wav`,
      world_clear: `${BASE_PATH}/music/world_clear.wav`,
    };
    const nonLoopTracks = ['death', 'flagpole', 'stage_clear', 'game_over', 'out_of_time', 'world_clear'];

    const playMusic = (key) => {
      if (!musicSrc[key] || musicState === key) return;
      const newSrc = musicSrc[key];
      musicEl.pause();
      musicEl.loop = !nonLoopTracks.includes(key);
      if (musicEl.src !== newSrc) musicEl.src = newSrc;
      musicEl.currentTime = 0;
      musicEl.play().catch(()=>{});
      musicState = key;
    };
    const stopAllMusic = () => { musicEl.pause(); musicEl.currentTime = 0; musicState = 'NONE'; };

    const updateMusic = (lv) => {
      if (!musicStarted && stateRef.current === 'playing') { musicStarted = true; playMusic('main_theme'); }
      if (!musicStarted) return;
      const m = lv.mario;
      if (musicState === 'NORMAL' || musicState === 'main_theme') {
        if (m.dead) playMusic('death');
        else if (m.invincible && lv.current_time - m.invincible_start_timer < 11000) playMusic('invincible');
        else if (m.state === FLAGPOLE) playMusic('flagpole');
        else if (lv.time_count === 100) playMusic('out_of_time');
        else if (musicState !== 'main_theme' && !m.dead && m.state !== FLAGPOLE) playMusic('main_theme');
      }
      else if (musicState === 'FLAGPOLE') {
        if (m.state === WALKING_TO_CASTLE) playMusic('stage_clear');
      }
      else if (musicState === 'STAGE_CLEAR' || musicState === 'stage_clear') {
        if (lv.state === IN_CASTLE) { stopAllMusic(); if (A().sfx.count_down) A().sfx.count_down.play().catch(()=>{}); musicState = 'FAST_COUNT_DOWN'; }
      }
      else if (musicState === 'TIME_WARNING') {
        if (musicEl.ended) playMusic('main_theme_sped_up');
        else if (m.dead) playMusic('death');
      }
      else if (musicState === 'SPED_UP' || musicState === 'main_theme_sped_up') {
        if (m.dead) playMusic('death');
        else if (m.state === FLAGPOLE) playMusic('flagpole');
      }
      else if (musicState === 'invincible') {
        if (lv.current_time - m.invincible_start_timer > 11000) playMusic('main_theme');
        else if (m.dead) playMusic('death');
      }
      else if (musicState === 'death') {
        if (musicEl.ended || !m.dead) playMusic('main_theme');
      }
    };

    let lastT = 0;
    const FRAME_TIME = 1000 / 60;

    const loop = (now) => {
      const lv = levelRef.current;
      if (stateRef.current !== 'playing') {
        if (lv) render(lv, ctx);
        animRef.current = null;
        return;
      }

      animRef.current = requestAnimationFrame(loop);
      if (now - lastT < FRAME_TIME) return;
      lastT = now;
      if (!lv) return;
      lv.current_time = now;
      const m = lv.mario;

      if (lv.state === FROZEN) {
        updateMario(lv, keys); updateCoinBoxes(lv); updateBricks(lv);
        for (const cs of lv.coins_sprite) cs.life--;
        lv.coins_sprite = lv.coins_sprite.filter(c => c.life > 0);
        for (const c of lv.coins_sprite) { c.y += c.vy; c.vy += 0.3; }
        for (const fp of lv.brick_pieces) { fp.x += fp.xv; fp.y += fp.yv; fp.yv += 0.8; }
        for (const e of lv.sprites_about_to_die) { e.rect.y += 2; e.rect.x += (e.xv||0); }
        lv.sprites_about_to_die = lv.sprites_about_to_die.filter(e => e.rect.y < SCREEN_H + 200);
        for (const p of lv.powerups) updatePowerup(p, lv);
        for (const ms of lv.moving_scores) { ms.y -= 1.5; ms.life--; }
        lv.moving_scores = lv.moving_scores.filter(ms => ms.life > 0);
        if (lv.flag_score && !lv.flag_score.added) { lv.flag_score.added = true; lv.score += lv.flag_score.val; }
        checkFlag(lv);
        lv.brick_pieces = lv.brick_pieces.filter(f => f.y < SCREEN_H + 200);
        checkMarioTransition(lv);
        checkMarioDeath(lv);
        updateTimers(lv);
        render(lv, ctx);
        return;
      }

      if (lv.state === IN_CASTLE) {
        updateMusic(lv);
        if (lv.time_count > 0) { lv.time_count -= 1; lv.score += 50; }
        else { lv.state = FLAG_AND_FIREWORKS; lv.castle_flag_y = 322; lv.end_timer = 0; playMusic('world_clear'); }
        updateTimers(lv); render(lv, ctx); return;
      }

      if (lv.state === FLAG_AND_FIREWORKS) {
        if (lv.end_timer === 0) lv.end_timer = lv.current_time;
        if (lv.castle_flag_y < GROUND_HEIGHT - 60) lv.castle_flag_y += 2;
        if (lv.current_time - lv.end_timer > 4000) {
          stateRef.current = 'win'; setGameState('win'); setMessage('COURSE CLEAR!');
        }
        render(lv, ctx); return;
      }

      updateMario(lv, keys);
      updateMusic(lv);
      checkCheckpoints(lv);
      updateEnemies(lv, keys);
      for (const e of lv.sprites_about_to_die) { e.rect.y += 2; e.rect.x += (e.xv || 0); }
      lv.sprites_about_to_die = lv.sprites_about_to_die.filter(e => e.rect.y < SCREEN_H + 200);
      for (const s of lv.shells) { s.rect.x += (s.x_vel || 0); s.rect.y += (s.y_vel || 0); s.y_vel = (s.y_vel || 0) + GRAVITY; }
      updateCoinBoxes(lv); updateBricks(lv);
      for (const cs of lv.coins_sprite) { cs.y += cs.vy; cs.vy += 0.3; cs.life--; }
      lv.coins_sprite = lv.coins_sprite.filter(c => c.life > 0);
      for (const fp of lv.brick_pieces) { fp.x += fp.xv; fp.y += fp.yv; fp.yv += 0.8; }
      lv.brick_pieces = lv.brick_pieces.filter(f => f.y < SCREEN_H + 200);
      for (const p of lv.powerups) updatePowerup(p, lv);
      for (const ms of lv.moving_scores) { ms.y -= 1.5; ms.life--; }
      lv.moving_scores = lv.moving_scores.filter(ms => ms.life > 0);
      if (lv.flag_score && !lv.flag_score.added) { lv.flag_score.added = true; lv.score += lv.flag_score.val; }
      checkFlag(lv);
      adjustSpritePositions(lv);
      checkMarioTransition(lv);
      checkMarioDeath(lv);
      updateViewport(lv);
      updateTimers(lv);
      render(lv, ctx);
      if (m.rect.y > SCREEN_H + 200) killMario(lv);
    };

    const updateTimers = (lv) => {
      if (stateRef.current !== 'playing') return;
      if (lv.state !== IN_CASTLE && lv.current_time - lv.last_time_update > 1000) {
        lv.last_time_update = lv.current_time;
        if (lv.time_count > 0) lv.time_count--;
      }
      setScore(lv.score); setCoins(lv.coin_total); setTime(Math.max(0, Math.floor(lv.time_count)));
    };

    const updateMario = (lv, keys) => {
      const m = lv.mario;
      switch (m.state) {
        case STAND: mStand(m, keys, lv); break;
        case WALK: mWalk(m, keys, lv); break;
        case JUMP: mJump(m, keys); break;
        case FALL: mFall(m, keys); break;
        case DEATH_JUMP: mDeathJump(m); break;
        case SMALL_TO_BIG: mSmallToBig(m, lv); break;
        case BIG_TO_FIRE: mBigToFire(m, lv); break;
        case BIG_TO_SMALL: mBigToSmall(m, lv); break;
        case FLAGPOLE: mFlagPole(m); break;
        case BOTTOM_OF_POLE: mBotPole(m); break;
        case WALKING_TO_CASTLE: mWalkCastle(m); break;
        case END_OF_LEVEL_FALL: m.y_vel += GRAVITY; break;
      }
    };

    const mStand = (m, keys, lv) => {
      m.frame_index = 0; m.x_vel = 0; m.y_vel = 0;
      if (keys['ArrowLeft']) { m.facing_right = false; m.state = WALK; return; }
      if (keys['ArrowRight']) { m.facing_right = true; m.state = WALK; return; }
      if ((keys['Space'] || keys['ArrowUp']) && m.allow_jump) {
        m.state = JUMP; m.y_vel = JUMP_VEL; m.allow_jump = false;
        playSfx(m.big ? 'big_jump' : 'small_jump'); return;
      }
      m.state = STAND;
    };

    const calcAnimSpeed = (m) => Math.max(30, 130 - Math.abs(m.x_vel) * 13);

    const mWalk = (m, keys, lv) => {
      if (!keys['Space'] && !keys['ArrowUp']) m.allow_jump = true;
      const running = keys['ShiftLeft'] || keys['ShiftRight'];
      m.max_x_vel = running ? MAX_RUN_SPEED : MAX_WALK_SPEED;
      m.x_accel = running ? RUN_ACCEL : WALK_ACCEL;

      if (m.walking_timer === 0) { m.frame_index = 1; m.walking_timer = lv.current_time; }
      else if (lv.current_time - m.walking_timer > calcAnimSpeed(m)) {
        m.frame_index = m.frame_index < 3 ? m.frame_index + 1 : 1;
        m.walking_timer = lv.current_time;
      }

      if ((keys['Space'] || keys['ArrowUp']) && m.allow_jump) {
          m.allow_jump = false; m.state = JUMP;
          if (m.x_vel > 4.5 || m.x_vel < -4.5) m.y_vel = JUMP_VEL - 0.5;
          else m.y_vel = JUMP_VEL;
          playSfx(m.big ? 'big_jump' : 'small_jump'); return;
        }

      if (keys['ArrowLeft']) {
        m.facing_right = false;
        if (m.x_vel > 0) { m.frame_index = 5; m.x_accel = SMALL_TURNAROUND; }
        else { m.x_accel = WALK_ACCEL; }
        if (m.x_vel > (-m.max_x_vel)) {
          m.x_vel -= m.x_accel;
          if (m.x_vel > -0.5) m.x_vel = -0.5;
        } else if (m.x_vel < (-m.max_x_vel)) {
          m.x_vel += m.x_accel;
        }
      } else if (keys['ArrowRight']) {
        m.facing_right = true;
        if (m.x_vel < 0) { m.frame_index = 5; m.x_accel = SMALL_TURNAROUND; }
        else { m.x_accel = WALK_ACCEL; }
        if (m.x_vel < m.max_x_vel) {
          m.x_vel += m.x_accel;
          if (m.x_vel < 0.5) m.x_vel = 0.5;
        } else if (m.x_vel > m.max_x_vel) {
          m.x_vel -= m.x_accel;
        }
      } else {
        if (m.facing_right) {
          if (m.x_vel > 0) m.x_vel -= m.x_accel;
          else { m.x_vel = 0; m.state = STAND; }
        } else {
          if (m.x_vel < 0) m.x_vel += m.x_accel;
          else { m.x_vel = 0; m.state = STAND; }
        }
      }
    };

    const mJump = (m, keys) => {
      m.allow_jump = false; m.frame_index = 4;
      m.gravity = JUMP_GRAVITY; m.y_vel += m.gravity;
      if (m.y_vel >= 0 && m.y_vel < MAX_Y_VEL) { m.gravity = GRAVITY; m.state = FALL; }
      if (!keys['Space'] && !keys['ArrowUp']) { m.gravity = GRAVITY; m.state = FALL; }
      if (keys['ArrowLeft']) { if (m.x_vel > (-m.max_x_vel)) m.x_vel -= m.x_accel; }
      else if (keys['ArrowRight']) { if (m.x_vel < m.max_x_vel) m.x_vel += m.x_accel; }
    };

    const mFall = (m, keys) => {
      if (m.y_vel < MAX_Y_VEL) m.y_vel += m.gravity;
      if (keys['ArrowLeft']) { if (m.x_vel > (-m.max_x_vel)) m.x_vel -= m.x_accel; }
      else if (keys['ArrowRight']) { if (m.x_vel < m.max_x_vel) m.x_vel += m.x_accel; }
    };

    const mDeathJump = (m) => {
      if (m.death_timer === 0) m.death_timer = levelRef.current.current_time;
      if (levelRef.current.current_time - m.death_timer > 500) { m.rect.y += m.y_vel; m.y_vel += m.gravity; }
    };

    const startDeathJump = (m, lv) => {
      m.dead = true; m.y_vel = -11; m.gravity = 0.5;
      m.frame_index = 6; m.state = DEATH_JUMP; m.in_transition_state = true;
      lv.state = FROZEN;
    };

    const mSmallToBig = (m, lv) => {
      m.in_transition_state = true;
      if (m.transition_timer === 0) m.transition_timer = lv.current_time;
      else if (lv.current_time - m.transition_timer > 950) {
        m.state = WALK; m.in_transition_state = false; m.transition_timer = 0;
        becomeBig(m);
      }
    };

    const mBigToFire = (m, lv) => {
      m.in_transition_state = true;
      if (m.fire_transition_timer === 0) m.fire_transition_timer = lv.current_time;
      else if (lv.current_time - m.fire_transition_timer > 1040) {
        m.fire = true; m.in_transition_state = false; m.state = WALK;
        m.transition_timer = 0; m.fire_transition_timer = 0;
        m.frame_list = 'fire';
      }
    };

    const mBigToSmall = (m, lv) => {
      m.in_transition_state = true; m.hurt_invincible = true;
      if (m.transition_timer === 0) m.transition_timer = lv.current_time;
      else if (lv.current_time - m.transition_timer > 915) {
        const a = A();
        const bottom = m.rect.y + m.rect.h;
        const left = m.rect.x;
        m.in_transition_state = false; m.state = WALK; m.big = false;
        m.right_frames = a ? (a.mario.right_small_normal_canvas || m.right_frames) : m.right_frames;
        m.left_frames = a ? (a.mario.right_small_normal_left || m.left_frames) : m.left_frames;
        const sf = m.right_frames && m.right_frames[0];
        if (sf) { m.rect.w = sf.w; m.rect.h = sf.h; }
        m.rect.y = bottom - m.rect.h;
        m.rect.x = left;
        m.transition_timer = 0; m.hurt_invisible_timer = 0;
      }
    };

    const mFlagPole = (m) => {
      m.in_transition_state = true;
      if (m.flag_pole_timer === 0) m.flag_pole_timer = levelRef.current.current_time;
      if (m.rect.y + m.rect.h < 493) {
        m.rect.x = m.flag_pole_right - m.rect.w; m.rect.y += 3;
      } else { m.state = BOTTOM_OF_POLE; m.flag_pole_timer = 0; }
    };

    const mBotPole = (m) => {
      if (m.flag_pole_timer === 0) m.flag_pole_timer = levelRef.current.current_time;
      if (levelRef.current.current_time - m.flag_pole_timer > 210) {
        m.in_transition_state = false;
        m.walking_timer = 0;
        m.state = (m.rect.y + m.rect.h) < 485 ? END_OF_LEVEL_FALL : WALKING_TO_CASTLE;
      }
    };

    const mWalkCastle = (m) => {
      m.max_x_vel = 5; m.x_accel = WALK_ACCEL; m.facing_right = true;
      if (m.x_vel < m.max_x_vel) m.x_vel += m.x_accel;
      if (m.walking_timer === 0) { m.frame_index = 1; m.walking_timer = levelRef.current.current_time; }
      else if (levelRef.current.current_time - m.walking_timer > calcAnimSpeed(m)) {
        m.frame_index = m.frame_index < 3 ? m.frame_index + 1 : 1;
        m.walking_timer = levelRef.current.current_time;
      }
    };

    const becomeBig = (m) => {
    const a = A();
    const bottom = m.rect.y + m.rect.h;
    const left = m.rect.x;
    m.big = true;
    m.right_frames = a ? (a.mario.right_big_normal_canvas || m.right_frames) : m.right_frames;
    m.left_frames = a ? (a.mario.right_big_normal_left || m.left_frames) : m.left_frames;
    const bf = m.right_frames && m.right_frames[0];
    if (bf) { m.rect.w = bf.w; m.rect.h = bf.h; }
    m.rect.y = bottom - m.rect.h;
    m.rect.x = left;
  };

    const checkMarioTransition = (lv) => {
      const m = lv.mario;
      if (m.in_transition_state) lv.state = FROZEN;
      else if (lv.state === FROZEN) lv.state = NOT_FROZEN;
    };

    const checkMarioDeath = (lv) => {
      if (lv.mario.dead && !lv.mario.in_castle && lv.mario.rect.y > SCREEN_H + 100) {
        let isGameOver = false;
        setLives(l => {
          const nl = Math.max(0, l - 1);
          if (nl <= 0) { isGameOver = true; stateRef.current = 'gameover'; setGameState('gameover'); setMessage('GAME OVER'); playMusic('game_over'); }
          return nl;
        });
        const newLv = initLevel(); newLv.score = lv.score; newLv.coin_total = lv.coin_total;
        levelRef.current = newLv;
        if (!isGameOver) { musicState = 'NONE'; playMusic('main_theme'); }
      }
    };

    const checkCheckpoints = (lv) => {
      const m = lv.mario;
      for (const cp of lv.checkpoints) {
        if (!cp.alive) continue;
        const cr = { x: cp.x, y: cp.h ? 0 : 0, w: cp.w || 40, h: cp.h || SCREEN_H };
        if (rectsOverlap(m.rect, cr)) {
          cp.alive = false;
          const idx = parseInt(cp.name) - 1;
          if (idx >= 0 && idx < 10 && lv.enemy_groups[idx]) {
            for (const e of lv.enemy_groups[idx]) e.rect.x = lv.viewport.right + Math.random() * 80;
            lv.enemies.push(...lv.enemy_groups[idx]);
          }
          if (cp.name === '11') {
            m.state = FLAGPOLE; m.invincible = false; m.flag_pole_right = 8518;
            if (m.rect.y + m.rect.h > 100 + lv.flag.y) m.rect.y = 100 + lv.flag.y - m.rect.h;
            const b = m.rect.y + m.rect.h;
            let val = 100; if (b > GROUND_HEIGHT - 200) val = 400; if (b > GROUND_HEIGHT - 280) val = 800;
            if (b > GROUND_HEIGHT - 360) val = 2000; if (b < 280) val = 5000;
            lv.flag_score = { val }; lv.flag.state = 'sliding'; lv.state = FROZEN;
            playSfx('flagpole');
          }
          if (cp.name === '12') { lv.state = IN_CASTLE; m.in_castle = true; m.x_vel = 0; m.y_vel = 0; }
          if (cp.name === 'secret_mushroom' && m.y_vel < 0) {
            const secretY = GROUND_HEIGHT - 200;
            lv.coin_boxes.push({ x: cp.x, y: secretY, contents: LIFE_MUSHROOM, state: 'resting', rest_height: secretY, y_vel: -6, frame: 0, anim_timer: 0, first_half: true });
            m.y_vel = 7; m.rect.y = secretY + 40; m.state = FALL;
          }
        }
      }
    };

    const adjustSpritePositions = (lv) => {
      const m = lv.mario; const obs = allObstacles(lv);
      m.rect.x += Math.round(m.x_vel);
      if (m.state !== WALKING_TO_CASTLE) {
        let h = obs.find(o => rectsOverlap(m.rect, o));
        if (h) { if (m.x_vel > 0) m.rect.x = h.x - m.rect.w; else m.rect.x = h.x + h.w; m.x_vel = 0; }
        h = [...lv.bricks.filter(b => b.state !== 'opened'), ...lv.coin_boxes].find(o => rectsOverlap(m.rect, { x: o.x, y: o.y, w: 43, h: 43 }));
        if (h) { if (m.x_vel > 0) m.rect.x = h.x - m.rect.w; else m.rect.x = h.x + 43; m.x_vel = 0; }
      }
      if (!m.in_transition_state) { m.rect.y += Math.round(m.y_vel); checkMarioY(lv, obs); }
      if (m.rect.x < lv.viewport.x + 5) m.rect.x = lv.viewport.x + 5;
    };

    const checkMarioY = (lv, obs) => {
      const m = lv.mario, bw = 43, bh = 43;
      let cb = lv.coin_boxes.find(o => rectsOverlap(m.rect, { x: o.x, y: o.y, w: bw, h: bh }));
      let br = lv.bricks.find(o => o.state !== 'opened' && rectsOverlap(m.rect, { x: o.x, y: o.y, w: bw, h: bh }));
      const ob = obs.find(o => rectsOverlap(m.rect, o));
      const en = lv.enemies.find(e => rectsOverlap(m.rect, e.rect));

      if (cb && br) {
        if (Math.abs(m.rect.x + m.rect.w / 2 - (cb.x + bw / 2)) < Math.abs(m.rect.x + m.rect.w / 2 - (br.x + bw / 2))) br = null;
        else cb = null;
      }

      if (cb) {
        if (m.rect.y > cb.y && m.y_vel < 0) {
          if (cb.state === 'resting') {
            cb.y_vel = -6; cb.state = 'bumped';
            if (cb.contents === COIN) { lv.score += 200; lv.coin_total += 1; lv.coins_sprite.push({ x: cb.x + 10, y: cb.y - 50, vy: -6, life: 30 }); playSfx('coin'); }
            else if (cb.contents === MUSHROOM) { lv.powerups.push({ name: MUSHROOM, rect: { x: cb.x + 6, y: cb.y - 44, w: 40, h: 40 }, x_vel: 2, y_vel: -1, growing: true, grow_timer: 0 }); playSfx('powerup_appears'); }
            else if (cb.contents === FIREFLOWER) { lv.powerups.push({ name: FIREFLOWER, rect: { x: cb.x + 6, y: cb.y - 44, w: 40, h: 40 }, x_vel: 2, y_vel: 0, growing: true, grow_timer: 0 }); playSfx('powerup_appears'); }
            else if (cb.contents === LIFE_MUSHROOM) { lv.powerups.push({ name: LIFE_MUSHROOM, rect: { x: cb.x + 6, y: cb.y - 44, w: 40, h: 40 }, x_vel: 2, y_vel: 0, growing: true, grow_timer: 0 }); playSfx('powerup_appears'); }
            else playSfx('bump');
          }
          m.y_vel = 7; m.rect.y = cb.y + bh; m.state = FALL;
        } else { m.y_vel = 0; m.rect.y = cb.y - m.rect.h; m.state = WALK; }
        testFalling(lv);
        return;
      }

      if (br) {
        if (m.rect.y > br.y && m.y_vel < 0) {
          if (br.state === 'resting') {
            if (m.big && !br.contents) {
              br.state = 'opened';
              lv.brick_pieces.push({ x: br.x, y: br.y - 10, xv: -2, yv: -12, w: 22, h: 22, dir: 'left' }, { x: br.x + 21, y: br.y - 10, xv: 2, yv: -12, w: 22, h: 22, dir: 'right' }, { x: br.x, y: br.y, xv: -2, yv: -6, w: 22, h: 22, dir: 'left' }, { x: br.x + 21, y: br.y, xv: 2, yv: -6, w: 22, h: 22, dir: 'right' });
              checkEnemyOnBrick(lv, br); playSfx('brick_smash');
            } else if (br.contents === SIXCOINS && br.coin_total > 0) {
              br.coin_total--; lv.coin_total++; lv.score += 200;
              lv.coins_sprite.push({ x: br.x + 10, y: br.y - 30, vy: -6, life: 30 }); playSfx('coin');
              br.state = br.coin_total === 0 ? 'opened' : 'resting';
              checkEnemyOnBrick(lv, br);
            } else {
              if (br.contents === STAR && !br.powerup_released) {
                lv.powerups.push({ name: STAR, rect: { x: br.x + 6, y: br.y - 44, w: 40, h: 40 }, x_vel: 2, y_vel: -1, growing: true, grow_timer: 0 }); br.powerup_released = true; playSfx('powerup_appears');
              } else playSfx('bump');
              br.state = 'bumped'; br.y_vel = -6;
              checkEnemyOnBrick(lv, br);
            }
          }
          m.y_vel = 7; m.rect.y = br.y + 43; m.state = FALL;
        } else { m.y_vel = 0; m.rect.y = br.y - m.rect.h; m.state = WALK; }
        testFalling(lv);
        return;
      }

      if (ob) {
        if (m.y_vel > 0) { m.y_vel = 0; m.rect.y = ob.y - m.rect.h; m.state = (m.state === END_OF_LEVEL_FALL || m.state === WALKING_TO_CASTLE) ? WALKING_TO_CASTLE : WALK; }
        else { m.y_vel = 7; m.rect.y = ob.y + ob.h; m.state = FALL; }
      } else if (en) {
        if (m.y_vel > 0 && m.rect.y + m.rect.h - en.rect.y < 30) {
          m.state = JUMP; m.y_vel = -7; m.rect.y = en.rect.y - m.rect.h;
          lv.score += 100; en.state = JUMPED_ON; playSfx('stomp');
          lv.sprites_about_to_die.push(en); lv.enemies = lv.enemies.filter(e => e !== en);
        }
      }
      testFalling(lv);
    };

    const checkEnemyOnBrick = (lv, br) => {
      const e = lv.enemies.find(en => rectsOverlap({ x: en.rect.x, y: en.rect.y, w: en.rect.w, h: 28 }, { x: br.x, y: br.y - 5, w: 43, h: 48 }));
      if (e) { lv.score += 100; e.state = 'dead'; lv.enemies = lv.enemies.filter(en => en !== e); lv.sprites_about_to_die.push(e); }
    };

    const testFalling = (lv) => {
      const m = lv.mario;
      m.rect.y += 1;
      const on = allObstacles(lv).some(o => rectsOverlap(m.rect, o))
        || lv.bricks.some(b => b.state !== 'opened' && rectsOverlap(m.rect, { x: b.x, y: b.y, w: 43, h: 43 }))
        || lv.coin_boxes.some(cb => rectsOverlap(m.rect, { x: cb.x, y: cb.y, w: 43, h: 43 }));
      m.rect.y -= 1;
      if (!on && [JUMP, DEATH_JUMP, SMALL_TO_BIG, BIG_TO_FIRE, BIG_TO_SMALL, FLAGPOLE, WALKING_TO_CASTLE, END_OF_LEVEL_FALL].indexOf(m.state) === -1) m.state = FALL;
    };

    const updateCoinBoxes = (lv) => {
      for (const cb of lv.coin_boxes) {
        if (cb.state === 'bumped') { cb.y += cb.y_vel; cb.y_vel += 1.2; if (cb.y >= cb.rest_height + 5) { cb.y = cb.rest_height; cb.state = 'opened'; } }
        if (cb.state === 'resting' && cb.contents !== LIFE_MUSHROOM) {
          if (cb.anim_timer === 0) cb.anim_timer = lv.current_time;
          if (cb.first_half) {
            if (cb.frame === 0 && lv.current_time - cb.anim_timer > 375) { cb.frame = 1; cb.anim_timer = lv.current_time; }
            else if (cb.frame === 1 && lv.current_time - cb.anim_timer > 125) { cb.frame = 2; cb.anim_timer = lv.current_time; }
            else if (cb.frame === 2 && lv.current_time - cb.anim_timer > 125) { cb.frame = 1; cb.first_half = false; cb.anim_timer = lv.current_time; }
          } else {
            if (cb.frame === 1 && lv.current_time - cb.anim_timer > 125) { cb.frame = 0; cb.first_half = true; cb.anim_timer = lv.current_time; }
          }
        }
      }
    };

    const updateBricks = (lv) => {
      for (const b of lv.bricks) {
        if (b.state === 'bumped') { b.y += b.y_vel; b.y_vel += 1.2; if (b.y >= b.rest_height + 5) { b.y = b.rest_height; b.state = b.contents === 'star' || (b.contents === SIXCOINS && b.coin_total === 0) ? 'opened' : 'resting'; } }
      }
    };

    const updatePowerup = (p, lv) => {
      if (p.name === FIREBALL) { p.rect.x += p.x_vel; p.rect.y += p.y_vel; p.y_vel += 0.3; if (p.y_vel > 8) p.y_vel = p.y_vel > 0 ? -8 : 8; }
      else if (p.growing) { p.rect.y -= 0.5; p.grow_timer++; if (p.grow_timer > 30) { p.growing = false; p.x_vel = 2; p.y_vel = 0; } return; }
      else {
        p.rect.x += (p.x_vel || 0);
        const oh = allObstacles(lv).find(o => rectsOverlap(p.rect, o));
        if (oh) p.x_vel = -(p.x_vel || 2);
        p.rect.y += (p.y_vel || 0); p.y_vel = (p.y_vel || 0) + GRAVITY;
        const oh2 = allObstacles(lv).find(o => rectsOverlap(p.rect, o));
        if (oh2) { p.y_vel = 0; p.rect.y = oh2.y - p.rect.h; }
      }
      if (p.rect.y > SCREEN_H + 100) { lv.powerups = lv.powerups.filter(pp => pp !== p); return; }

      const m = lv.mario;
      if (rectsOverlap(m.rect, p.rect)) {
        if (p.name === MUSHROOM) {
          lv.score += 1000; m.state = SMALL_TO_BIG; m.in_transition_state = true; lv.state = FROZEN;
          for (const b of lv.bricks) if (b.contents === MUSHROOM) b.contents = FIREFLOWER;
          for (const cb of lv.coin_boxes) if (cb.contents === MUSHROOM) cb.contents = FIREFLOWER;
          playSfx('powerup');
        } else if (p.name === FIREFLOWER) {
          lv.score += 1000; m.state = m.big ? BIG_TO_FIRE : SMALL_TO_BIG; m.in_transition_state = true; lv.state = FROZEN; playSfx('powerup');
        } else if (p.name === STAR) {
          m.invincible = true; m.invincible_start_timer = lv.current_time; playSfx('powerup');
        } else if (p.name === LIFE_MUSHROOM) {
          setLives(l => l + 1); lv.lives++; playSfx('one_up');
        }
        lv.powerups = lv.powerups.filter(pp => pp !== p);
      }
    };

    const updateEnemies = (lv, keys) => {
      const enemyObstacles = (lv) => [...allObstacles(lv), ...lv.bricks.filter(b => b.state !== 'opened').map(b => ({ x: b.x, y: b.y, w: 43, h: 43 })), ...lv.coin_boxes.map(cb => ({ x: cb.x, y: cb.y, w: 43, h: 43 }))];

      for (let i = lv.enemies.length - 1; i >= 0; i--) {
        const e = lv.enemies[i];
        const eObs = enemyObstacles(lv);
        e.rect.x += e.x_vel;
        const oh = eObs.find(o => rectsOverlap(e.rect, o));
        if (oh) { if (e.x_vel > 0) { e.rect.x = oh.x - e.rect.w; e.x_vel = -1.5; } else { e.rect.x = oh.x + oh.w; e.x_vel = 1.5; } }
        e.rect.y += e.y_vel; e.y_vel += GRAVITY;
        const oh2 = eObs.find(o => rectsOverlap(e.rect, o));
        if (oh2) { e.y_vel = 0; e.rect.y = oh2.y - e.rect.h; }
        if (e.rect.x < lv.viewport.x - 300 || e.rect.x > lv.viewport.right + 500) lv.enemies.splice(i, 1);
        if (e.anim_timer === 0) e.anim_timer = lv.current_time;
        if (lv.current_time - e.anim_timer > 125) { e.frame = e.frame === 0 ? 1 : 0; e.anim_timer = lv.current_time; }
      }

      for (let i = 0; i < lv.enemies.length; i++) {
        for (let j = i + 1; j < lv.enemies.length; j++) {
          const a = lv.enemies[i], b = lv.enemies[j];
          if (!rectsOverlap(a.rect, b.rect)) continue;
          const overlapX = Math.min(a.rect.x + a.rect.w, b.rect.x + b.rect.w) - Math.max(a.rect.x, b.rect.x);
          const overlapY = Math.min(a.rect.y + a.rect.h, b.rect.y + b.rect.h) - Math.max(a.rect.y, b.rect.y);
          if (overlapX < overlapY) {
            if (a.rect.x < b.rect.x) { a.rect.x -= overlapX / 2; b.rect.x += overlapX / 2; }
            else { a.rect.x += overlapX / 2; b.rect.x -= overlapX / 2; }
            a.x_vel = a.x_vel > 0 ? -1.5 : 1.5;
            b.x_vel = b.x_vel > 0 ? -1.5 : 1.5;
          } else {
            if (a.rect.y < b.rect.y) { a.rect.y -= overlapY / 2; b.rect.y += overlapY / 2; }
            else { a.rect.y += overlapY / 2; b.rect.y -= overlapY / 2; }
          }
        }
      }

      for (let i = lv.enemies.length - 1; i >= 0; i--) {
        const e = lv.enemies[i]; const m = lv.mario;
        if (!rectsOverlap(m.rect, e.rect)) continue;
        if (m.invincible) {
          lv.score += 100; e.state = 'dead'; lv.sprites_about_to_die.push(e); lv.enemies.splice(i, 1); playSfx('kick');
        } else if (m.big) {
          m.big = false; m.rect.h = 40; m.state = BIG_TO_SMALL; m.in_transition_state = true; lv.state = FROZEN;
          m.hurt_invincible = true; m.hurt_invisible_timer = 120;
          m.frame_list = 'normal_small'; playSfx('pipe');
        } else if (!m.hurt_invincible) {
          startDeathJump(m, lv); playMusic('death');
        }
      }
    };

    const checkFlag = (lv) => { if (lv.flag.state === 'sliding') { lv.flag.y += 5; if (lv.flag.y > 450) lv.flag.state = 'done'; } };

    const updateViewport = (lv) => {
      const m = lv.mario;
      lv.viewport.x = Math.max(0, m.rect.x - SCREEN_W / 3);
      lv.viewport.right = lv.viewport.x + SCREEN_W;
    };

    const killMario = (lv) => {
      setLives(prev => {
        const l = Math.max(0, prev - 1);
        if (l <= 0) { stateRef.current = 'gameover'; setGameState('gameover'); setMessage('GAME OVER'); playMusic('game_over'); levelRef.current = initLevel(); return l; }
        const newLv = initLevel(); newLv.score = lv.score; newLv.coin_total = lv.coin_total; newLv.lives = l;
        newLv.time_count = 401; levelRef.current = newLv;
        musicState = 'NONE'; playMusic('main_theme');
        return l;
      });
    };

    const render = (lv, ctx) => {
      const a = A(); if (!a) { ctx.fillStyle = '#5c94fc'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); return; }
      const vx = lv.viewport.x;

      if (a.bg) ctx.drawImage(a.bg, -vx, 0);
      else { ctx.fillStyle = '#5c94fc'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H); }

      const drawTile = (tileCanvas, x, y) => { if (tileCanvas) ctx.drawImage(tileCanvas, x - vx, y); };
      const ts = a.tiles;

      for (const b of lv.bricks) {
        if (b.state === 'opened') drawTile(ts.brick_opened, b.x, b.y);
        else drawTile(ts.brick, b.x, b.y);
      }
      for (const cb of lv.coin_boxes) {
        if (cb.state === 'opened') drawTile(ts.brick_opened, cb.x, cb.y);
        else drawTile(ts['coin_box_' + cb.frame], cb.x, cb.y);
      }

      for (const c of lv.coins_sprite) {
        const idx = Math.floor(lv.current_time / 100) % 4;
        if (a.items['coin_' + idx]) ctx.drawImage(a.items['coin_' + idx], c.x - vx, c.y);
      }

      const es = a.enemies;
      for (const e of lv.enemies) {
        const sprite = e.name === GOOMBA ? es['goomba_' + e.frame] : es['koopa_' + e.frame];
        if (sprite) {
          const sx = e.rect.x - vx + (e.rect.w - sprite.width) / 2;
          const sy = e.rect.y + e.rect.h - sprite.height;
          ctx.drawImage(sprite, sx, sy);
        }
      }
      for (const e of lv.sprites_about_to_die) {
        if (e.name === GOOMBA && es.goomba_flat) {
          const sprite = es.goomba_flat;
          const sx = e.rect.x - vx + (e.rect.w - sprite.width) / 2;
          ctx.drawImage(sprite, sx, e.rect.y + e.rect.h - sprite.height / 2, sprite.width, sprite.height / 2);
        }
      }
      for (const s of lv.shells) {
        const sprite = es.koopa_shell;
        if (sprite) {
          const sx = s.rect.x - vx + (s.rect.w - sprite.width) / 2;
          const sy = s.rect.y + s.rect.h - sprite.height;
          ctx.drawImage(sprite, sx, sy);
        }
      }

      const it = a.items;
      for (const p of lv.powerups) {
        const px = p.rect.x - vx;
        const py = p.rect.y + p.rect.h;
        if (p.name === MUSHROOM) { const s = it.mushroom; if (s) ctx.drawImage(s, px + (p.rect.w - s.width) / 2, py - s.height); }
        else if (p.name === FIREFLOWER) { const idx = Math.floor(lv.current_time / 100) % 4; const s = it['fireflower_' + idx]; if (s) ctx.drawImage(s, px + (p.rect.w - s.width) / 2, py - s.height); }
        else if (p.name === STAR) { const idx = Math.floor(lv.current_time / 80) % 4; const s = it['star_' + idx]; if (s) ctx.drawImage(s, px + (p.rect.w - s.width) / 2, py - s.height); }
        else if (p.name === LIFE_MUSHROOM) { const s = it.oneup; if (s) ctx.drawImage(s, px + (p.rect.w - s.width) / 2, py - s.height); }
        else if (p.name === FIREBALL) { const idx = Math.floor(lv.current_time / 80) % 2; const s = it['fireball_' + idx]; if (s) ctx.drawImage(s, px + (p.rect.w - s.width) / 2, py - s.height); }
      }

      for (const fp of lv.brick_pieces) {
        const sprite = fp.dir === 'right' ? it.brick_piece_right : it.brick_piece_left;
        if (sprite) ctx.drawImage(sprite, fp.x - vx, fp.y);
      }

      const m = lv.mario;

      let frames = null;
      if (m.invincible) {
        const elapsed = lv.current_time - m.invincible_start_timer;
        if (elapsed > 12000) m.invincible = false;
        else {
          const speed = elapsed > 10000 ? 100 : 30;
          if (lv.current_time - m.invincible_animation_timer > speed) {
            m.invincible_index = (m.invincible_index + 1) % 4;
            m.invincible_animation_timer = lv.current_time;
          }
          const colorKeys = ['normal', 'green', 'red', 'black'];
          const colorKey = colorKeys[m.invincible_index];
          const prefix = m.big ? 'right_big_' + colorKey : 'right_small_' + colorKey;
          frames = m.facing_right ? (a.mario[prefix + '_canvas'] || a.mario.right_small_normal_canvas) : (a.mario[prefix + '_left'] || a.mario.right_small_normal_left);
        }
      }
      if (!frames) {
        if (m.fire && !m.invincible) {
          frames = m.facing_right ? a.mario.right_fire_canvas : a.mario.right_fire_left;
        } else if (m.big && !m.invincible) {
          frames = m.facing_right ? a.mario.right_big_normal_canvas : a.mario.right_big_normal_left;
        } else if (!m.invincible) {
          frames = m.facing_right ? a.mario.right_small_normal_canvas : a.mario.right_small_normal_left;
        }
      }

      if (frames && !m.dead && !m.in_castle) {
        const f = frames[m.frame_index] || frames[0];
        if (f) {
          const mx = m.rect.x - vx + (m.rect.w - f.w) / 2;
          const my = m.rect.y + m.rect.h - f.h;
          ctx.drawImage(f.canvas, mx, my);
        }
      }

      if (m.dead && !m.in_castle) {
        const df = (a.mario.right_small_normal_canvas || [])[6];
        if (df) ctx.drawImage(df.canvas, m.rect.x - vx + (m.rect.w - df.w) / 2, m.rect.y + m.rect.h - df.h);
        return;
      }

      if (lv.castle_flag_y > 0) {
        const cfx = 8745 - vx;
        const cfy = lv.castle_flag_y;
        ctx.fillStyle = '#00aa00';
        ctx.fillRect(cfx, cfy, 20, 14);
        ctx.fillStyle = '#888';
        ctx.fillRect(cfx + 20, cfy - 30, 3, 30 + 14);
      }

      for (const ms of lv.moving_scores) {
        ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace';
        ctx.fillText(ms.val ? ms.val.toString() : '', ms.x - vx, ms.y);
      }

      ctx.fillStyle = '#888';
      ctx.fillRect(8518 - vx, 100, 4, 400);
      ctx.fillStyle = '#00ff00';
      ctx.beginPath(); ctx.moveTo(8520 - vx, 100); ctx.lineTo(8550 - vx, 130); ctx.lineTo(8520 - vx, 160); ctx.closePath(); ctx.fill();
      if (lv.flag_score && lv.flag_score.val) {
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace';
        ctx.fillText(lv.flag_score.val.toString(), 8520 - vx, 85);
      }

      const tx = a.text;
      const charGap = 4;
      const drawStr = (str, x, y) => {
        let cx = x;
        for (let i = 0; i < str.length; i++) {
          const c = tx[str[i]] || tx[' '];
          if (c) { ctx.drawImage(c, cx, y); cx += c.width + charGap; }
        }
        return cx - x;
      };
      ctx.fillStyle = '#5c94fc';
      ctx.fillRect(0, 0, SCREEN_W, 70);
      const sc = String(lv.score).padStart(6, '0');
      drawStr('MARIO', 75, 20);
      drawStr(sc, 80, 42);
      drawStr('x' + String(lv.coin_total).padStart(2, '0'), 295, 42);
      drawStr('WORLD', 440, 20);
      drawStr('1-1', 465, 42);
      drawStr('TIME', 620, 20);
      drawStr(String(Math.max(0, Math.floor(lv.time_count))).padStart(3, '0'), 640, 42);
      drawStr('x' + String(lives), 700, 20);

      if (stateRef.current === 'ready') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 28px sans-serif'; ctx.fillText('SUPER MARIO BROS', 210, 260);
        ctx.font = 'bold 16px monospace'; ctx.fillText('1 PLAYER GAME', 300, 350);
        ctx.font = '14px sans-serif';
        ctx.fillText('\u2190 \u2192 \u79fb\u52a8 | SPACE/\u2191 \u8df3\u8dc3 | SHIFT \u52a0\u901f', 190, 400);
        ctx.fillText('\u6309 SPACE \u5f00\u59cb\u6e38\u6e8f', 290, 440);
      }

      if (stateRef.current === 'gameover') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 24px monospace';
        ctx.fillText('GAME OVER', 320, 280);
        ctx.font = '14px sans-serif'; ctx.fillText('\u6309 SPACE \u91cd\u65b0\u5f00\u59cb', 310, 340);
      }

      if (stateRef.current === 'win') {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 28px sans-serif';
        ctx.fillText('COURSE CLEAR!', 250, 250);
        ctx.font = 'bold 20px monospace';
        ctx.fillText('SCORE: ' + lv.score, 300, 310);
        ctx.font = '14px sans-serif'; ctx.fillText('\u6309 SPACE \u91cd\u65b0\u5f00\u59cb', 290, 380);
      }
    };

    const startLoop = () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      animRef.current = requestAnimationFrame(loop);
    };
    loopStarterRef.current = startLoop;

    startLoop();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      stopAllMusic();
      const a = A();
      if (a && a.sfx) Object.values(a.sfx).forEach(pool => pool.forEach(s => { s.pause(); s.currentTime = 0; }));
    };
  }, [gameState, startGame]);

  const keysRef = useRef({});

  const vKeyDown = (code) => { keysRef.current[code] = true; window.dispatchEvent(new KeyboardEvent('keydown', { code })); };
  const vKeyUp = (code) => { keysRef.current[code] = false; window.dispatchEvent(new KeyboardEvent('keyup', { code })); };

  return (
    <div className="flex flex-col items-center bg-black p-2 pt-10" style={{ minHeight: '100%' }}>
      <div className="w-full max-w-[840px] mb-1">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors active:scale-95 bg-gray-800 px-3 py-1.5 rounded-lg">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          <span className="text-xs">返回</span>
        </button>
      </div>
      <canvas ref={canvasRef} className="rounded-xl border-2 border-gray-700 shadow-2xl" style={{ width: '100%', maxWidth: '840px', height: 'auto', aspectRatio: '800/600', imageRendering: 'pixelated' }}
        onClick={() => {
          if (stateRef.current === 'ready' || stateRef.current === 'gameover') { setLives(3); startGame(); }
        }}
      />
      <div className="w-full max-w-[840px] mt-[124px] mb-8 select-none" style={{ touchAction: 'none' }}>
        <div className="flex items-end justify-between px-4" style={{ height: 180 }}>
          <div className="relative" style={{ width: 170, height: 170 }}>
            <button className="absolute bg-gray-700 hover:bg-gray-600 active:bg-gray-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold transition-colors" style={{ left: 55, top: 0, width: 60, height: 54 }}
              onPointerDown={() => vKeyDown('ArrowUp')} onPointerUp={() => vKeyUp('ArrowUp')} onPointerLeave={() => vKeyUp('ArrowUp')}>▲</button>
            <button className="absolute bg-gray-700 hover:bg-gray-600 active:bg-gray-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold transition-colors" style={{ left: 55, bottom: 0, width: 60, height: 54 }}
              onPointerDown={() => vKeyDown('ArrowDown')} onPointerUp={() => vKeyUp('ArrowDown')} onPointerLeave={() => vKeyUp('ArrowDown')}>▼</button>
            <button className="absolute bg-gray-700 hover:bg-gray-600 active:bg-gray-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold transition-colors" style={{ left: 0, top: 55, width: 55, height: 60 }}
              onPointerDown={() => vKeyDown('ArrowLeft')} onPointerUp={() => vKeyUp('ArrowLeft')} onPointerLeave={() => vKeyUp('ArrowLeft')}>◀</button>
            <button className="absolute bg-gray-700 hover:bg-gray-600 active:bg-gray-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold transition-colors" style={{ right: 0, top: 55, width: 55, height: 60 }}
              onPointerDown={() => vKeyDown('ArrowRight')} onPointerUp={() => vKeyUp('ArrowRight')} onPointerLeave={() => vKeyUp('ArrowRight')}>▶</button>
          </div>
          <div className="flex items-center gap-5 pb-3" style={{ marginTop: 15 }}>
            <div className="flex flex-col items-center gap-1">
              <button className="rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg transition-transform active:scale-90" style={{ width: 72, height: 72, background: '#dc2626' }}
                onPointerDown={() => vKeyDown('Space')} onPointerUp={() => vKeyUp('Space')} onPointerLeave={() => vKeyUp('Space')}>A</button>
              <span className="text-gray-500 text-[10px]">跳跃</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <button className="rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg transition-transform active:scale-90" style={{ width: 72, height: 72, background: '#2563eb' }}
                onPointerDown={() => vKeyDown('ShiftLeft')} onPointerUp={() => vKeyUp('ShiftLeft')} onPointerLeave={() => vKeyUp('ShiftLeft')}>B</button>
              <span className="text-gray-500 text-[10px]">加速</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MarioGame;
