import React from 'react';
import { Box, Typography } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import COLORS from '../../../assets/colors';

/**
 * Componente que muestra el estado de evaluación de los jueces asignados a un proyecto
 * @param {Array} juecesEsperados - Lista de nombres de jueces asignados al proyecto
 * @param {Array} evaluacionesIndividuales - Lista de evaluaciones realizadas
 */
export default function EstadoJueces({ juecesEsperados, evaluacionesIndividuales }) {
  if (!juecesEsperados || juecesEsperados.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Typography 
        variant="subtitle2" 
        fontWeight={700} 
        sx={{ 
          mb: 1.5, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1, 
          color: COLORS.navy,
          fontSize: { xs: 12, sm: 14 }
        }}
      >
        <PersonIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
        Estado de Jueces
      </Typography>
      
      <Box sx={{ display: 'flex', gap: { xs: 1, sm: 1.5 }, flexWrap: 'wrap' }}>
        {juecesEsperados.map((juez) => {
          // Verificar si este juez ya evaluó este proyecto
          const haEvaluado = evaluacionesIndividuales?.some(
            e => e.jurado === juez
          );
          
          return (
            <Box
              key={juez}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 0.5, sm: 0.75 },
                px: { xs: 1, sm: 1.5 },
                py: { xs: 0.5, sm: 0.75 },
                bgcolor: haEvaluado ? 'rgba(16,185,129,0.1)' : '#fff',
                border: `1px solid ${haEvaluado ? '#10b981' : '#e5e7eb'}`,
                borderRadius: 1.5,
                minWidth: { xs: 80, sm: 100 }
              }}
            >
              <Typography sx={{ fontSize: { xs: 12, sm: 14 } }}>
                {haEvaluado ? '✓' : '⏳'}
              </Typography>
              <Typography 
                variant="caption" 
                fontWeight={600} 
                sx={{ 
                  color: haEvaluado ? '#10b981' : '#6b7280',
                  fontSize: { xs: 10, sm: 12 }
                }}
              >
                {juez}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
