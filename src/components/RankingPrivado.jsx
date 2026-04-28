import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, collectionGroup } from 'firebase/firestore';
import { db } from '../firebaseconfig';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  CircularProgress, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';

// Colores de Agrosuper
const COLORS = {
  navy: '#001a6e',
  orange: '#F47920',
  orangeDark: '#d96a18',
};

// Función para normalizar strings
const normalizarTexto = (texto) => {
  if (!texto) return '';
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

// Mapear categoría normalizada al ID de ponderación en Firebase
const categoriaToPonderacionId = (categoriaNormalizada) => {
  const mapeo = {
    "chispeza": "chispeza",
    "mejora continua": "mejora-continua",
    "sandia cala": "sandia-cala",
    "pinta pa bueno": "pinta-pa-bueno"
  };
  return mapeo[categoriaNormalizada] || categoriaNormalizada;
};

// Diccionario de estilos centralizado (consistente con EvaluacionProyectos)
const categoriaEstilos = {
  "mejora continua": { color: "#a114c4", icono: "📈" },
  "sandia cala": { color: "#28aa1d", icono: "🍉" },
  "pinta pa bueno": { color: "#f96703", icono: "🖌️" },
  "chispeza": { color: "#ffc64c", icono: "💡" },
  "default": { color: "#6c757d", icono: "📁" }
};

// Función para obtener colores derivados del color principal
const getCategoryColors = (categoria) => {
  const catNormalizada = normalizarTexto(categoria);
  const estilo = categoriaEstilos[catNormalizada];
  
  if (!estilo) {
    // Fallback a default (gris)
    return {
      bg: '#f5f5f5',
      text: categoriaEstilos["default"].color,
      border: '#dee2e6'
    };
  }
  
  // Generar colores de fondo claros basados en el color principal
  const colorMap = {
    "#a114c4": { bg: '#F3E5F5', border: '#BA68C8' }, // mejora continua
    "#28aa1d": { bg: '#E8F5E9', border: '#81C784' }, // sandia cala
    "#f96703": { bg: '#FFF3E0', border: '#FFB74D' }, // pinta pa bueno
    "#ffc64c": { bg: '#FFF8E1', border: '#FFD54F' }, // chispeza
    "#6c757d": { bg: '#f5f5f5', border: '#dee2e6' }  // default
  };
  
  const colors = colorMap[estilo.color] || { bg: '#f5f5f5', border: '#e0e0e0' };
  
  return {
    bg: colors.bg,
    text: estilo.color,
    border: colors.border
  };
};

export default function RankingPrivado() {
  const navigate = useNavigate();
  const [activeGroup, setActiveGroup] = useState('todos');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedProjects, setExpandedProjects] = useState({});
  const [finalActiva, setFinalActiva] = useState(null);
  const [proyectos, setProyectos] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [ponderaciones, setPonderaciones] = useState({});
  const [loading, setLoading] = useState(true);
  const [grupos, setGrupos] = useState([]);

  // Cargar datos de Firebase
  useEffect(() => {
    cargarDatosRanking();
  }, []);

  const cargarDatosRanking = async () => {
    setLoading(true);
    try {
      // 1. Obtener final activa
      const finalesRef = collection(db, 'finales');
      const qFinales = query(finalesRef, where('activa', '==', true));
      const finalesSnapshot = await getDocs(qFinales);
      
      if (finalesSnapshot.empty) {
        setLoading(false);
        return;
      }

      const finalActivaDoc = finalesSnapshot.docs[0];
      const finalData = {
        id: finalActivaDoc.id,
        ...finalActivaDoc.data()
      };
      setFinalActiva(finalData);

      // 2. Obtener proyectos de la final activa
      const proyectosRef = collection(db, 'proyectos');
      const qProyectos = query(proyectosRef, where('finalId', '==', finalActivaDoc.id));
      const proyectosSnapshot = await getDocs(qProyectos);
      const proyectosData = proyectosSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProyectos(proyectosData);

      // Extraer grupos únicos de los proyectos
      const gruposUnicos = [...new Set(proyectosData.map(p => p.grupo).filter(Boolean))].sort();
      setGrupos(gruposUnicos);

      // Inicializar categorías expandidas
      const categoriasUnicas = [...new Set(proyectosData.map(p => normalizarTexto(p.categoria)))];
      const expandedInit = {};
      categoriasUnicas.forEach(cat => { expandedInit[cat] = true; });
      setExpandedCategories(expandedInit);

      // 3. Obtener evaluaciones de la final activa desde colección plana
      const evaluacionesRef = collection(db, 'evaluaciones');
      const qEvaluaciones = query(evaluacionesRef, where('finalId', '==', finalActivaDoc.id));
      const evaluacionesSnapshot = await getDocs(qEvaluaciones);
      const evaluacionesData = evaluacionesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setEvaluaciones(evaluacionesData);

      // 4. Obtener ponderaciones
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

  // Calcular nota de una evaluación individual
  const calcularNotaEvaluacion = (evaluacion, categoria) => {
    const catNormalizada = normalizarTexto(categoria);
    const ponderacionId = categoriaToPonderacionId(catNormalizada);
    const ponderacion = ponderaciones[ponderacionId] || {};
    
    // Calcular promedio de cada campo
    const campos = ['DESAFIO', 'CREATIVIDAD', 'IMPLEMENTABILIDAD', 'ESCALABILIDAD'];
    
    // Determinar si usa IMPACTO o EBITDA/PRODUCTIVIDAD
    if (catNormalizada === 'chispeza') {
      campos.push('IMPACTO');
    } else {
      campos.push('EBITDA', 'PRODUCTIVIDAD');
    }

    let notaFinal = 0;

    campos.forEach(campo => {
      const valor = evaluacion.calificaciones?.[campo];
      if (valor !== undefined && valor !== null) {
        const peso = ponderacion[campo] !== undefined ? ponderacion[campo] : (100 / campos.length);
        const notaPonderada = (Number(valor) * peso) / 100;
        notaFinal += notaPonderada;
      }
    });

    return notaFinal;
  };

  // Calcular promedios por proyecto
  const calcularPromedioProyecto = (proyectoId, categoria) => {
    const evaluacionesProyecto = evaluaciones.filter(e => e.proyectoId === proyectoId);
    
    if (evaluacionesProyecto.length === 0) return null;

    const catNormalizada = normalizarTexto(categoria);
    const ponderacionId = categoriaToPonderacionId(catNormalizada);
    const ponderacion = ponderaciones[ponderacionId] || {};
    
    // Calcular promedio de cada campo
    const campos = ['DESAFIO', 'CREATIVIDAD', 'IMPLEMENTABILIDAD', 'ESCALABILIDAD'];
    
    // Determinar si usa IMPACTO o EBITDA/PRODUCTIVIDAD
    if (catNormalizada === 'chispeza') {
      campos.push('IMPACTO');
    } else {
      campos.push('EBITDA', 'PRODUCTIVIDAD');
    }

    let notaFinal = 0;
    const detallesCampos = {};

    campos.forEach(campo => {
      const valoresCampo = evaluacionesProyecto
        .map(e => e.calificaciones?.[campo])
        .filter(v => v !== undefined && v !== null);
      
      if (valoresCampo.length > 0) {
        const promedioCampo = valoresCampo.reduce((sum, val) => sum + Number(val), 0) / valoresCampo.length;
        // Usar ponderación de Firebase o peso igualmente distribuido si no existe
        const peso = ponderacion[campo] !== undefined ? ponderacion[campo] : (100 / campos.length);
        const notaPonderada = (promedioCampo * peso) / 100;
        
        detallesCampos[campo] = {
          promedio: promedioCampo,
          peso: peso,
          notaPonderada: notaPonderada
        };
        
        notaFinal += notaPonderada;
      }
    });

    return {
      nota: notaFinal,
      cantidadEvaluaciones: evaluacionesProyecto.length,
      detalles: detallesCampos,
      evaluacionesIndividuales: evaluacionesProyecto
    };
  };

  // Agrupar proyectos por categoría con sus promedios
  const groupedAndSortedData = useMemo(() => {
    if (!proyectos.length) return {};

    // Filtrar por grupo si no es "todos"
    let proyectosFiltrados = proyectos;
    if (activeGroup !== 'todos') {
      proyectosFiltrados = proyectos.filter(p => p.grupo === activeGroup);
    }

    const grouped = proyectosFiltrados.reduce((acc, proyecto) => {
      const catNormalizada = normalizarTexto(proyecto.categoria);
      
      if (!acc[catNormalizada]) {
        acc[catNormalizada] = {
          nombreDisplay: proyecto.categoria,
          proyectos: []
        };
      }

      const resultado = calcularPromedioProyecto(proyecto.id, proyecto.categoria);
      
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
  }, [proyectos, evaluaciones, ponderaciones, activeGroup]);

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const toggleProject = (projectId) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  const getRankIcon = (index) => {
    if (index === 0) return <EmojiEventsIcon sx={{ fontSize: 28, color: '#FFD700' }} />;
    if (index === 1) return <EmojiEventsIcon sx={{ fontSize: 28, color: '#C0C0C0' }} />;
    if (index === 2) return <EmojiEventsIcon sx={{ fontSize: 28, color: '#CD7F32' }} />;
    
    return (
      <Box sx={{ 
        width: 28, 
        height: 28, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: 16,
        color: '#666'
      }}>
        {index + 1}
      </Box>
    );
  };

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

  if (!finalActiva) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#fafafa', p: 3 }}>
        <Box sx={{ textAlign: 'center', maxWidth: 400 }}>
          <EmojiEventsIcon sx={{ fontSize: 48, color: '#bbb', mb: 2 }} />
          <Typography variant="h6" fontWeight={700} color={COLORS.navy} gutterBottom>
            No hay final activa
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Aún no se ha configurado una final activa para mostrar el ranking.
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
      {/* Header compacto */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #e0e0e0', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <Container maxWidth="lg" sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Button
              onClick={() => navigate('/')}
              startIcon={<ArrowBackIcon />}
              sx={{ 
                color: '#666',
                textTransform: 'none',
                fontSize: 13,
                fontWeight: 500,
                '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' }
              }}
            >
              Volver
            </Button>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip 
                icon={<EmojiEventsIcon />}
                label={`${proyectos.length} proyectos`}
                size="small"
                sx={{ bgcolor: '#f5f5f5', fontWeight: 600, fontSize: 12 }}
              />
            </Box>
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Typography 
              variant="h5" 
              sx={{ 
                color: COLORS.navy, 
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '-0.3px',
                mb: 0.5
              }}
            >
              {finalActiva.nombre} - PRIVADO
            </Typography>
            <Typography variant="body2" sx={{ color: '#666', fontWeight: 600 }}>
              Ranking {finalActiva.anio}
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: 3 }}>
        {/* Selectores de Grupo */}
        {grupos.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant={activeGroup === 'todos' ? 'contained' : 'outlined'}
              onClick={() => setActiveGroup('todos')}
              sx={{
                px: 3,
                py: 1,
                fontWeight: 600,
                fontSize: 13,
                borderRadius: 2,
                textTransform: 'none',
                ...(activeGroup === 'todos' ? {
                  bgcolor: COLORS.orange,
                  borderColor: COLORS.orange,
                  '&:hover': { bgcolor: COLORS.orangeDark }
                } : {
                  borderColor: '#d1d5db',
                  color: '#555',
                  '&:hover': { borderColor: COLORS.orange, bgcolor: 'rgba(244,121,32,0.05)' }
                })
              }}
            >
              Todos
            </Button>
            
            {grupos.map((grupo) => (
              <Button
                key={grupo}
                variant={activeGroup === grupo ? 'contained' : 'outlined'}
                onClick={() => setActiveGroup(grupo)}
                sx={{
                  px: 3,
                  py: 1,
                  fontWeight: 600,
                  fontSize: 13,
                  borderRadius: 2,
                  textTransform: 'none',
                  ...(activeGroup === grupo ? {
                    bgcolor: COLORS.orange,
                    borderColor: COLORS.orange,
                    '&:hover': { bgcolor: COLORS.orangeDark }
                  } : {
                    borderColor: '#d1d5db',
                    color: '#555',
                    '&:hover': { borderColor: COLORS.orange, bgcolor: 'rgba(244,121,32,0.05)' }
                  })
                }}
              >
                Grupo {grupo}
              </Button>
            ))}
          </Box>
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
            {Object.entries(groupedAndSortedData).map(([catKey, { nombreDisplay, proyectos: proyectosCategoria }]) => {
              const colors = getCategoryColors(nombreDisplay);
              const estilo = categoriaEstilos[normalizarTexto(nombreDisplay)] || categoriaEstilos["default"];
              const isExpanded = expandedCategories[catKey];

              return (
                <Accordion 
                  key={catKey}
                  expanded={isExpanded}
                  onChange={() => toggleCategory(catKey)}
                  elevation={0}
                  sx={{ 
                    borderRadius: '8px !important',
                    border: '1px solid #e0e0e0',
                    '&:before': { display: 'none' },
                    overflow: 'hidden',
                    bgcolor: 'white'
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon sx={{ color: colors.text }} />}
                    sx={{
                      bgcolor: colors.bg,
                      minHeight: 60,
                      '&.Mui-expanded': { minHeight: 60 },
                      px: 2.5,
                      py: 1
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography sx={{ fontSize: 28 }}>
                        {estilo.icono}
                      </Typography>
                      <Box>
                        <Typography variant="h6" fontWeight={800} sx={{ color: colors.text, fontSize: 16 }}>
                          {nombreDisplay}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {proyectosCategoria.length} proyecto{proyectosCategoria.length !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                    </Box>
                  </AccordionSummary>

                  <AccordionDetails sx={{ p: 0 }}>
                    <Box>
                      {proyectosCategoria.map((proyecto, index) => {
                        const isProjectExpanded = expandedProjects[proyecto.id];
                        
                        return (
                          <Box key={proyecto.id}>
                            <Box
                              onClick={() => toggleProject(proyecto.id)}
                              sx={{
                                px: 3,
                                py: 2,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                cursor: 'pointer',
                                borderBottom: !isProjectExpanded ? (index < proyectosCategoria.length - 1 ? '1px solid #f0f0f0' : 'none') : '1px solid #f0f0f0',
                                '&:hover': { bgcolor: '#fafafa' },
                                transition: 'background-color 0.2s'
                              }}
                            >
                              {/* Posición */}
                              <Box sx={{ flexShrink: 0 }}>
                                {getRankIcon(index)}
                              </Box>

                              {/* Info del Proyecto */}
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body1" fontWeight={700} sx={{ color: COLORS.navy, mb: 0.5 }}>
                                  #{proyecto.numero} - {proyecto.proyecto}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                  <Typography variant="caption" color="text.secondary">
                                    <strong>Líder:</strong> {proyecto.lider}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    <strong>Gerencia:</strong> {proyecto.gerencia}
                                  </Typography>
                                  {proyecto.grupo && (
                                    <Typography variant="caption" color="text.secondary">
                                      <strong>Grupo:</strong> {proyecto.grupo}
                                    </Typography>
                                  )}
                                </Box>
                              </Box>

                              {/* Nota y Evaluaciones */}
                              <Box sx={{ flexShrink: 0, textAlign: 'right', display: 'flex', alignItems: 'center', gap: 1 }}>
                                {proyecto.resultado ? (
                                  <>
                                    <Box>
                                      <Typography 
                                        variant="h5" 
                                        fontWeight={900}
                                        sx={{ color: colors.text }}
                                      >
                                        {proyecto.resultado.nota.toFixed(2)}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {proyecto.resultado.cantidadEvaluaciones} eval.
                                      </Typography>
                                    </Box>
                                    <ExpandMoreIcon 
                                      sx={{ 
                                        color: '#666',
                                        transform: isProjectExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.3s'
                                      }} 
                                    />
                                  </>
                                ) : (
                                  <Typography variant="caption" color="text.disabled" fontStyle="italic">
                                    Sin evaluar
                                  </Typography>
                                )}
                              </Box>
                            </Box>

                            {/* Detalles de Evaluaciones - Accordion interno */}
                            {isProjectExpanded && proyecto.resultado?.evaluacionesIndividuales && (
                              <Box sx={{ bgcolor: '#f8f9fa', px: 3, py: 2, borderBottom: index < proyectosCategoria.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: COLORS.navy }}>
                                  <PersonIcon sx={{ fontSize: 18 }} />
                                  Evaluaciones Individuales
                                </Typography>
                                
                                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                        <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Juez</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12 }}>Desafío</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12 }}>Creatividad</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12 }}>Implementabilidad</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12 }}>Escalabilidad</TableCell>
                                        {normalizarTexto(proyecto.categoria) === 'chispeza' ? (
                                          <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12 }}>Impacto</TableCell>
                                        ) : (
                                          <>
                                            <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12 }}>EBITDA</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12 }}>Productividad</TableCell>
                                          </>
                                        )}
                                        <TableCell align="center" sx={{ fontWeight: 700, fontSize: 12, bgcolor: colors.bg, color: colors.text }}>Nota Final</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {proyecto.resultado.evaluacionesIndividuales.map((evaluacion, idx) => {
                                        const notaEvaluacion = calcularNotaEvaluacion(evaluacion, proyecto.categoria);
                                        
                                        return (
                                          <TableRow key={idx} sx={{ '&:hover': { bgcolor: '#fafafa' } }}>
                                            <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>{evaluacion.juez || 'Sin nombre'}</TableCell>
                                            <TableCell align="center" sx={{ fontSize: 13 }}>{evaluacion.calificaciones?.DESAFIO || '-'}</TableCell>
                                            <TableCell align="center" sx={{ fontSize: 13 }}>{evaluacion.calificaciones?.CREATIVIDAD || '-'}</TableCell>
                                            <TableCell align="center" sx={{ fontSize: 13 }}>{evaluacion.calificaciones?.IMPLEMENTABILIDAD || '-'}</TableCell>
                                            <TableCell align="center" sx={{ fontSize: 13 }}>{evaluacion.calificaciones?.ESCALABILIDAD || '-'}</TableCell>
                                            {normalizarTexto(proyecto.categoria) === 'chispeza' ? (
                                              <TableCell align="center" sx={{ fontSize: 13 }}>{evaluacion.calificaciones?.IMPACTO || '-'}</TableCell>
                                            ) : (
                                              <>
                                                <TableCell align="center" sx={{ fontSize: 13 }}>{evaluacion.calificaciones?.EBITDA || '-'}</TableCell>
                                                <TableCell align="center" sx={{ fontSize: 13 }}>{evaluacion.calificaciones?.PRODUCTIVIDAD || '-'}</TableCell>
                                              </>
                                            )}
                                            <TableCell align="center" sx={{ fontWeight: 700, fontSize: 14, bgcolor: colors.bg, color: colors.text }}>
                                              {notaEvaluacion.toFixed(2)}
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              </Box>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>
        )}
      </Container>
    </Box>
  );
}
