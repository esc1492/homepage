import streamlit as st
import streamlit.components.v1 as components
import base64

def sound_b64(name):
    with open(f'sound/{name}.mp3', 'rb') as f:
        return base64.b64encode(f.read()).decode()

st.set_page_config(page_title="알카노이드", page_icon="🧱", layout="centered")
st.markdown("""
<style>
.stApp header, .stApp footer, .stAppDeployButton,
[data-testid="stAppDeployButton"], #MainMenu, #stDecoration,
[data-testid="stToolbar"], .stToolbar,
[data-testid="manage-app-button"] {
  display: none !important;
}
.stMainBlockContainer { padding-top: 30px !important; }
</style>
""", unsafe_allow_html=True)

sound_paddle_uri = 'data:audio/mp3;base64,' + sound_b64('swipe')
sound_launch_uri = 'data:audio/mp3;base64,' + sound_b64('drop')
sound_brick_uri = 'data:audio/mp3;base64,' + sound_b64('change')
sound_wall_uri = 'data:audio/mp3;base64,' + sound_b64('break')

GAME_HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="ko">
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #111; color: #eee; font-family: monospace; display: flex; justify-content: center; padding: 20px 0 0; }
#app { display: flex; flex-direction: column; align-items: center; gap: 14px; }

canvas#board { border: 2px solid #444; border-radius: 6px; background: #0a0a12; display: block; touch-action: none; max-width: 100%; height: auto; }

#game-area { display: flex; flex-direction: column; align-items: center; gap: 10px; }

@media (max-width: 540px) {
  body { padding: 4px 4px 0; overflow-x: hidden; }
  #game-area { gap: 3px; }
  #controls .ctrl-btn { width: 48px; height: 38px; font-size: 14px; }
  #controls .ctrl-btn.wide { width: 80px; font-size: 11px; }
  #controls { gap: 2px; margin-top: 0; }
  .ctrl-row { gap: 4px; }
  #key-hint { display: none; }
  #btn-start { font-size: 12px; padding: 5px; }
  canvas#board { max-width: 100%; height: auto; }
}

#btn-start {
  width: 100%; padding: 9px; font-size: 14px; cursor: pointer;
  border-radius: 6px; border: 1px solid #555;
  background: #2a2a2a; color: #fff;
}
#btn-start:hover { background: #3a3a3a; }

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
  <div id="game-area">
    <canvas id="board" width="400" height="580"></canvas>
    <div id="controls">
      <div class="ctrl-row">
        <button class="ctrl-btn" id="c-left" title="왼쪽">\u2190</button>
        <button class="ctrl-btn wide" id="c-launch" title="발사">🚀 LAUNCH</button>
        <button class="ctrl-btn" id="c-right" title="오른쪽">\u2192</button>
      </div>
      <div id="key-hint">⌨ ← → &nbsp;&nbsp;|&nbsp;&nbsp; 🖱 이동 &nbsp;&nbsp;|&nbsp;&nbsp; Space: 발사</div>
    </div>
      <button id="btn-start">▶ 시작</button>
  </div>

</div>

<script>
// Audio
const SOUNDS={
  paddle:'%%PADDLE_URI%%',
  launch:'%%LAUNCH_URI%%',
  brick:'%%BRICK_URI%%',
  wall:'%%WALL_URI%%'
};
const audios={};
['paddle','launch','brick','wall'].forEach(function(n){audios[n]=new Audio(SOUNDS[n]);});
let soundEnabled=true;
function playSound(n){if(soundEnabled&&audios[n]){var a=audios[n];a.currentTime=0;a.play().catch(function(){});}}

// Canvas
var W=400,H=580;
var BALL_R=7,PADDLE_W=80,PADDLE_H=12,PADDLE_Y=540;
var BALL_BASE=4;
var COLS=8,ROWS=6,BRICK_W=44,BRICK_H=16,GAP=4;
var BRICK_LEFT=(W-COLS*BRICK_W-(COLS-1)*GAP)/2;
var BRICK_TOP=48;
var BRICK_COLORS=['#FFD700','#4CAF50','#FF9800','#F44336','#2196F3','#9C27B0'];

