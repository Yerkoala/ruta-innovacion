import React, { useEffect, useState } from 'react';
import { Box, Typography, Divider, CircularProgress } from '@mui/material';
import { leerRubricasPPB, leerRubricasSC, leerRubricasMC, leerRubricasIA } from './rubricasfunciones';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ScrollableTable from './ScrollableTable';
import { ponderacionNegocios } from '../DB/ponderacionNegocios';

// Función para calcular promedio total por proyecto incluyendo IA
const calcularPromediosPorProyecto = (rubricas, rubricasIA) => {
  return rubricas
    .map(proyecto => {
      const todas = [];

      // Promedios de negocio, metodológico y TI
      Object.values(proyecto.rubricas).forEach(tipo => {
        tipo.forEach(evaluacion => {
          if (typeof evaluacion.promedio === 'number') {
            todas.push(evaluacion.promedio);
          }
        });
      });

      // Buscar evaluación IA por ID
      const evaluacionIA = rubricasIA.find(doc => parseInt(doc.id) === proyecto.id);
      if (evaluacionIA?.evaluaciones?.[0]?.calificaciones?.["Valoracion IA"]) {
        const valorIA = parseFloat(evaluacionIA.evaluaciones[0].calificaciones["Valoracion IA"]);
        if (!isNaN(valorIA)) {
          todas.push(valorIA);
        } else {
          console.warn(`⚠️ Valor IA no numérico para proyecto ${proyecto.id}`);
        }
      } else {
        console.warn(`⚠️ No se encontró evaluación IA para proyecto ${proyecto.id}`);
      }

      const promedioTotal = todas.length > 0
        ? parseFloat((todas.reduce((a, b) => a + b, 0) / todas.length).toFixed(2))
        : 0;


      return {
        id: proyecto.id,
        tema: proyecto.tema,
        promedio: promedioTotal
      };
    })
    .sort((a, b) => b.promedio - a.promedio); // 👈 orden descendente
};

const GraficoPromedios = ({ titulo, datos, color }) => (
  <Box sx={{ mb: 6, backgroundColor: "white", boxShadow: "2px 2px 6px #00000040", borderRadius: "10px", padding: "10px", width: "60%" }}>
    <Typography variant="h6" gutterBottom>{titulo}</Typography>
    <Divider sx={{ mb: 2 }} />
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={datos}>
        <XAxis dataKey="id" label={{ position: "insideBottom", offset: -5 }} />
        <YAxis domain={[0, 5]} />
        <Tooltip />
        <Legend />
        <Bar dataKey="promedio" fill={color} name="Promedio Total" />
      </BarChart>
    </ResponsiveContainer>
  </Box>
);

const ResultadosPublico = () => {
  const [rubricasPPB, setRubricasPPB] = useState([]);
  const [rubricasSC, setRubricasSC] = useState([]);
  const [rubricasMC, setRubricasMC] = useState([]);
  const [rubricasIA, setRubricasIA] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cancelarPPB = leerRubricasPPB((ppb) => {
      setRubricasPPB(agregarPromedios(ppb));
    });

    const cancelarSC = leerRubricasSC((sc) => {
      setRubricasSC(agregarPromedios(sc));
    });

    const cancelarMC = leerRubricasMC((mc) => {
      setRubricasMC(agregarPromedios(mc));
    });

    const cancelarIA = leerRubricasIA((ia) => {
      setRubricasIA(ia);
    });

    setCargando(false);

    return () => {
      cancelarPPB();
      cancelarSC();
      cancelarMC();
      cancelarIA();
    };
  }, []);

  const convertirValorMetodologica = (valor) => {
    if (valor === "Sí" || valor === "N/A") return 5.0;
    if (valor === "No") return 0;
    return null;
  };

  const convertirValorTI = (valor) => {
    if (valor === "Sí" || valor === "N/A") return 5.0;
    if (valor === "Parcial") return 2.5;
    if (valor === "No") return 0;
    return null;
  };

  const convertirValorNegocio = (valor) => {
    return typeof valor === "number" ? valor : null;
  };

  const agregarPromedios = (rubricas) => {
    return rubricas.map((proyecto, indexProyecto) => {
      const nuevoProyecto = { ...proyecto };
      const categoria = proyecto.categoria;

      Object.keys(nuevoProyecto.rubricas).forEach((tipo) => {
        nuevoProyecto.rubricas[tipo] = nuevoProyecto.rubricas[tipo].map((evaluacion, indexEvaluacion) => {
          const calificaciones = evaluacion.calificaciones || {};

          if (tipo === "negocio") {
            const pesos = ponderacionNegocios[categoria] || {};

            let total = 0;
            let sumaPesos = 0;

            for (const criterio in calificaciones) {
              const nota = convertirValorNegocio(calificaciones[criterio]);
              const peso = pesos[criterio] || 0;


              if (nota !== null) {
                total += nota * peso;
                sumaPesos += peso;
              }
            }

            const promedio = sumaPesos > 0
              ? parseFloat((total / sumaPesos).toFixed(2))
              : null;


            return {
              ...evaluacion,
              promedio
            };
          }

          const valores = Object.values(calificaciones)
            .map(v => {
              if (tipo === "metodologico") return convertirValorMetodologica(v);
              if (tipo === "TI") return convertirValorTI(v);
              return convertirValorNegocio(v);
            })
            .filter(v => v !== null);


          const promedio = valores.length > 0
            ? parseFloat((valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(2))
            : null;


          return {
            ...evaluacion,
            promedio
          };
        });
      });

      return nuevoProyecto;
    });
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h3" gutterBottom sx={{ textAlign: "center", fontWeight: "bold", color: "#424242" }}>SEMIFINALES</Typography>
      <Typography variant="h5" gutterBottom sx={{ textAlign: "center", color: "grey", marginTop:"-20px" }}>INNOVACIÓN</Typography>
      <Typography variant="h4" gutterBottom sx={{ textAlign: "center" }}>📊 Resultados</Typography>
      {cargando ? (
        <CircularProgress />
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "30px" }}>
            <GraficoPromedios
              titulo="Mejora Continua"
              datos={calcularPromediosPorProyecto(rubricasMC, rubricasIA)}
              color="#a114c4"
            />
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
            <GraficoPromedios
              titulo="Sandía Calá"
              datos={calcularPromediosPorProyecto(rubricasSC, rubricasIA)}
              color="#28aa1d"
            />
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", paddingBottom: "40px" }}>
            <GraficoPromedios
              titulo="Pinta Pa' Bueno"
              datos={calcularPromediosPorProyecto(rubricasPPB, rubricasIA)}
              color="#f96703"
            />
          </div>
        </>
      )}
    </Box>
  );
};

export default ResultadosPublico;