import streamlit as st
import streamlit.components.v1 as components

st.set_page_config(page_title="테트리스", page_icon="🎮", layout="centered")
st.markdown("""
<style>
.stApp header, .stApp footer, .stAppDeployButton,
[data-testid="stAppDeployButton"], #MainMenu, #stDecoration,
[data-testid="stToolbar"], .stToolbar {
  display: none !important;
}
.stMainBlockContainer { padding-top: 40px !important; }
.block-container { padding-top: 40px !important; }
</style>
""", unsafe_allow_html=True)

GAME_HTML = """
<!DOCTYPE html>
<html lang="ko">
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #111; color: #eee; font-family: monospace; display: flex; justify-content: center; padding: 20px 0 0; }
#app { display: flex; gap: 14px; align-items: flex-start; justify-content: center; flex-wrap: wrap; }

/* board */
canvas#board { border: 2px solid #444; border-radius: 6px; background: #0d0d0d; display: block; touch-action: none; }

/* side panel */
#side { display: flex; flex-direction: column; gap: 10px; min-width: 110px; }
.panel { background: #1e1e1e; border: 1px solid #333; border-radius: 6px; padding: 8px 10px; }
.panel-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 4px; }
.panel-value { font-size: 22px; font-weight: 500; color: #fff; }
canvas#next { display: block; background: #0d0d0d; border-radius: 4px; }

/* start button */
#btn-start {
  width: 100%; padding: 9px; font-size: 14px; cursor: pointer;
  border-radius: 6px; border: 1px solid #555;
  background: #2a2a2a; color: #fff;
}
#btn-start:hover { background: #3a3a3a; }

/* mobile controls */
#controls {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}
.ctrl-row { display: flex; gap: 8px; justify-content: center; }
.ctrl-btn {
  width: 64px; height: 56px;
  font-size: 20px;
  cursor: pointer;
  border-radius: 8px;
  border: 1px solid #555;
  background: #1e1e1e;
  color: #fff;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  display: flex; align-items: center; justify-content: center;
}
.ctrl-btn:active { background: #3a3a3a; transform: scale(0.94); }
.ctrl-btn.wide { width: 140px; font-size: 13px; }
#key-hint { font-size: 10px; color: #555; text-align: center; line-height: 1.7; margin-top: 2px; }
</style>
</head>
<body>
<div id="app">
  <div style="display:flex;flex-direction:column;align-items:center;gap:10px;">
    <canvas id="board" width="200" height="400"></canvas>
    <div id="controls">
      <div class="ctrl-row">
        <button class="ctrl-btn" id="c-up" title="회전">↻</button>
      </div>
      <div class="ctrl-row">
        <button class="ctrl-btn" id="c-left" title="왼쪽">←</button>
        <button class="ctrl-btn" id="c-down" title="빠르게">↓</button>
        <button class="ctrl-btn" id="c-right" title="오른쪽">→</button>
      </div>
      <div class="ctrl-row">
        <button class="ctrl-btn wide" id="c-drop" title="즉시 드롭">⬇ DROP</button>
      </div>
      <div id="key-hint">키보드: ← → ↑ ↓ Space</div>
    </div>
  </div>

  <div id="side">
    <div class="panel">
      <div class="panel-label">점수</div>
      <div class="panel-value" id="score">0</div>
    </div>
    <div class="panel">
      <div class="panel-label">레벨</div>
      <div class="panel-value" id="level">1</div>
    </div>
    <div class="panel">
      <div class="panel-label">줄</div>
      <div class="panel-value" id="lines">0</div>
    </div>
    <div class="panel">
      <div class="panel-label">다음</div>
      <canvas id="next" width="80" height="80"></canvas>
    </div>
    <button id="btn-start">▶ 시작</button>
  </div>
</div>

<script>
const COLS=10,ROWS=20,SZ=20;
const bc=document.getElementById('board'),bx=bc.getContext('2d');
const nc=document.getElementById('next'),nx=nc.getContext('2d');
const COLORS=['','#FF4C4C','#FF9900','#FFD700','#4CAF50','#29B6F6','#7E57C2','#EC407A'];
const SHAPES=[
  [],
  [[1,1,1,1]],
  [[2,2],[2,2]],
  [[0,3,0],[3,3,3]],
  [[4,0],[4,0],[4,4]],
  [[0,5],[0,5],[5,5]],
  [[6,0],[6,6],[0,6]],
  [[0,7],[7,7],[7,0]]
];

let board,piece,next,score,level,lines,running,raf,lastT;

function newBoard(){return Array.from({length:ROWS},()=>Array(COLS).fill(0));}

function randPiece(){
  const id=Math.ceil(Math.random()*7);
  const m=SHAPES[id].map(r=>[...r]);
  return{id,m,x:Math.floor(COLS/2)-Math.floor(m[0].length/2),y:0};
}

function valid(p,dx=0,dy=0,m=p.m){
  for(let r=0;r<m.length;r++)
    for(let c=0;c<m[r].length;c++)
      if(m[r][c]){
        const nx2=p.x+c+dx,ny=p.y+r+dy;
        if(nx2<0||nx2>=COLS||ny>=ROWS)return false;
        if(ny>=0&&board[ny][nx2])return false;
      }
  return true;
}

function rotate(m){return m[0].map((_,c)=>m.map(r=>r[c]).reverse());}

function place(){
  piece.m.forEach((r,ri)=>r.forEach((v,ci)=>{if(v&&piece.y+ri>=0)board[piece.y+ri][piece.x+ci]=v;}));
  let cleared=0;
  for(let r=ROWS-1;r>=0;r--){
    if(board[r].every(v=>v)){board.splice(r,1);board.unshift(Array(COLS).fill(0));cleared++;r++;}
  }
  if(cleared){
    const pts=[0,100,300,500,800];
    score+=(pts[cleared]||0)*level;
    lines+=cleared;
    level=Math.floor(lines/10)+1;
  }
  document.getElementById('score').textContent=score;
  document.getElementById('level').textContent=level;
  document.getElementById('lines').textContent=lines;
  piece=next;next=randPiece();
  if(!valid(piece)){running=false;drawOver();}
  drawNext();
}

function drop(){if(valid(piece,0,1))piece.y++;else place();}

function hardDrop(){while(valid(piece,0,1))piece.y++;place();}

function doRotate(){
  const r=rotate(piece.m);
  if(valid(piece,0,0,r))piece.m=r;
  else if(valid(piece,1,0,r)){piece.x++;piece.m=r;}
  else if(valid(piece,-1,0,r)){piece.x--;piece.m=r;}
}

function drawCell(ctx,x,y,id){
  const cl=COLORS[id];
  ctx.fillStyle=cl;ctx.fillRect(x*SZ+1,y*SZ+1,SZ-2,SZ-2);
  ctx.fillStyle='rgba(255,255,255,0.3)';ctx.fillRect(x*SZ+1,y*SZ+1,SZ-2,3);
  ctx.fillStyle='rgba(0,0,0,0.2)';ctx.fillRect(x*SZ+1,y*SZ+SZ-4,SZ-2,3);
}

function drawBoard(){
  bx.fillStyle='#0d0d0d';bx.fillRect(0,0,bc.width,bc.height);
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(board[r][c])drawCell(bx,c,r,board[r][c]);
  piece.m.forEach((row,ri)=>row.forEach((v,ci)=>{if(v)drawCell(bx,piece.x+ci,piece.y+ri,piece.id);}));
  // grid
  bx.strokeStyle='rgba(255,255,255,0.04)';bx.lineWidth=0.5;
  for(let c=1;c<COLS;c++){bx.beginPath();bx.moveTo(c*SZ,0);bx.lineTo(c*SZ,ROWS*SZ);bx.stroke();}
  for(let r=1;r<ROWS;r++){bx.beginPath();bx.moveTo(0,r*SZ);bx.lineTo(COLS*SZ,r*SZ);bx.stroke();}
}

function drawNext(){
  nx.fillStyle='#0d0d0d';nx.fillRect(0,0,80,80);
  const m=next.m,os=8;
  const ox=Math.floor((4-m[0].length)/2),oy=Math.floor((4-m.length)/2);
  m.forEach((r,ri)=>r.forEach((v,ci)=>{
    if(v){nx.fillStyle=COLORS[v];nx.fillRect((ox+ci)*os*2+8,(oy+ri)*os*2+8,os*2-2,os*2-2);}
  }));
}

function drawOver(){
  bx.fillStyle='rgba(0,0,0,0.65)';bx.fillRect(0,ROWS*SZ/2-34,COLS*SZ,68);
  bx.fillStyle='#fff';bx.font='bold 17px monospace';bx.textAlign='center';
  bx.fillText('GAME OVER',COLS*SZ/2,ROWS*SZ/2-10);
  bx.font='12px monospace';bx.fillStyle='#aaa';
  bx.fillText('점수: '+score,COLS*SZ/2,ROWS*SZ/2+16);
  document.getElementById('btn-start').textContent='▶ 다시 시작';
}

function loop(ts){
  if(!running)return;
  if(!lastT)lastT=ts;
  const spd=Math.max(80,800-(level-1)*70);
  if(ts-lastT>spd){drop();lastT=ts;}
  drawBoard();
  raf=requestAnimationFrame(loop);
}

function start(){
  board=newBoard();score=0;level=1;lines=0;running=true;lastT=0;
  document.getElementById('score').textContent='0';
  document.getElementById('level').textContent='1';
  document.getElementById('lines').textContent='0';
  piece=randPiece();next=randPiece();drawNext();
  cancelAnimationFrame(raf);
  raf=requestAnimationFrame(loop);
  document.getElementById('btn-start').textContent='▶ 재시작';
}

document.getElementById('btn-start').addEventListener('click',start);

// keyboard
document.addEventListener('keydown',e=>{
  if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' '].includes(e.key))e.preventDefault();
  if(!running)return;
  if(e.key==='ArrowLeft'){if(valid(piece,-1,0))piece.x--;}
  else if(e.key==='ArrowRight'){if(valid(piece,1,0))piece.x++;}
  else if(e.key==='ArrowDown'){drop();lastT=performance.now();}
  else if(e.key==='ArrowUp'){doRotate();}
  else if(e.key===' '){hardDrop();}
  drawBoard();
});

// mobile buttons — prevent default to avoid scroll
function addCtrl(id,fn){
  const el=document.getElementById(id);
  el.addEventListener('touchstart',e=>{e.preventDefault();if(running){fn();drawBoard();}},{passive:false});
  el.addEventListener('mousedown',e=>{if(running){fn();drawBoard();}});
}
addCtrl('c-left',()=>{if(valid(piece,-1,0))piece.x--;});
addCtrl('c-right',()=>{if(valid(piece,1,0))piece.x++;});
addCtrl('c-up',()=>doRotate());
addCtrl('c-down',()=>{drop();lastT=performance.now();});
addCtrl('c-drop',()=>hardDrop());

// swipe on board
let tx0,ty0;
bc.addEventListener('touchstart',e=>{tx0=e.touches[0].clientX;ty0=e.touches[0].clientY;e.preventDefault();},{passive:false});
bc.addEventListener('touchend',e=>{
  if(!running)return;
  const dx=e.changedTouches[0].clientX-tx0,dy=e.changedTouches[0].clientY-ty0;
  if(Math.abs(dx)<12&&Math.abs(dy)<12){doRotate();}
  else if(Math.abs(dx)>Math.abs(dy)){
    if(dx>0&&valid(piece,1,0))piece.x++;
    else if(dx<0&&valid(piece,-1,0))piece.x--;
  } else if(dy>30){hardDrop();}
  drawBoard();
},{passive:false});

// initial screen
bx.fillStyle='#0d0d0d';bx.fillRect(0,0,bc.width,bc.height);
bx.fillStyle='rgba(255,255,255,0.2)';bx.font='13px monospace';bx.textAlign='center';
bx.fillText('▶ 시작을 눌러주세요',COLS*SZ/2,ROWS*SZ/2);
nx.fillStyle='#0d0d0d';nx.fillRect(0,0,80,80);
</script>
</body>
</html>
"""

components.html(GAME_HTML, height=700, scrolling=False)
