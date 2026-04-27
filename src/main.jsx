import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import RubricaNeg from './components/RubricaNeg';
import RubricaMet from './components/RubricaMet';
import RubricaTI from './components/RubricaTI';
import ResultadosPublico from './resultados/ResultadosPublico';
import ResultadosPrivado from './resultados/ResultadosPrivado';
import RubricaIA from './components/RubricaIA';
import ResultadosIA from './resultados/ResultadosIA';
import ResultadosFinales from './resultados/ResultadosFinales';
import AdminPanel from './components/adminPanel/component/AdminPanel';
import EvaluacionProyectos from './components/EvaluacionProyectos';
import Ranking from './components/Ranking';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/evaluacion" element={<EvaluacionProyectos />} />
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="/ranking" element={<Ranking />} />
    </Routes>
  </BrowserRouter>
);