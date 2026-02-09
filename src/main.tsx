import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // <--- 必须要有这一行，且路径要对

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);