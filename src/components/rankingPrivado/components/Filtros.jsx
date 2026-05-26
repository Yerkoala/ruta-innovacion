import React from 'react';
import { Box, Button, Typography, Divider } from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import GavelIcon from '@mui/icons-material/Gavel';
import COLORS from '../../../assets/colors';

export default function Filtros({ 
  grupos = [], 
  jueces = [],
  activeGroup, 
  activeJuez,
  onGroupChange, 
  onJuezChange 
}) {
  // Si no hay grupos ni jueces, no mostrar nada
  if (grupos.length === 0 && jueces.length === 0) {
    return null;
  }

  return (
    <Box>
      {/* Filtros por Grupo */}
      {grupos.length > 0 && (
        <Box sx={{ mb: jueces.length > 0 ? 3 : 0 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1, 
            mb: 2,
            justifyContent: 'center'
          }}>
            <GroupIcon sx={{ fontSize: 20, color: COLORS.navy }} />
            <Typography 
              variant="subtitle2" 
              fontWeight={700} 
              sx={{ color: COLORS.navy, textTransform: 'uppercase', letterSpacing: '0.5px' }}
            >
              Filtrar por Grupo
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant={activeGroup === 'todos' ? 'contained' : 'outlined'}
              onClick={() => onGroupChange && onGroupChange('todos')}
              sx={{
                px: { xs: 1.5, sm: 3 },
                py: { xs: 0.5, sm: 1 },
                fontWeight: 600,
                fontSize: { xs: 11, sm: 13 },
                borderRadius: 2,
                textTransform: 'none',
                minWidth: { xs: 'auto', sm: 'auto' },
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
                onClick={() => onGroupChange && onGroupChange(grupo)}
                sx={{
                  px: { xs: 1.5, sm: 3 },
                  py: { xs: 0.5, sm: 1 },
                  fontWeight: 600,
                  fontSize: { xs: 11, sm: 13 },
                  borderRadius: 2,
                  textTransform: 'none',
                  minWidth: { xs: 'auto', sm: 'auto' },
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
        </Box>
      )}

      {/* Divisor visual si hay ambos filtros */}
      {grupos.length > 0 && jueces.length > 0 && (
        <Divider sx={{ my: 3 }} />
      )}

      {/* Filtros por Juez */}
      {jueces.length > 0 && (
        <Box>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1, 
            mb: 2,
            justifyContent: 'center'
          }}>
            <GavelIcon sx={{ fontSize: 20, color: COLORS.navy }} />
            <Typography 
              variant="subtitle2" 
              fontWeight={700} 
              sx={{ color: COLORS.navy, textTransform: 'uppercase', letterSpacing: '0.5px' }}
            >
              Filtrar por Juez
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant={activeJuez === 'todos' ? 'contained' : 'outlined'}
              onClick={() => onJuezChange && onJuezChange('todos')}
              sx={{
                px: { xs: 1.5, sm: 3 },
                py: { xs: 0.5, sm: 1 },
                fontWeight: 600,
                fontSize: { xs: 11, sm: 13 },
                borderRadius: 2,
                textTransform: 'none',
                minWidth: { xs: 'auto', sm: 'auto' },
                ...(activeJuez === 'todos' ? {
                  bgcolor: COLORS.navy,
                  borderColor: COLORS.navy,
                  '&:hover': { bgcolor: '#00135a' }
                } : {
                  borderColor: '#d1d5db',
                  color: '#555',
                  '&:hover': { borderColor: COLORS.navy, bgcolor: 'rgba(0,26,110,0.05)' }
                })
              }}
            >
              Todos
            </Button>
            
            {jueces.map((juez) => (
              <Button
                key={juez}
                variant={activeJuez === juez ? 'contained' : 'outlined'}
                onClick={() => onJuezChange && onJuezChange(juez)}
                sx={{
                  px: { xs: 1.5, sm: 3 },
                  py: { xs: 0.5, sm: 1 },
                  fontWeight: 600,
                  fontSize: { xs: 11, sm: 13 },
                  borderRadius: 2,
                  textTransform: 'none',
                  minWidth: { xs: 'auto', sm: 'auto' },
                  ...(activeJuez === juez ? {
                    bgcolor: COLORS.navy,
                    borderColor: COLORS.navy,
                    '&:hover': { bgcolor: '#00135a' }
                  } : {
                    borderColor: '#d1d5db',
                    color: '#555',
                    '&:hover': { borderColor: COLORS.navy, bgcolor: 'rgba(0,26,110,0.05)' }
                  })
                }}
              >
                {juez}
              </Button>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}