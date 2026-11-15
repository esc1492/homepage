// Lode Runner core logic. No DOM/browser APIs.

export const W = 28;
export const H = 16;

export const TILE = {
  EMPTY: 0,
  BRICK: 1,      // diggable brick
  SOLID: 2,      // undiggable block
  LADDER: 3,
  BAR: 4,        // hand-over-hand bar
  TRAPDOOR: 5,   // diggable, opens like a trapdoor
  HIDDEN: 6,     // ladder revealed when all gold is taken
  GOLD: 7,
  ENEMY: 8,      // spawn marker
  PLAYER: 9,     // spawn marker
};

const HOLE = 10; // internal: temporary hole

// ms per tile. 원작 화면 캡처에서 잰 값이 기준입니다 — 걷기 약 260ms/칸, climb 300 · fall 155.
// 2026-11-15 이력: 네 값을 1.619배 늦췄다(421) → 달리기 애니메이션을 왕복으로 고친 뒤 원작 속도(260)로
// 되돌렸다 → 걷기를 240·230 으로 올려 가며 감각을 봤다 → 최종적으로 **걷기는 원작값 260**, **경비병은
// 원작값(285)의 50% 느린 428** 로 정했습니다. 걷기를 바꿀 때 `POSE_PER_TILE` 은 건드리지 마십시오
// (거리 비례라 걸음이 칸에 붙어 유지됩니다).
export const SPEED = { walk: 260, climb: 300, fall: 155, guard: 428 };
export const DIG_MS = 320;
export const HOLE_MS = 5200;
export const TRAP_MS = 2000; // 경비병이 구멍에서 기어 나오기까지 (주인공은 나오지 못함)
export const SCORE_GOLD = 250;
export const SCORE_GUARD = 75; // 가둘 때 +75, 구멍이 메워져 죽을 때 +75
export const SCORE_LEVEL = 1500;

export function parseLevel(map) {
  const tiles = new Uint8Array(W * H);
  let player = { c: 1, r: 1 };
  const guards = [];
  const hidden = [];
  let gold = 0;
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const raw = typeof map[r] === "string" ? map[r].charCodeAt(c) - 48 : map[r][c];
      const v = raw & 0x0f;
      let t = v;
      if (v === TILE.PLAYER) { player = { c, r }; t = TILE.EMPTY; }
      else if (v === TILE.ENEMY) { guards.push({ c, r }); t = TILE.EMPTY; }
      else if (v === TILE.HIDDEN) { hidden.push(r * W + c); }
      else if (v === TILE.GOLD) { gold++; }
      tiles[r * W + c] = t;
    }
  }
  return { tiles, player, guards, gold, hidden };
}

function makeChar(c, r) {
  // x: 가로 위치(칸 단위 소수). 주인공은 누르고 있는 동안 연속으로 움직이므로
  // 칸과 칸 사이에 설 수 있습니다. 경비병은 칸 단위로만 움직여 x 를 쓰지 않습니다.
  return { c, r, x: c, pc: c, pr: r, dir: 1, timer: 0, vt: 0, digUntil: 0, trappedAt: 0, moving: false };
}

export class Game {
  constructor(levelMap, { lives = 5, level = 1, score = 0 } = {}) {
    this.map = levelMap;
    this.level = level;
    this.lives = lives;
    this.score = score;
    this.reset();
  }

  reset() {
    const p = parseLevel(this.map);
    this.tiles = p.tiles;
    this.hidden = p.hidden;
    this.goldLeft = p.gold;
    this.revealed = false;
    this.player = makeChar(p.player.c, p.player.r);
    this.guards = p.guards.map((g) => makeChar(g.c, g.r));
    this.holes = new Map();
    this.time = 0;
    this.pendingDig = null;
    this.state = "playing"; // playing | dead | complete | gameover
    this.deadTimer = 0;
  }

  tileAt(c, r) {
    if (c < 0 || c >= W) return TILE.SOLID;
    if (r < 0) return TILE.EMPTY;
    if (r >= H) return TILE.SOLID;
    const idx = r * W + c;
    if (this.holes.has(idx)) return HOLE;
    return this.tiles[idx];
  }

  rawTileAt(c, r) {
    if (c < 0 || c >= W || r < 0 || r >= H) return TILE.SOLID;
    return this.tiles[r * W + c];
  }

