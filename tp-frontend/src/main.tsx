import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
// import "@picocss/pico/css/pico.violet.min.css";
import "@picocss/pico/css/pico.purple.min.css";

import { BrowserRouter } from "react-router-dom";
import { UserProvider } from "./components/userContext.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <UserProvider>
        <App />
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);
