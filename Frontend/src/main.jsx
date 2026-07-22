import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./app.jsx";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "./context/AuthContext.jsx";
import { LanguageProvider } from "./context/LanguageContext.jsx";
import { HelmetProvider } from "react-helmet-async";
import { initNativeShell } from "./utils/initNativeShell.js";
import { initTheme } from "./utils/theme.js";
import { initUiSkin } from "./utils/uiSkin.js";
import AppUpdatePrompt from "./components/AppUpdatePrompt.jsx";

initTheme();
initUiSkin();
initNativeShell().catch(() => {});

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <StrictMode>
      <LanguageProvider>
        <AuthProvider>
          <HelmetProvider>
            <App />
            <AppUpdatePrompt />
          </HelmetProvider>
        </AuthProvider>
        <ToastContainer position="top-right" autoClose={2000} />
      </LanguageProvider>
    </StrictMode>
  </BrowserRouter>,
);
