import React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export function Alert({ type = "error", children }) {
  const isSuccess = type === "success";

  return (
    <div className={`glass-panel border-l-4 p-4 rounded-xl text-sm font-medium flex items-start gap-3 ${isSuccess
      ? "border-l-accent-cyan bg-accent-cyan/10 text-accent-cyan"
      : "border-l-accent-pink bg-accent-pink/10 text-accent-pink"
      }`}>
      {isSuccess ? <CheckCircle2 size={20} className="shrink-0" /> : <AlertCircle size={20} className="shrink-0" />}
      <div className="flex-1 text-surface">{children}</div>
    </div>
  );
}
