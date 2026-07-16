(function() {
  "use strict";
  const COLS = 34,
    ROWS = 20,
    TILE = 20;
  const canvas = document.getElementById('dungeon');
  const ctx = canvas.getContext('2d');
  const panelEl = document.getElementById('panel');
  const logEl = document.getElementById('log');
  const depthLabel = document.getElementById('depthLabel');
  const deathOverlay = document.getElementById('deathOverlay');
  const potionButtonsEl = document.getElementById('potionButtons');

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function choice(arr) {
    return arr[randInt(0, arr.length - 1)];
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const POTION_EFFECTS = ['Healing', 'Poison', 'Strength', 'Weakness', 'Fortitude', 'Clairvoyance'];
  const POTION_APPEARANCES = ['Murky', 'Fizzy', 'Clear', 'Bubbling', 'Glowing', 'Muddy'];
  const MONSTER_TEMPLATES = [{
      name: 'Rat',
      sym: 'r',
      color: '#8fae66',
      hp: 4,
      atk: 2,
      def: 0,
      xp: 2,
      minDepth: 1
    },
    {
      name: 'Bat',
      sym: 'b',
      color: '#b28fce',
      hp: 4,
      atk: 2,
      def: 0,
      xp: 3,
      minDepth: 1,
      erratic: true
    },
    {
      name: 'Snake',
      sym: 's',
      color: '#5fbf5f',
      hp: 6,
      atk: 3,
      def: 1,
      xp: 4,
      minDepth: 1
    },
    {
      name: 'Goblin',
      sym: 'g',
      color: '#c9a227',
      hp: 9,
      atk: 4,
      def: 1,
      xp: 8,
      minDepth: 2
    },
    {
      name: 'Skeleton',
      sym: 'k',
      color: '#d8d8d8',
      hp: 12,
      atk: 5,
      def: 2,
      xp: 12,
      minDepth: 3
    },
    {
      name: 'Ghoul',
      sym: 'o',
      color: '#7fc9c0',
      hp: 14,
      atk: 6,
      def: 1,
      xp: 15,
      minDepth: 4
    },
    {
      name: 'Ogre',
      sym: 'O',
      color: '#c97a4a',
      hp: 20,
      atk: 7,
      def: 3,
      xp: 22,
      minDepth: 5
    },
    {
      name: 'Wraith',
      sym: 'W',
      color: '#9a9aff',
      hp: 18,
      atk: 8,
      def: 2,
      xp: 25,
      minDepth: 6
    },
    {
      name: 'Manor Dragon',
      sym: 'D',
      color: '#ff5555',
      hp: 32,
      atk: 10,
      def: 4,
      xp: 60,
      minDepth: 8
    }
  ];
  let state = null;

  function newGame() {
    const perm = shuffle([0, 1, 2, 3, 4, 5]);
    const appearanceForEffect = {};
    perm.forEach((effectIdx, appearanceIdx) => {
      appearanceForEffect[POTION_EFFECTS[effectIdx]] = POTION_APPEARANCES[appearanceIdx];
    });
    state = {
      depth: 1,
      player: {
        x: 0,
        y: 0,
        hp: 20,
        maxHp: 20,
        atk: 4,
        def: 1,
        level: 1,
        xp: 0,
        gold: 0,
        potions: []
      },
      grid: null,
      rooms: [],
      monsters: [],
      items: [],
      stairs: null,
      visited: new Set(),
      visible: new Set(),
      identified: {},
      appearanceForEffect: appearanceForEffect,
      messages: [],
      alive: true,
      turn: 0
    };
    generateLevel();
    log('You descend into the manor\'s cellar.', true);
    render();
  }

  function log(msg, important) {
    state.messages.unshift({
      msg,
      important: !!important
    });
    if (state.messages.length > 40) state.messages.pop();
    renderLog();
  }

  function renderLog() {
    logEl.innerHTML = state.messages.slice(0, 6).map(m =>
      `<div${m.important ? ' style="color:var(--amber);opacity:1;"' : ''}>${escapeHtml(m.msg)}</div>`
    ).join('');
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function key(x, y) {
    return x + ',' + y;
  }

  function generateLevel() {
    const grid = [];
    for (let y = 0; y < ROWS; y++) grid.push(new Array(COLS).fill('#'));
    const rooms = [];
    const maxRooms = 9;
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts && rooms.length < maxRooms; i++) {
      const w = randInt(4, 8);
      const h = randInt(3, 6);
      const x = randInt(1, COLS - w - 2);
      const y = randInt(1, ROWS - h - 2);
      let overlaps = false;
      for (const r of rooms) {
        if (x <= r.x + r.w + 1 && x + w + 1 >= r.x && y <= r.y + r.h + 1 && y + h + 1 >= r.y) {
          overlaps = true;
          break;
        }
      }
      if (overlaps) continue;
      for (let yy = y; yy < y + h; yy++)
        for (let xx = x; xx < x + w; xx++) grid[yy][xx] = '.';
      if (rooms.length > 0) {
        const prev = rooms[rooms.length - 1];
        const cx1 = Math.floor(prev.x + prev.w / 2),
          cy1 = Math.floor(prev.y + prev.h / 2);
        const cx2 = Math.floor(x + w / 2),
          cy2 = Math.floor(y + h / 2);
        if (Math.random() < 0.5) {
          hCorridor(grid, cx1, cx2, cy1);
          vCorridor(grid, cy1, cy2, cx2);
        } else {
          vCorridor(grid, cy1, cy2, cx1);
          hCorridor(grid, cx1, cx2, cy2);
        }
      }
      rooms.push({
        x,
        y,
        w,
        h
      });
    }
    state.grid = grid;
    state.rooms = rooms;
    state.visited = new Set();
    state.visible = new Set();
    state.monsters = [];
    state.items = [];
    const startRoom = rooms[0];
    state.player.x = Math.floor(startRoom.x + startRoom.w / 2);
    state.player.y = Math.floor(startRoom.y + startRoom.h / 2);
    const stairRoom = rooms[rooms.length - 1];
    state.stairs = {
      x: Math.floor(stairRoom.x + stairRoom.w / 2),
      y: Math.floor(stairRoom.y + stairRoom.h / 2)
    };
    grid[state.stairs.y][state.stairs.x] = '>';
    const depth = state.depth;
    const numMonsters = Math.min(4 + depth, 14);
    const pool = MONSTER_TEMPLATES.filter(t => t.minDepth <= depth);
    for (let i = 0; i < numMonsters; i++) {
      const room = choice(rooms.slice(1));
      if (!room) continue;
      const pos = randomFloorInRoom(room);
      if (!pos) continue;
      if (pos.x === state.player.x && pos.y === state.player.y) continue;
      const tmpl = choice(pool.length ? pool : [MONSTER_TEMPLATES[0]]);
      const scale = 1 + Math.floor(depth / 4);
      state.monsters.push({
        name: tmpl.name,
        sym: tmpl.sym,
        color: tmpl.color,
        hp: tmpl.hp + Math.floor(depth * 0.6),
        maxHp: tmpl.hp + Math.floor(depth * 0.6),
        atk: tmpl.atk + Math.floor(depth * 0.3),
        def: tmpl.def,
        xp: tmpl.xp,
        erratic: !!tmpl.erratic,
        x: pos.x,
        y: pos.y,
        awake: false
      });
    }
    const numGold = randInt(3, 6);
    for (let i = 0; i < numGold; i++) {
      const room = choice(rooms);
      const pos = randomFloorInRoom(room);
      if (!pos) continue;
      state.items.push({
        type: 'gold',
        x: pos.x,
        y: pos.y,
        amount: randInt(5, 15) + depth * 3
      });
    }
    const numPotions = randInt(2, 4);
    for (let i = 0; i < numPotions; i++) {
      const room = choice(rooms);
      const pos = randomFloorInRoom(room);
      if (!pos) continue;
      const effect = choice(POTION_EFFECTS);
      state.items.push({
        type: 'potion',
        x: pos.x,
        y: pos.y,
        effect: effect
      });
    }
    recomputeVisibility();
  }

  function randomFloorInRoom(room) {
    for (let tries = 0; tries < 20; tries++) {
      const x = randInt(room.x, room.x + room.w - 1);
      const y = randInt(room.y, room.y + room.h - 1);
      if (state.grid[y][x] === '.') return {
        x,
        y
      };
    }
    return null;
  }

  function hCorridor(grid, x1, x2, y) {
    const s = Math.min(x1, x2),
      e = Math.max(x1, x2);
    for (let x = s; x <= e; x++) grid[y][x] = '.';
  }

  function vCorridor(grid, y1, y2, x) {
    const s = Math.min(y1, y2),
      e = Math.max(y1, y2);
    for (let y = s; y <= e; y++) grid[y][x] = '.';
  }

  function isWalkable(x, y) {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
    const t = state.grid[y][x];
    return t === '.' || t === '>';
  }

  function hasLOS(x0, y0, x1, y1) {
    let dx = Math.abs(x1 - x0),
      dy = Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1,
      sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0,
      y = y0;
    while (!(x === x1 && y === y1)) {
      if (state.grid[y] && state.grid[y][x] === '#') return false;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
    return true;
  }

  function recomputeVisibility() {
    state.visible = new Set();
    const p = state.player;
    const radius = 7;
    for (let y = Math.max(0, p.y - radius); y <= Math.min(ROWS - 1, p.y + radius); y++) {
      for (let x = Math.max(0, p.x - radius); x <= Math.min(COLS - 1, p.x + radius); x++) {
        const dist = Math.hypot(x - p.x, y - p.y);
        if (dist <= radius && hasLOS(p.x, p.y, x, y)) {
          state.visible.add(key(x, y));
          state.visited.add(key(x, y));
        }
      }
    }
  }

  function monsterAt(x, y) {
    return state.monsters.find(m => m.hp > 0 && m.x === x && m.y === y);
  }

  function itemAt(x, y) {
    return state.items.find(it => it.x === x && it.y === y);
  }

  function playerLevelUp() {
    const p = state.player;
    const needed = p.level * 20;
    if (p.xp >= needed) {
      p.xp -= needed;
      p.level++;
      p.maxHp += 6;
      p.hp = p.maxHp;
      p.atk += 1;
      if (p.level % 2 === 0) p.def += 1;
      log(`You feel stronger! Welcome to level ${p.level}.`, true);
    }
  }

  function attack(atkStats, defStats) {
    const raw = atkStats.atk + randInt(0, 3) - defStats.def;
    return Math.max(1, raw);
  }

  function playerAttackMonster(m) {
    const dmg = attack(state.player, m);
    m.hp -= dmg;
    log(`You hit the ${m.name} for ${dmg}.`);
    if (m.hp <= 0) {
      log(`The ${m.name} dies!`, true);
      state.player.xp += m.xp;
      playerLevelUp();
    } else {
      m.awake = true;
    }
  }

  function monsterAttackPlayer(m) {
    const dmg = attack(m, state.player);
    state.player.hp -= dmg;
    log(`The ${m.name} hits you for ${dmg}.`);
    if (state.player.hp <= 0) {
      state.player.hp = 0;
      die(`Slain by a ${m.name} on depth ${state.depth}.`);
    }
  }

  function die(cause) {
    state.alive = false;
    document.getElementById('deathCause').textContent = cause;
    const score = state.player.gold + state.depth * 100 + state.player.level * 50;
    document.getElementById('deathScore').textContent =
      `Gold: ${state.player.gold}  Depth: ${state.depth}  Level: ${state.player.level}  Score: ${score}`;
    deathOverlay.classList.remove('hidden');
  }

  function pickupAt(x, y) {
    const it = itemAt(x, y);
    if (!it) return;
    if (it.type === 'gold') {
      state.player.gold += it.amount;
      log(`You find ${it.amount} gold.`);
      state.items.splice(state.items.indexOf(it), 1);
    } else if (it.type === 'potion') {
      if (state.player.potions.length >= 8) {
        log('Your pack is full. You leave the potion.');
        return;
      }
      state.player.potions.push({
        effect: it.effect
      });
      const known = state.identified[it.effect];
      const appearance = state.appearanceForEffect[it.effect];
      log(known ? `You pick up a Potion of ${it.effect}.` : `You pick up a ${appearance} Potion.`);
      state.items.splice(state.items.indexOf(it), 1);
    }
  }

  function quaffPotion(idx) {
    if (!state.alive) return;
    const p = state.player;
    const pot = p.potions[idx];
    if (!pot) return;
    p.potions.splice(idx, 1);
    const eff = pot.effect;
    state.identified[eff] = true;
    switch (eff) {
      case 'Healing':
        p.hp = Math.min(p.maxHp, p.hp + 14);
        log('Warmth spreads through you. You feel healed.', true);
        break;
      case 'Poison':
        p.hp -= 8;
        log('The potion burns! It was poison!', true);
        if (p.hp <= 0) {
          p.hp = 0;
          die(`Succumbed to poison on depth ${state.depth}.`);
        }
        break;
      case 'Strength':
        p.atk += 1;
        log('Your muscles surge with power.', true);
        break;
      case 'Weakness':
        p.atk = Math.max(1, p.atk - 1);
        log('You feel your strength drain away.', true);
        break;
      case 'Fortitude':
        p.maxHp += 6;
        p.hp += 6;
        log('Your body feels tougher.', true);
        break;
      case 'Clairvoyance':
        for (let y = 0; y < ROWS; y++)
          for (let x = 0; x < COLS; x++)
            if (state.grid[y][x] !== '#') state.visited.add(key(x, y));
        log('The manor\'s layout flashes into your mind.', true);
        break;
    }
    render();
  }

  function tryMove(dx, dy) {
    if (!state.alive) return;
    const p = state.player;
    const nx = p.x + dx,
      ny = p.y + dy;
    if (dx === 0 && dy === 0) {
      log('You wait.');
      monsterTurn();
      render();
      return;
    }
    if (!isWalkable(nx, ny)) return;
    const m = monsterAt(nx, ny);
    if (m) {
      playerAttackMonster(m);
    } else {
      p.x = nx;
      p.y = ny;
      pickupAt(nx, ny);
    }
    recomputeVisibility();
    if (state.alive) monsterTurn();
    render();
  }

  function monsterTurn() {
    for (const m of state.monsters) {
      if (m.hp <= 0) continue;
      const distToPlayer = Math.hypot(m.x - state.player.x, m.y - state.player.y);
      if (!m.awake) {
        if (distToPlayer <= 7 && hasLOS(m.x, m.y, state.player.x, state.player.y)) {
          m.awake = true;
        } else {
          continue;
        }
      }
      const dxp = state.player.x - m.x,
        dyp = state.player.y - m.y;
      if (Math.abs(dxp) <= 1 && Math.abs(dyp) <= 1 && !(dxp === 0 && dyp === 0)) {
        monsterAttackPlayer(m);
        if (!state.alive) return;
        continue;
      }
      let stepx = 0,
        stepy = 0;
      if (m.erratic && Math.random() < 0.4) {
        stepx = choice([-1, 0, 1]);
        stepy = choice([-1, 0, 1]);
      } else {
        stepx = dxp === 0 ? 0 : (dxp > 0 ? 1 : -1);
        stepy = dyp === 0 ? 0 : (dyp > 0 ? 1 : -1);
        if (Math.abs(dxp) < Math.abs(dyp)) stepx = 0;
        else if (Math.abs(dyp) < Math.abs(dxp)) stepy = 0;
      }
      const nx = m.x + stepx,
        ny = m.y + stepy;
      if (isWalkable(nx, ny) && !monsterAt(nx, ny) && !(nx === state.player.x && ny === state.player.y)) {
        m.x = nx;
        m.y = ny;
      }
    }
    state.monsters = state.monsters.filter(m => m.hp > 0 || true);
  }

  function descend() {
    if (!state.alive) return;
    const p = state.player;
    if (p.x !== state.stairs.x || p.y !== state.stairs.y) {
      log('You must stand on the stairs (>) to descend.');
      return;
    }
    state.depth++;
    log(`You descend to depth ${state.depth}...`, true);
    generateLevel();
    render();
  }

  function render() {
    depthLabel.textContent = 'Depth ' + state.depth;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = '16px monospace';
    ctx.textBaseline = 'top';
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const k = key(x, y);
        const vis = state.visible.has(k);
        const seen = state.visited.has(k);
        if (!seen) continue;
        const t = state.grid[y][x];
        let ch = ' ',
          color = null;
        if (t === '#') {
          ch = '#';
          color = vis ? '#1f6b38' : '#0c2b16';
        } else if (t === '.') {
          ch = '·';
          color = vis ? '#123a1f' : '#08170c';
        } else if (t === '>') {
          ch = '>';
          color = vis ? '#ffb000' : '#5a3f00';
        }
        drawGlyph(x, y, ch, color, vis);
      }
    }
    for (const it of state.items) {
      const k = key(it.x, it.y);
      if (!state.visited.has(k)) continue;
      const vis = state.visible.has(k);
      if (it.type === 'gold') {
        drawGlyph(it.x, it.y, '$', vis ? '#ffd93d' : '#6b5a1a', vis);
      } else if (it.type === 'potion') {
        drawGlyph(it.x, it.y, '!', vis ? '#7fdfff' : '#274a52', vis);
      }
    }
    for (const m of state.monsters) {
      if (m.hp <= 0) continue;
      const k = key(m.x, m.y);
      if (!state.visible.has(k)) continue;
      drawGlyph(m.x, m.y, m.sym, m.color, true);
    }
    drawGlyph(state.player.x, state.player.y, '@', '#39ff6a', true, true);
    renderPanel();
    renderPotionButtons();
  }

  function drawGlyph(x, y, ch, color, glow, extraGlow) {
    if (!color) return;
    ctx.save();
    if (glow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = extraGlow ? 12 : 6;
    }
    ctx.fillStyle = color;
    ctx.fillText(ch, x * TILE + 3, y * TILE + 2);
    ctx.restore();
  }

  function renderPanel() {
    const p = state.player;
    const hpPct = Math.max(0, p.hp / p.maxHp * 100);
    const lowClass = hpPct < 30 ? ' low' : '';
    let html = '';
    html += `<h2>ADVENTURER</h2>`;
    html += `<div class="row"><span class="label">HP</span><span>${p.hp}/${p.maxHp}</span></div>`;
    html += `<div class="hpbar-wrap"><div class="hpbar${lowClass}" style="width:${hpPct}%"></div></div>`;
    html += `<div class="row"><span class="label">ATK</span><span>${p.atk}</span></div>`;
    html += `<div class="row"><span class="label">DEF</span><span>${p.def}</span></div>`;
    html += `<div class="row"><span class="label">LEVEL</span><span>${p.level}</span></div>`;
    html += `<div class="row"><span class="label">XP</span><span>${p.xp}/${p.level*20}</span></div>`;
    html += `<div class="row"><span class="label">GOLD</span><span>${p.gold}</span></div>`;
    html += `<h2>PACK</h2>`;
    if (p.potions.length === 0) {
      html += `<div class="inv-empty">(empty)</div>`;
    } else {
      p.potions.forEach((pot, i) => {
        const known = state.identified[pot.effect];
        const label = known ? `Potion of ${pot.effect}` : `${state.appearanceForEffect[pot.effect]} Potion`;
        html += `<div class="inv-item" data-idx="${i}">${i+1}. ${label}</div>`;
      });
    }
    panelEl.innerHTML = html;
    panelEl.querySelectorAll('.inv-item').forEach(el => {
      el.addEventListener('click', () => quaffPotion(parseInt(el.dataset.idx, 10)));
    });
  }

  function renderPotionButtons() {
    const p = state.player;
    if (p.potions.length === 0) {
      potionButtonsEl.innerHTML = '';
      return;
    }
    potionButtonsEl.innerHTML = p.potions.map((pot, i) => {
      const known = state.identified[pot.effect];
      const label = known ? pot.effect.slice(0, 4) : state.appearanceForEffect[pot.effect].slice(0, 4);
      return `<button data-qidx="${i}">${i+1}:${label}</button>`;
    }).join('');
    potionButtonsEl.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => quaffPotion(parseInt(btn.dataset.qidx, 10)));
    });
  }
  const DIR = {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0],
    wait: [0, 0]
  };
  document.querySelectorAll('.dpad button').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = DIR[btn.dataset.dir];
      tryMove(d[0], d[1]);
    });
  });
  document.getElementById('descendBtn').addEventListener('click', descend);
  document.getElementById('restartBtn').addEventListener('click', () => {
    deathOverlay.classList.add('hidden');
    newGame();
  });
  window.addEventListener('keydown', (e) => {
    if (!state.alive) {
      if (e.key === 'r' || e.key === 'R') {
        deathOverlay.classList.add('hidden');
        newGame();
      }
      return;
    }
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') {
      e.preventDefault();
      tryMove(0, -1);
    } else if (k === 'arrowdown' || k === 's') {
      e.preventDefault();
      tryMove(0, 1);
    } else if (k === 'arrowleft' || k === 'a') {
      e.preventDefault();
      tryMove(-1, 0);
    } else if (k === 'arrowright' || k === 'd') {
      e.preventDefault();
      tryMove(1, 0);
    } else if (k === ' ') {
      e.preventDefault();
      tryMove(0, 0);
    } else if (k === '>' || k === 'enter') {
      e.preventDefault();
      descend();
    } else if (/^[1-8]$/.test(k)) {
      quaffPotion(parseInt(k, 10) - 1);
    }
  });
  newGame();
})();