import { createRoot } from "react-dom/client";
import { initCleanupRegistry } from "./services/stateResetService";
import App from "./App.tsx";
import "./index.css";

// Initialize cleanup registry before any other modules
initCleanupRegistry();

// Register service worker for web push notifications
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(console.warn);
}

createRoot(document.getElementById("root")!).render(<App />);