var bc=document.getElementById('board'),bx=bc.getContext('2d');

// Stars
var stars=[];
(function(){for(var i=0;i<60;i++)stars.push({x:Math.random()*W,y:Math.random()*H,r:0.5+Math.random()*1.5,a:0.1+Math.random()*0.3});})();

// Color helpers
function hexToRgb(h){
  var v=parseInt(h.slice(1),16);
  return{v:v>>16&255,g:v>>8&255,b:v&255};
}
function rgbToHex(r,g,b){
  return'#'+[r,g,b].map(function(c){return Math.max(0,Math.min(255,Math.round(c))).toString(16).padStart(2,'0');}).join('');
}
function lighten(h,a){var c=hexToRgb(h);return rgbToHex(c.r+a,c.g+a,c.b+a);}
function darken(h,a){var c=hexToRgb(h);return rgbToHex(c.r-a,c.g-a,c.b-a);}

// Brick helper
function makeBrick(row,col,hp,maxHp,color,extra){
  var b={
    x:BRICK_LEFT+col*(BRICK_W+GAP),
    y:BRICK_TOP+row*(BRICK_H+GAP),
    w:BRICK_W,h:BRICK_H,
    color:color||BRICK_COLORS[row],
    visible:true,
    hp:hp||1,
    maxHp:maxHp||1,
    destructible:true,
    row:row,col:col
  };
  if(extra)for(var k in extra)b[k]=extra[k];
  return b;
}

function genLevel(n){
  var bricks=[],r,c,d,minC,maxC,isSilver;
  switch(n){
    case 0:
      for(r=0;r<ROWS;r++)for(c=0;c<COLS;c++)bricks.push(makeBrick(r,c));
      break;
    case 1:
      for(r=0;r<ROWS;r++)for(c=0;c<COLS;c++){
        d=Math.abs(c-3.5)+Math.abs(r-2.5);
        if(d<=3.5)bricks.push(makeBrick(r,c));
      }
      break;
    case 2:
      for(r=0;r<ROWS;r++)for(c=0;c<COLS;c++)
        if((r+c)%2===0){
          isSilver=r===2||r===3;
          bricks.push(makeBrick(r,c,isSilver?2:1,isSilver?2:null,isSilver?'#9E9E9E':null));
        }
      break;
    case 3:
      for(r=0;r<ROWS;r++)for(c=0;c<COLS;c++){
        minC=Math.floor(COLS/2-r/2);maxC=Math.ceil(COLS/2+r/2);
        if(c>=minC&&c<=maxC)bricks.push(makeBrick(r,c));
      }
      break;
    case 4:
      for(r=0;r<ROWS;r++)for(c=0;c<COLS;c++){
        if(r===0&&c>0&&c<COLS-1)
          bricks.push(makeBrick(r,c,99,99,'#B8860B',{destructible:false}));
        else if(r===ROWS-1&&c%2===0);
        else if(r===2&&(c===0||c===COLS-1));
        else if(r===4&&c===4);
        else{
          isSilver=r===3||r===4;
          bricks.push(makeBrick(r,c,isSilver?2:1,isSilver?2:null,isSilver?'#9E9E9E':null));
        }
      }
      break;
  }
  return bricks;
}

// Game state
var gameState='ready',score=0,lives=3,round=1,bricks=[];
var paddle={x:W/2-PADDLE_W/2,y:PADDLE_Y,w:PADDLE_W,h:PADDLE_H};
var ball={x:W/2,y:PADDLE_Y-BALL_R-1,r:BALL_R,dx:0,dy:0};
var raf,keysHeld={},mobileDir=0;

