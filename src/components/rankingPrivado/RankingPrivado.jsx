import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebaseconfig';
import Header from './components/Header';
import Filtros from './components/Filtros';
import ResumenJuez from './components/ResumenJuez';
import CategoriaAccordion from './components/CategoriaAccordion';
import COLORS from '../../assets/colors';
import { normalizarTexto } from './utils/categorias';
import { calcularPromedioProyecto } from './utils/calculos';
import { Box, Container, Typography, Button, CircularProgress } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function RankingPrivado() {
  const navigate = useNavigate();
  const [activeGroup, setActiveGroup] = useState('todos');
  const [activeJuez, setActiveJuez] = useState('todos');
  const [finalSeleccionada, setFinalSeleccionada] = useState(null);
  const [finalesDisponibles, setFinalesDisponibles] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [ponderaciones, setPonderaciones] = useState({});
  const [loading, setLoading] = useState(true);
  const [grupos, setGrupos] = useState([]);
  const [jueces, setJueces] = useState([]);
  const [juecesEsperadosPorProyecto, setJuecesEsperadosPorProyecto] = useState({}); // Mapa de proyectoId -> [jueces esperados]

  // Cargar finales disponibles al montar
  useEffect(() => {
    cargarFinales();
  }, []);

  // Cargar datos cuando cambia la final seleccionada
  useEffect(() => {
    if (finalSeleccionada) {
      cargarDatosRanking();
    }
  }, [finalSeleccionada]);

  // Escuchar cambios en tiempo real de evaluaciones
  useEffect(() => {
    if (!finalSeleccionada?.id) return;

    const evaluacionesRef = collection(db, 'evaluaciones');
    const qEvaluaciones = query(evaluacionesRef, where('finalId', '==', finalSeleccionada.id));
    
    // Suscripción en tiempo real
    const unsubscribe = onSnapshot(qEvaluaciones, (snapshot) => {
      const evaluacionesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEvaluaciones(evaluacionesData);
    });

    // Cleanup al desmontar
    return () => unsubscribe();
  }, [finalSeleccionada]);

  // Cargar todas las finales disponibles
  const cargarFinales = async () => {
    try {
      const finalesRef = collection(db, 'finales');
      const qFinales = query(finalesRef, orderBy('anio', 'desc'));
      const finalesSnapshot = await getDocs(qFinales);
      
      const finalesData = finalesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setFinalesDisponibles(finalesData);
      
      // Seleccionar la final activa por defecto, o la primera disponible
      const finalActiva = finalesData.find(f => f.activa) || finalesData[0];
      if (finalActiva) {
        setFinalSeleccionada(finalActiva);
      }
    } catch (error) {
      console.error('Error al cargar finales:', error);
      setLoading(false);
    }
  };

  const cargarDatosRanking = async () => {
    setLoading(true);
    try {
      if (!finalSeleccionada?.id) {
        setLoading(false);
        return;
      }

      // 1. Obtener proyectos de la final seleccionada
      const proyectosRef = collection(db, 'proyectos');
      const qProyectos = query(proyectosRef, where('finalId', '==', finalSeleccionada.id));
      const proyectosSnapshot = await getDocs(qProyectos);
      const proyectosData = proyectosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProyectos(proyectosData);

      // Extraer grupos únicos de los proyectos
      const gruposUnicos = [...new Set(proyectosData.map(p => p.grupo).filter(Boolean))].sort();
      setGrupos(gruposUnicos);

      // Extraer jueces únicos de los proyectos
      const juecesSet = new Set();
      proyectosData.forEach(proyecto => {
        if (proyecto.juez) {
          const juecesProyecto = String(proyecto.juez).split(',').map(j => j.trim()).filter(Boolean);
          juecesProyecto.forEach(j => juecesSet.add(j));
        }
      });
      const juecesUnicos = [...juecesSet].sort();
      setJueces(juecesUnicos);

      // Extraer jueces esperados por PROYECTO (no por grupo)
      const juecesEsperadosPorProyectoMap = {};
      proyectosData.forEach(proyecto => {
        if (proyecto.juez) {
          const jueces = String(proyecto.juez).split(',').map(j => j.trim()).filter(Boolean);
          juecesEsperadosPorProyectoMap[proyecto.id] = jueces;
        } else {
          juecesEsperadosPorProyectoMap[proyecto.id] = [];
        }
      });
      setJuecesEsperadosPorProyecto(juecesEsperadosPorProyectoMap);

      // 2. Obtener evaluaciones iniciales (luego se actualizan en tiempo real)
      const evaluacionesRef = collection(db, 'evaluaciones');
      const qEvaluaciones = query(evaluacionesRef, where('finalId', '==', finalSeleccionada.id));
      const evaluacionesSnapshot = await getDocs(qEvaluaciones);
      const evaluacionesData = evaluacionesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setEvaluaciones(evaluacionesData);

      // 3. Obtener ponderaciones
      const ponderacionesRef = collection(db, 'ponderaciones');
      const ponderacionesSnapshot = await getDocs(ponderacionesRef);
      const ponderacionesData = {};
      ponderacionesSnapshot.docs.forEach(doc => {
        ponderacionesData[doc.id] = doc.data();
      });
      setPonderaciones(ponderacionesData);

    } catch (error) {
      console.error('Error al cargar datos del ranking:', error);
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambio de final
  const handleFinalChange = (nuevaFinal) => {
    setFinalSeleccionada(nuevaFinal);
    // Resetear estados relacionados
    setActiveGroup('todos');
    setActiveJuez('todos');
  };

  // Manejar cambio de grupo
  const handleGroupChange = (grupo) => {
    setActiveGroup(grupo);
  };

  // Manejar cambio de juez
  const handleJuezChange = (juez) => {
    setActiveJuez(juez);
  };

  // Agrupar proyectos por categoría con sus promedios
  const groupedAndSortedData = useMemo(() => {
    if (!proyectos.length) return {};

    // Filtrar por grupo si no es "todos"
    let proyectosFiltrados = proyectos;
    if (activeGroup !== 'todos') {
      proyectosFiltrados = proyectosFiltrados.filter(p => p.grupo === activeGroup);
    }

    // Filtrar por juez si no es "todos"
    if (activeJuez !== 'todos') {
      proyectosFiltrados = proyectosFiltrados.filter(p => {
        // Verificar si el juez seleccionado está asignado a este proyecto
        if (p.juez) {
          const juecesProyecto = String(p.juez).split(',').map(j => j.trim()).filter(Boolean);
          return juecesProyecto.includes(activeJuez);
        }
        return false;
      });
    }

    const grouped = proyectosFiltrados.reduce((acc, proyecto) => {
      const catNormalizada = normalizarTexto(proyecto.categoria);
      
      if (!acc[catNormalizada]) {
        acc[catNormalizada] = {
          nombreDisplay: proyecto.categoria,
          proyectos: []
        };
      }

      const resultado = calcularPromedioProyecto(proyecto.id, proyecto.categoria, evaluaciones, ponderaciones);
      
      acc[catNormalizada].proyectos.push({
        ...proyecto,
        resultado: resultado
      });

      return acc;
    }, {});

    // Ordenar de mayor a menor nota dentro de cada categoría
    Object.keys(grouped).forEach(cat => {
      grouped[cat].proyectos.sort((a, b) => {
        const notaA = a.resultado?.nota || 0;
        const notaB = b.resultado?.nota || 0;
        return notaB - notaA;
      });
    });

    return grouped;
  }, [proyectos, evaluaciones, ponderaciones, activeGroup, activeJuez]);

  // Obtener proyectos asignados al juez seleccionado (para el resumen)
  const proyectosAsignadosJuez = useMemo(() => {
    if (activeJuez === 'todos') return [];
    
    return proyectos.filter(p => {
      if (p.juez) {
        const juecesProyecto = String(p.juez).split(',').map(j => j.trim()).filter(Boolean);
        return juecesProyecto.includes(activeJuez);
      }
      return false;
    });
  }, [proyectos, activeJuez]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#fafafa' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={50} thickness={4} sx={{ color: COLORS.orange, mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Cargando ranking...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!finalSeleccionada) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#fafafa', p: 3 }}>
        <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
          <EmojiEventsIcon sx={{ fontSize: 48, color: '#bbb', mb: 2 }} />
          <Typography variant="h6" fontWeight={700} color={COLORS.navy} gutterBottom>
            No hay finales disponibles
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Aún no se han configurado finales para mostrar el ranking.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/')}
            startIcon={<ArrowBackIcon />}
            sx={{ 
              bgcolor: COLORS.orange,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { bgcolor: COLORS.orangeDark }
            }}
          >
            Volver al inicio
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#fafafa', pb: 4 }}>
      {/* Header con selector de final */}
      <Header 
        finalActiva={finalSeleccionada}
        finalesDisponibles={finalesDisponibles}
        proyectos={proyectos}
        onFinalChange={handleFinalChange}
      />

      <Container maxWidth="xl" sx={{ mt: 3 }}>
        {/* Componente de Filtros */}
        {(grupos.length > 0 || jueces.length > 0) && (
          <Box sx={{ mb: 3, bgcolor: 'white', p: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
            <Filtros
              grupos={grupos}
              jueces={jueces}
              activeGroup={activeGroup}
              activeJuez={activeJuez}
              onGroupChange={handleGroupChange}
              onJuezChange={handleJuezChange}
            />
          </Box>
        )}

        {/* Resumen del juez seleccionado */}
        {activeJuez !== 'todos' && (
          <ResumenJuez
            nombreJuez={activeJuez}
            proyectosAsignados={proyectosAsignadosJuez}
            evaluaciones={evaluaciones}
            finalId={finalSeleccionada?.id}
          />
        )}

        {/* Listado de Categorías y Rankings */}
        {Object.keys(groupedAndSortedData).length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, bgcolor: 'white', borderRadius: 2, border: '1px solid #e0e0e0' }}>
            <EmojiEventsIcon sx={{ fontSize: 48, color: '#ddd', mb: 2 }} />
            <Typography variant="h6" fontWeight={700} color="text.secondary" gutterBottom>
              No hay proyectos evaluados
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Aún no se han registrado evaluaciones para esta final.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {Object.entries(groupedAndSortedData).map(([catKey, { nombreDisplay, proyectos: proyectosCategoria }]) => (
              <CategoriaAccordion
                key={catKey}
                catKey={catKey}
                nombreDisplay={nombreDisplay}
                proyectos={proyectosCategoria}
                juecesEsperadosPorProyecto={juecesEsperadosPorProyecto}
                ponderaciones={ponderaciones}
                initialExpanded={true}
              />
            ))}
          </Box>
        )}
      </Container>
    </Box>
  );
}
