import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./App.css";
import App from "./App";
import SystemTrayWindow from "./components/windows/SystemTrayWindow";
import SubmenuWindow from "./components/windows/SubmenuWindow";
import reportWebVitals from "./reportWebVitals";
import { WindowTypeEnum } from "./types/types";
import "@fontsource/great-vibes";
import "@fontsource/dancing-script";
import "@fontsource/pacifico";

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
} else if (windowType === WindowTypeEnum.TraySubmenu) {
  document.body.classList.add("tray-submenu-window-body");
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
