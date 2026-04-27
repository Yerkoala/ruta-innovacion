import React, { useEffect, useState } from 'react';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import { Container, Typography, Box, Paper } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList, Cell } from 'recharts';

const db = getFirestore();

const ResultadosIA = () => {
  const [proyectos, setProyectos] = useState([]);
  const [mostrarPregunta, setMostrarPregunta] = useState(false);


  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'RubricaIA'), (snapshot) => {

      const todosLosProyectos = snapshot.docs.map((doc, index) => {
        const data = doc.data();

        const evaluaciones = data.evaluaciones || [];

        const promedios = evaluaciones.map((evaluacion, evalIndex) => {
          const calificaciones = evaluacion.calificaciones || {};

          const valores = Object.entries(calificaciones)
            .filter(([key]) => key !== 'Pregunta IA')
            .map(([, value]) => Number(value));


          const promedio =
            valores.length > 0
              ? valores.reduce((a, b) => a + b, 0) / valores.length
              : 0;

          return {
            promedio,
            preguntaIA: calificaciones['Pregunta IA'] || null,
            juez: evaluacion.juez
          };
        });

        const promedioGeneral =
          promedios.length > 0
            ? promedios.reduce((a, b) => a + b.promedio, 0) / promedios.length
            : 0;


        return {
          tema: data.tema,
          categoria: data.categoria,
          promedio: parseFloat(promedioGeneral.toFixed(2)),
          preguntasIA: promedios
            .map((p) => p.preguntaIA)
            .filter((p) => p && p.trim() !== ''),
          hora: data.hora || ''
        };
      });

      const ordenadosPorHora = todosLosProyectos.sort((a, b) => {
        const fechaA = new Date(a.hora);
        const fechaB = new Date(b.hora);
        return fechaB - fechaA; // orden descendente
      });

      setProyectos(ordenadosPorHora);
      setMostrarPregunta(false);

      setTimeout(() => {
        setMostrarPregunta(true);
      }, 3000);
    });

    return () => unsubscribe();
  }, []);



  const proyecto = proyectos[0]; // último documento

  const [categoriaFiltrada, setCategoriaFiltrada] = useState(null);

  // Datos para el gráfico
  const datosGrafico = [...proyectos]
    .filter((p) => p.categoria === proyecto?.categoria)
    .map((p) => ({
      nombre: p.tema,
      promedio: p.promedio,
      categoria: p.categoria
    }))
    .sort((a, b) => b.promedio - a.promedio);

  const categoriaEstilos = {
    "Mejora Continua": { backgroundColor: "#a114c4", color: "#FFFFFF" },
    "Sandía Calá": { backgroundColor: "#28aa1d", color: "#FFFFFF" },
    "Pinta Pa' Bueno": { backgroundColor: "#f96703", color: "#FFFFFF" }
  };

  const categoriaEstilosTextos = {
    "Mejora Continua": { color: "#a114c4" },
    "Sandía Calá": { color: "#28aa1d" },
    "Pinta Pa' Bueno": { color: "#f96703" }
  };

  const categoriaEstilosGradiente = {
    "Mejora Continua": { backgroundImage: 'linear-gradient(to right, #3c1053, #ad5389)' },
    "Sandía Calá": { backgroundImage: 'linear-gradient(to right, #245520ff, #28aa1d)' },
    "Pinta Pa' Bueno": { backgroundImage: 'linear-gradient(to right, #9e4306ff, #f96703)' }
  };

  const colorBarra = categoriaEstilos[proyecto?.categoria]?.backgroundColor || '#6a1b9a';

  return (
    <Container maxWidth="md" sx={{ minHeight: "94dvh" }}>
      <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: "bold", color: "#424242" }} mb={7} mt={5}>
        Juez IA
      </Typography>

      {proyecto && (
        <Paper elevation={3} sx={{ padding: 2, marginBottom: 2, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: "#424242" }}>
            {proyecto.tema}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {proyecto.categoria}
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Box
              sx={{
                width: '270px',
                height: '270px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...categoriaEstilosGradiente[proyecto.categoria] // ⬅️ Aplica el gradiente según la categoría
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  fontSize: '7rem',
                  fontWeight: 'bold',
                  color: 'white'
                }}
              >
                {proyecto.promedio}
              </Typography>
            </Box>
          </Box>

          {proyecto.preguntasIA.length > 0 && (
            <Box mt={2} sx={{ textAlign: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Pregunta IA
              </Typography>

              {!mostrarPregunta ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 1 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      border: '4px solid',
                      borderColor: 'transparent',
                      borderTopColor: '#6a1b9a',
                      animation: 'spin 1s linear infinite, colorShift 3s ease-in-out infinite'
                    }}
                  />
                  <Typography variant="body2" sx={{ ml: 2, fontStyle: 'italic', color: 'gray' }}>
                    Generando pregunta IA...
                  </Typography>
                </Box>
              ) : (
                proyecto.preguntasIA.map((pregunta, i) => (
                  <Typography
                    key={i}
                    variant="body2"
                    sx={{ fontStyle: 'italic', ...categoriaEstilosTextos[proyecto.categoria], fontSize: '2rem' }}
                  >
                    “{pregunta}”
                  </Typography>
                ))
              )}
            </Box>
          )}
        </Paper>
      )}

      {/* Gráfico de barras horizontal */}
      <Box mt={4}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, textAlign: "center", color: "#424242" }}>
          Ranking de notas IA
        </Typography>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={datosGrafico}
            layout="vertical"
            margin={{ top: 20, right: 30, left: -5, bottom: 20 }} // ⬅️ más espacio a la izquierda
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 5]} />
            <YAxis
              dataKey="nombre"
              type="category"
              width={150} // ⬅️ ancho fijo para evitar corte
              tick={{ fontSize: 14, wordBreak: 'keep-all', whiteSpace: 'nowrap' }} // ⬅️ evita salto
            />
            <Tooltip />
            <Bar dataKey="promedio">
              {datosGrafico.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={categoriaEstilos[entry.categoria]?.backgroundColor || '#6a1b9a'}
                />
              ))}
              <LabelList dataKey="promedio" position="right" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Container>
  );
};

export default ResultadosIA;