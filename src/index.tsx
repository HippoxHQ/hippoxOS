import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./App.css";
import App from "./App";
import SystemTrayWindow from "./windows/SystemTrayWindow";
import SubmenuWindow from "./windows/SubmenuWindow";
import reportWebVitals from "./reportWebVitals";
import { WindowTypeEnum } from "./type";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);

const urlParams = new URLSearchParams(window.location.search);
const windowType = urlParams.get("type");

if (windowType === WindowTypeEnum.Tray) {
  document.body.classList.add("tray-window-body");
  root.render(
    <React.StrictMode>
      <SystemTrayWindow />
    </React.StrictMode>,
  );
} else if (windowType === WindowTypeEnum.Submenu) {
  document.body.classList.add("submenu-window-body");
  root.render(
    <React.StrictMode>
      <SubmenuWindow />
    </React.StrictMode>,
  );
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

reportWebVitals();
