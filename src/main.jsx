import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import AdminPanel from './components/adminPanel/component/AdminPanel';
import EvaluacionProyectos from './components/EvaluacionProyectos';
import Ranking from './components/Ranking';
import RankingPrivado from './components/RankingPrivado';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/evaluacion" element={<EvaluacionProyectos />} />
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="/ranking" element={<Ranking />} />
      <Route path="/ranking-privado" element={<RankingPrivado />} />
    </Routes>
  </BrowserRouter>
);