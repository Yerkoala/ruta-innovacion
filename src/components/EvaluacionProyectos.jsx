import { useState, useMemo, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Accordion, AccordionSummary, AccordionDetails, Typography, IconButton, Box, Container, FormControl, InputLabel, Select, MenuItem, Alert, Chip, Stack, Divider, Button, Paper, Tooltip, Snackbar, TextField } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SendIcon from '@mui/icons-material/Send'
import CircularProgress from '@mui/material/CircularProgress'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import WarningIcon from '@mui/icons-material/Warning'
import CloudOffIcon from '@mui/icons-material/CloudOff'
import { collection, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebaseconfig'
import COLORS from '../assets/colors'

// Función para normalizar strings
const normalizarTexto = (texto) => {
    if (!texto) return ''
    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/['"]/g, "")
        .toLowerCase()
        .trim()
}

// Descripciones y opciones de criterios conocidos; criterios nuevos usan valores por defecto
const DESCRIPCION_CRITERIOS = {
    DESAFIO:          { descripcion: 'Evalúa el nivel de complejidad y magnitud del problema que aborda el proyecto', opciones: [1, 2, 3, 4, 5] },
    CREATIVIDAD:      { descripcion: 'Mide la originalidad e innovación de la solución propuesta', opciones: [1, 2, 3, 4, 5] },
    IMPLEMENTABILIDAD:{ descripcion: 'Valora la viabilidad técnica y facilidad de implementación del proyecto', opciones: [1, 2, 3, 4, 5] },
    ESCALABILIDAD:    { descripcion: 'Evalúa el potencial de crecimiento y replicabilidad de la solución', opciones: [1, 2, 3, 4, 5] },
    IMPACTO:          { descripcion: 'Evalúa el impacto generado en ahorro de tiempo, optimización de procesos o generación de valor económico', opciones: [1, 2, 3, 4, 5] },
    EBITDA:           { descripcion: 'Impacto financiero del proyecto en resultados operacionales (EBITDA)', opciones: [1, 2, 3, 4, 5] },
    PRODUCTIVIDAD:    { descripcion: 'Mejora en eficiencia de procesos y aprovechamiento de recursos.\n1 = No impacta en productividad\n3 = Genera aumento en kilos de productos o disminución de HHT\n5 = Genera reducción de FTE', opciones: [1, 3, 5] },
};

// Diccionario de estilos centralizado
const categoriaEstilos = {
    "mejora continua": { color: "#a114c4", icono: "📈" },
    "sandia cala": { color: "#28aa1d", icono: "🍉" },
    "pinta pa bueno": { color: "#f96703", icono: "🖌️" },
    "chispeza": { color: "#ffc64c", icono: "💡" },
    "eureka": { color: "#2196f3", icono: "💡" },
    "default": { color: "#6c757d", icono: "📁" } // Fallback para categorías no reconocidas
}

function EvaluacionProyectos() {
    const { state } = useLocation()
    const navigate = useNavigate()
    const [inputs, setInputs] = useState({})
    const [feedbacks, setFeedbacks] = useState({}) // Estado para feedbacks de cada proyecto
    const [ponderacionesPorCat, setPonderacionesPorCat] = useState({})
    const [criteriosTipoPorCat, setCriteriosTipoPorCat] = useState({}) // Tipos de criterios por categoría
    const [feedbackConfigPorCat, setFeedbackConfigPorCat] = useState({}) // Configuración de feedback por categoría
    const [loadingProyectoId, setLoadingProyectoId] = useState(null)
    const [enviadoProyectoId, setEnviadoProyectoId] = useState(null)
    const [intentoEnvio, setIntentoEnvio] = useState({})
    const [snackbar, setSnackbar] = useState({ open: false, mensaje: '', severity: 'info' })
    const [proyectosGuardadosFirebase, setProyectosGuardadosFirebase] = useState({}) // Track de qué está en Firebase
    const [proyectosConError, setProyectosConError] = useState({}) // Track de errores de conexión

    const nombreJurado = state?.nombre
    const proyectos = state?.proyectos || []
    const finalNombre = state?.finalNombre
    const finalId = state?.finalId

    // DEBUG: Ver estructura completa de proyectos
    useEffect(() => {
        if (proyectos.length > 0) {
            console.log('=== DATOS DE PROYECTOS ===')
            console.log('Total de proyectos:', proyectos.length)
            console.log('Primer proyecto completo:', proyectos[0])
            console.log('Todos los campos del primer proyecto:', Object.keys(proyectos[0]))
            console.log('Todos los proyectos:', proyectos)
        }
    }, [proyectos])

    // Clave única para localStorage basada en jurado y final
    const localStorageKey = `evaluaciones_${finalId}_${nombreJurado}`.replace(/\s+/g, '-')

    // Guardar en localStorage (respaldo automático)
    const guardarEnLocalStorage = (datos, feedbacksData = {}, guardados = {}) => {
        try {
            localStorage.setItem(localStorageKey, JSON.stringify({
                datos,
                feedbacks: feedbacksData,
                proyectosGuardados: guardados,
                timestamp: new Date().toISOString(),
                finalNombre,
                nombreJurado
            }))
        } catch (error) {
            console.error('Error al guardar en localStorage:', error)
        }
    }

    // Recuperar de localStorage
    const recuperarDeLocalStorage = () => {
        try {
            const guardado = localStorage.getItem(localStorageKey)
            if (guardado) {
                const { datos, feedbacks: feedbacksGuardados, proyectosGuardados, timestamp } = JSON.parse(guardado)
                // Solo recuperar si tiene menos de 7 días
                const diasDesdeGuardado = (new Date() - new Date(timestamp)) / (1000 * 60 * 60 * 24)
                if (diasDesdeGuardado < 7) {
                    return { 
                        datos: datos || {}, 
                        feedbacks: feedbacksGuardados || {},
                        proyectosGuardados: proyectosGuardados || {} 
                    }
                }
            }
        } catch (error) {
            console.error('Error al recuperar de localStorage:', error)
        }
        return { datos: {}, feedbacks: {}, proyectosGuardados: {} }
    }

    // Limpiar localStorage de esta evaluación
    const limpiarLocalStorage = () => {
        try {
            localStorage.removeItem(localStorageKey)
        } catch (error) {
            console.error('Error al limpiar localStorage:', error)
        }
    }

    // useEffect: Recuperar datos guardados localmente al montar
    useEffect(() => {
        const { datos, feedbacks: feedbacksGuardados, proyectosGuardados } = recuperarDeLocalStorage()
        if (datos && Object.keys(datos).length > 0) {
            setInputs(datos)
            setFeedbacks(feedbacksGuardados || {})
            setProyectosGuardadosFirebase(proyectosGuardados)
            setSnackbar({
                open: true,
                mensaje: `📋 Se recuperaron ${Object.keys(datos).length} evaluaciones guardadas localmente`,
                severity: 'info'
            })
        }
    }, []) // Solo al montar

    // useEffect: Auto-guardar en localStorage cuando cambian los inputs, feedbacks o proyectosGuardadosFirebase
    useEffect(() => {
        if (Object.keys(inputs).length > 0) {
            guardarEnLocalStorage(inputs, feedbacks, proyectosGuardadosFirebase)
        }
    }, [inputs, feedbacks, proyectosGuardadosFirebase])

    // useEffect: Cargar criterios de evaluación y configuración de feedback desde Firebase para cada categoría presente
    useEffect(() => {
        if (proyectos.length === 0) return;
        const categoriasUnicas = [...new Set(proyectos.map(p => normalizarTexto(p.categoria)))];
        const cargar = async () => {
            const resultadoCriterios = {};
            const resultadoFeedback = {};
            const resultadoTipos = {};
            for (const catNorm of categoriasUnicas) {
                const firebaseId = catNorm.replace(/\s+/g, '-');
                try {
                    const snap = await getDoc(doc(db, 'ponderaciones', firebaseId));
                    if (snap.exists()) {
                        const { fechaActualizacion, feedbackEnabled, feedbackRequired, criteriosTipo, ...criterios } = snap.data();
                        resultadoCriterios[catNorm] = Object.keys(criterios);
                        resultadoTipos[catNorm] = criteriosTipo || {};
                        resultadoFeedback[catNorm] = {
                            enabled: feedbackEnabled || false,
                            required: feedbackRequired || false
                        };
                    }
                } catch (_) { /* usa fallback hardcodeado */ }
            }
            if (Object.keys(resultadoCriterios).length > 0) setPonderacionesPorCat(resultadoCriterios);
            if (Object.keys(resultadoTipos).length > 0) setCriteriosTipoPorCat(resultadoTipos);
            if (Object.keys(resultadoFeedback).length > 0) setFeedbackConfigPorCat(resultadoFeedback);
        };
        cargar();
    }, [proyectos])

    // Función para obtener campos según categoría (usa criterios de Firebase si están disponibles)
    const obtenerCamposPorCategoria = (categoria) => {
        const catNormalizada = normalizarTexto(categoria)
        const criteriosDesdeFirebase = ponderacionesPorCat[catNormalizada]
        const tiposDesdeFirebase = criteriosTipoPorCat[catNormalizada] || {}

        if (criteriosDesdeFirebase && criteriosDesdeFirebase.length > 0) {
            return criteriosDesdeFirebase.map(nombre => {
                const tipo = tiposDesdeFirebase[nombre] || 'numeric';
                return {
                    nombre,
                    tipo,
                    descripcion: DESCRIPCION_CRITERIOS[nombre]?.descripcion || `Criterio de evaluación: ${nombre}`,
                    opciones: tipo === 'boolean' ? ['Sí', 'No'] : (DESCRIPCION_CRITERIOS[nombre]?.opciones || [1, 2, 3, 4, 5])
                }
            })
        }

        // Fallback hardcodeado mientras cargan o si falla Firebase
        const camposBase = [
            { nombre: 'DESAFIO',           descripcion: DESCRIPCION_CRITERIOS.DESAFIO.descripcion,           opciones: [1, 2, 3, 4, 5] },
            { nombre: 'CREATIVIDAD',       descripcion: DESCRIPCION_CRITERIOS.CREATIVIDAD.descripcion,       opciones: [1, 2, 3, 4, 5] },
            { nombre: 'IMPLEMENTABILIDAD', descripcion: DESCRIPCION_CRITERIOS.IMPLEMENTABILIDAD.descripcion, opciones: [1, 2, 3, 4, 5] },
            { nombre: 'ESCALABILIDAD',     descripcion: DESCRIPCION_CRITERIOS.ESCALABILIDAD.descripcion,     opciones: [1, 2, 3, 4, 5] },
        ]

        if (catNormalizada === 'chispeza') {
            return [...camposBase, { nombre: 'IMPACTO', descripcion: DESCRIPCION_CRITERIOS.IMPACTO.descripcion, opciones: [1, 2, 3, 4, 5] }]
        }

        return [
            ...camposBase,
            { nombre: 'EBITDA',       descripcion: DESCRIPCION_CRITERIOS.EBITDA.descripcion,       opciones: [1, 2, 3, 4, 5] },
            { nombre: 'PRODUCTIVIDAD', descripcion: DESCRIPCION_CRITERIOS.PRODUCTIVIDAD.descripcion, opciones: [1, 3, 5] },
        ]
    }

    // Definición de campos con sus descripciones (para la leyenda general)
    const camposEvaluacion = [
        {
            nombre: 'DESAFIO',
            descripcion: 'Evalúa el nivel de complejidad y magnitud del problema que aborda el proyecto',
            opciones: [1, 2, 3, 4, 5]
        },
        {
            nombre: 'CREATIVIDAD',
            descripcion: 'Mide la originalidad e innovación de la solución propuesta',
            opciones: [1, 2, 3, 4, 5]
        },
        {
            nombre: 'IMPLEMENTABILIDAD',
            descripcion: 'Valora la viabilidad técnica y facilidad de implementación del proyecto',
            opciones: [1, 2, 3, 4, 5]
        },
        {
            nombre: 'ESCALABILIDAD',
            descripcion: 'Evalúa el potencial de crecimiento y replicabilidad de la solución',
            opciones: [1, 2, 3, 4, 5]
        },
        {
            nombre: 'IMPACTO',
            descripcion: 'Evalúa el impacto generado (para Chispeza): ahorro de tiempo, optimización o valor económico',
            opciones: [1, 2, 3, 4, 5],
            categoria: 'Chispeza'
        },
        {
            nombre: 'EBITDA',
            descripcion: 'Impacto financiero del proyecto en resultados operacionales (EBITDA)',
            opciones: [1, 2, 3, 4, 5],
            categoria: 'Otras categorías'
        },
        {
            nombre: 'PRODUCTIVIDAD',
            descripcion: `Mejora en eficiencia de procesos y aprovechamiento de recursos.
                            1 = No impacta en productividad
                            3 = Genera aumento en kilos de productos o disminución de HHT
                            5 = Genera reducción de FTE`,
            opciones: [1, 3, 5],
            categoria: 'Otras categorías'
        }
    ]

    const camposEditables = camposEvaluacion.map(c => c.nombre)

    // Lógica para agrupar proyectos por categoría
    const proyectosAgrupados = useMemo(() => {
        return proyectos.reduce((acc, proyecto) => {
            const catNormalizada = normalizarTexto(proyecto.categoria)

            // Si la categoría aún no existe en nuestro acumulador, la creamos
            if (!acc[catNormalizada]) {
                acc[catNormalizada] = {
                    nombreDisplay: proyecto.categoria, // Guardamos el nombre original con mayúsculas/tildes para mostrarlo
                    proyectos: []
                }
            }
            acc[catNormalizada].proyectos.push(proyecto)
            return acc
        }, {})
    }, [proyectos])

    const handleChange = (proyectoId, campo, valor) => {
        setInputs((prev) => ({
            ...prev,
            [proyectoId]: { ...prev[proyectoId], [campo]: valor }
        }))
        // Limpiar error previo cuando el usuario edita
        if (proyectosConError[proyectoId]) {
            setProyectosConError(prev => {
                const updated = { ...prev }
                delete updated[proyectoId]
                return updated
            })
        }
    }

    const handleFeedbackChange = (proyectoId, valor) => {
        setFeedbacks((prev) => ({
            ...prev,
            [proyectoId]: valor
        }))
        // Limpiar error previo cuando el usuario edita
        if (proyectosConError[proyectoId]) {
            setProyectosConError(prev => {
                const updated = { ...prev }
                delete updated[proyectoId]
                return updated
            })
        }
    }

    // Función auxiliar para timeout
    const conTimeout = (promesa, ms) => {
        return Promise.race([
            promesa,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout: La conexión está muy lenta')), ms)
            )
        ])
    }

    const handleEnviar = async (proyecto) => {
        const proyectoId = proyecto.id
        setIntentoEnvio((prev) => ({ ...prev, [proyectoId]: true }))

        const calificaciones = inputs[proyectoId] || {}
        const camposRequeridos = obtenerCamposPorCategoria(proyecto.categoria).map(c => c.nombre)
        const tieneCamposVacios = camposRequeridos.some(campo => !calificaciones[campo])

        // Validar feedback si está habilitado y es requerido
        const catNormalizada = normalizarTexto(proyecto.categoria)
        const feedbackConfig = feedbackConfigPorCat[catNormalizada] || {}
        const feedbackTexto = feedbacks[proyectoId] || ''
        const feedbackRequerido = feedbackConfig.enabled && feedbackConfig.required && !feedbackTexto.trim()

        if (tieneCamposVacios || feedbackRequerido || !nombreJurado || !finalId || !proyectoId) return

        setLoadingProyectoId(proyectoId)
        setEnviadoProyectoId(null)
        
        // Limpiar error previo
        setProyectosConError(prev => {
            const updated = { ...prev }
            delete updated[proyectoId]
            return updated
        })

        try {
            // Guardar en colección plana con timeout de 30 segundos
            const evaluacionId = `${finalId}_${nombreJurado}_${proyectoId}`.replace(/\s+/g, '-')
            const evaluacionRef = doc(db, 'evaluaciones', evaluacionId)
            
            // Preparar datos a guardar
            const datosEvaluacion = {
                proyectoId,
                proyectoNumero: proyecto.numero,
                proyectoNombre: proyecto.proyecto,
                gerencia: proyecto.gerencia,
                categoria: proyecto.categoria,
                lider: proyecto.lider,
                jurado: nombreJurado,
                finalId,
                finalNombre,
                calificaciones,
                fechaEvaluacion: serverTimestamp()
            }

            // Agregar feedback si está habilitado
            const catNormalizada = normalizarTexto(proyecto.categoria)
            const feedbackConfig = feedbackConfigPorCat[catNormalizada] || {}
            if (feedbackConfig.enabled) {
                datosEvaluacion.feedback = feedbacks[proyectoId] || ''
            }

            await conTimeout(
                setDoc(evaluacionRef, datosEvaluacion),
                30000 // 30 segundos de timeout
            )

            // Éxito: marcar como guardado y limpiar de localStorage eventualmente
            const esActualizacion = proyectosGuardadosFirebase[proyectoId]
            setEnviadoProyectoId(proyectoId)
            setProyectosGuardadosFirebase(prev => ({ ...prev, [proyectoId]: true }))
            
            setSnackbar({
                open: true,
                mensaje: esActualizacion ? '✅ Evaluación actualizada en la nube' : '✅ Evaluación guardada en la nube',
                severity: 'success'
            })
            setTimeout(() => setEnviadoProyectoId(null), 3000)
        } catch (error) {
            console.error("Error al enviar la evaluación:", error)
            
            // Marcar como error para mostrar indicador visual
            setProyectosConError(prev => ({ ...prev, [proyectoId]: true }))
            
            const esTimeout = error.message.includes('Timeout')
            const mensaje = esTimeout
                ? '⚠️ Conexión lenta detectada. Tus datos están guardados localmente. Intenta de nuevo cuando mejore la conexión.'
                : '❌ Error al guardar. Tus datos están seguros localmente. Intenta nuevamente.'
            
            setSnackbar({
                open: true,
                mensaje,
                severity: 'warning'
            })
            
            // NO limpiamos los inputs - los datos quedan guardados localmente
        } finally {
            setLoadingProyectoId(null)
        }
    }

    if (!nombreJurado || !proyectos || proyectos.length === 0) {
        return (
            <Container maxWidth="md">
                <Box mt={4}>
                    <Alert severity="warning">No hay proyectos para evaluar o falta información.</Alert>
                    <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ mt: 2 }}>
                        Volver al inicio
                    </Button>
                </Box>
            </Container>
        )
    }

    return (
        <Container maxWidth="md" sx={{ pb: 6 }}>
            {/* Cabecera */}
            <Box mt={3} mb={4}>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} size="small" sx={{ mb: 2, color: 'text.secondary' }}>
                    Volver
                </Button>

                <Paper elevation={0} sx={{ p: 4, borderRadius: 3, backgroundColor: '#f8f9fa', border: '1px solid #e0e0e0', textAlign: 'center' }}>
                    <EmojiEventsIcon sx={{ fontSize: 40, color: COLORS.orange, mb: 1 }} />
                    <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.navy, textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
                        {finalNombre}
                    </Typography>
                    <Box sx={{ width: 40, height: 3, backgroundColor: COLORS.orange, borderRadius: 2, mx: 'auto', my: 2 }} />
                    <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Jurado: <Box component="span" sx={{ color: COLORS.navy, fontWeight: 700 }}>{nombreJurado}</Box>
                    </Typography>
                    <Chip
                        label={`${proyectos.length} proyectos en total`}
                        size="small"
                        sx={{ mt: 2, backgroundColor: 'rgba(0, 26, 110, 0.08)', color: COLORS.navy, fontWeight: 600 }}
                    />
                </Paper>
            </Box>

            {/* Banner de advertencia si hay errores de conexión */}
            {Object.keys(proyectosConError).length > 0 && (
                <Alert 
                    severity="warning" 
                    icon={<CloudOffIcon />}
                    sx={{ mb: 3, borderRadius: 2 }}
                >
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        ⚠️ {Object.keys(proyectosConError).length} evaluación{Object.keys(proyectosConError).length !== 1 ? 'es' : ''} con error de conexión
                    </Typography>
                    <Typography variant="caption">
                        Tus datos están guardados de forma segura en tu navegador. 
                        Cuando mejore tu conexión, haz clic en "Guardar Evaluación" nuevamente para sincronizar con la nube.
                    </Typography>
                </Alert>
            )}

            {/* Leyenda de Criterios de Evaluación */}
            <Accordion
                elevation={0}
                sx={{
                    mb: 4,
                    borderRadius: '12px !important',
                    border: '1px solid #e0e0e0',
                    '&:before': { display: 'none' }
                }}
            >
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                        backgroundColor: '#f8f9fa',
                        borderRadius: '12px',
                        '&.Mui-expanded': {
                            borderBottomLeftRadius: 0,
                            borderBottomRightRadius: 0
                        }
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <InfoOutlinedIcon sx={{ color: COLORS.orange, fontSize: 24 }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.navy }}>
                            Criterios de Evaluación
                        </Typography>
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 3 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
                        Puedes hacer clic en el ícono ℹ️ junto a cada campo para ver su descripción:
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                        {camposEvaluacion.map((campo) => (
                            <Box key={campo.nombre} sx={{ display: 'flex', gap: 1.5, p: 1.5, borderRadius: 2, backgroundColor: '#f8f9fa' }}>
                                <InfoOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20, flexShrink: 0, mt: 0.2 }} />
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: COLORS.navy, mb: 0.5 }}>
                                        {campo.nombre}
                                        {campo.nombre === 'PRODUCTIVIDAD' && (
                                            <Chip label="1, 3 o 5" size="small" sx={{ ml: 1, fontSize: 10, height: 18 }} />
                                        )}
                                        {campo.categoria && (
                                            <Chip label={campo.categoria} size="small" sx={{ ml: 1, fontSize: 10, height: 18, bgcolor: '#e3f2fd' }} />
                                        )}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4, whiteSpace: 'pre-line' }}>
                                        {campo.descripcion}
                                    </Typography>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                </AccordionDetails>
            </Accordion>

            {/* Iteración sobre las categorías agrupadas */}
            {Object.entries(proyectosAgrupados).map(([catKey, grupo]) => {
                const estilo = categoriaEstilos[catKey] || categoriaEstilos["default"]

                return (
                    <Box key={catKey} sx={{ mb: 6 }}>
                        {/* Título de la Categoría */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, pl: 1 }}>
                            <Typography sx={{ fontSize: 28 }}>{estilo.icono}</Typography>
                            <Typography variant="h5" sx={{ fontWeight: 700, color: estilo.color, textTransform: 'capitalize' }}>
                                {grupo.nombreDisplay}
                            </Typography>
                            <Box sx={{ flexGrow: 1, height: '1px', backgroundColor: estilo.color, opacity: 0.2, ml: 2 }} />
                            <Chip label={`${grupo.proyectos.length}`} size="small" sx={{ backgroundColor: estilo.color, color: 'white', fontWeight: 'bold' }} />
                        </Box>

                        {/* Lista de proyectos en esta categoría */}
                        <Stack spacing={2}>
                            {grupo.proyectos.map((proyecto) => {
                                const proyectoId = proyecto.id
                                const estaEnviado = enviadoProyectoId === proyectoId                                
                                const fueGuardado = proyectosGuardadosFirebase[proyectoId] // Verifica si ya fue guardado alguna vez
                                return (
                                    <Accordion
                                        key={proyectoId}
                                        disableGutters
                                        elevation={0}
                                        sx={{
                                            border: '1px solid #e0e0e0',
                                            borderRadius: '8px !important',
                                            overflow: 'hidden',
                                            borderLeft: `6px solid ${estilo.color}`, // Acento lateral de color
                                            '&:before': { display: 'none' }, // Quita la línea separadora por defecto de MUI
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                            transition: 'transform 0.2s',
                                            '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }
                                        }}
                                    >
                                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                            <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%', pr: 2 }}>
                                                <Chip
                                                    label={`#${proyecto.numero}`}
                                                    size="small"
                                                    sx={{ bgcolor: `${estilo.color}15`, color: estilo.color, fontWeight: 700 }}
                                                />
                                                <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 600, color: '#333' }}>
                                                    {proyecto.proyecto}
                                                </Typography>
                                                {proyectosConError[proyectoId] && (
                                                    <Tooltip title="Error al guardar en la nube. Datos seguros localmente. Intenta de nuevo.">
                                                        <CloudOffIcon sx={{ color: '#ff9800', fontSize: 20 }} />
                                                    </Tooltip>
                                                )}
                                                {estaEnviado && !proyectosConError[proyectoId] && <CheckCircleIcon color="success" />}
                                            </Stack>
                                        </AccordionSummary>

                                        <AccordionDetails sx={{ backgroundColor: '#fafafa', borderTop: '1px solid #f0f0f0', p: 3 }}>
                                            {/* DEBUG: Ver campos del proyecto actual */}
                                            {console.log(`Proyecto #${proyecto.numero} - Campos disponibles:`, Object.keys(proyecto))}
                                            {console.log(`Proyecto #${proyecto.numero} - Datos completos:`, proyecto)}
                                            
                                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} mb={3}>
                                                <Box flex={1}>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 700 }}>Gerencia</Typography>
                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{proyecto.gerencia}</Typography>
                                                </Box>
                                                {proyecto.lider && (
                                                    <Box flex={1}>
                                                        <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 700 }}>Líder</Typography>
                                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{proyecto.lider}</Typography>
                                                    </Box>
                                                )}
                                                {proyecto.Empresa && (
                                                    <Box flex={1}>
                                                        <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 700 }}>Empresa</Typography>
                                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{proyecto.Empresa}</Typography>
                                                    </Box>
                                                )}
                                                {proyecto.grupo && (
                                                    <Box flex={0.4}>
                                                        <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', fontWeight: 700 }}>Grupo</Typography>
                                                        <Typography variant="body2" sx={{ fontWeight: 700, color: estilo.color }}>{proyecto.grupo}</Typography>
                                                    </Box>
                                                )}
                                            </Stack>

                                            {proyecto.descripcion && (
                                                <Box sx={{ backgroundColor: '#fff', p: 2, borderRadius: 2, border: '1px dashed #d9d9d9', mb: 3 }}>
                                                    <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                                                        "{proyecto.descripcion}"
                                                    </Typography>
                                                </Box>
                                            )}

                                            {proyecto.problema && (
                                                <Box sx={{ backgroundColor: '#fff', p: 2, borderRadius: 2, border: '1px dashed #d9d9d9', mb: 3 }}>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                                                        Problema que Resuelve
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                        {proyecto.problema}
                                                    </Typography>
                                                </Box>
                                            )}

                                            {proyecto.impacto && (
                                                <Box sx={{ backgroundColor: '#fff', p: 2, borderRadius: 2, border: '1px dashed #d9d9d9', mb: 3 }}>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                                                        Impacto Esperado
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                        {proyecto.impacto}
                                                    </Typography>
                                                </Box>
                                            )}

                                            {proyecto.Costo_implementacion && (
                                                <Box sx={{ backgroundColor: '#fff', p: 2, borderRadius: 2, border: '1px dashed #d9d9d9', mb: 3 }}>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                                                        💰 Costo de Implementación
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                        {proyecto.Costo_implementacion}
                                                    </Typography>
                                                </Box>
                                            )}

                                            {proyecto.Costo_piloto && (
                                                <Box sx={{ backgroundColor: '#fff', p: 2, borderRadius: 2, border: '1px dashed #d9d9d9', mb: 3 }}>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                                                        🧪 Costo de Piloto
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                        {proyecto.Costo_piloto}
                                                    </Typography>
                                                </Box>
                                            )}

                                            {proyecto.Casos && (
                                                <Box sx={{ backgroundColor: '#fff', p: 2, borderRadius: 2, border: '1px dashed #d9d9d9', mb: 3 }}>
                                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                                                        📊 Casos
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                        {proyecto.Casos}
                                                    </Typography>
                                                </Box>
                                            )}

                                            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: estilo.color }}>
                                                CALIFICACIÓN
                                            </Typography>

                                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                                                {obtenerCamposPorCategoria(proyecto.categoria).map((campo) => {
                                                    const valorCampo = inputs[proyectoId]?.[campo.nombre] ?? ''
                                                    const mostrarError = intentoEnvio[proyectoId] && valorCampo === ''
                                                    
                                                    // Para campos booleanos, convertir valores internos (5/0) a "Sí"/"No" para mostrar
                                                    const valorParaMostrar = campo.tipo === 'boolean' && valorCampo !== '' 
                                                        ? (valorCampo === 5 || valorCampo === '5' ? 'Sí' : 'No')
                                                        : valorCampo

                                                    return (
                                                        <Box key={campo.nombre} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                                            <Tooltip
                                                                title={
                                                                    <Box sx={{ whiteSpace: 'pre-line' }}>
                                                                        {campo.descripcion}
                                                                    </Box>
                                                                }
                                                                arrow
                                                                enterTouchDelay={0}
                                                                leaveTouchDelay={3000}
                                                                placement="top"
                                                            >
                                                                <InfoOutlinedIcon
                                                                    sx={{
                                                                        fontSize: 20,
                                                                        color: 'text.secondary',
                                                                        cursor: 'help',
                                                                        mt: 2,
                                                                        flexShrink: 0,
                                                                        '&:hover': { color: estilo.color }
                                                                    }}
                                                                />
                                                            </Tooltip>
                                                            <FormControl fullWidth size="small" error={mostrarError}>
                                                                <InputLabel sx={{ fontSize: 14 }}>
                                                                    {campo.nombre}
                                                                </InputLabel>
                                                                <Select
                                                                    value={valorParaMostrar}
                                                                    onChange={(e) => {
                                                                        const valorSeleccionado = e.target.value;
                                                                        // Para campos booleanos, convertir "Sí"/"No" a 5/0 internamente
                                                                        const valorAGuardar = campo.tipo === 'boolean'
                                                                            ? (valorSeleccionado === 'Sí' ? 5 : 0)
                                                                            : valorSeleccionado;
                                                                        handleChange(proyectoId, campo.nombre, valorAGuardar);
                                                                    }}
                                                                    label={campo.nombre}
                                                                    sx={{ backgroundColor: '#fff' }}
                                                                >
                                                                    <MenuItem value=""><em>Selecciona</em></MenuItem>
                                                                    {campo.opciones.map((valor) => (
                                                                        <MenuItem key={valor} value={valor}>{valor}</MenuItem>
                                                                    ))}
                                                                </Select>
                                                                {mostrarError && (
                                                                    <Typography variant="caption" sx={{ color: 'error.main', mt: 0.5, fontSize: 11 }}>
                                                                        Requerido
                                                                    </Typography>
                                                                )}
                                                            </FormControl>
                                                        </Box>
                                                    )
                                                })}
                                            </Box>

                                            {/* Campo de Feedback si está habilitado */}
                                            {(() => {
                                                const catNormalizada = normalizarTexto(proyecto.categoria)
                                                const feedbackConfig = feedbackConfigPorCat[catNormalizada] || {}
                                                if (!feedbackConfig.enabled) return null

                                                const feedbackTexto = feedbacks[proyectoId] || ''
                                                const mostrarErrorFeedback = intentoEnvio[proyectoId] && feedbackConfig.required && !feedbackTexto.trim()

                                                return (
                                                    <Box sx={{ mt: 3 }}>
                                                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 1 }}>
                                                            📝 Feedback {feedbackConfig.required && <Box component="span" sx={{ color: 'error.main' }}>*</Box>}
                                                        </Typography>
                                                        <TextField
                                                            fullWidth
                                                            multiline
                                                            rows={2}
                                                            value={feedbackTexto}
                                                            onChange={(e) => handleFeedbackChange(proyectoId, e.target.value)}
                                                            placeholder={feedbackConfig.required ? 'Ingresa tu feedback (obligatorio)' : 'Ingresa tu feedback (opcional)'}
                                                            error={mostrarErrorFeedback}
                                                            helperText={mostrarErrorFeedback ? 'El feedback es obligatorio para esta categoría' : ''}
                                                            sx={{ 
                                                                backgroundColor: '#fff',
                                                                '& .MuiOutlinedInput-root': {
                                                                    '&.Mui-focused fieldset': {
                                                                        borderColor: estilo.color
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                    </Box>
                                                )
                                            })()}

                                            <Box 
                                                sx={{ 
                                                    mt: 5, 
                                                    pt: 3, 
                                                    borderTop: '1px solid #e0e0e0', 
                                                    display: 'flex', 
                                                    justifyContent: 'flex-end', 
                                                    gap: 2, 
                                                    alignItems: 'center' 
                                                }}
                                            >
                                                {estaEnviado && loadingProyectoId !== proyectoId && (
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <CheckCircleIcon sx={{ color: '#2e7d32', fontSize: 20 }} />
                                                        <Typography variant="body2" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                                                            Guardado
                                                        </Typography>
                                                    </Box>
                                                )}
                                                <Button
                                                    variant="contained"
                                                    onClick={() => handleEnviar(proyecto)}
                                                    disabled={loadingProyectoId === proyectoId}
                                                    startIcon={loadingProyectoId === proyectoId ? null : (proyectosConError[proyectoId] ? <CloudOffIcon /> : <SendIcon />)}
                                                    sx={{
                                                        backgroundColor: proyectosConError[proyectoId] ? '#ff9800' : estilo.color,
                                                        color: '#fff',
                                                        fontWeight: 700,
                                                        textTransform: 'none',
                                                        boxShadow: 'none',
                                                        minWidth: 180,
                                                        '&:hover': {
                                                            backgroundColor: proyectosConError[proyectoId] ? '#f57c00' : estilo.color,
                                                            filter: proyectosConError[proyectoId] ? 'none' : 'brightness(0.9)',
                                                            boxShadow: 'none'
                                                        },
                                                        '&:disabled': {
                                                            backgroundColor: proyectosConError[proyectoId] ? '#ff9800' : estilo.color,
                                                            opacity: 0.7,
                                                            color: '#fff'
                                                        }
                                                    }}
                                                >
                                                    {loadingProyectoId === proyectoId ? (
                                                        <Box display="flex" alignItems="center" gap={1}>
                                                            <CircularProgress size={18} sx={{ color: '#fff' }} />
                                                            <span>Guardando...</span>
                                                        </Box>
                                                    ) : proyectosConError[proyectoId] ? (
                                                        'Reintentar Guardar'
                                                    ) : fueGuardado ? (
                                                        'Actualizar Evaluación'
                                                    ) : (
                                                        'Guardar Evaluación'
                                                    )}
                                                </Button>
                                            </Box>
                                        </AccordionDetails>
                                    </Accordion>
                                )
                            })}
                        </Stack>
                    </Box>
                )
            })}

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    sx={{ width: '100%' }}
                >
                    {snackbar.mensaje}
                </Alert>
            </Snackbar>
        </Container>
    )
}

export default EvaluacionProyectos