  walkableAt(c, r) {
    const t = this.tileAt(c, r);
    return t !== TILE.BRICK && t !== TILE.SOLID && t !== TILE.TRAPDOOR;
  }

  supportedAt(c, r) {
    const t = this.tileAt(c, r);
    if (t === TILE.LADDER || t === TILE.BAR) return true;
    const b = this.tileAt(c, r + 1);
    if (b === HOLE) return !!this.guardAt(c, r + 1);
    return b === TILE.BRICK || b === TILE.SOLID || b === TILE.TRAPDOOR || b === TILE.LADDER || b === TILE.BAR;
  }

  guardAt(c, r) {
    return this.guards.find((g) => g.c === c && g.r === r) || null;
  }

  // 주인공은 칸 사이에 서므로, 발이 걸쳐 있는 옆 칸도 디딤으로 쳐 줍니다.
  // (이게 없으면 사다리 칸의 오른쪽 절반에 서 있을 때 옆 칸 기준으로 판정되어 떨어집니다)
  supported(ch) {
    if (this.supportedAt(ch.c, ch.r)) return true;
    if (ch !== this.player) return false; // 경비병은 칸 단위로만 판정합니다
    const x = ch.x ?? ch.c;
    if (x === ch.c) return false;
    for (const c of [Math.floor(x), Math.ceil(x)]) {
      if (c !== ch.c && Math.abs(c - x) <= 0.7 && this.supportedAt(c, ch.r)) return true;
    }
    return false;
  }

  update(dt, input = {}) {
    if (this.state === "dead") {
      this.deadTimer -= dt;
      if (this.deadTimer <= 0) this.respawn();
      return;
    }
    if (this.state !== "playing") return;

    this.time += dt;
    if (input.dig) this.pendingDig = { dir: input.dig, until: this.time + 250 };
    this.updateHoles();

    if (this.state === "playing") this.updatePlayer(dt, input);
    if (this.state !== "playing") return;

    for (const g of this.guards) {
      g.timer += dt;
      while (g.timer >= SPEED.guard) {
        g.timer -= SPEED.guard;
        this.stepGuard(g);
      }
      // 경비병 그림 위치(x)는 목표 칸을 향해 같은 속도로 따라갑니다. 논리 칸(c)만 보면
      // 그림이 아직 한 칸 떨어져 있는데도 붙은 것으로 판정되어 "안 닿았는데 죽는" 일이 생깁니다.
      if (g.x !== g.c) {
        const d = Math.sign(g.c - g.x);
        const nx = g.x + (d * dt) / SPEED.guard;
        g.x = d > 0 ? Math.min(nx, g.c) : Math.max(nx, g.c);
      }
    }
    this.checkContact();
  }

  // 주인공 이동: 가로는 누르고 있는 동안 연속으로, 세로(사다리·낙하)는 칸 단위로.
  updatePlayer(dt, input) {
    const p = this.player;
    p.moving = false;
    if (this.time < p.digUntil) return;

    const idx = p.r * W + p.c;
    // 원작처럼 구멍에 빠지면 구멍이 메워질 때까지 나올 수 없습니다
    if (this.holes.has(idx)) return;

    // 발밑이 비면 걷기보다 낙하가 먼저입니다 (구멍 위 포함)
    if (!this.supported(p)) {
      p.x = p.c;
      p.vt += dt;
      while (p.vt >= SPEED.fall && this.state === "playing") {
        p.vt -= SPEED.fall;
        this.moveChar(p, p.c, p.r + 1);
      }
      return;
    }

    // 연속 이동이라 사다리 칸 중앙에 딱 서 있지 않을 수 있습니다. 반 칸 안에 사다리가 있으면
    // 그 열로 붙여서 오르내릴 수 있게 합니다.
    const ladderCol = this.ladderColumn(p, input);
    if (ladderCol !== null) {
      // 누르는 순간 첫 칸을 바로 오르내립니다. 타이머가 찰 때까지 기다리면 짧게 눌렀을 때
      // 아무 반응이 없어 "못 올라간다"고 느껴집니다 (2026-11-15 동완님 확인).
      if (!p.climbing) p.vt = Math.max(p.vt, SPEED.climb - dt);
      p.climbing = true;
      p.pc = p.c;
      p.c = ladderCol;
      p.x = ladderCol; // 사다리에서는 칸 가운데에 맞춥니다
      p.vt += dt;
      while (p.vt >= SPEED.climb && this.state === "playing") {
        p.vt -= SPEED.climb;
        const up = input.up && (this.tileAt(p.c, p.r) === TILE.LADDER || this.tileAt(p.c, p.r - 1) === TILE.LADDER) && this.walkableAt(p.c, p.r - 1);
        const down = input.down && this.tileAt(p.c, p.r + 1) === TILE.LADDER;
        if (up) this.moveChar(p, p.c, p.r - 1);
        else if (down) this.moveChar(p, p.c, p.r + 1);
        else break;
      }
      return;
    }
    p.climbing = false;
    p.vt = 0;

    const digDir = input.dig || (this.pendingDig && this.time <= this.pendingDig.until ? this.pendingDig.dir : 0);
    if (digDir) { this.dig(digDir); this.pendingDig = null; return; }

    if (input.dir) this.walkHoriz(input.dir, dt);
  }

