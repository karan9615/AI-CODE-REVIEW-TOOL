import React from "react";
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from "lucide-react";

const alertConfig = {
  success: {
    border: "border-l-accent-cyan",
    bg: "bg-accent-cyan/10",
    text: "text-accent-cyan",
    Icon: CheckCircle2,
  },
  error: {
    border: "border-l-accent-pink",
    bg: "bg-accent-pink/10",
    text: "text-accent-pink",
    Icon: AlertCircle,
  },
  warning: {
    border: "border-l-yellow-500",
    bg: "bg-yellow-500/10",
    text: "text-yellow-500",
    Icon: AlertTriangle,
  },
  info: {
    border: "border-l-blue-400",
    bg: "bg-blue-400/10",
    text: "text-blue-400",
    Icon: Info,
  },
};

export function Alert({ type = "error", children }) {
  const config = alertConfig[type] || alertConfig.error;
  const { border, bg, text, Icon } = config;

  return (
    <div className={`glass-panel border-l-4 p-4 rounded-xl text-sm font-medium flex items-start gap-3 ${border} ${bg} ${text}`}>
      <Icon size={20} className="shrink-0 mt-0.5" />
      <div className="flex-1">{children}</div>
    </div>
  );
}
