export const RISK_META = {
  break_risk: {
    label: "Break Risk",
    color: "#fb5b7c",
    dim: "#b53357",
    description: "High probability of an extended dry spell",
  },
  heavy_rain_risk: {
    label: "Heavy Rain Risk",
    color: "#fbbf24",
    dim: "#b9860e",
    description: "High probability of heavy downpour",
  },
  onset_favorable: {
    label: "Favorable Onset",
    color: "#38bdf8",
    dim: "#6c5ce7",
    description: "Conditions favor monsoon onset / sowing",
  },
  normal: {
    label: "Normal",
    color: "#7d84a3",
    dim: "#4a5762",
    description: "No significant anomaly detected",
  },
};

export const SEVERITY_META = {
  critical: { label: "Critical", color: "#fb5b7c" },
  warning: { label: "Warning", color: "#fbbf24" },
  caution: { label: "Caution", color: "#fbbf24" },
  info: { label: "Info", color: "#38bdf8" },
};

export function pct(value) {
  return `${Math.round(value * 100)}%`;
}
