import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { Site } from "./Site";
import "./styles/tokens.css";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Site />
  </StrictMode>,
);
