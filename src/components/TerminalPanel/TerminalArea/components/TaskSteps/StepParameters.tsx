import React from "react";
import { formatParameters, getFullParams, getShortParams } from "../../utils";

interface StepParametersProps {
  parameters: string;
  stepKey: string;
  isExpanded: boolean;
  onToggle: (stepKey: string) => void;
  t: (key: string) => string;
  type?: "input" | "output";
}

export const StepParameters: React.FC<StepParametersProps> = ({
  parameters,
  stepKey,
  isExpanded,
  onToggle,
  t,
  type = "input",
}) => {
  if (!parameters || parameters === "{}") return null;

  const shortParams = getShortParams(parameters);
  const fullParams = getFullParams(parameters);
  const hasFullContent = fullParams !== shortParams && fullParams.length > 60;
  const label =
    type === "output"
      ? `${t("terminal.stepOutput") || "Ouput"}`
      : `${t("terminal.stepInput") || "Input"}`;
  return (
    <div className="step-parameters-row">
      <div className="step-parameters-header">
        <span className="step-parameters-label">{label}:</span>
        {hasFullContent && (
          <button
            className="step-parameters-toggle"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(stepKey);
            }}
            title={isExpanded ? t("terminal.collapse") : t("terminal.expand")}
          >
            {isExpanded
              ? `▲ ${t("terminal.collapse")}`
              : `▼ ${t("terminal.expand")}`}
          </button>
        )}
      </div>
      {isExpanded ? (
        <pre className="step-parameters-code">{fullParams}</pre>
      ) : (
        <div className="step-parameters-short" title={parameters}>
          <span className="step-parameters-value">{shortParams}</span>
          {!hasFullContent && shortParams !== fullParams && (
            <span className="step-parameters-more">...</span>
          )}
        </div>
      )}
    </div>
  );
};
