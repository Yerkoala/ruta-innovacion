import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Chip, 
  IconButton,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Switch,
  FormControlLabel,
  Snackbar,
  Alert
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BlockIcon from '@mui/icons-material/Block';
import COLORS from '../../../assets/colors';
import { suscribirseEstadosJueces, cambiarEstadoVotacionJuez } from '../../adminPanel/utils/firebaseOperations';

export default function ResumenJuez({ 
  nombreJuez, 
  proyectosAsignados = [], 
  evaluaciones = [],
  finalId = null
}) {
  const [expanded, setExpanded] = useState(false);
  const [estadoJuez, setEstadoJuez] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // Suscribirse al estado del juez en tiempo real
  useEffect(() => {
    if (!finalId || !nombreJuez || nombreJuez === 'todos') {
      return;
    }

    const unsubscribe = suscribirseEstadosJueces(finalId, (estados) => {
      // estados es un array, necesitamos encontrar el juez específico
      const estadoDelJuez = estados.find(e => e.nombre === nombreJuez);
      if (estadoDelJuez) {
        setEstadoJuez(estadoDelJuez);
      } else {
        // Si no hay estado, el juez está en pendiente
        setEstadoJuez({ estado: 'pendiente' });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [finalId, nombreJuez]);

  const mostrarNotificacion = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const cerrarNotificacion = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const toggleEstadoJuez = async () => {
    if (!finalId || !nombreJuez) return;

    try {
      const estadoVotacion = estadoJuez?.estado || 'pendiente';
      
      // Si está "evaluando", cambiarlo a "pendiente"
      // Si está "pendiente" o "completado", cambiarlo a "evaluando"
      const nuevoEstado = estadoVotacion === 'evaluando' ? 'pendiente' : 'evaluando';

      await cambiarEstadoVotacionJuez(finalId, nombreJuez, nuevoEstado);
      
      const mensaje = nuevoEstado === 'evaluando' 
        ? `${nombreJuez} marcado como "Votando"` 
        : `${nombreJuez} puede volver a votar`;
      
      mostrarNotificacion(mensaje, 'success');
    } catch (error) {
      mostrarNotificacion(error.message, 'error');
    }
  };

  if (!nombreJuez || nombreJuez === 'todos') {
    return null;
  }

  // Estado de votación del juez
  const estadoVotacion = estadoJuez?.estado || 'pendiente';
  const estaVotando = estadoVotacion === 'evaluando';
  const estaCompletado = estadoVotacion === 'completado';

  // Calcular estadísticas
  const totalProyectos = proyectosAsignados.length;
  
  // Proyectos que este juez ya evaluó
  const proyectosEvaluados = proyectosAsignados.filter(proyecto => {
    return evaluaciones.some(evaluacion => 
      evaluacion.proyectoId === proyecto.id && evaluacion.jurado === nombreJuez
    );
  });

  const totalEvaluados = proyectosEvaluados.length;
  const totalPendientes = totalProyectos - totalEvaluados;
  const porcentajeCompletado = totalProyectos > 0 ? (totalEvaluados / totalProyectos) * 100 : 0;
  const estaCompleto = totalPendientes === 0 && totalProyectos > 0;
  const noHaEmpezado = totalEvaluados === 0 && totalProyectos > 0;

  // Determinar colores según el estado
  const getColors = () => {
    if (estaCompleto) return { border: '#10b981', bg: 'rgba(16,185,129,0.1)', bgHover: 'rgba(16,185,129,0.15)', text: '#10b981' };
    if (noHaEmpezado) return { border: '#ef4444', bg: 'rgba(239,68,68,0.1)', bgHover: 'rgba(239,68,68,0.15)', text: '#ef4444' };
    return { border: COLORS.orange, bg: 'rgba(244,121,32,0.1)', bgHover: 'rgba(244,121,32,0.15)', text: COLORS.orange };
  };

  const colors = getColors();

  // Proyectos pendientes
  const proyectosPendientes = proyectosAsignados.filter(proyecto => {
    return !evaluaciones.some(evaluacion => 
      evaluacion.proyectoId === proyecto.id && evaluacion.jurado === nombreJuez
    );
  });

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        mb: 3, 
        border: `2px solid ${colors.border}`,
        borderRadius: 2,
        overflow: 'hidden'
      }}
    >
      {/* Header del resumen */}
      <Box 
        sx={{ 
          bgcolor: colors.bg,
          p: { xs: 1.5, sm: 2.5 },
          cursor: 'pointer',
          '&:hover': { bgcolor: colors.bgHover },
          transition: 'background-color 0.2s'
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 1.5, sm: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
            <AssignmentIcon sx={{ fontSize: { xs: 20, sm: 28 }, color: colors.text }} />
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, mb: 0.5 }}>
                <Typography variant="h6" fontWeight={800} sx={{ color: COLORS.navy, fontSize: { xs: 14, sm: 18 } }}>
                  Resumen de {nombreJuez}
                </Typography>
                {/* Badge de estado del juez */}
                <Chip 
                  label={
                    estaVotando ? 'Votando' :
                    estaCompletado ? 'Completado' :
                    'Pendiente'
                  }
                  size="small" 
                  color={
                    estaVotando ? 'warning' :
                    estaCompletado ? 'success' :
                    'default'
                  }
                  variant={estaVotando ? 'filled' : 'outlined'}
                  icon={
                    estaVotando ? <BlockIcon sx={{ fontSize: { xs: 12, sm: 16 } }} /> :
                    estaCompletado ? <CheckCircleIcon sx={{ fontSize: { xs: 12, sm: 16 } }} /> :
                    <PendingIcon sx={{ fontSize: { xs: 12, sm: 16 } }} />
                  }
                  sx={{
                    height: { xs: 20, sm: 24 },
                    '& .MuiChip-label': { px: { xs: 0.75, sm: 1 }, fontSize: { xs: 10, sm: 12 } }
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: 10, sm: 12 }, display: { xs: 'none', sm: 'block' } }}>
                Haz clic para ver detalles
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
            {/* Switch de control de estado - Solo si no está completado */}
            {!estaCompletado && finalId && (
              <Box 
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                sx={{ 
                  bgcolor: 'white', 
                  borderRadius: 2, 
                  px: { xs: 1, sm: 2 }, 
                  py: { xs: 0.5, sm: 1 },
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <FormControlLabel
                  control={
                    <Switch 
                      checked={estaVotando}
                      onChange={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        toggleEstadoJuez();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      color={estaVotando ? 'warning' : 'success'}
                      size="small"
                    />
                  }
                  label={estaVotando ? 'Cambiar a Pendiente' : 'Marcar como Votando'}
                  labelPlacement="start"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  sx={{
                    m: 0,
                    '& .MuiFormControlLabel-label': {
                      fontSize: { xs: 10, sm: 12 },
                      fontWeight: 600,
                      color: estaVotando ? 'warning.main' : 'success.main',
                      display: { xs: 'none', sm: 'block' }
                    }
                  }}
                />
              </Box>
            )}
            
            <IconButton 
              sx={{ 
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s',
                color: colors.text,
                p: { xs: 0.5, sm: 1 }
              }}
            >
              <ExpandMoreIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
            </IconButton>
          </Box>
        </Box>

        {/* Estadísticas principales */}
        <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, flexWrap: 'wrap', mb: { xs: 1.5, sm: 2 } }}>
          <Chip
            icon={<AssignmentIcon sx={{ fontSize: { xs: 14, sm: 18 } }} />}
            label={`${totalProyectos} Asignados`}
            sx={{ 
              bgcolor: 'white', 
              fontWeight: 700,
              fontSize: { xs: 10, sm: 13 },
              border: `1px solid ${COLORS.navy}`,
              color: COLORS.navy,
              height: { xs: 24, sm: 32 },
              '& .MuiChip-label': { px: { xs: 1, sm: 1.5 } }
            }}
          />
          <Chip
            icon={<CheckCircleIcon sx={{ fontSize: { xs: 14, sm: 18 } }} />}
            label={`${totalEvaluados} Evaluados`}
            sx={{ 
              bgcolor: 'white', 
              fontWeight: 700,
              fontSize: { xs: 10, sm: 13 },
              border: '1px solid #10b981',
              color: '#10b981',
              height: { xs: 24, sm: 32 },
              '& .MuiChip-label': { px: { xs: 1, sm: 1.5 } }
            }}
          />
          <Chip
            icon={<PendingIcon sx={{ fontSize: { xs: 14, sm: 18 } }} />}
            label={`${totalPendientes} Pendientes`}
            sx={{ 
              bgcolor: 'white', 
              fontWeight: 700,
              fontSize: { xs: 10, sm: 13 },
              border: `1px solid ${totalPendientes > 0 ? COLORS.orange : '#e5e7eb'}`,
              color: totalPendientes > 0 ? COLORS.orange : '#6b7280',
              height: { xs: 24, sm: 32 },
              '& .MuiChip-label': { px: { xs: 1, sm: 1.5 } }
            }}
          />
          {noHaEmpezado && (
            <Chip
              icon={<PendingIcon sx={{ fontSize: { xs: 14, sm: 18 } }} />}
              label="⚠️ SIN INICIAR"
              sx={{ 
                bgcolor: '#ef4444', 
                color: 'white',
                fontWeight: 900,
                fontSize: { xs: 10, sm: 13 },
                height: { xs: 24, sm: 32 },
                '& .MuiChip-label': { px: { xs: 1, sm: 1.5 } }
              }}
            />
          )}
          {estaCompleto && (
            <Chip
              icon={<CheckCircleIcon sx={{ fontSize: { xs: 14, sm: 18 } }} />}
              label="✓ COMPLETO"
              sx={{ 
                bgcolor: '#10b981', 
                color: 'white',
                fontWeight: 900,
                fontSize: { xs: 10, sm: 13 },
                height: { xs: 24, sm: 32 },
                '& .MuiChip-label': { px: { xs: 1, sm: 1.5 } }
              }}
            />
          )}
        </Box>

        {/* Barra de progreso */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: { xs: 0.5, sm: 1 } }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ fontSize: { xs: 10, sm: 12 } }}>
              Progreso
            </Typography>
            <Typography variant="caption" fontWeight={900} sx={{ color: colors.text, fontSize: { xs: 10, sm: 12 } }}>
              {porcentajeCompletado.toFixed(0)}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={porcentajeCompletado} 
            sx={{
              height: { xs: 6, sm: 8 },
              borderRadius: 1,
              bgcolor: '#e5e7eb',
              '& .MuiLinearProgress-bar': {
                bgcolor: colors.text,
                borderRadius: 1
              }
            }}
          />
        </Box>
      </Box>

      {/* Detalles expandibles */}
      <Collapse in={expanded}>
        <Box sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: '#fafafa' }}>
          {/* Tabla de proyectos evaluados */}
          {proyectosEvaluados.length > 0 && (
            <Box sx={{ mb: totalPendientes > 0 ? { xs: 2, sm: 3 } : 0 }}>
              <Typography 
                variant="subtitle2" 
                fontWeight={800} 
                sx={{ mb: { xs: 1, sm: 1.5 }, color: '#10b981', display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, fontSize: { xs: 12, sm: 14 } }}
              >
                <CheckCircleIcon sx={{ fontSize: { xs: 14, sm: 18 } }} />
                Proyectos Evaluados ({proyectosEvaluados.length})
              </Typography>
              
              <TableContainer 
                component={Paper} 
                elevation={0} 
                sx={{ 
                  border: '1px solid #e0e0e0',
                  maxWidth: '100%',
                  overflowX: 'auto'
                }}
              >
                <Table size="small" sx={{ minWidth: { xs: 500, sm: 'auto' } }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: { xs: 10, sm: 12 }, width: 50, whiteSpace: 'nowrap' }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: { xs: 10, sm: 12 }, whiteSpace: 'nowrap' }}>ID</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: { xs: 10, sm: 12 }, whiteSpace: 'nowrap' }}>Categoría</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: { xs: 10, sm: 12 }, whiteSpace: 'nowrap' }}>Proyecto</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: { xs: 10, sm: 12 }, whiteSpace: 'nowrap' }}>Grupo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {proyectosEvaluados.map((proyecto, index) => (
                      <TableRow key={proyecto.id} sx={{ '&:hover': { bgcolor: '#f9fafb' } }}>
                        <TableCell sx={{ fontWeight: 700, color: '#6b7280', fontSize: { xs: 10, sm: 12 }, whiteSpace: 'nowrap' }}>
                          {index + 1}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#10b981', fontSize: { xs: 11, sm: 13 }, whiteSpace: 'nowrap' }}>
                          #{proyecto.numero}
                        </TableCell>
                        <TableCell sx={{ fontSize: { xs: 10, sm: 12 }, whiteSpace: 'nowrap' }}>{proyecto.categoria}</TableCell>
                        <TableCell sx={{ fontSize: { xs: 10, sm: 12 } }}>{proyecto.proyecto}</TableCell>
                        <TableCell align="center" sx={{ fontSize: { xs: 10, sm: 12 }, whiteSpace: 'nowrap' }}>{proyecto.grupo || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Tabla de proyectos pendientes */}
          {proyectosPendientes.length > 0 && (
            <Box>
              <Typography 
                variant="subtitle2" 
                fontWeight={800} 
                sx={{ mb: { xs: 1, sm: 1.5 }, color: COLORS.orange, display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, fontSize: { xs: 12, sm: 14 } }}
              >
                <PendingIcon sx={{ fontSize: { xs: 14, sm: 18 } }} />
                Proyectos Pendientes ({proyectosPendientes.length})
              </Typography>
              
              <TableContainer 
                component={Paper} 
                elevation={0} 
                sx={{ 
                  border: '1px solid #e0e0e0',
                  maxWidth: '100%',
                  overflowX: 'auto'
                }}
              >
                <Table size="small" sx={{ minWidth: { xs: 500, sm: 'auto' } }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: { xs: 10, sm: 12 }, width: 50, whiteSpace: 'nowrap' }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: { xs: 10, sm: 12 }, whiteSpace: 'nowrap' }}>ID</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: { xs: 10, sm: 12 }, whiteSpace: 'nowrap' }}>Categoría</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: { xs: 10, sm: 12 }, whiteSpace: 'nowrap' }}>Proyecto</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: { xs: 10, sm: 12 }, whiteSpace: 'nowrap' }}>Grupo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {proyectosPendientes.map((proyecto, index) => (
                      <TableRow key={proyecto.id} sx={{ '&:hover': { bgcolor: '#fff8f1' } }}>
                        <TableCell sx={{ fontWeight: 700, color: '#6b7280', fontSize: { xs: 10, sm: 12 }, whiteSpace: 'nowrap' }}>
                          {index + 1}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: COLORS.orange, fontSize: { xs: 11, sm: 13 }, whiteSpace: 'nowrap' }}>
                          #{proyecto.numero}
                        </TableCell>
                        <TableCell sx={{ fontSize: { xs: 10, sm: 12 }, whiteSpace: 'nowrap' }}>{proyecto.categoria}</TableCell>
                        <TableCell sx={{ fontSize: { xs: 10, sm: 12 } }}>{proyecto.proyecto}</TableCell>
                        <TableCell align="center" sx={{ fontSize: { xs: 10, sm: 12 }, whiteSpace: 'nowrap' }}>{proyecto.grupo || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {totalProyectos === 0 && (
            <Box sx={{ textAlign: 'center', py: { xs: 2, sm: 3 } }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: 11, sm: 14 } }}>
                Este juez no tiene proyectos asignados
              </Typography>
            </Box>
          )}
        </Box>
      </Collapse>

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={cerrarNotificacion}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={cerrarNotificacion}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
