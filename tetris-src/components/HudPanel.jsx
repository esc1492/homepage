export default function HudPanel({ label, value }) {
  return (
    <div className="panel">
      <div className="panel-label">{label}</div>
      <div className="panel-value">{value}</div>
    </div>
  );
}
