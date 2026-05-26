import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PersonIcon from '@mui/icons-material/Person';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import COLORS from '../../../assets/colors';
import EstadoJueces from './EstadoJueces';
import TablaEvaluaciones from './TablaEvaluaciones';

/**
 * Componente que renderiza una tarjeta de proyecto con su información y ranking
 * @param {Object} proyecto - Datos del proyecto
 * @param {number} index - Posición en el ranking (0-based)
 * @param {Array} juecesEsperados - Lista de jueces asignados al proyecto
 * @param {Object} colors - Colores de la categoría
 * @param {Object} ponderaciones - Ponderaciones de Firebase
 * @param {number} totalProyectos - Total de proyectos en la categoría
 */
export default function ProyectoCard({ 
  proyecto, 
  index, 
  juecesEsperados = [], 
  colors,
  ponderaciones,
  totalProyectos 
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Función para obtener el ícono de ranking
  const getRankIcon = (position) => {
    if (position === 0) return <EmojiEventsIcon sx={{ fontSize: 28, color: '#FFD700' }} />;
    if (position === 1) return <EmojiEventsIcon sx={{ fontSize: 28, color: '#C0C0C0' }} />;
    if (position === 2) return <EmojiEventsIcon sx={{ fontSize: 28, color: '#CD7F32' }} />;
    
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
        {position + 1}
      </Box>
    );
  };

  // Calcular estado de evaluación
  const totalEsperados = juecesEsperados.length;
  const totalEvaluados = proyecto.resultado?.cantidadEvaluaciones || 0;
  const estaCompleto = totalEsperados > 0 && totalEvaluados >= totalEsperados;

  return (
    <Box>
      {/* Header del Proyecto - Clickable */}
      <Box
        onClick={() => setIsExpanded(!isExpanded)}
        sx={{
          px: 3,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          cursor: 'pointer',
          borderBottom: !isExpanded ? (index < totalProyectos - 1 ? '1px solid #f0f0f0' : 'none') : '1px solid #f0f0f0',
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
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
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
            
            {/* Estado de Evaluación del Proyecto */}
            {totalEsperados > 0 && (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0.5,
                px: 1.5,
                py: 0.5,
                bgcolor: estaCompleto ? 'rgba(16,185,129,0.1)' : '#f3f4f6',
                borderRadius: 1,
                border: `1px solid ${estaCompleto ? '#10b981' : '#e5e7eb'}`
              }}>
                {estaCompleto ? (
                  <>
                    <Typography sx={{ fontSize: 14, color: '#10b981' }}>✓</Typography>
                    <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700 }}>
                      {totalEvaluados}/{totalEsperados} Completo
                    </Typography>
                  </>
                ) : (
                  <>
                    <PersonIcon sx={{ fontSize: 14, color: '#6b7280' }} />
                    <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600 }}>
                      {totalEvaluados}/{totalEsperados} evaluados
                    </Typography>
                  </>
                )}
              </Box>
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
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
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
      {isExpanded && (
        <Box sx={{ 
          bgcolor: '#f8f9fa', 
          px: 3, 
          py: 2, 
          borderBottom: index < totalProyectos - 1 ? '1px solid #f0f0f0' : 'none' 
        }}>
          {/* Estado de Jueces por Proyecto */}
          <EstadoJueces 
            juecesEsperados={juecesEsperados}
            evaluacionesIndividuales={proyecto.resultado?.evaluacionesIndividuales}
          />

          {/* Tabla de Evaluaciones */}
          <TablaEvaluaciones
            evaluacionesIndividuales={proyecto.resultado?.evaluacionesIndividuales}
            categoria={proyecto.categoria}
            colors={colors}
            ponderaciones={ponderaciones}
          />
        </Box>
      )}
    </Box>
  );
}