function clampPaddle(){paddle.x=Math.max(0,Math.min(W-paddle.w,paddle.x));}

function ballSpeed(){return BALL_BASE*(1+(round-1)*0.12);}

function launchBall(){
  if(gameState!=='ready')return;
  var spd=ballSpeed();
  var ang=(Math.random()-0.5)*0.7;
  ball.dx=spd*Math.sin(ang)||0.1;
  ball.dy=-spd*Math.cos(ang);
  gameState='playing';
  playSound('launch');
}

function resetBall(){
  ball.x=paddle.x+paddle.w/2;
  ball.y=paddle.y-ball.r-1;
  ball.dx=0;ball.dy=0;
  gameState='ready';
}

function loseLife(){
  lives--;playSound('wall');
  document.getElementById('lives').textContent='\u2764'.repeat(Math.max(0,lives));
  if(lives<=0){
    gameState='gameOver';
    document.getElementById('btn-start').textContent='\u25b6 \uac8c\uc784\uc624\ubc84';
  }else{
    gameState='lost';
    setTimeout(resetBall,800);
  }
}

function checkLevelComplete(){
  for(var i=0;i<bricks.length;i++)if(bricks[i].visible)return;
  round++;
  if(round>5){
    gameState='win';
    document.getElementById('btn-start').textContent='\u25b6 \uc2b9\ub9ac! \ub2e4\uc2dc \uc2dc\uc791';
  }else{
    gameState='levelComplete';
    document.getElementById('round').textContent=round;
    setTimeout(function(){
      bricks=genLevel(round-1);
      resetBall();
    },1200);
  }
}

function updateScore(){document.getElementById('score').textContent=score;}

// Drawing
function drawBackground(){
  bx.fillStyle='#0a0a12';bx.fillRect(0,0,W,H);
  for(var i=0;i<stars.length;i++){
    bx.fillStyle='rgba(255,255,255,'+stars[i].a+')';
    bx.beginPath();bx.arc(stars[i].x,stars[i].y,stars[i].r,0,Math.PI*2);bx.fill();
  }
}

function drawHUD(){
  bx.fillStyle='#888';bx.font='11px monospace';bx.textAlign='left';
  bx.fillText('SCORE',12,16);
  bx.fillStyle='#fff';bx.font='bold 16px monospace';
  bx.fillText(String(score).padStart(6,'0'),12,34);

  bx.textAlign='center';bx.fillStyle='#888';bx.font='11px monospace';
  bx.fillText('ROUND',W/2,16);
  bx.fillStyle='#fff';bx.font='bold 16px monospace';
  bx.fillText(round,W/2,34);

  bx.textAlign='right';bx.fillStyle='#888';bx.font='11px monospace';
  bx.fillText('LIVES',W-12,16);
  bx.fillStyle='#F44336';bx.font='16px monospace';
  bx.fillText('\u2764'.repeat(Math.max(0,lives)),W-12,34);

  bx.strokeStyle='rgba(255,255,255,0.08)';bx.lineWidth=1;
  bx.beginPath();bx.moveTo(0,42);bx.lineTo(W,42);bx.stroke();
}