  // 오르내릴 수 있는 사다리 열을 찾습니다 (지금 열, 또는 반 칸 넘게 벗어나지 않은 옆 열).
  ladderColumn(p, input) {
    const x = p.x;
    for (const c of [Math.round(x), Math.floor(x), Math.ceil(x)]) {
      if (Math.abs(c - x) > 0.75) continue;
      const onLadder = this.tileAt(c, p.r) === TILE.LADDER;
      if (input.up && (onLadder || this.tileAt(c, p.r - 1) === TILE.LADDER) && this.walkableAt(c, p.r - 1)) return c;
      if (input.down && this.tileAt(c, p.r + 1) === TILE.LADDER) return c;
    }
    return null;
  }

  // 누르고 있는 동안만 가로로 움직입니다. 손을 떼면 그 자리(칸 사이 포함)에서 섭니다.
  walkHoriz(dir, dt) {
    const p = this.player;
    p.dir = dir;
    const nx = p.x + (dir * dt) / SPEED.walk;
    const nc = Math.round(nx);
    if (nc !== p.c) {
      // 반 칸을 넘어 다음 칸으로 들어가려는 순간에 벽·바닥 여부를 봅니다
      if (!this.walkableAt(nc, p.r)) { p.x = p.c; return; }
      p.pc = p.c; p.pr = p.r;
      p.c = nc;
      p.moving = true;
      this.onPlayerTile(nc, p.r);
    }
    p.x = nx;
  }

  stepGuard(g) {
    const idx = g.r * W + g.c;
    // 구멍에 빠진 경비병은 잠시 뒤 기어 나옵니다. 그 전에 구멍이 메워지면 죽습니다.
    if (this.holes.has(idx)) {
      if (!g.trappedAt) g.trappedAt = this.time + TRAP_MS;
      if (this.time >= g.trappedAt && this.walkableAt(g.c, g.r - 1)) this.moveChar(g, g.c, g.r - 1);
      return;
    }
    g.trappedAt = 0;
    // 발밑이 비어 있으면 걷기보다 낙하가 먼저입니다 (구멍 위에 서면 빠짐)
    if (!this.supported(g)) { this.moveChar(g, g.c, g.r + 1); return; }
    // 원작처럼 주인공과 같은 줄이면 구멍을 피하지 않고 곧장 걸어갑니다.
    // BFS 는 구멍 너머로 가는 길을 찾지 못해 경비병이 구멍 앞에서 멈추기 때문입니다.
    const p = this.player;
    if (g.r === p.r && this.tileAt(g.c, g.r) !== TILE.LADDER) {
      const dir = Math.sign(p.c - g.c);
      if (dir && this.walkableAt(g.c + dir, g.r)) {
        this.moveChar(g, g.c + dir, g.r);
        return;
      }
    }
    const next = this.bfsStep(g.c, g.r, p.c, p.r);
    if (next) this.moveChar(g, next.c, next.r);
  }

