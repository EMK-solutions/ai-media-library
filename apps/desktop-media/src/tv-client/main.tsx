import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TvBroadcastApp } from "./TvBroadcastApp";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <TvBroadcastApp />
    </StrictMode>,
  );
}
