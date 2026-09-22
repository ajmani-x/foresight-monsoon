export const RISK_META = {
  break_risk: {
    label: "Break Risk",
    color: "#f0546b",
    dim: "#a83648",
    description: "High probability of an extended dry spell",
  },
  heavy_rain_risk: {
    label: "Heavy Rain Risk",
    color: "#f5a524",
    dim: "#b97815",
    description: "High probability of heavy downpour",
  },
  onset_favorable: {
    label: "Favorable Onset",
    color: "#5fe3d3",
    dim: "#1fb3a3",
    description: "Conditions favor monsoon onset / sowing",
  },
  normal: {
    label: "Normal",
    color: "#7c8b99",
    dim: "#4a5762",
    description: "No significant anomaly detected",
  },
};

export const SEVERITY_META = {
  critical: { label: "Critical", color: "#f0546b" },
  warning: { label: "Warning", color: "#f5a524" },
  caution: { label: "Caution", color: "#f5a524" },
  info: { label: "Info", color: "#5fe3d3" },
};

export function pct(value) {
  return `${Math.round(value * 100)}%`;
}
