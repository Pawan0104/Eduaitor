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
import {
  initNativeShell,
} from "./utils/initNativeShell.js";
import { initTheme } from "./utils/theme.js";
import { initUiSkin } from "./utils/uiSkin.js";
import AppUpdatePrompt from "./components/AppUpdatePrompt.jsx";
import OptionalPasswordChangeModal from "./components/OptionalPasswordChangeModal.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
// Register global Bearer-token interceptors before any page axios calls.
import "./config/axios.js";

initTheme();
initUiSkin();
initNativeShell().catch(() => {});

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <StrictMode>
      <ErrorBoundary>
        <LanguageProvider>
          <AuthProvider>
            <HelmetProvider>
              <App />
              <OptionalPasswordChangeModal />
              <AppUpdatePrompt />
            </HelmetProvider>
          </AuthProvider>
          <ToastContainer
            position="top-right"
            autoClose={2500}
            limit={3}
            newestOnTop
            closeOnClick
            pauseOnHover
            draggable
            style={{ zIndex: 100000 }}
            toastStyle={{ zIndex: 100000, fontSize: "0.875rem" }}
          />
        </LanguageProvider>
      </ErrorBoundary>
    </StrictMode>
  </BrowserRouter>,
);
