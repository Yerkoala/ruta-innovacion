import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemText,
  Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckIcon from '@mui/icons-material/Check';
import COLORS from '../../../assets/colors';

export default function Header({ 
  finalActiva, 
  finalesDisponibles = [], 
  proyectos = [], 
  onFinalChange 
}) {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleSelectFinal = (final) => {
    if (onFinalChange) {
      onFinalChange(final);
    }
    handleCloseMenu();
  };

  if (!finalActiva) return null;

  return (
    <Box sx={{ 
      bgcolor: 'white', 
      borderBottom: '1px solid #e0e0e0', 
      position: 'sticky', 
      top: 0, 
      zIndex: 100, 
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)' 
    }}>
      <Container maxWidth="lg" sx={{ py: 2 }}>
        {/* Fila superior: Botón volver y contador de proyectos */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          mb: 2 
        }}>
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
              label={`${proyectos.length} proyecto${proyectos.length !== 1 ? 's' : ''}`}
              size="small"
              sx={{ bgcolor: '#f5f5f5', fontWeight: 600, fontSize: 12 }}
            />
          </Box>
        </Box>

        {/* Título con selector de final */}
        <Box sx={{ textAlign: 'center' }}>
          <Box sx={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 1.5,
            cursor: finalesDisponibles.length > 1 ? 'pointer' : 'default',
            '&:hover': finalesDisponibles.length > 1 ? { 
              '& .expand-icon': { 
                color: COLORS.orange 
              } 
            } : {}
          }}
          onClick={finalesDisponibles.length > 1 ? handleOpenMenu : undefined}
          >
            <Typography 
              variant="h5" 
              sx={{ 
                color: COLORS.navy, 
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '-0.3px',
                display: 'inline'
              }}
            >
              {finalActiva.nombre} - PRIVADO
            </Typography>
            
            {finalesDisponibles.length > 1 && (
              <IconButton
                size="small"
                className="expand-icon"
                sx={{ 
                  color: COLORS.navy,
                  transition: 'all 0.2s',
                  transform: open ? 'rotate(180deg)' : 'rotate(0deg)'
                }}
              >
                <ExpandMoreIcon />
              </IconButton>
            )}
          </Box>

          <Typography variant="body2" sx={{ color: '#666', fontWeight: 600, mt: 0.5 }}>
            Ranking {finalActiva.anio}
          </Typography>
        </Box>

        {/* Menú de selección de finales */}
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleCloseMenu}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          PaperProps={{
            sx: {
              mt: 1,
              minWidth: 280,
              maxHeight: 400,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              borderRadius: 2
            }
          }}
        >
          <Box sx={{ px: 2, py: 1.5, bgcolor: '#f8f9fa' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              SELECCIONAR FINAL
            </Typography>
          </Box>
          <Divider />
          
          {finalesDisponibles.map((final) => {
            const isSelected = final.id === finalActiva.id;
            
            return (
              <MenuItem
                key={final.id}
                onClick={() => handleSelectFinal(final)}
                selected={isSelected}
                sx={{
                  py: 1.5,
                  px: 2,
                  '&.Mui-selected': {
                    bgcolor: 'rgba(0, 26, 110, 0.08)',
                    '&:hover': {
                      bgcolor: 'rgba(0, 26, 110, 0.12)'
                    }
                  }
                }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  width: '100%'
                }}>
                  <Box>
                    <ListItemText
                      primary={final.nombre}
                      secondary={`Año ${final.anio}`}
                      primaryTypographyProps={{
                        fontWeight: isSelected ? 700 : 600,
                        fontSize: 14,
                        color: isSelected ? COLORS.navy : 'text.primary'
                      }}
                      secondaryTypographyProps={{
                        fontSize: 12
                      }}
                    />
                  </Box>
                  {isSelected && (
                    <CheckIcon sx={{ color: COLORS.orange, fontSize: 20, ml: 1 }} />
                  )}
                </Box>
              </MenuItem>
            );
          })}
        </Menu>
      </Container>
    </Box>
  );
}
