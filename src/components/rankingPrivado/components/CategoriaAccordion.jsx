import React, { useState } from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Box, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ProyectoCard from './ProyectoCard';
import { getCategoryColors, categoriaEstilos, normalizarTexto } from '../utils/categorias';

/**
 * Componente que renderiza el accordion completo de una categoría con sus proyectos
 * @param {string} catKey - Clave normalizada de la categoría
 * @param {string} nombreDisplay - Nombre para mostrar de la categoría
 * @param {Array} proyectos - Lista de proyectos de esta categoría
 * @param {Object} juecesEsperadosPorProyecto - Mapa de proyectoId -> [jueces]
 * @param {Object} ponderaciones - Ponderaciones de Firebase
 * @param {boolean} initialExpanded - Estado inicial de expansión
 */
export default function CategoriaAccordion({ 
  catKey, 
  nombreDisplay, 
  proyectos, 
  juecesEsperadosPorProyecto,
  ponderaciones,
  initialExpanded = true
}) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  
  const colors = getCategoryColors(nombreDisplay);
  const estilo = categoriaEstilos[normalizarTexto(nombreDisplay)] || categoriaEstilos["default"];

  return (
    <Accordion 
      expanded={isExpanded}
      onChange={() => setIsExpanded(!isExpanded)}
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
              {proyectos.length} proyecto{proyectos.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ p: 0 }}>
        <Box>
          {proyectos.map((proyecto, index) => (
            <ProyectoCard
              key={proyecto.id}
              proyecto={proyecto}
              index={index}
              juecesEsperados={juecesEsperadosPorProyecto[proyecto.id] || []}
              colors={colors}
              ponderaciones={ponderaciones}
              totalProyectos={proyectos.length}
            />
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
