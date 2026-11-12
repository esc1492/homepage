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

// ms per tile. 원작 화면 캡처에서 잰 간격(걷기 약 260ms/칸)에 맞췄습니다.
export const SPEED = { walk: 260, climb: 300, fall: 155, guard: 285 };
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
  return { c, r, pc: c, pr: r, dir: 1, timer: 0, digUntil: 0, trappedAt: 0, moving: false };
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
    this.pendingDir = null;
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

  supported(ch) {
    return this.supportedAt(ch.c, ch.r);
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
    // 걸음은 260ms 마다 한 번인데 키는 그보다 짧게 눌릴 수 있습니다. 짧게 눌러도 다음
    // 걸음 시점에 반영되도록 방향 입력을 잠시 받아 둡니다 (파기 입력과 같은 방식).
    if (input.dir) this.pendingDir = { dir: input.dir, until: this.time + SPEED.walk * 1.2 };
    this.updateHoles();

    const p = this.player;
    p.timer += dt;
    let stepMs = this.supported(p) ? SPEED.walk : SPEED.fall;
    if (this.tileAt(p.c, p.r) === TILE.LADDER) stepMs = input.up || input.down ? SPEED.climb : SPEED.walk;
    while (p.timer >= stepMs && this.state === "playing") {
      p.timer -= stepMs;
      this.stepPlayer(input);
      stepMs = this.supported(p) ? SPEED.walk : SPEED.fall;
      if (this.tileAt(this.player.c, this.player.r) === TILE.LADDER && (input.up || input.down)) stepMs = SPEED.climb;
    }
    if (this.state !== "playing") return;

    for (const g of this.guards) {
      g.timer += dt;
      while (g.timer >= SPEED.guard) {
        g.timer -= SPEED.guard;
        this.stepGuard(g);
      }
    }
    this.checkContact();
  }

  stepPlayer(input) {
    const p = this.player;
    p.moving = false;
    if (this.time < p.digUntil) return;

    const idx = p.r * W + p.c;
    // 원작처럼 구멍에 빠지면 구멍이 메워질 때까지 나올 수 없습니다
    if (this.holes.has(idx)) return;
    if (!this.supported(p)) { this.moveChar(p, p.c, p.r + 1); return; }

    const onLadder = this.tileAt(p.c, p.r) === TILE.LADDER;
    const below = this.tileAt(p.c, p.r + 1);

    const aboveIsLadder = this.tileAt(p.c, p.r - 1) === TILE.LADDER;
    const digDir = input.dig || (this.pendingDig && this.time <= this.pendingDig.until ? this.pendingDig.dir : 0);
    if (digDir && this.supported(p)) { this.dig(digDir); this.pendingDig = null; return; }
    if (input.up && (onLadder || aboveIsLadder) && this.walkableAt(p.c, p.r - 1)) { this.moveChar(p, p.c, p.r - 1); return; }
    if (input.down && below === TILE.LADDER) { this.moveChar(p, p.c, p.r + 1); return; }
    // 이번 프레임에 키가 없어도, 조금 전에 눌렸던 방향이면 한 걸음 반영합니다
    const dir = input.dir || (this.pendingDir && this.time <= this.pendingDir.until ? this.pendingDir.dir : 0);
    if (dir && this.walkableAt(p.c + dir, p.r)) {
      p.dir = dir;
      this.pendingDir = null;
      this.moveChar(p, p.c + dir, p.r);
      return;
    }
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
    } else if (this.holes.has(r * W + c)) {
      // 경비병을 구멍에 가두면 +75 (원작). 구멍이 메워져 죽으면 updateHoles 에서 +75 더
      this.score += SCORE_GUARD;
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
    for (const g of this.guards) {
      if (g.c === this.player.c && g.r === this.player.r) { this.killPlayer(); return; }
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
