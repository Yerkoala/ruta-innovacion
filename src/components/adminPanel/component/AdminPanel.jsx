import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Box, Button, Typography, Select, MenuItem, FormControl, InputLabel, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Alert, Stack, LinearProgress, ThemeProvider, CssBaseline, Accordion, AccordionSummary, AccordionDetails, TextField, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Snackbar, CircularProgress } from '@mui/material';
import * as XLSX from 'xlsx';

// Imports locales
import { theme } from '../const/theme';
import { UploadIcon, CheckIcon, PlusIcon, ExpandMoreIcon, SettingsIcon, DeleteIcon, CopyIcon, StepBadge } from '../components/Icons';
import { CategorySection } from '../components/CategorySection';
import { procesarArchivoExcel, validarArchivoExcel } from '../utils/fileProcessing';
import { cargarFinalesDesdeFirebase, crearFinalEnFirebase, duplicarFinalesEnFirebase, marcarFinalComoActiva, eliminarFinalDeFirebase, obtenerFinalActiva, inicializarFinalesPredeterminadas, guardarProyectosEnFirebase, eliminarProyectosPorFinal, obtenerProyectosPorFinal, obtenerPonderaciones, guardarPonderaciones } from '../utils/firebaseOperations';

export default function AdminPanel() {
    // Estados principales
    const [finalActivaId, setFinalActivaId] = useState('');
    const [anioFiltroFinalActiva, setAnioFiltroFinalActiva] = useState(new Date().getFullYear());
    const [tipoFinalFiltro, setTipoFinalFiltro] = useState('Evaluacion'); // 'Evaluacion' o 'Priorizacion'
    const [eventoSeleccionado, setEventoSeleccionado] = useState('');
    const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());
    const [loadingFinalActiva, setLoadingFinalActiva] = useState(true);
    const [loadingCambioFinal, setLoadingCambioFinal] = useState(false);
    const [archivoCargado, setArchivoCargado] = useState(null);
    const [proyectos, setProyectos] = useState([]); // Proyectos del Excel (preview)
    const [proyectosGuardados, setProyectosGuardados] = useState([]); // Proyectos en Firebase
    const [loadingProyectosGuardados, setLoadingProyectosGuardados] = useState(false);
    const [error, setError] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [expandedCats, setExpandedCats] = useState({});
    const [accordionExpanded, setAccordionExpanded] = useState(true);

    // Estados para Gestionar Finales
    const [accordionFinalesExpanded, setAccordionFinalesExpanded] = useState(false);
    const [finalesDisponibles, setFinalesDisponibles] = useState([]);
    const [loadingFinales, setLoadingFinales] = useState(false);
    const [dialogNuevaFinal, setDialogNuevaFinal] = useState(false);
    const [nuevaFinalNombre, setNuevaFinalNombre] = useState('');
    const [nuevaFinalAnio, setNuevaFinalAnio] = useState(new Date().getFullYear());
    const [nuevaFinalTipo, setNuevaFinalTipo] = useState('Evaluacion');
    const [dialogDuplicar, setDialogDuplicar] = useState(false);
    const [anioOrigen, setAnioOrigen] = useState(new Date().getFullYear() - 1);
    const [anioDestino, setAnioDestino] = useState(new Date().getFullYear());

    // Estados para confirmación de carga de proyectos
    const [dialogConfirmarCarga, setDialogConfirmarCarga] = useState(false);
    const [proyectosExistentes, setProyectosExistentes] = useState(0);

    // Estados para notificaciones
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    // Estados para Ponderaciones
    const [accordionPonderacionesExpanded, setAccordionPonderacionesExpanded] = useState(false);
    const [ponderaciones, setPonderaciones] = useState({
        'chispeza': { DESAFIO: 20, CREATIVIDAD: 20, IMPLEMENTABILIDAD: 20, ESCALABILIDAD: 20, IMPACTO: 20 },
        'sandia-cala': { DESAFIO: 20, CREATIVIDAD: 15, IMPLEMENTABILIDAD: 20, ESCALABILIDAD: 15, EBITDA: 20, PRODUCTIVIDAD: 10 },
        'mejora-continua': { DESAFIO: 20, CREATIVIDAD: 15, IMPLEMENTABILIDAD: 20, ESCALABILIDAD: 15, EBITDA: 20, PRODUCTIVIDAD: 10 },
        'pinta-pa-bueno': { DESAFIO: 20, CREATIVIDAD: 15, IMPLEMENTABILIDAD: 20, ESCALABILIDAD: 15, EBITDA: 20, PRODUCTIVIDAD: 10 },
        'eureka': { DESAFIO: 20, CREATIVIDAD: 15, IMPLEMENTABILIDAD: 20, ESCALABILIDAD: 15, EBITDA: 20, PRODUCTIVIDAD: 10 }
    });
    const [loadingPonderaciones, setLoadingPonderaciones] = useState(false);
    const [loadingSaveCategoria, setLoadingSaveCategoria] = useState(null); // Track qué categoría se está guardando

    const fileInputRef = useRef(null);

    // Generar años disponibles
    const anioActual = new Date().getFullYear();
    const aniosDisponibles = Array.from({ length: 7 }, (_, i) => anioActual - 2 + i);

    // Años únicos disponibles en las finales
    const aniosConFinales = useMemo(() => {
        const anios = [...new Set(finalesDisponibles.map(f => f.anio))];
        return anios.sort((a, b) => b - a); // Más reciente primero
    }, [finalesDisponibles]);

    // Finales filtradas por año y tipo seleccionado
    const finalesFiltradas = useMemo(() => {
        return finalesDisponibles.filter(f => 
            f.anio === anioFiltroFinalActiva && 
            (f.tipo || 'Evaluacion') === tipoFinalFiltro
        );
    }, [finalesDisponibles, anioFiltroFinalActiva, tipoFinalFiltro]);

    // Función para mostrar notificaciones
    const mostrarNotificacion = (message, severity = 'info') => {
        setSnackbar({ open: true, message, severity });
    };

    const cerrarNotificacion = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    // Función para cargar proyectos guardados de una final
    const cargarProyectosGuardados = async (finalId) => {
        if (!finalId) {
            setProyectosGuardados([]);
            return;
        }

        setLoadingProyectosGuardados(true);
        try {
            const proyectos = await obtenerProyectosPorFinal(finalId);
            setProyectosGuardados(proyectos);
        } catch (error) {
            mostrarNotificacion('Error al cargar proyectos guardados', 'error');
            setProyectosGuardados([]);
        } finally {
            setLoadingProyectosGuardados(false);
        }
    };

    // Funciones para procesar archivos
    const handleProcesarArchivo = async (file) => {
        setError('');

        if (!validarArchivoExcel(file)) {
            setError('Formato no válido. Usa .xlsx, .xls o .csv');
            return;
        }

        setArchivoCargado(file);

        try {
            const mapped = await procesarArchivoExcel(file);
            setProyectos(mapped);

            const cats = {};
            mapped.forEach(p => { if (p.Categoria) cats[p.Categoria] = true; });
            setExpandedCats(Object.fromEntries(Object.keys(cats).map(c => [c, true])));
        } catch (err) {
            setError(err.message);
        }
    };

    const descargarPlantillaFormato = () => {
        // Crear workbook y worksheet
        const wb = XLSX.utils.book_new();
        
        // Definir las columnas de la plantilla
        const headers = ['N°', 'Proyecto', 'Gerencia', 'Categoría', 'Grupo', 'Líder', 'Descripción'];
        
        // Crear datos de ejemplo (opcional: puedes dejar solo headers)
        const data = [
            headers,
            [1, 'Ejemplo de Proyecto', 'Gerencia Ejemplo', 'chispeza', 'Grupo A', 'Juan Pérez', 'Descripción del proyecto de ejemplo'],
            [2, '', '', '', '', '', '']
        ];
        
        // Crear worksheet desde el array
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // Establecer anchos de columnas
        ws['!cols'] = [
            { wch: 5 },   // N°
            { wch: 30 },  // Proyecto
            { wch: 20 },  // Gerencia
            { wch: 15 },  // Categoría
            { wch: 12 },  // Grupo
            { wch: 20 },  // Líder
            { wch: 50 }   // Descripción
        ];
        
        // Agregar worksheet al workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Proyectos');
        
        // Descargar el archivo
        XLSX.writeFile(wb, 'plantilla_proyectos.xlsx');
        
        mostrarNotificacion('Plantilla descargada correctamente', 'success');
    };

    const limpiarArchivoCargado = () => {
        setArchivoCargado(null);
        setProyectos([]);
        setError('');
        setExpandedCats({});
        // Limpiar el input de archivo
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Funciones para gestionar finales
    const cargarFinales = async () => {
        setLoadingFinales(true);
        try {
            const finales = await cargarFinalesDesdeFirebase();
            setFinalesDisponibles(finales);
            
            // Si no hay finales, ofrecer crearlas
            if (finales.length === 0) {
                const crear = window.confirm('No hay finales configuradas. ¿Deseas crear las finales predeterminadas para el año actual?');
                if (crear) {
                    const cantidad = await inicializarFinalesPredeterminadas(new Date().getFullYear());
                    mostrarNotificacion(`${cantidad} finales creadas exitosamente`, 'success');
                    // Recargar finales
                    const nuevasFinales = await cargarFinalesDesdeFirebase();
                    setFinalesDisponibles(nuevasFinales);
                    // Cargar la final activa
                    await cargarFinalActiva();
                }
            }
        } catch (error) {
            mostrarNotificacion(error.message, 'error');
        } finally {
            setLoadingFinales(false);
        }
    };

    const cargarFinalActiva = async () => {
        setLoadingFinalActiva(true);
        try {
            const finalActiva = await obtenerFinalActiva();
            if (finalActiva && finalActiva.id) {
                setFinalActivaId(finalActiva.id);
            }
        } catch (error) {
            // Error silencioso, no molestar al usuario
        } finally {
            setLoadingFinalActiva(false);
        }
    };

    const cambiarFinalActiva = async (nuevoFinalId) => {
        if (!nuevoFinalId) return;
        
        setLoadingCambioFinal(true);
        try {
            await marcarFinalComoActiva(nuevoFinalId);
            setFinalActivaId(nuevoFinalId);
            mostrarNotificacion('Final activa actualizada correctamente', 'success');
            // Recargar lista de finales para actualizar el estado "activa"
            cargarFinales();
        } catch (error) {
            mostrarNotificacion(error.message, 'error');
        } finally {
            setLoadingCambioFinal(false);
        }
    };

    const crearNuevaFinal = async () => {
        if (!nuevaFinalNombre.trim()) {
            mostrarNotificacion('Por favor ingresa un nombre para la final', 'warning');
            return;
        }

        try {
            await crearFinalEnFirebase(nuevaFinalNombre, nuevaFinalAnio, nuevaFinalTipo);
            const tipoTexto = nuevaFinalTipo === 'Evaluacion' ? 'Evaluación' : 'Priorización';
            mostrarNotificacion(`Final "${nuevaFinalNombre} ${nuevaFinalAnio}" (${tipoTexto}) creada exitosamente`, 'success');
            setDialogNuevaFinal(false);
            setNuevaFinalNombre('');
            setNuevaFinalTipo('Evaluacion');
            cargarFinales();
        } catch (error) {
            mostrarNotificacion(error.message, 'error');
        }
    };

    const duplicarFinales = async () => {
        try {
            const cantidad = await duplicarFinalesEnFirebase(anioOrigen, anioDestino);
            mostrarNotificacion(`${cantidad} finales duplicadas del ${anioOrigen} al ${anioDestino}`, 'success');
            setDialogDuplicar(false);
            cargarFinales();
        } catch (error) {
            mostrarNotificacion(error.message, 'error');
        }
    };

    const marcarComoActiva = async (finalId) => {
        try {
            await marcarFinalComoActiva(finalId);
            mostrarNotificacion('Final activada correctamente', 'success');
            cargarFinales();
        } catch (error) {
            mostrarNotificacion(error.message, 'error');
        }
    };

    const eliminarFinal = async (finalId, nombreFinal) => {
        if (!window.confirm(`¿Estás seguro de eliminar "${nombreFinal}"?\n\nEsta acción no se puede deshacer.`)) {
            return;
        }

        try {
            await eliminarFinalDeFirebase(finalId);
            mostrarNotificacion('Final eliminada correctamente', 'success');
            cargarFinales();
        } catch (error) {
            mostrarNotificacion(error.message, 'error');
        }
    };

    // Funciones para gestionar ponderaciones
    const cargarTodasLasPonderaciones = async () => {
        setLoadingPonderaciones(true);
        try {
            const categorias = ['chispeza', 'sandia-cala', 'mejora-continua', 'pinta-pa-bueno', 'eureka'];
            const nuevasPonderaciones = {};
            
            for (const categoria of categorias) {
                const ponderacion = await obtenerPonderaciones(categoria);
                nuevasPonderaciones[categoria] = ponderacion;
            }
            
            setPonderaciones(nuevasPonderaciones);
        } catch (error) {
            mostrarNotificacion('Error al cargar ponderaciones', 'error');
        } finally {
            setLoadingPonderaciones(false);
        }
    };

    const actualizarPonderacion = (categoria, campo, valor) => {
        setPonderaciones(prev => ({
            ...prev,
            [categoria]: {
                ...(prev[categoria] || {}), // Validación de seguridad
                [campo]: Number(valor) || 0
            }
        }));
    };

    const calcularSumaPonderaciones = (categoria) => {
        const pond = ponderaciones[categoria];
        if (!pond) return 0; // Validación de seguridad
        // Chispeza tiene campos diferentes (5 campos con IMPACTO)
        const camposValidos = categoria === 'chispeza'
            ? ['DESAFIO', 'CREATIVIDAD', 'IMPLEMENTABILIDAD', 'ESCALABILIDAD', 'IMPACTO']
            : ['DESAFIO', 'CREATIVIDAD', 'IMPLEMENTABILIDAD', 'ESCALABILIDAD', 'EBITDA', 'PRODUCTIVIDAD'];
        return camposValidos.reduce((sum, campo) => sum + (Number(pond[campo]) || 0), 0);
    };

    const guardarPonderacionesCategoria = async (categoria) => {
        const suma = calcularSumaPonderaciones(categoria);
        
        if (suma !== 100) {
            mostrarNotificacion(`La suma debe ser 100%. Actualmente es ${suma}%`, 'error');
            return;
        }

        setLoadingSaveCategoria(categoria);
        try {
            await guardarPonderaciones(categoria, ponderaciones[categoria]);
            mostrarNotificacion('Ponderaciones guardadas correctamente', 'success');
        } catch (error) {
            mostrarNotificacion(error.message, 'error');
        } finally {
            setLoadingSaveCategoria(null);
        }
    };

    // Cargar finales y final activa al montar el componente
    useEffect(() => {
        cargarFinales();
        cargarFinalActiva();
        cargarTodasLasPonderaciones();
    }, []);

    // Ajustar el año del filtro cuando cambia la final activa
    useEffect(() => {
        if (finalActivaId && finalesDisponibles.length > 0) {
            const finalActiva = finalesDisponibles.find(f => f.id === finalActivaId);
            if (finalActiva && finalActiva.anio !== anioFiltroFinalActiva) {
                setAnioFiltroFinalActiva(finalActiva.anio);
            }
        }
    }, [finalActivaId, finalesDisponibles]);

    // Cargar proyectos guardados cuando cambia el evento seleccionado
    useEffect(() => {
        if (eventoSeleccionado) {
            cargarProyectosGuardados(eventoSeleccionado);
        } else {
            setProyectosGuardados([]);
        }
    }, [eventoSeleccionado]);

    // Cargar proyectos guardados cuando cambia el evento seleccionado
    useEffect(() => {
        if (eventoSeleccionado) {
            cargarProyectosGuardados(eventoSeleccionado);
        } else {
            setProyectosGuardados([]);
        }
    }, [eventoSeleccionado]);

    // Funciones auxiliares
    const grupos = useMemo(() => {
        const map = {};
        proyectos.forEach(p => {
            const cat = p.Categoria || 'Sin categoría';
            if (!map[cat]) map[cat] = [];
            map[cat].push(p);
        });
        return map;
    }, [proyectos]);

    const gruposGuardados = useMemo(() => {
        const map = {};
        proyectosGuardados.forEach(p => {
            const cat = p.categoria || 'Sin categoría';
            if (!map[cat]) map[cat] = [];
            map[cat].push(p);
        });
        return map;
    }, [proyectosGuardados]);

    const categorias = Object.keys(grupos);

    const toggleCat = (cat) => setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));
    const toggleAll = (val) => setExpandedCats(Object.fromEntries(categorias.map(c => [c, val])));

    const handleCargar = async () => {
        if (!eventoSeleccionado || !proyectos.length) return;
        
        // Verificar si ya existen proyectos para esta final
        setLoading(true);
        try {
            const existentes = await obtenerProyectosPorFinal(eventoSeleccionado);
            setProyectosExistentes(existentes.length);
            setLoading(false);
            setDialogConfirmarCarga(true);
        } catch (error) {
            setLoading(false);
            mostrarNotificacion(error.message, 'error');
        }
    };

    const confirmarCargaProyectos = async (reemplazar = false) => {
        setDialogConfirmarCarga(false);
        
        const finalSeleccionada = finalesDisponibles.find(f => f.id === eventoSeleccionado);
        
        setLoading(true);
        try {
            // Si se debe reemplazar, primero eliminar los existentes
            if (reemplazar && proyectosExistentes > 0) {
                await eliminarProyectosPorFinal(eventoSeleccionado);
            }
            
            const guardados = await guardarProyectosEnFirebase(eventoSeleccionado, proyectos, reemplazar);
            
            const mensaje = reemplazar 
                ? `✅ ${guardados} proyectos actualizados exitosamente en "${finalSeleccionada?.nombre}"`
                : `✅ ${guardados} proyectos agregados exitosamente en "${finalSeleccionada?.nombre}"`;
            
            mostrarNotificacion(mensaje, 'success');
            
            // Limpiar solo el archivo Excel y su preview
            setProyectos([]);
            setArchivoCargado(null);
            setProyectosExistentes(0);
            
            // Recargar los proyectos guardados para mostrar los cambios
            await cargarProyectosGuardados(eventoSeleccionado);
        } catch (error) {
            mostrarNotificacion(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={{ minHeight: '100vh', py: 4, px: 2 }}>
                <Box sx={{ maxWidth: 1400, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2.5 }}>

                    {/* Header */}
                    <Box sx={{ mb: 0.5 }}>
                        <Typography variant="h4" color="text.primary" gutterBottom>
                            Panel de Administración
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Gestiona los proyectos de las finales de innovación
                        </Typography>
                    </Box>

                    {/* Selector de Final Activa */}
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" mb={2.5} sx={{ fontWeight: 600 }}>
                            Final Activa del Sistema
                        </Typography>

                        {loadingFinalActiva ? (
                            <LinearProgress sx={{ borderRadius: 1 }} />
                        ) : (
                            <>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2}>
                                    {/* Selector de Año */}
                                    <FormControl sx={{ minWidth: { xs: '100%', sm: 150 } }}>
                                        <InputLabel>Año</InputLabel>
                                        <Select
                                            value={anioFiltroFinalActiva}
                                            label="Año"
                                            onChange={e => setAnioFiltroFinalActiva(e.target.value)}
                                            sx={{ borderRadius: 2 }}
                                            disabled={loadingCambioFinal}
                                        >
                                            {aniosConFinales.length > 0 ? (
                                                aniosConFinales.map((anio) => (
                                                    <MenuItem key={anio} value={anio}>{anio}</MenuItem>
                                                ))
                                            ) : (
                                                <MenuItem value={new Date().getFullYear()}>{new Date().getFullYear()}</MenuItem>
                                            )}
                                        </Select>
                                    </FormControl>

                                    {/* Selector de Tipo de Final */}
                                    <FormControl sx={{ minWidth: { xs: '100%', sm: 180 } }}>
                                        <InputLabel>Tipo de Final</InputLabel>
                                        <Select
                                            value={tipoFinalFiltro}
                                            label="Tipo de Final"
                                            onChange={e => setTipoFinalFiltro(e.target.value)}
                                            sx={{ borderRadius: 2 }}
                                            disabled={loadingCambioFinal}
                                        >
                                            <MenuItem value="Evaluacion">Evaluación</MenuItem>
                                            <MenuItem value="Priorizacion">Priorización</MenuItem>
                                        </Select>
                                    </FormControl>

                                    {/* Selector de Final */}
                                    <FormControl fullWidth>
                                        <InputLabel>Selecciona la final activa</InputLabel>
                                        <Select
                                            value={finalActivaId}
                                            label="Selecciona la final activa"
                                            onChange={e => cambiarFinalActiva(e.target.value)}
                                            sx={{ borderRadius: 2 }}
                                            disabled={finalesFiltradas.length === 0 || loadingCambioFinal}
                                            endAdornment={
                                                loadingCambioFinal && (
                                                    <CircularProgress 
                                                        size={20} 
                                                        sx={{ mr: 2 }} 
                                                    />
                                                )
                                            }
                                        >
                                            {finalesFiltradas.map((final) => (
                                                <MenuItem key={final.id} value={final.id}>
                                                    {final.nombre}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Stack>

                                {loadingCambioFinal && (
                                    <LinearProgress sx={{ mt: 2, borderRadius: 1 }} />
                                )}

                                {finalActivaId && !loadingCambioFinal && (
                                    <Alert severity="success" icon={<CheckIcon />} sx={{ mt: 2, borderRadius: 2 }}>
                                        <span>Final activa del sistema: <strong>{finalesDisponibles.find(f => f.id === finalActivaId)?.nombre || 'No configurada'} {finalesDisponibles.find(f => f.id === finalActivaId)?.anio || ''}</strong></span>
                                    </Alert>
                                )}

                                {finalesDisponibles.length === 0 && (
                                    <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
                                        No hay finales configuradas. Ve a "Gestionar Finales" para crear una.
                                    </Alert>
                                )}

                                {finalesDisponibles.length > 0 && finalesFiltradas.length === 0 && (
                                    <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                                        No hay finales de tipo "{tipoFinalFiltro === 'Evaluacion' ? 'Evaluación' : 'Priorización'}" para el año {anioFiltroFinalActiva}. Selecciona otro año, tipo o créalas en "Gestionar Finales".
                                    </Alert>
                                )}
                            </>
                        )}
                    </Paper>

                    {/* Accordion: Cargar Proyectos */}
                    <Accordion
                        expanded={accordionExpanded}
                        onChange={() => setAccordionExpanded(!accordionExpanded)}
                        sx={{
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            borderRadius: '10px !important',
                            '&:before': { display: 'none' },
                            overflow: 'hidden'
                        }}
                    >
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            sx={{
                                bgcolor: 'background.paper',
                                borderBottom: accordionExpanded ? '1px solid' : 'none',
                                borderColor: 'divider',
                                '& .MuiAccordionSummary-content': { my: 1.5 }
                            }}
                        >
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Box sx={{
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    borderRadius: 2,
                                    width: 48,
                                    height: 48,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <UploadIcon />
                                </Box>
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        Cargar Proyectos
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {proyectos.length > 0
                                            ? `${proyectos.length} proyecto${proyectos.length !== 1 ? 's' : ''} cargado${proyectos.length !== 1 ? 's' : ''}`
                                            : 'Selecciona evento y carga el archivo Excel'
                                        }
                                    </Typography>
                                </Box>
                            </Stack>
                        </AccordionSummary>

                        <AccordionDetails sx={{ p: 3, bgcolor: 'grey.50' }}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2.5 }}>

                                {/* Paso 1: Selección de evento */}
                                <Paper sx={{ p: 3 }}>
                                    <Stack direction="row" alignItems="center" spacing={1.5} mb={2.5}>
                                        <StepBadge num="1" />
                                        <Typography variant="h6">Selecciona evento</Typography>
                                    </Stack>

                                    <FormControl fullWidth sx={{ mb: 2 }}>
                                        <InputLabel>Evento a cargar</InputLabel>
                                        <Select
                                            value={eventoSeleccionado}
                                            label="Evento a cargar"
                                            onChange={e => setEventoSeleccionado(e.target.value)}
                                            sx={{ borderRadius: 2 }}
                                            disabled={finalesDisponibles.length === 0}
                                        >
                                            {finalesDisponibles.map((final) => (
                                                <MenuItem key={final.id} value={final.id}>
                                                    {final.nombre} {final.anio}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <FormControl fullWidth>
                                        <InputLabel>Año</InputLabel>
                                        <Select
                                            value={anioSeleccionado}
                                            label="Año"
                                            onChange={e => setAnioSeleccionado(e.target.value)}
                                            sx={{ borderRadius: 2 }}
                                        >
                                            {aniosDisponibles.map((anio) => (
                                                <MenuItem key={anio} value={anio}>{anio}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    {eventoSeleccionado && (
                                        <Alert severity="info" icon={<CheckIcon />} sx={{ mt: 2, borderRadius: 2 }}>
                                            <span>Cargarás proyectos para: <strong>{finalesDisponibles.find(f => f.id === eventoSeleccionado)?.nombre || eventoSeleccionado}</strong></span>
                                        </Alert>
                                    )}
                                </Paper>

                                {/* Paso 2: Carga de archivo */}
                                <Paper sx={{ p: 3 }}>
                                    <Stack direction="row" alignItems="center" spacing={1.5} mb={2.5}>
                                        <StepBadge num="2" />
                                        <Typography variant="h6">Carga archivo</Typography>
                                    </Stack>

                                    {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

                                    <Box
                                        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={e => {
                                            e.preventDefault();
                                            setIsDragging(false);
                                            if (e.dataTransfer.files[0]) handleProcesarArchivo(e.dataTransfer.files[0]);
                                        }}
                                        onClick={() => fileInputRef.current?.click()}
                                        sx={{
                                            border: '2px dashed',
                                            borderColor: isDragging ? 'primary.main' : archivoCargado ? 'primary.light' : 'divider',
                                            borderRadius: 3,
                                            p: 3,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: 1,
                                            cursor: 'pointer',
                                            bgcolor: isDragging ? 'rgba(46,125,50,0.04)' : archivoCargado ? 'rgba(76,175,80,0.04)' : 'grey.50',
                                            transition: 'all .2s',
                                            minHeight: 160,
                                            justifyContent: 'center',
                                            '&:hover': { bgcolor: 'rgba(46,125,50,0.04)', borderColor: 'primary.light' }
                                        }}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".xlsx,.xls,.csv"
                                            onChange={e => { if (e.target.files[0]) handleProcesarArchivo(e.target.files[0]); }}
                                            style={{ display: 'none' }}
                                        />
                                        <Box sx={{ color: archivoCargado ? 'primary.main' : 'text.disabled' }}>
                                            <UploadIcon />
                                        </Box>

                                        {archivoCargado ? (
                                            <Box sx={{ textAlign: 'center' }}>
                                                <Typography variant="body2" color="primary.main" fontWeight={600}>
                                                    Archivo cargado
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {archivoCargado.name}
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <Box sx={{ textAlign: 'center' }}>
                                                <Typography variant="body2" fontWeight={600} color="text.primary">
                                                    Arrastra tu Excel aquí
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    o haz clic para explorar
                                                </Typography>
                                            </Box>
                                        )}
                                    </Box>

                                    <Stack direction="row" spacing={1} sx={{ mt: 1.5, justifyContent: 'center' }}>
                                        <Button 
                                            size="small" 
                                            variant="outlined" 
                                            color="primary" 
                                            onClick={descargarPlantillaFormato} 
                                            sx={{ fontSize: 11, textTransform: 'none' }}
                                        >
                                            📥 Descargar planilla formato
                                        </Button>
                                        {archivoCargado && (
                                            <Button 
                                                size="small" 
                                                variant="outlined" 
                                                color="error" 
                                                onClick={limpiarArchivoCargado} 
                                                sx={{ fontSize: 11, textTransform: 'none' }}
                                            >
                                                ✕ Quitar archivo
                                            </Button>
                                        )}
                                    </Stack>
                                </Paper>
                            </Box>

                            {/* Proyectos guardados en Firebase */}
                            {eventoSeleccionado && (
                                <Paper sx={{ p: 3, mt: 2.5 }}>
                                    <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
                                        <StepBadge num="3" />
                                        <Typography variant="h6">Proyectos en Firebase</Typography>
                                        <Box sx={{ flex: 1 }} />
                                        {loadingProyectosGuardados && <CircularProgress size={20} />}
                                    </Stack>

                                    {loadingProyectosGuardados ? (
                                        <LinearProgress sx={{ borderRadius: 1 }} />
                                    ) : proyectosGuardados.length > 0 ? (
                                        <>
                                            <Alert severity="success" icon={<CheckIcon />} sx={{ mb: 2, borderRadius: 2 }}>
                                                <span>Esta final tiene <strong>{proyectosGuardados.length} proyectos guardados</strong></span>
                                            </Alert>

                                            <Stack direction="row" spacing={1} mb={2}>
                                                <Button size="small" variant="outlined" color="inherit" onClick={() => toggleAll(true)} sx={{ fontSize: 11, py: 0.4, px: 1.5, borderRadius: 5 }}>
                                                    Expandir todo
                                                </Button>
                                                <Button size="small" variant="outlined" color="inherit" onClick={() => toggleAll(false)} sx={{ fontSize: 11, py: 0.4, px: 1.5, borderRadius: 5 }}>
                                                    Colapsar todo
                                                </Button>
                                            </Stack>

                                            {Object.keys(gruposGuardados).map((cat) => (
                                                <CategorySection
                                                    key={cat}
                                                    categoria={cat}
                                                    proyectos={gruposGuardados[cat]}
                                                    expanded={!!expandedCats[cat]}
                                                    onToggle={() => toggleCat(cat)}
                                                />
                                            ))}
                                        </>
                                    ) : (
                                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                                            Este evento no tiene proyectos cargados aún
                                        </Alert>
                                    )}
                                </Paper>
                            )}

                            {/* Vista previa de proyectos del Excel */}
                            {proyectos.length > 0 && (
                                <Paper sx={{ p: 3, mt: 2.5, border: '2px solid', borderColor: 'warning.main' }}>
                                    <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                                        <StepBadge num="4" />
                                        <Typography variant="h6">📄 Nuevos proyectos desde Excel</Typography>
                                        <Box sx={{ flex: 1 }} />
                                        <Chip label={`${proyectos.length} por guardar`} color="warning" size="small" />
                                    </Stack>

                                    <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                                        <span>Vista previa antes de guardar. Estos proyectos <strong>NO están en Firebase</strong> aún.</span>
                                    </Alert>

                                    <Stack direction="row" spacing={1} mb={2}>
                                        <Button size="small" variant="outlined" color="inherit" onClick={() => toggleAll(true)} sx={{ fontSize: 11, py: 0.4, px: 1.5, borderRadius: 5 }}>
                                            Expandir todo
                                        </Button>
                                        <Button size="small" variant="outlined" color="inherit" onClick={() => toggleAll(false)} sx={{ fontSize: 11, py: 0.4, px: 1.5, borderRadius: 5 }}>
                                            Colapsar todo
                                        </Button>
                                    </Stack>

                                    {categorias.map((cat) => (
                                        <CategorySection
                                            key={cat}
                                            categoria={cat}
                                            proyectos={grupos[cat]}
                                            expanded={!!expandedCats[cat]}
                                            onToggle={() => toggleCat(cat)}
                                        />
                                    ))}
                                </Paper>
                            )}

                            {/* Botón de guardar */}
                            {proyectos.length > 0 && (
                                <Paper sx={{ p: 3, mt: 2.5 }}>
                                    {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        color="primary"
                                        size="large"
                                        disabled={!eventoSeleccionado || !proyectos.length || loading}
                                        onClick={handleCargar}
                                        sx={{
                                            py: 1.8,
                                            fontSize: 15,
                                            borderRadius: 2,
                                            boxShadow: (eventoSeleccionado && proyectos.length) ? '0 4px 14px rgba(46,125,50,0.3)' : 'none'
                                        }}
                                    >
                                        {loading
                                            ? 'Guardando en base de datos…'
                                            : `Guardar ${proyectos.length} proyectos en Firebase`}
                                    </Button>

                                    {eventoSeleccionado && !loading && (
                                        <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mt={1.5}>
                                            Se guardarán en el evento "{finalesDisponibles.find(f => f.id === eventoSeleccionado)?.nombre || eventoSeleccionado}"
                                        </Typography>
                                    )}
                                </Paper>
                            )}
                        </AccordionDetails>
                    </Accordion>

                    {/* Accordion: Gestionar Finales */}
                    <Accordion
                        expanded={accordionFinalesExpanded}
                        onChange={() => setAccordionFinalesExpanded(!accordionFinalesExpanded)}
                        sx={{
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            borderRadius: '10px !important',
                            '&:before': { display: 'none' },
                            overflow: 'hidden'
                        }}
                    >
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            sx={{
                                bgcolor: 'background.paper',
                                borderBottom: accordionFinalesExpanded ? '1px solid' : 'none',
                                borderColor: 'divider',
                                '& .MuiAccordionSummary-content': { my: 1.5 }
                            }}
                        >
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Box sx={{
                                    bgcolor: 'secondary.main',
                                    color: 'white',
                                    borderRadius: 2,
                                    width: 48,
                                    height: 48,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <SettingsIcon />
                                </Box>
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        Gestionar Finales
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {finalesDisponibles.length > 0
                                            ? `${finalesDisponibles.length} final${finalesDisponibles.length !== 1 ? 'es' : ''} configurada${finalesDisponibles.length !== 1 ? 's' : ''}`
                                            : 'Crea y administra las finales de cada año'
                                        }
                                    </Typography>
                                </Box>
                            </Stack>
                        </AccordionSummary>

                        <AccordionDetails sx={{ p: 3, bgcolor: 'grey.50' }}>
                            <Stack direction="row" spacing={2} mb={3}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<PlusIcon />}
                                    onClick={() => setDialogNuevaFinal(true)}
                                >
                                    Nueva Final
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    startIcon={<CopyIcon />}
                                    onClick={() => setDialogDuplicar(true)}
                                >
                                    Duplicar Año
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="inherit"
                                    onClick={cargarFinales}
                                    disabled={loadingFinales}
                                >
                                    {loadingFinales ? 'Cargando...' : 'Recargar'}
                                </Button>
                            </Stack>

                            {loadingFinales ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                    <LinearProgress sx={{ width: '50%' }} />
                                </Box>
                            ) : finalesDisponibles.length === 0 ? (
                                <Alert severity="info">
                                    No hay finales configuradas. Crea la primera haciendo clic en "Nueva Final".
                                </Alert>
                            ) : (
                                <TableContainer component={Paper}>
                                    <Table>
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: 'grey.100' }}>
                                                <TableCell sx={{ fontWeight: 700 }}>Nombre</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Año</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Tipo</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>Acciones</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {finalesDisponibles.map((final) => (
                                                <TableRow key={final.id} sx={{ '&:hover': { bgcolor: 'grey.50' } }}>
                                                    <TableCell sx={{ fontWeight: 600 }}>{final.nombre}</TableCell>
                                                    <TableCell>{final.anio}</TableCell>
                                                    <TableCell>
                                                        <Chip 
                                                            label={(final.tipo || 'Evaluacion') === 'Evaluacion' ? 'Evaluación' : 'Priorización'} 
                                                            size="small" 
                                                            color={(final.tipo || 'Evaluacion') === 'Evaluacion' ? 'primary' : 'secondary'}
                                                            variant="outlined"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: 'grey.200', px: 1, py: 0.5, borderRadius: 1 }}>
                                                            {final.id}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        {final.activa ? (
                                                            <Chip label="ACTIVA" color="success" size="small" />
                                                        ) : (
                                                            <Chip label="Inactiva" variant="outlined" size="small" />
                                                        )}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                            {!final.activa && (
                                                                <Button
                                                                    size="small"
                                                                    variant="outlined"
                                                                    color="success"
                                                                    onClick={() => marcarComoActiva(final.id)}
                                                                >
                                                                    Activar
                                                                </Button>
                                                            )}
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => eliminarFinal(final.id, final.nombre)}
                                                                disabled={final.activa}
                                                            >
                                                                <DeleteIcon />
                                                            </IconButton>
                                                        </Stack>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </AccordionDetails>
                    </Accordion>

                    {/* Accordion: Ponderación Calificaciones */}
                    <Accordion
                        expanded={accordionPonderacionesExpanded}
                        onChange={() => {
                            if (!accordionPonderacionesExpanded) {
                                cargarTodasLasPonderaciones();
                            }
                            setAccordionPonderacionesExpanded(!accordionPonderacionesExpanded);
                        }}
                        sx={{
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            borderRadius: '10px !important',
                            '&:before': { display: 'none' },
                            overflow: 'hidden'
                        }}
                    >
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            sx={{
                                bgcolor: 'background.paper',
                                borderBottom: accordionPonderacionesExpanded ? '1px solid' : 'none',
                                borderColor: 'divider',
                                '& .MuiAccordionSummary-content': { my: 1.5 }
                            }}
                        >
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Box sx={{
                                    bgcolor: 'info.main',
                                    color: 'white',
                                    borderRadius: 2,
                                    width: 48,
                                    height: 48,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Typography variant="h5" sx={{ fontWeight: 700 }}>%</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        Ponderación Calificaciones
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Configura el peso de cada criterio por categoría
                                    </Typography>
                                </Box>
                            </Stack>
                        </AccordionSummary>

                        <AccordionDetails sx={{ p: 3, bgcolor: 'grey.50' }}>
                            {loadingPonderaciones ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                    <LinearProgress sx={{ width: '50%' }} />
                                </Box>
                            ) : (
                                <Stack spacing={3}>
                                    {/* Chispeza */}
                                    <Paper sx={{ p: 3 }}>
                                        <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 600, color: '#ffc64c' }}>
                                            💡 Chispeza
                                        </Typography>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                                            <TextField
                                                label="DESAFÍO"
                                                type="number"
                                                value={ponderaciones['chispeza']?.DESAFIO || 0}
                                                onChange={(e) => actualizarPonderacion('chispeza', 'DESAFIO', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                            <TextField
                                                label="CREATIVIDAD"
                                                type="number"
                                                value={ponderaciones['chispeza']?.CREATIVIDAD || 0}
                                                onChange={(e) => actualizarPonderacion('chispeza', 'CREATIVIDAD', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                            <TextField
                                                label="IMPLEMENTABILIDAD"
                                                type="number"
                                                value={ponderaciones['chispeza']?.IMPLEMENTABILIDAD || 0}
                                                onChange={(e) => actualizarPonderacion('chispeza', 'IMPLEMENTABILIDAD', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                            <TextField
                                                label="ESCALABILIDAD"
                                                type="number"
                                                value={ponderaciones['chispeza']?.ESCALABILIDAD || 0}
                                                onChange={(e) => actualizarPonderacion('chispeza', 'ESCALABILIDAD', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                            <TextField
                                                label="IMPACTO"
                                                type="number"
                                                value={ponderaciones['chispeza']?.IMPACTO || 0}
                                                onChange={(e) => actualizarPonderacion('chispeza', 'IMPACTO', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 3 }}>
                                            <Typography variant="body2" sx={{ 
                                                color: calcularSumaPonderaciones('chispeza') === 100 ? '#ffc64c' : 'error.main',
                                                fontWeight: 600 
                                            }}>
                                                Total: {calcularSumaPonderaciones('chispeza')}% 
                                                {calcularSumaPonderaciones('chispeza') !== 100 && ' ⚠️ Debe sumar 100%'}
                                            </Typography>
                                            <Button 
                                                variant="contained" 
                                                size="small"
                                                onClick={() => guardarPonderacionesCategoria('chispeza')}
                                                disabled={calcularSumaPonderaciones('chispeza') !== 100 || loadingSaveCategoria === 'chispeza'}
                                                startIcon={loadingSaveCategoria === 'chispeza' ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
                                                sx={{
                                                    bgcolor: '#ffc64c',
                                                    color: '#000',
                                                    '&:hover': { bgcolor: '#e6b344' },
                                                    '&:disabled': { bgcolor: 'grey.300' }
                                                }}
                                            >
                                                {loadingSaveCategoria === 'chispeza' ? 'Guardando...' : 'Guardar'}
                                            </Button>
                                        </Box>
                                    </Paper>

                                    {/* Sandía Calá */}
                                    <Paper sx={{ p: 3 }}>
                                        <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 600, color: '#28aa1d' }}>
                                            🍉 Sandía Calá
                                        </Typography>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                                            <TextField
                                                label="DESAFÍO"
                                                type="number"
                                                value={ponderaciones['sandia-cala']?.DESAFIO || 0}
                                                onChange={(e) => actualizarPonderacion('sandia-cala', 'DESAFIO', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                            <TextField
                                                label="CREATIVIDAD"
                                                type="number"
                                                value={ponderaciones['sandia-cala']?.CREATIVIDAD || 0}
                                                onChange={(e) => actualizarPonderacion('sandia-cala', 'CREATIVIDAD', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                            <TextField
                                                label="IMPLEMENTABILIDAD"
                                                type="number"
                                                value={ponderaciones['sandia-cala']?.IMPLEMENTABILIDAD || 0}
                                                onChange={(e) => actualizarPonderacion('sandia-cala', 'IMPLEMENTABILIDAD', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                            <TextField
                                                label="ESCALABILIDAD"
                                                type="number"
                                                value={ponderaciones['sandia-cala']?.ESCALABILIDAD || 0}
                                                onChange={(e) => actualizarPonderacion('sandia-cala', 'ESCALABILIDAD', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                            <TextField
                                                label="EBITDA"
                                                type="number"
                                                value={ponderaciones['sandia-cala']?.EBITDA || 0}
                                                onChange={(e) => actualizarPonderacion('sandia-cala', 'EBITDA', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                            <TextField
                                                label="PRODUCTIVIDAD"
                                                type="number"
                                                value={ponderaciones['sandia-cala']?.PRODUCTIVIDAD || 0}
                                                onChange={(e) => actualizarPonderacion('sandia-cala', 'PRODUCTIVIDAD', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 3 }}>
                                            <Typography variant="body2" sx={{ 
                                                color: calcularSumaPonderaciones('sandia-cala') === 100 ? '#28aa1d' : 'error.main',
                                                fontWeight: 600 
                                            }}>
                                                Total: {calcularSumaPonderaciones('sandia-cala')}% 
                                                {calcularSumaPonderaciones('sandia-cala') !== 100 && ' ⚠️ Debe sumar 100%'}
                                            </Typography>
                                            <Button 
                                                variant="contained" 
                                                size="small"
                                                onClick={() => guardarPonderacionesCategoria('sandia-cala')}
                                                disabled={calcularSumaPonderaciones('sandia-cala') !== 100 || loadingSaveCategoria === 'sandia-cala'}
                                                startIcon={loadingSaveCategoria === 'sandia-cala' ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
                                                sx={{
                                                    bgcolor: '#28aa1d',
                                                    color: '#fff',
                                                    '&:hover': { bgcolor: '#22901a' },
                                                    '&:disabled': { bgcolor: 'grey.300' }
                                                }}
                                            >
                                                {loadingSaveCategoria === 'sandia-cala' ? 'Guardando...' : 'Guardar'}
                                            </Button>
                                        </Box>
                                    </Paper>

                                    {/* Mejora Continua */}
                                    <Paper sx={{ p: 3 }}>
                                        <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 600, color: '#a114c4' }}>
                                            📈 Mejora Continua
                                        </Typography>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                                            <TextField
                                                label="DESAFÍO"
                                                type="number"
                                                value={ponderaciones['mejora-continua']?.DESAFIO || 0}
                                                onChange={(e) => actualizarPonderacion('mejora-continua', 'DESAFIO', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                            <TextField
                                                label="CREATIVIDAD"
                                                type="number"
                                                value={ponderaciones['mejora-continua']?.CREATIVIDAD || 0}
                                                onChange={(e) => actualizarPonderacion('mejora-continua', 'CREATIVIDAD', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                            <TextField
                                                label="IMPLEMENTABILIDAD"
                                                type="number"
                                                value={ponderaciones['mejora-continua']?.IMPLEMENTABILIDAD || 0}
                                                onChange={(e) => actualizarPonderacion('mejora-continua', 'IMPLEMENTABILIDAD', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                            <TextField
                                                label="ESCALABILIDAD"
                                                type="number"
                                                value={ponderaciones['mejora-continua']?.ESCALABILIDAD || 0}
                                                onChange={(e) => actualizarPonderacion('mejora-continua', 'ESCALABILIDAD', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                            <TextField
                                                label="EBITDA"
                                                type="number"
                                                value={ponderaciones['mejora-continua']?.EBITDA || 0}
                                                onChange={(e) => actualizarPonderacion('mejora-continua', 'EBITDA', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                            <TextField
                                                label="PRODUCTIVIDAD"
                                                type="number"
                                                value={ponderaciones['mejora-continua']?.PRODUCTIVIDAD || 0}
                                                onChange={(e) => actualizarPonderacion('mejora-continua', 'PRODUCTIVIDAD', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 3 }}>
                                            <Typography variant="body2" sx={{ 
                                                color: calcularSumaPonderaciones('mejora-continua') === 100 ? '#a114c4' : 'error.main',
                                                fontWeight: 600 
                                            }}>
                                                Total: {calcularSumaPonderaciones('mejora-continua')}% 
                                                {calcularSumaPonderaciones('mejora-continua') !== 100 && ' ⚠️ Debe sumar 100%'}
                                            </Typography>
                                            <Button 
                                                variant="contained" 
                                                size="small"
                                                onClick={() => guardarPonderacionesCategoria('mejora-continua')}
                                                disabled={calcularSumaPonderaciones('mejora-continua') !== 100 || loadingSaveCategoria === 'mejora-continua'}
                                                startIcon={loadingSaveCategoria === 'mejora-continua' ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
                                                sx={{
                                                    bgcolor: '#a114c4',
                                                    color: '#fff',
                                                    '&:hover': { bgcolor: '#8a11a5' },
                                                    '&:disabled': { bgcolor: 'grey.300' }
                                                }}
                                            >
                                                {loadingSaveCategoria === 'mejora-continua' ? 'Guardando...' : 'Guardar'}
                                            </Button>
                                        </Box>
                                    </Paper>

                                    {/* Pinta Pa' Bueno */}
                                    <Paper sx={{ p: 3 }}>
                                        <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 600, color: '#f96703' }}>
                                            🖌️ Pinta Pa' Bueno
                                        </Typography>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                                            <TextField
                                                label="DESAFÍO"
                                                type="number"
                                                value={ponderaciones['pinta-pa-bueno']?.DESAFIO || 0}
                                                onChange={(e) => actualizarPonderacion('pinta-pa-bueno', 'DESAFIO', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                            <TextField
                                                label="CREATIVIDAD"
                                                type="number"
                                                value={ponderaciones['pinta-pa-bueno']?.CREATIVIDAD || 0}
                                                onChange={(e) => actualizarPonderacion('pinta-pa-bueno', 'CREATIVIDAD', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                            <TextField
                                                label="IMPLEMENTABILIDAD"
                                                type="number"
                                                value={ponderaciones['pinta-pa-bueno']?.IMPLEMENTABILIDAD || 0}
                                                onChange={(e) => actualizarPonderacion('pinta-pa-bueno', 'IMPLEMENTABILIDAD', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                            <TextField
                                                label="ESCALABILIDAD"
                                                type="number"
                                                value={ponderaciones['pinta-pa-bueno']?.ESCALABILIDAD || 0}
                                                onChange={(e) => actualizarPonderacion('pinta-pa-bueno', 'ESCALABILIDAD', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                            <TextField
                                                label="EBITDA"
                                                type="number"
                                                value={ponderaciones['pinta-pa-bueno']?.EBITDA || 0}
                                                onChange={(e) => actualizarPonderacion('pinta-pa-bueno', 'EBITDA', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                            <TextField
                                                label="PRODUCTIVIDAD"
                                                type="number"
                                                value={ponderaciones['pinta-pa-bueno']?.PRODUCTIVIDAD || 0}
                                                onChange={(e) => actualizarPonderacion('pinta-pa-bueno', 'PRODUCTIVIDAD', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 3 }}>
                                            <Typography variant="body2" sx={{ 
                                                color: calcularSumaPonderaciones('pinta-pa-bueno') === 100 ? '#f96703' : 'error.main',
                                                fontWeight: 600 
                                            }}>
                                                Total: {calcularSumaPonderaciones('pinta-pa-bueno')}% 
                                                {calcularSumaPonderaciones('pinta-pa-bueno') !== 100 && ' ⚠️ Debe sumar 100%'}
                                            </Typography>
                                            <Button 
                                                variant="contained" 
                                                size="small"
                                                onClick={() => guardarPonderacionesCategoria('pinta-pa-bueno')}
                                                disabled={calcularSumaPonderaciones('pinta-pa-bueno') !== 100 || loadingSaveCategoria === 'pinta-pa-bueno'}
                                                startIcon={loadingSaveCategoria === 'pinta-pa-bueno' ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
                                                sx={{
                                                    bgcolor: '#f96703',
                                                    color: '#fff',
                                                    '&:hover': { bgcolor: '#d95803' },
                                                    '&:disabled': { bgcolor: 'grey.300' }
                                                }}
                                            >
                                                {loadingSaveCategoria === 'pinta-pa-bueno' ? 'Guardando...' : 'Guardar'}
                                            </Button>
                                        </Box>
                                    </Paper>

                                    {/* Eureka */}
                                    <Paper sx={{ p: 3 }}>
                                        <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 600, color: '#2196f3' }}>
                                            👩🏻 Eureka
                                        </Typography>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                                            <TextField
                                                label="DESAFÍO"
                                                type="number"
                                                value={ponderaciones['eureka']?.DESAFIO || 0}
                                                onChange={(e) => actualizarPonderacion('eureka', 'DESAFIO', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                            <TextField
                                                label="CREATIVIDAD"
                                                type="number"
                                                value={ponderaciones['eureka']?.CREATIVIDAD || 0}
                                                onChange={(e) => actualizarPonderacion('eureka', 'CREATIVIDAD', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                            <TextField
                                                label="IMPLEMENTABILIDAD"
                                                type="number"
                                                value={ponderaciones['eureka']?.IMPLEMENTABILIDAD || 0}
                                                onChange={(e) => actualizarPonderacion('eureka', 'IMPLEMENTABILIDAD', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                            <TextField
                                                label="ESCALABILIDAD"
                                                type="number"
                                                value={ponderaciones['eureka']?.ESCALABILIDAD || 0}
                                                onChange={(e) => actualizarPonderacion('eureka', 'ESCALABILIDAD', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                            <TextField
                                                label="EBITDA"
                                                type="number"
                                                value={ponderaciones['eureka']?.EBITDA || 0}
                                                onChange={(e) => actualizarPonderacion('eureka', 'EBITDA', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                            <TextField
                                                label="PRODUCTIVIDAD"
                                                type="number"
                                                value={ponderaciones['eureka']?.PRODUCTIVIDAD || 0}
                                                onChange={(e) => actualizarPonderacion('eureka', 'PRODUCTIVIDAD', e.target.value)}
                                                InputProps={{ endAdornment: '%' }}
                                                inputProps={{ min: 0, max: 100 }}
                                                size="small"
                                            />
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 3 }}>
                                            <Typography variant="body2" sx={{ 
                                                color: calcularSumaPonderaciones('eureka') === 100 ? '#2196f3' : 'error.main',
                                                fontWeight: 600 
                                            }}>
                                                Total: {calcularSumaPonderaciones('eureka')}% 
                                                {calcularSumaPonderaciones('eureka') !== 100 && ' ⚠️ Debe sumar 100%'}
                                            </Typography>
                                            <Button 
                                                variant="contained" 
                                                size="small"
                                                onClick={() => guardarPonderacionesCategoria('eureka')}
                                                disabled={calcularSumaPonderaciones('eureka') !== 100 || loadingSaveCategoria === 'eureka'}
                                                startIcon={loadingSaveCategoria === 'eureka' ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null}
                                                sx={{
                                                    bgcolor: '#2196f3',
                                                    color: '#fff',
                                                    '&:hover': { bgcolor: '#1976d2' },
                                                    '&:disabled': { bgcolor: 'grey.300' }
                                                }}
                                            >
                                                {loadingSaveCategoria === 'eureka' ? 'Guardando...' : 'Guardar'}
                                            </Button>
                                        </Box>
                                    </Paper>
                                </Stack>
                            )}
                        </AccordionDetails>
                    </Accordion>

                    {/* Diálogo: Nueva Final */}
                    <Dialog open={dialogNuevaFinal} onClose={() => setDialogNuevaFinal(false)} maxWidth="sm" fullWidth>
                        <DialogTitle>Crear Nueva Final</DialogTitle>
                        <DialogContent>
                            <TextField
                                autoFocus
                                margin="dense"
                                label="Nombre de la Final"
                                fullWidth
                                value={nuevaFinalNombre}
                                onChange={(e) => setNuevaFinalNombre(e.target.value)}
                                placeholder="Ej: Final Ruta Innovación"
                                sx={{ mb: 2, mt: 1 }}
                            />
                            <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel>Año</InputLabel>
                                <Select
                                    value={nuevaFinalAnio}
                                    label="Año"
                                    onChange={(e) => setNuevaFinalAnio(e.target.value)}
                                >
                                    {aniosDisponibles.map((anio) => (
                                        <MenuItem key={anio} value={anio}>{anio}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth>
                                <InputLabel>Tipo de Final</InputLabel>
                                <Select
                                    value={nuevaFinalTipo}
                                    label="Tipo de Final"
                                    onChange={(e) => setNuevaFinalTipo(e.target.value)}
                                >
                                    <MenuItem value="Evaluacion">Evaluación</MenuItem>
                                    <MenuItem value="Priorizacion">Priorización</MenuItem>
                                </Select>
                            </FormControl>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDialogNuevaFinal(false)}>Cancelar</Button>
                            <Button onClick={crearNuevaFinal} variant="contained" color="primary">Crear</Button>
                        </DialogActions>
                    </Dialog>

                    {/* Diálogo: Duplicar Finales */}
                    <Dialog open={dialogDuplicar} onClose={() => setDialogDuplicar(false)} maxWidth="sm" fullWidth>
                        <DialogTitle>Duplicar Finales de un Año a Otro</DialogTitle>
                        <DialogContent>
                            <Alert severity="info" sx={{ mb: 3, mt: 1 }}>
                                Esto copiará todas las finales del año origen al año destino
                            </Alert>
                            <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel>Año Origen</InputLabel>
                                <Select
                                    value={anioOrigen}
                                    label="Año Origen"
                                    onChange={(e) => setAnioOrigen(e.target.value)}
                                >
                                    {aniosDisponibles.map((anio) => (
                                        <MenuItem key={anio} value={anio}>{anio}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth>
                                <InputLabel>Año Destino</InputLabel>
                                <Select
                                    value={anioDestino}
                                    label="Año Destino"
                                    onChange={(e) => setAnioDestino(e.target.value)}
                                >
                                    {aniosDisponibles.map((anio) => (
                                        <MenuItem key={anio} value={anio}>{anio}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDialogDuplicar(false)}>Cancelar</Button>
                            <Button onClick={duplicarFinales} variant="contained" color="primary">Duplicar</Button>
                        </DialogActions>
                    </Dialog>

                    {/* Diálogo: Confirmar Carga de Proyectos */}
                    <Dialog 
                        open={dialogConfirmarCarga} 
                        onClose={() => setDialogConfirmarCarga(false)} 
                        maxWidth="sm" 
                        fullWidth
                    >
                        <DialogTitle>
                            {proyectosExistentes > 0 ? '⚠️ Proyectos Existentes Detectados' : 'Confirmar Carga de Proyectos'}
                        </DialogTitle>
                        <DialogContent>
                            {proyectosExistentes > 0 ? (
                                <>
                                    <Alert severity="warning" sx={{ mb: 3, mt: 1 }}>
                                        Ya existen <strong>{proyectosExistentes} proyectos</strong> para esta final.
                                    </Alert>
                                    <Typography variant="body2" sx={{ mb: 2 }}>
                                        Vas a cargar <strong>{proyectos.length} proyectos</strong> desde el archivo Excel.
                                    </Typography>
                                    <Typography variant="body2" sx={{ mb: 2 }}>
                                        ¿Qué deseas hacer?
                                    </Typography>
                                    <Stack spacing={2}>
                                        <Paper 
                                            sx={{ 
                                                p: 2, 
                                                border: '2px solid', 
                                                borderColor: 'primary.main',
                                                bgcolor: 'primary.50',
                                                cursor: 'pointer',
                                                '&:hover': { bgcolor: 'primary.100' }
                                            }}
                                            onClick={() => confirmarCargaProyectos(true)}
                                        >
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                                                🔄 Reemplazar proyectos existentes
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Elimina los {proyectosExistentes} proyectos actuales y los reemplaza con los {proyectos.length} nuevos (útil para actualizar descripciones)
                                            </Typography>
                                        </Paper>
                                        <Paper 
                                            sx={{ 
                                                p: 2, 
                                                border: '2px solid', 
                                                borderColor: 'grey.300',
                                                cursor: 'pointer',
                                                '&:hover': { bgcolor: 'grey.50' }
                                            }}
                                            onClick={() => confirmarCargaProyectos(false)}
                                        >
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                                                ➕ Agregar como proyectos nuevos
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Mantiene los {proyectosExistentes} existentes y agrega {proyectos.length} más (puede crear duplicados)
                                            </Typography>
                                        </Paper>
                                    </Stack>
                                </>
                            ) : (
                                <>
                                    <Alert severity="success" sx={{ mb: 2, mt: 1 }}>
                                        No hay proyectos previos para esta final.
                                    </Alert>
                                    <Typography variant="body2">
                                        Se cargarán <strong>{proyectos.length} proyectos nuevos</strong> desde el archivo Excel.
                                    </Typography>
                                </>
                            )}
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDialogConfirmarCarga(false)}>
                                Cancelar
                            </Button>
                            {proyectosExistentes === 0 && (
                                <Button 
                                    onClick={() => confirmarCargaProyectos(false)} 
                                    variant="contained" 
                                    color="primary"
                                >
                                    Cargar Proyectos
                                </Button>
                            )}
                        </DialogActions>
                    </Dialog>

                </Box>
            </Box>

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
        </ThemeProvider>
    );
}
