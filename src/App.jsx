import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  CssBaseline,
} from '@mui/material'
import { obtenerFinalActiva, obtenerProyectosPorFinal, obtenerEstadoJuez, suscribirseEstadosJueces, registrarJuezEvaluando } from './components/adminPanel/utils/firebaseOperations'
import COLORS from './assets/colors'

function App() {
  const [juezSeleccionado, setJuezSeleccionado] = useState('')
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null)
  const [gruposDisponibles, setGruposDisponibles] = useState([])
  const [juecesDisponibles, setJuecesDisponibles] = useState([])
  const [juecesEstado, setJuecesEstado] = useState({}) // Estado de cada juez (evaluando/completado)
  const [errores, setErrores] = useState({ seleccion: false })
  const [finalActiva, setFinalActiva] = useState(null)
  const [proyectosCargados, setProyectosCargados] = useState([])
  const [loadingFinal, setLoadingFinal] = useState(true)
  const [loadingProyectos, setLoadingProyectos] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, mensaje: '', severity: 'info' })
  const [busquedaJuez, setBusquedaJuez] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const cargarFinalActiva = async () => {
      try {
        const final = await obtenerFinalActiva()
        setFinalActiva(final)
        
        // Cargar proyectos para detectar grupos disponibles
        if (final?.id) {
          const proyectos = await obtenerProyectosPorFinal(final.id)
          setProyectosCargados(proyectos)
          
          // Detectar grupos únicos (filtrar valores vacíos, espacios y caracteres sueltos sin sentido)
          const gruposUnicos = [...new Set(
            proyectos
              .map(p => String(p.grupo || '').trim())
              .filter(g => g && g.length > 1) // Ignorar valores de 1 sólo carácter (probablemente residuales)
          )].sort()
          
          setGruposDisponibles(gruposUnicos)
          
          // Si no hay grupos válidos, establecer un grupo por defecto y cargar jueces
          if (gruposUnicos.length === 0) {
            setGrupoSeleccionado('sin-grupo')
          }
        }
      } catch (error) {
        console.error('Error al cargar final activa:', error)
      } finally {
        setLoadingFinal(false)
      }
    }
    cargarFinalActiva()
  }, [])

  // Cargar jueces cuando se selecciona un grupo (o si no hay grupos)
  useEffect(() => {
    const cargarJuecesDeGrupo = () => {
      if (!grupoSeleccionado || !finalActiva?.id) {
        setJuecesDisponibles([])
        setJuecesEstado({})
        return
      }

      try {
        // Si no hay grupos, cargar TODOS los jueces
        let proyectosDelGrupo
        if (grupoSeleccionado === 'sin-grupo') {
          proyectosDelGrupo = proyectosCargados
        } else {
          // Filtrar proyectos del grupo seleccionado
          proyectosDelGrupo = proyectosCargados.filter(p => p.grupo === grupoSeleccionado)
        }
        
        // Extraer jueces únicos del campo "juez" (separado por comas)
        const juecesSet = new Set()
        proyectosDelGrupo.forEach(proyecto => {
          if (proyecto.juez) {
            const jueces = String(proyecto.juez).split(',').map(j => j.trim())
            jueces.forEach(juez => {
              if (juez) juecesSet.add(juez)
            })
          }
        })
        
        const juecesUnicos = Array.from(juecesSet).sort()
        setJuecesDisponibles(juecesUnicos)
        
      } catch (error) {
        console.error('Error al cargar jueces del grupo:', error)
      }
    }

    cargarJuecesDeGrupo()
  }, [grupoSeleccionado, proyectosCargados, finalActiva])

  // Suscripción en tiempo real a los estados de jueces
  useEffect(() => {
    if (!finalActiva?.id) {
      setJuecesEstado({})
      return
    }

    // Suscribirse a cambios en tiempo real
    const unsubscribe = suscribirseEstadosJueces(finalActiva.id, (estados) => {
      const estadosMap = {}
      estados.forEach(estado => {
        estadosMap[estado.nombre] = estado // Guardamos el objeto completo
      })
      setJuecesEstado(estadosMap)
    })

    // Limpiar suscripción al desmontar
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [finalActiva])

  const handleSubmit = async () => {
    // Si no hay grupos, solo validar el juez
    const sinGrupos = gruposDisponibles.length === 0
    const nuevosErrores = { 
      seleccion: !juezSeleccionado
    }
    
    setErrores(nuevosErrores)
    if (Object.values(nuevosErrores).includes(true)) {
      setSnackbar({ open: true, mensaje: sinGrupos ? 'Debes seleccionar un juez' : 'Debes seleccionar un grupo y un juez', severity: 'warning' })
      return
    }

    if (!finalActiva?.id) {
      setSnackbar({ open: true, mensaje: 'No hay una final activa configurada', severity: 'error' })
      return
    }

    setLoadingProyectos(true)
    try {
      // Filtrar proyectos del grupo que contengan al juez seleccionado
      const proyectosFiltrados = proyectosCargados.filter(p => {
        // Si no hay grupos, filtrar solo por juez
        if (sinGrupos) {
          if (!p.juez) return false
          const juecesProyecto = String(p.juez).split(',').map(j => j.trim())
          return juecesProyecto.includes(juezSeleccionado)
        }
        
        // Si hay grupos, filtrar por grupo y juez
        if (p.grupo !== grupoSeleccionado) return false
        if (!p.juez) return false
        
        // Verificar si el juez seleccionado está en la lista de jueces del proyecto
        const juecesProyecto = String(p.juez).split(',').map(j => j.trim())
        return juecesProyecto.includes(juezSeleccionado)
      })
      
      if (proyectosFiltrados.length === 0) {
        setSnackbar({ 
          open: true, 
          mensaje: sinGrupos 
            ? `No hay proyectos asignados al juez ${juezSeleccionado}` 
            : `No hay proyectos asignados al juez ${juezSeleccionado} en ${grupoSeleccionado}`, 
          severity: 'warning' 
        })
        setLoadingProyectos(false)
        return
      }
      
      // Registrar al juez como "evaluando" en Firebase (verifica estado actual)
      const grupoParaRegistro = sinGrupos ? 'sin-grupo' : grupoSeleccionado
      const resultado = await registrarJuezEvaluando(finalActiva.id, juezSeleccionado, grupoParaRegistro)
      
      // Si no se permite la entrada (ya está evaluando), mostrar mensaje y detener
      if (!resultado.success) {
        setSnackbar({ 
          open: true, 
          mensaje: resultado.message, 
          severity: 'warning' 
        })
        setLoadingProyectos(false)
        return
      }
      
      // Si todo está bien, navegar a la evaluación
      navigate('/evaluacion', {
        state: { 
          nombre: juezSeleccionado, 
          proyectos: proyectosFiltrados, 
          finalNombre: finalActiva.nombre, 
          finalId: finalActiva.id,
          grupo: sinGrupos ? 'sin-grupo' : grupoSeleccionado
        }
      })
    } catch (error) {
      console.error('Error al iniciar evaluación:', error)
      setSnackbar({ open: true, mensaje: 'Error al cargar los proyectos', severity: 'error' })
      setLoadingProyectos(false)
    }
  }

  return (
    <>
      {/* CssBaseline elimina los márgenes por defecto del body que causan el doble scroll */}
      <CssBaseline />
      <Box
        sx={{
          height: '100vh', // Altura exacta de la ventana
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: "'Montserrat', sans-serif",
          position: 'relative',
          overflow: 'hidden', // Evita scroll
          boxSizing: 'border-box',
        }}
      >
        {/* Círculos decorativos - Se aumentó un poco la opacidad para que se noten bien en blanco */}
        <Box sx={{
          position: 'absolute', bottom: -80, right: -80,
          width: { xs: 280, md: 400 }, height: { xs: 280, md: 400 },
          borderRadius: '50%', backgroundColor: COLORS.orange, opacity: 0.15,
          pointerEvents: 'none',
        }} />
        <Box sx={{
          position: 'absolute', top: -80, left: -80,
          width: { xs: 220, md: 320 }, height: { xs: 220, md: 320 },
          borderRadius: '50%', backgroundColor: COLORS.orange, opacity: 0.1,
          pointerEvents: 'none',
        }} />

        {/* Hero */}
        <Box sx={{
          textAlign: 'center',
          px: 3,
          position: 'relative', 
          zIndex: 1,
          width: '100%',
        }}>
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 1,
            backgroundColor: 'rgba(244,121,32,0.1)',
            border: '1px solid rgba(244,121,32,0.3)',
            borderRadius: '100px',
            px: 2, py: 0.75, mb: 2.5,
          }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: COLORS.orange }} />
            <Typography sx={{
              color: COLORS.orangeDark, fontSize: 10, fontWeight: 700,
              letterSpacing: 1.5, textTransform: 'uppercase',
            }}>
              Ruta de la Innovación
            </Typography>
          </Box>

          {loadingFinal ? (
            <CircularProgress sx={{ color: COLORS.orange, display: 'block', mx: 'auto' }} />
          ) : (
            <>
              <Typography sx={{
                color: COLORS.navy, // Título en Azul Marino para contraste
                fontWeight: 800,
                fontSize: { xs: 34, sm: 42, md: 48 },
                lineHeight: 1.1,
                letterSpacing: '-0.5px',
                textTransform: 'uppercase',
                mb: 1,
                whiteSpace: 'pre-line',
              }}>
                {finalActiva?.nombre || 'SEMIFINALES\nDE INNOVACIÓN'}
              </Typography>
              <Typography sx={{ color: '#666', fontSize: 15, fontWeight: 600 }}> {/* Año en gris oscuro */}
                {finalActiva?.anio || new Date().getFullYear()}
              </Typography>
            </>
          )}

          <Box sx={{
            width: 40, height: 3, backgroundColor: COLORS.orange,
            borderRadius: 2, mx: 'auto', mt: 3,
          }} />
        </Box>

        {/* Formulario */}
        <Box sx={{
          mt: { xs: 3.5, md: 4 },
          width: '100%',
          maxWidth: { xs: 'calc(100% - 32px)', sm: 600, md: 800, lg: 1000 },
          backgroundColor: '#ffffff',
          border: '1px solid #e0e0e0', // Borde gris claro
          boxShadow: '0px 10px 40px rgba(0, 26, 110, 0.08)', // Sombra sutil con tono navy
          borderRadius: 3,
          p: { xs: 3, md: 4 },
          position: 'relative', 
          zIndex: 1,
        }}>
          {/* Selector de Grupo */}
          {gruposDisponibles.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{
                color: '#555',
                fontSize: 10, fontWeight: 700,
                letterSpacing: 1.5, textTransform: 'uppercase',
                mb: 1.5,
              }}>
                Selecciona tu Grupo
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                {gruposDisponibles.map((grupo) => {
                  return (
                    <Button
                      key={grupo}
                      variant={grupoSeleccionado === grupo ? 'contained' : 'outlined'}
                      onClick={() => {
                        setGrupoSeleccionado(grupo)
                        setJuezSeleccionado('') // Reset juez cuando cambia grupo
                      }}
                      disabled={loadingProyectos}
                      sx={{
                        minWidth: 80,
                        py: 1.2,
                        px: 2.5,
                        borderRadius: 2,
                        fontWeight: 700,
                        fontSize: 14,
                        textTransform: 'none',
                        ...(grupoSeleccionado === grupo ? {
                          backgroundColor: COLORS.orange,
                          color: '#fff',
                          '&:hover': { backgroundColor: COLORS.orangeDark },
                        } : {
                          borderColor: '#d1d5db',
                          color: '#555',
                          '&:hover': { borderColor: COLORS.orange, backgroundColor: 'rgba(244,121,32,0.05)' },
                        })
                      }}
                    >
                      {grupo}
                    </Button>
                  )
                })}
              </Box>
            </Box>
          )}

          {/* Selector de Juez - Se muestra cuando hay grupo seleccionado o cuando no hay grupos */}
          {juecesDisponibles.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography sx={{
                color: '#555',
                fontSize: 10, fontWeight: 700,
                letterSpacing: 1.5, textTransform: 'uppercase',
                mb: 1.5,
              }}>
                Selecciona tu Nombre
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                {juecesDisponibles.map((juez) => {
                  const estadoJuez = juecesEstado[juez]
                  const estaEvaluando = estadoJuez && estadoJuez.estado === 'evaluando'
                  const estaCompletado = estadoJuez && estadoJuez.estado === 'completado'
                  
                  return (
                    <Button
                      key={juez}
                      variant={juezSeleccionado === juez && !estaEvaluando ? 'contained' : 'outlined'}
                      onClick={() => !estaEvaluando && setJuezSeleccionado(juez)}
                      disabled={loadingProyectos || estaEvaluando}
                      sx={{
                        minWidth: 100,
                        py: 1.2,
                        px: 2.5,
                        borderRadius: 2,
                        fontWeight: 700,
                        fontSize: 14,
                        textTransform: 'none',
                        position: 'relative',
                        ...(estaEvaluando ? {
                          borderColor: '#d1d5db !important',
                          color: '#9ca3af !important',
                          backgroundColor: '#f3f4f6 !important',
                          cursor: 'not-allowed !important',
                          opacity: '0.7 !important',
                          pointerEvents: 'none',
                          '&:hover': { 
                            backgroundColor: '#f3f4f6 !important',
                            borderColor: '#d1d5db !important'
                          }
                        } : juezSeleccionado === juez ? {
                          backgroundColor: COLORS.orange,
                          color: '#fff',
                          '&:hover': { backgroundColor: COLORS.orangeDark },
                        } : {
                          borderColor: '#d1d5db',
                          color: '#555',
                          '&:hover': { borderColor: COLORS.orange, backgroundColor: 'rgba(244,121,32,0.05)' },
                        })
                      }}
                    >
                      {juez}
                      {estaEvaluando && (
                        <Box component="span" sx={{ 
                          ml: 1, 
                          fontSize: 10, 
                          color: '#f59e0b',
                          fontWeight: 500
                        }}>
                          (votando)
                        </Box>
                      )}
                      {estaCompletado && !estaEvaluando && (
                        <Box component="span" sx={{ 
                          ml: 1, 
                          fontSize: 10, 
                          color: '#10b981',
                          fontWeight: 500
                        }}>
                          ✓
                        </Box>
                      )}
                    </Button>
                  )
                })}
              </Box>
            </Box>
          )}

          {/* Mensaje de error de selección */}
          {errores.seleccion && (
            <Typography sx={{ color: '#d32f2f', fontSize: 12, mt: 1, fontFamily: 'inherit' }}>
              {gruposDisponibles.length === 0 ? 'Debes seleccionar un juez' : 'Debes seleccionar un grupo y un juez'}
            </Typography>
          )}

          {finalActiva && (
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              backgroundColor: 'rgba(244,121,32,0.06)',
              border: '1px solid rgba(244,121,32,0.15)',
              borderRadius: 2.5,
              p: 1.5, mt: 2,
            }}>
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: COLORS.orange, flexShrink: 0 }} />
              <Typography sx={{ color: '#555', fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>
                Evaluarás proyectos de:{' '}
                <Box component="span" sx={{ color: COLORS.orangeDark, fontWeight: 700 }}>
                  {finalActiva.nombre}
                </Box>
              </Typography>
            </Box>
          )}

          <Button
            fullWidth
            onClick={handleSubmit}
            disabled={loadingProyectos || loadingFinal}
            sx={{
              mt: 2.5,
              py: { xs: 2, md: 1.75 },
              backgroundColor: COLORS.orange,
              color: '#fff',
              fontFamily: 'inherit',
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              borderRadius: 2.5,
              boxShadow: 'none',
              '&:hover': { backgroundColor: COLORS.orangeDark, boxShadow: 'none' },
              '&:disabled': { backgroundColor: '#e0e0e0', color: '#9e9e9e' },
            }}
          >
            {loadingProyectos
              ? <CircularProgress size={22} sx={{ color: '#fff' }} />
              : 'Comenzar Evaluación →'}
          </Button>
        </Box>

        {/* Footer Text */}
        <Typography sx={{
          textAlign: 'center',
          color: '#999', // Gris claro para el footer
          fontSize: 11, letterSpacing: 0.3,
          position: 'absolute',
          bottom: 24,
          left: 0,
          right: 0,
          zIndex: 1,
        }}>
          Plataforma de evaluación interna · Agrosuper S.A.
        </Typography>

        <Box sx={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 3, backgroundColor: COLORS.orange,
        }} />

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            severity={snackbar.severity}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            sx={{ fontFamily: 'inherit' }}
          >
            {snackbar.mensaje}
          </Alert>
        </Snackbar>
      </Box>
    </>
  )
}

export default App