function drawBrick(b){
  if(!b.visible)return;
  var x=b.x,y=b.y,w=b.w,h=b.h,color=b.color;

  bx.fillStyle=color;bx.fillRect(x,y,w,h);

  if(!b.destructible){
    bx.fillStyle='rgba(255,255,255,0.15)';
    bx.fillRect(x+4,y+4,w-8,2);bx.fillRect(x+4,y+4,2,h-8);
    bx.fillStyle='rgba(0,0,0,0.2)';
    bx.fillRect(x+4,y+h-6,w-8,2);bx.fillRect(x+w-6,y+4,2,h-8);
    // gold shine
    bx.fillStyle='rgba(255,255,200,0.08)';
    bx.fillRect(x+8,y+6,w-16,h-12);
  }else{
    bx.fillStyle=lighten(color,40);bx.fillRect(x,y,w,2);bx.fillRect(x,y,2,h);
    bx.fillStyle=darken(color,40);bx.fillRect(x,y+h-2,w,2);bx.fillRect(x+w-2,y,2,h);

    bx.fillStyle='rgba(255,255,255,0.06)';bx.fillRect(x+6,y+5,w-12,h-10);
  }

  if(b.maxHp>1){
    bx.fillStyle='rgba(255,255,255,0.15)';bx.fillRect(x+6,y+3,w-12,2);
    bx.fillStyle='rgba(0,0,0,0.25)';bx.fillRect(x+w-6,y+h-5,2,3);
    if(b.hp>0){
      bx.fillStyle=b.hp>1?'rgba(255,255,255,0.35)':'rgba(255,100,100,0.4)';
      bx.fillRect(x+3,y+h-5,(w-6)*(b.hp/b.maxHp),2);
    }
  }
}

function drawPaddle(){
  var x=paddle.x,y=paddle.y,w=paddle.w,h=paddle.h,r=h/2;

  var grad=bx.createLinearGradient(x,y,x,y+h);
  grad.addColorStop(0,'#c8d0dc');grad.addColorStop(0.25,'#e8ecf2');
  grad.addColorStop(0.5,'#b0b8c8');grad.addColorStop(0.8,'#8890a0');
  grad.addColorStop(1,'#586070');
  bx.fillStyle=grad;

  bx.beginPath();
  bx.moveTo(x+r,y);bx.lineTo(x+w-r,y);
  bx.quadraticCurveTo(x+w,y,x+w,y+r);
  bx.lineTo(x+w,y+h-r);
  bx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  bx.lineTo(x+r,y+h);
  bx.quadraticCurveTo(x,y+h,x,y+h-r);
  bx.lineTo(x,y+r);
  bx.quadraticCurveTo(x,y,x+r,y);
  bx.closePath();bx.fill();

  bx.strokeStyle='#4a5260';bx.lineWidth=1;bx.stroke();

  bx.fillStyle='rgba(255,255,255,0.45)';bx.fillRect(x+12,y+2,w-24,1.5);
  bx.fillStyle='rgba(255,255,255,0.2)';bx.fillRect(x+10,y+h-4,w-20,1);

  bx.fillStyle='#2979FF';
  bx.shadowColor='#2979FF';bx.shadowBlur=4;
  bx.beginPath();bx.arc(x+8,y+h/2,2,0,Math.PI*2);bx.fill();
  bx.beginPath();bx.arc(x+w-8,y+h/2,2,0,Math.PI*2);bx.fill();
  bx.shadowBlur=0;

  bx.fillStyle='rgba(41,121,255,0.12)';bx.fillRect(x+w/2-7,y+3,14,h-6);
}

function drawBall(){
  bx.fillStyle='rgba(255,255,255,0.1)';
  bx.beginPath();bx.arc(ball.x+2,ball.y+3,ball.r+5,0,Math.PI*2);bx.fill();

  var grad=bx.createRadialGradient(ball.x-2,ball.y-2,1,ball.x,ball.y,ball.r);
  grad.addColorStop(0,'#fff');grad.addColorStop(0.5,'#e8ecf4');
  grad.addColorStop(1,'#8890a0');
  bx.fillStyle=grad;
  bx.beginPath();bx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);bx.fill();

  bx.fillStyle='rgba(255,255,255,0.7)';
  bx.beginPath();bx.arc(ball.x-2,ball.y-3,2.5,0,Math.PI*2);bx.fill();
}

function drawOverlay(text,sub){
  bx.fillStyle='rgba(0,0,0,0.55)';
  bx.fillRect(0,H/2-42,W,84);
  bx.fillStyle='#fff';bx.font='bold 22px monospace';bx.textAlign='center';
  bx.fillText(text,W/2,H/2-6);
  if(sub){
    bx.fillStyle='#aaa';bx.font='13px monospace';
    bx.fillText(sub,W/2,H/2+22);
  }
}