  neighbors(c, r) {
    const out = [];
    if (c < 0 || c >= W || r >= H) return out;
    const t = this.tileAt(c, r);
    const supported = this.supportedAt(c, r);
    const below = this.tileAt(c, r + 1);
    if (!supported) {
      if (r + 1 < H) out.push((r + 1) * W + c);
      return out;
    }
    if (t === TILE.LADDER && this.walkableAt(c, r - 1)) out.push((r - 1) * W + c);
    if (below === TILE.LADDER) out.push((r + 1) * W + c);
    for (const d of [-1, 1]) if (this.walkableAt(c + d, r)) out.push(r * W + c + d);
    return out;
  }

  bfsStep(fromC, fromR, toC, toR) {
    const start = fromR * W + fromC;
    const goal = toR * W + toC;
    if (start === goal) return null;
    const prev = new Int32Array(W * H).fill(-1);
    prev[start] = start;
    const queue = [start];
    for (let qi = 0; qi < queue.length; qi++) {
      const cur = queue[qi];
      if (cur === goal) {
        let s = goal;
        while (prev[s] !== start && prev[s] !== s && prev[s] !== -1) s = prev[s];
        if (prev[s] === -1) return null;
        return { c: s % W, r: (s / W) | 0 };
      }
      for (const n of this.neighbors(cur % W, (cur / W) | 0)) {
        if (prev[n] === -1) { prev[n] = cur; queue.push(n); }
      }
    }
    return null;
  }

  moveChar(ch, c, r) {
    if (r >= H) return;
    if (r < 0) r = 0;
    ch.pc = ch.c; ch.pr = ch.r;
    ch.c = c; ch.r = r;
    ch.moving = true;
    if (ch === this.player) {
      ch.x = c; // 세로 이동은 칸 가운데로 맞춥니다
      this.onPlayerTile(c, r);
    } else if (this.holes.has(r * W + c)) {
      // 경비병을 구멍에 가두면 +75 (원작). 구멍이 메워져 죽으면 updateHoles 에서 +75 더
      this.score += SCORE_GUARD;
    }
  }

  onPlayerTile(c, r) {
    const t = this.tileAt(c, r);
    if (t === TILE.GOLD) {
      this.tiles[r * W + c] = TILE.EMPTY;
      this.goldLeft--;
      this.score += SCORE_GOLD;
      if (this.goldLeft <= 0) this.revealLadders();
    }
    if (this.revealed && r === 0) {
      this.state = "complete";
      this.score += SCORE_LEVEL;
    }
  }

  revealLadders() {
    if (this.revealed) return;
    this.revealed = true;
    for (const idx of this.hidden) this.tiles[idx] = TILE.LADDER;
  }

  dig(dir) {
    const p = this.player;
    const tc = p.c + dir;
    const tr = p.r + 1;
    const t = this.rawTileAt(tc, tr);
    if (t !== TILE.BRICK && t !== TILE.TRAPDOOR) return;
    const idx = tr * W + tc;
    if (this.holes.has(idx)) return;
    this.holes.set(idx, { refillAt: this.time + HOLE_MS });
    p.digUntil = this.time + DIG_MS;
    p.dir = dir;
  }

  updateHoles() {
    for (const [idx, h] of [...this.holes]) {
      if (this.time >= h.refillAt) {
        const c = idx % W;
        const r = (idx / W) | 0;
        this.holes.delete(idx);
        if (this.player.c === c && this.player.r === r) { this.killPlayer(); continue; }
        for (const g of this.guards) {
          if (g.c === c && g.r === r) { g.dead = true; this.score += SCORE_GUARD; }
        }
      }
    }
    if (this.guards.some((g) => g.dead)) this.guards = this.guards.filter((g) => !g.dead);
  }

  checkContact() {
    const p = this.player;
    for (const g of this.guards) {
      // 실제 그림 위치끼리 반 칸 안으로 겹쳤을 때만 잡히도록 합니다
      if (g.r === p.r && Math.abs((g.x ?? g.c) - p.x) < 0.5) { this.killPlayer(); return; }
    }
  }

  killPlayer() {
    if (this.state !== "playing") return;
    this.lives--;
    if (this.lives <= 0) { this.lives = 0; this.state = "gameover"; return; }
    this.state = "dead";
    this.deadTimer = 1200;
  }

  respawn() {
    const { lives, score, level } = this;
    this.reset();
    this.lives = lives;
    this.score = score;
    this.level = level;
    this.state = "playing";
  }
}
