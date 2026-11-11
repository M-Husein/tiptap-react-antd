import React from "react";
import ReactDOM from "react-dom/client";
import { ConfigProvider } from "antd";
import App from "./App";

import "./styles/content.css";
import "./styles/editor.css";
import "./styles/viewer.css";
// Required for typeset math (see README "Adding Math"). This one file is
// enough: it declares the math fonts AND sets --ML__static-fonts, which
// tells MathLive's live editor not to try fetching fonts at runtime.
import "mathlive/static.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfigProvider>
      <App />
    </ConfigProvider>
  </React.StrictMode>,
);