// Physics
function updateBall(){
  if(gameState==='ready'){
    ball.x=paddle.x+paddle.w/2;ball.y=paddle.y-ball.r-1;
    return;
  }
  if(gameState!=='playing')return;

  ball.x+=ball.dx;ball.y+=ball.dy;

  if(ball.x-ball.r<=0){ball.x=ball.r;ball.dx=-ball.dx;playSound('wall');}
  if(ball.x+ball.r>=W){ball.x=W-ball.r;ball.dx=-ball.dx;playSound('wall');}
  if(ball.y-ball.r<=0){ball.y=ball.r;ball.dy=-ball.dy;playSound('wall');}
  if(ball.y+ball.r>=H){loseLife();return;}

  // Paddle
  if(ball.dy>0&&ball.y+ball.r>=paddle.y&&ball.y+ball.r<=paddle.y+paddle.h+4&&
     ball.x>=paddle.x-ball.r&&ball.x<=paddle.x+paddle.w+ball.r){
    var hit=(ball.x-(paddle.x+paddle.w/2))/(paddle.w/2);
    var ang=hit*Math.PI/3;
    var spd=Math.sqrt(ball.dx*ball.dx+ball.dy*ball.dy);
    ball.dx=spd*Math.sin(ang);
    ball.dy=-Math.abs(spd*Math.cos(ang));
    ball.y=paddle.y-ball.r;
    playSound('paddle');
  }

  // Bricks
  for(var i=0;i<bricks.length;i++){
    var b=bricks[i];
    if(!b.visible)continue;
    var cx=Math.max(b.x,Math.min(ball.x,b.x+b.w));
    var cy=Math.max(b.y,Math.min(ball.y,b.y+b.h));
    var dx=ball.x-cx,dy=ball.y-cy;
    if(dx*dx+dy*dy<ball.r*ball.r){
      var ox=Math.min(ball.x+ball.r-b.x,b.x+b.w-(ball.x-ball.r));
      var oy=Math.min(ball.y+ball.r-b.y,b.y+b.h-(ball.y-ball.r));
      if(ox<oy){
        ball.dx=-ball.dx;
        if(ball.x<b.x+b.w/2)ball.x=b.x-ball.r;else ball.x=b.x+b.w+ball.r;
      }else{
        ball.dy=-ball.dy;
        if(ball.y<b.y+b.h/2)ball.y=b.y-ball.r;else ball.y=b.y+b.h+ball.r;
      }
      if(b.destructible){
        b.hp--;
        if(b.hp<=0){
          b.visible=false;score+=10*round;updateScore();playSound('brick');
        }else playSound('wall');
      }else playSound('wall');
      checkLevelComplete();
      break;
    }
  }
}

// Loop
function loop(){
  if(keysHeld['ArrowLeft']||keysHeld['a'])paddle.x-=6;
  if(keysHeld['ArrowRight']||keysHeld['d'])paddle.x+=6;
  paddle.x+=mobileDir*6;
  clampPaddle();

  updateBall();

  drawBackground();
  for(var i=0;i<bricks.length;i++)drawBrick(bricks[i]);
  drawPaddle();drawBall();drawHUD();

  if(gameState==='ready')drawOverlay('READY','Space / \ud074\ub9ad\uc73c\ub85c \ubc1c\uc0ac');
  if(gameState==='levelComplete')drawOverlay('ROUND COMPLETE!','');
  if(gameState==='lost')drawOverlay('READY','');
  if(gameState==='gameOver')drawOverlay('GAME OVER','\ucd5c\uc885 \uc810\uc218: '+score);
  if(gameState==='win')drawOverlay('YOU WIN!','\ucd5c\uc885 \uc810\uc218: '+score);

  raf=requestAnimationFrame(loop);
}

