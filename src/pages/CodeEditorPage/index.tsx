import React from "react";
import Coding from "./Coding";

interface CodeEditorPageProps {
  t: (key: string) => string;
  onClose?: () => void;
}

const CodeEditorPage: React.FC<CodeEditorPageProps> = ({ t, onClose }) => {
  return <Coding t={t} onClose={onClose} />;
};

export default CodeEditorPage;
