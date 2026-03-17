import React from "react";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "./components/ErrorBoundary";
import KinwardApp from "./KinwardApp";

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <KinwardApp />
  </ErrorBoundary>
);
