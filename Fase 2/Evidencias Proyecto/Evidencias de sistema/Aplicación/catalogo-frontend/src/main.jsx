// src/index.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import Formularioregistro from "./Formularioregistro.jsx";
import Admin from "./Admin.jsx"; // 🔹 importar la página de admin
import Dashboard from "./Dashboard.jsx";
import Usuario from "./Usuario.jsx"; // 🔹 importar la página de usuario

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/formularioregistro" element={<Formularioregistro />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<Admin />} /> {/* 🔹 ruta de admin */}
        <Route path="/usuario" element={<Usuario />} /> {/* 🔹 ruta de usuario */}
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
