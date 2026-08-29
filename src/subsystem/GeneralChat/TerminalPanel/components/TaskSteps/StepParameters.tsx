import React from "react";
import { getFullParams, getShortParams } from "../../utils";
import { ChevronDown, ChevronUp } from "lucide-react";
interface StepParametersProps {
  parameters: string;
  stepKey: string;
  isExpanded: boolean;
  onToggle: (stepKey: string) => void;
  t: (key: string) => string;
  type?: "input" | "output";
}
export const StepParameters: React.FC<StepParametersProps> = ({ parameters, stepKey, isExpanded, onToggle, t, type = "input" }) => {
  if (!parameters || parameters === "{}") return null;
  const fullParams = getFullParams(parameters);
  const shortParams = getShortParams(parameters);
  const label = type === "output" ? `${t("terminal.stepOutput") || "Output"}` : `${t("terminal.stepInput") || "Input"}`;
  const briefContent = type === "output" ? parameters : shortParams;
  return (
    <div className="step-parameters-row">
      <div className="step-parameters-header">
        <span className="step-parameters-label">{label}:</span>
        {isExpanded ? (
          <button
            className="step-parameters-toggle"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(stepKey);
            }}
            title={t("terminal.collapse")}
          >
            <ChevronUp size={18} /> {t("terminal.collapse")}
          </button>
        ) : (
          <>
            <span
              className="step-parameters-short"
              style={{
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                margin: "0 8px",
              }}
            >
              {briefContent}
            </span>
            <button
              className="step-parameters-toggle"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(stepKey);
              }}
              title={t("terminal.expand")}
            >
              <ChevronDown size={18} /> {t("terminal.expand")}
            </button>
          </>
        )}
      </div>
      {isExpanded && <pre className="step-parameters-code">{type === "output" ? parameters : fullParams}</pre>}
    </div>
  );
};