function start(){
  score=0;lives=3;round=1;
  bricks=genLevel(0);
  paddle.x=W/2-paddle.w/2;resetBall();
  document.getElementById('score').textContent='0';
  document.getElementById('round').textContent='1';
  document.getElementById('lives').textContent='\u2764\u2764\u2764';
  document.getElementById('btn-start').textContent='\u25b6 \uc7ac\uc2dc\uc791';
  if(raf)cancelAnimationFrame(raf);
  raf=requestAnimationFrame(loop);
}

// Controls
document.addEventListener('keydown',function(e){
  keysHeld[e.key]=true;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].indexOf(e.key)!==-1)e.preventDefault();
  if(e.key===' '&&gameState==='ready')launchBall();
});
document.addEventListener('keyup',function(e){keysHeld[e.key]=false;});

// Mouse
bc.addEventListener('mousemove',function(e){
  var rect=bc.getBoundingClientRect();
  var sx=bc.width/rect.width;
  paddle.x=(e.clientX-rect.left)*sx-paddle.w/2;
  clampPaddle();
});
bc.addEventListener('click',function(){if(gameState==='ready')launchBall();});

// Touch
bc.addEventListener('touchmove',function(e){
  e.preventDefault();
  var rect=bc.getBoundingClientRect();
  var sx=bc.width/rect.width;
  paddle.x=(e.touches[0].clientX-rect.left)*sx-paddle.w/2;
  clampPaddle();
},{passive:false});
bc.addEventListener('touchstart',function(e){
  e.preventDefault();
  if(gameState==='ready')launchBall();
},{passive:false});

// Mobile buttons
function addCtrl(id,dir){
  var el=document.getElementById(id);
  el.addEventListener('touchstart',function(e){e.preventDefault();mobileDir=dir;},{passive:false});
  el.addEventListener('touchend',function(e){e.preventDefault();mobileDir=0;},{passive:false});
  el.addEventListener('touchcancel',function(){mobileDir=0;});
  el.addEventListener('mousedown',function(){mobileDir=dir;});
  el.addEventListener('mouseup',function(){mobileDir=0;});
  el.addEventListener('mouseleave',function(){mobileDir=0;});
}
addCtrl('c-left',-1);
addCtrl('c-right',1);

document.getElementById('c-launch').addEventListener('click',function(){if(gameState==='ready')launchBall();});
document.getElementById('c-launch').addEventListener('touchstart',function(e){e.preventDefault();if(gameState==='ready')launchBall();},{passive:false});
document.getElementById('btn-start').addEventListener('click',start);

// Initial
bx.fillStyle='#0a0a12';bx.fillRect(0,0,W,H);
for(var i=0;i<stars.length;i++){
  bx.fillStyle='rgba(255,255,255,'+stars[i].a+')';
  bx.beginPath();bx.arc(stars[i].x,stars[i].y,stars[i].r,0,Math.PI*2);bx.fill();
}
bx.fillStyle='rgba(255,255,255,0.2)';bx.font='14px monospace';bx.textAlign='center';
bx.fillText('\u25b6 \uc2dc\uc791\uc744 \ub20c\ub7ec\uc8fc\uc138\uc694',W/2,H/2-10);
bx.font='11px monospace';bx.fillStyle='rgba(255,255,255,0.12)';
bx.fillText('Arkanoid',W/2,H/2+14);
</script>
</body>
</html>
"""

GAME_HTML = (GAME_HTML_TEMPLATE
    .replace('%%PADDLE_URI%%', sound_paddle_uri)
    .replace('%%LAUNCH_URI%%', sound_launch_uri)
    .replace('%%BRICK_URI%%', sound_brick_uri)
    .replace('%%WALL_URI%%', sound_wall_uri))

components.html(GAME_HTML, height=720, scrolling=False)
