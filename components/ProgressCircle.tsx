export function ProgressCircle(param: { percent: number }) {
  const percent = param.percent ?? 0;
  const color =
    percent < 30 ? "#ef4444" :
    percent < 70 ? "#f59e0b" :
    "#22c55e";

  return (
    <div
  style={{
    position: "relative",
    width: 56,
    height: 56,
  }}
>
      <div
  style={{
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    background: `conic-gradient(${color} 0% ${percent}%, #e5e7eb ${percent}% 100%)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }}
>
  <div
    style={{
      width: "70%",
      height: "70%",
      background: "white",
      borderRadius: "50%",
    }}
  />
  <div
  style={{
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "70%",
    height: "70%",
    background: "white",
    borderRadius: "50%",
  }}
/>
</div>
      <div
  style={{
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    fontSize: 12,
    fontWeight: "bold",
    color: "black",
  }}
>
        {Math.max(0, Math.min(100, percent))}%
      </div>
    </div>
  );
}