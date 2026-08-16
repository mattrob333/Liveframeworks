import React from "react";
import { apparatusSegments } from "@/lib/apparatus";

function Segment({ part }) {
  if (part.type === "hedge") {
    return <span className="apparatus-hedge">[<em>{part.text}</em>]</span>;
  }
  return <span className="apparatus-caps">{part.text}</span>;
}

export default function Apparatus({
  basis,
  confidence,
  sourceCount,
  kind,
  className = "",
  ...rest
}) {
  const parts = apparatusSegments({ basis, confidence, sourceCount, kind });
  if (!parts.length) return null;
  return (
    <span className={["apparatus", className].filter(Boolean).join(" ")} {...rest}>
      {parts.map((part, index) => (
        <React.Fragment key={`${part.type}-${part.text}-${index}`}>
          {index > 0 && <span className="apparatus-sep" aria-hidden="true"> · </span>}
          <Segment part={part} />
        </React.Fragment>
      ))}
    </span>
  );
}
