import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import Formularioregistro from "./Formularioregistro.jsx";
import Admin from "./Admin.jsx";
import Dashboard from "./Dashboard.jsx";
import Usuario from "./Usuario.jsx";
import PriceHistoryPage from "./PriceHistoryPage.jsx";
import AdminRoute from './AdminRoute.jsx';

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/formularioregistro" element={<Formularioregistro />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<Admin />} /></Route>
        <Route path="/usuario" element={<Usuario />} />
        {/* 🔹 ruta dinámica para historial de precios */}
        <Route path="/price-history/:storeName/:productName" element={<PriceHistoryPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
