'use client';

/**
 * 화면 조작 버튼. 원본의 c-left / c-launch / c-right.
 *
 * 원본은 touchstart 에서 preventDefault() 를 불러 뒤따르는 합성 mousedown 을 막아야 했습니다
 * (막지 않으면 한 번 눌러 두 번 동작). 여기서는 마우스 이벤트를 아예 듣지 않고 Pointer Events
 * 만 쓰므로 그 문제가 생기지 않습니다.
 */
function HoldButton({ className, title, label, dir, onDir }) {
  const stop = () => onDir(0);

  return (
    <button
      type="button"
      className={className}
      title={title}
      onPointerDown={() => onDir(dir)}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
    >
      {label}
    </button>
  );
}

export default function ControlBar({ onDir, onLaunch }) {
  return (
    <div className="controls">
      <div className="ctrl-row">
        <HoldButton className="ctrl-btn" title="왼쪽" label="←" dir={-1} onDir={onDir} />
        {/* 발사는 누르는 즉시 반응해야 하므로 pointerdown 에 겁니다. */}
        <button type="button" className="ctrl-btn wide" title="발사" onPointerDown={onLaunch}>
          🚀 LAUNCH
        </button>
        <HoldButton className="ctrl-btn" title="오른쪽" label="→" dir={1} onDir={onDir} />
      </div>
      <p className="key-hint">⌨ ← → &nbsp;|&nbsp; 🖱 이동 &nbsp;|&nbsp; Enter/Space: 발사</p>
    </div>
  );
}
