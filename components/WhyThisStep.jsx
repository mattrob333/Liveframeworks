import React from "react";

export default function WhyThisStep({ insight }) {
  const text = String(insight || "").trim();
  if (!text) return null;
  return (
    <div className="why-this-step">
      <p className="why-this-step-label">Why this step</p>
      <p className="why-this-step-note">{text}</p>
    </div>
  );
}
