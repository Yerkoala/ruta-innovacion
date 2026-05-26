import React from 'react';
import { 
  Box, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper 
} from '@mui/material';
import COLORS from '../../../assets/colors';
import { normalizarTexto } from '../utils/categorias';
import { calcularNotaEvaluacion } from '../utils/calculos';

/**
 * Componente que muestra la tabla de evaluaciones individuales de un proyecto
 * @param {Array} evaluacionesIndividuales - Lista de evaluaciones del proyecto
 * @param {string} categoria - Categoría del proyecto (determina las columnas)
 * @param {Object} colors - Colores de la categoría para estilos
 * @param {Object} ponderaciones - Ponderaciones de Firebase para calcular notas
 */
export default function TablaEvaluaciones({ 
  evaluacionesIndividuales, 
  categoria, 
  colors,
  ponderaciones 
}) {
  if (!evaluacionesIndividuales || evaluacionesIndividuales.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 3, bgcolor: '#fff', borderRadius: 1, border: '1px solid #e5e7eb' }}>
        <Typography variant="body2" color="text.secondary">
          Aún no hay evaluaciones registradas para este proyecto
        </Typography>
      </Box>
    );
  }

  const esChispeza = normalizarTexto(categoria) === 'chispeza';

  return (
    <>
      <Typography 
        variant="subtitle2" 
        fontWeight={700} 
        sx={{ 
          mb: 2, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1, 
          color: COLORS.navy,
          fontSize: { xs: 12, sm: 14 }
        }}
      >
        Evaluaciones Individuales
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
        <Table size="small" sx={{ minWidth: { xs: 650, sm: 'auto' } }}>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 700, fontSize: { xs: 10, sm: 12 }, whiteSpace: 'nowrap' }}>Juez</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: { xs: 10, sm: 12 }, whiteSpace: 'nowrap' }}>Desafío</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: { xs: 10, sm: 12 }, whiteSpace: 'nowrap' }}>Creatividad</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: { xs: 10, sm: 12 }, whiteSpace: 'nowrap' }}>Implementabilidad</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: { xs: 10, sm: 12 }, whiteSpace: 'nowrap' }}>Escalabilidad</TableCell>
              {esChispeza ? (
                <TableCell align="center" sx={{ fontWeight: 700, fontSize: { xs: 10, sm: 12 }, whiteSpace: 'nowrap' }}>Impacto</TableCell>
              ) : (
                <>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: { xs: 10, sm: 12 }, whiteSpace: 'nowrap' }}>EBITDA</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: { xs: 10, sm: 12 }, whiteSpace: 'nowrap' }}>Productividad</TableCell>
                </>
              )}
              <TableCell 
                align="center" 
                sx={{ 
                  fontWeight: 700, 
                  fontSize: { xs: 10, sm: 12 }, 
                  bgcolor: colors.bg, 
                  color: colors.text,
                  whiteSpace: 'nowrap'
                }}
              >
                Nota Final
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {evaluacionesIndividuales.map((evaluacion, idx) => {
              const notaEvaluacion = calcularNotaEvaluacion(evaluacion, categoria, ponderaciones);
              
              return (
                <TableRow key={idx} sx={{ '&:hover': { bgcolor: '#fafafa' } }}>
                  <TableCell sx={{ fontWeight: 600, fontSize: { xs: 11, sm: 13 }, whiteSpace: 'nowrap' }}>
                    {evaluacion.jurado || 'Sin nombre'}
                  </TableCell>
                  <TableCell align="center" sx={{ fontSize: { xs: 11, sm: 13 } }}>
                    {evaluacion.calificaciones?.DESAFIO || '-'}
                  </TableCell>
                  <TableCell align="center" sx={{ fontSize: { xs: 11, sm: 13 } }}>
                    {evaluacion.calificaciones?.CREATIVIDAD || '-'}
                  </TableCell>
                  <TableCell align="center" sx={{ fontSize: { xs: 11, sm: 13 } }}>
                    {evaluacion.calificaciones?.IMPLEMENTABILIDAD || '-'}
                  </TableCell>
                  <TableCell align="center" sx={{ fontSize: { xs: 11, sm: 13 } }}>
                    {evaluacion.calificaciones?.ESCALABILIDAD || '-'}
                  </TableCell>
                  {esChispeza ? (
                    <TableCell align="center" sx={{ fontSize: { xs: 11, sm: 13 } }}>
                      {evaluacion.calificaciones?.IMPACTO || '-'}
                    </TableCell>
                  ) : (
                    <>
                      <TableCell align="center" sx={{ fontSize: { xs: 11, sm: 13 } }}>
                        {evaluacion.calificaciones?.EBITDA || '-'}
                      </TableCell>
                      <TableCell align="center" sx={{ fontSize: { xs: 11, sm: 13 } }}>
                        {evaluacion.calificaciones?.PRODUCTIVIDAD || '-'}
                      </TableCell>
                    </>
                  )}
                  <TableCell 
                    align="center" 
                    sx={{ 
                      fontWeight: 700, 
                      fontSize: { xs: 12, sm: 14 }, 
                      bgcolor: colors.bg, 
                      color: colors.text 
                    }}
                  >
                    {notaEvaluacion.toFixed(2)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
