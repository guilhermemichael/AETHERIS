import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/App";
import "./styles/theme.css";
import "./styles/typography.css";
import "./styles/globals.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("AETHERIS root container was not found");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

