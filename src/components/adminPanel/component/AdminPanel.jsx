import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Box, Button, Typography, Select, MenuItem, FormControl, InputLabel, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Alert, Stack, LinearProgress, ThemeProvider, CssBaseline, Accordion, AccordionSummary, AccordionDetails, TextField, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Snackbar, CircularProgress, Switch, FormControlLabel } from '@mui/material';

// Imports locales
import { theme } from '../const/theme';
import { UploadIcon, CheckIcon, PlusIcon, ExpandMoreIcon, SettingsIcon, DeleteIcon, CopyIcon, StepBadge } from '../components/Icons';
import { CategorySection } from '../components/CategorySection';
import { procesarArchivoExcel, validarArchivoExcel } from '../utils/fileProcessing';
import { descargarPlantillaFormato, descargarProyectosFirebase } from '../utils/downloadProjects';
import { cargarFinalesDesdeFirebase, crearFinalEnFirebase, duplicarFinalesEnFirebase, marcarFinalComoActiva, eliminarFinalDeFirebase, obtenerFinalActiva, inicializarFinalesPredeterminadas, guardarProyectosEnFirebase, eliminarProyectosPorFinal, obtenerProyectosPorFinal, obtenerPonderaciones, guardarPonderaciones, obtenerCategoriasPersonalizadas, guardarCategoriasPersonalizadas, obtenerJuecesDeProyectos, suscribirseEstadosJueces, cambiarEstadoVotacionJuez } from '../utils/firebaseOperations';

const CATEGORIAS_DEFECTO = [
    { id: 'chispeza',        nombre: 'Chispeza',        emoji: '💡', color: '#ffc64c', textColor: '#000' },
    { id: 'sandia-cala',     nombre: 'Sandía Calá',     emoji: '🍉', color: '#28aa1d', textColor: '#fff' },
    { id: 'mejora-continua', nombre: 'Mejora Continua', emoji: '📈', color: '#a114c4', textColor: '#fff' },
    { id: 'pinta-pa-bueno',  nombre: "Pinta Pa' Bueno", emoji: '🖌️', color: '#f96703', textColor: '#fff' },
    { id: 'eureka',          nombre: 'Eureka',          emoji: '👩🏻', color: '#2196f3', textColor: '#fff' },
];

const COLORES_PALETTE = [
    '#e53935','#d81b60','#8e24aa','#5e35b1','#3949ab','#1e88e5',
    '#039be5','#00acc1','#00897b','#43a047','#7cb342','#c0ca33',
    '#fdd835','#ffb300','#fb8c00','#f4511e','#6d4c41','#546e7a',
];

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
    const [criteriosTipo, setCriteriosTipo] = useState({
        'chispeza': { DESAFIO: 'numeric', CREATIVIDAD: 'numeric', IMPLEMENTABILIDAD: 'numeric', ESCALABILIDAD: 'numeric', IMPACTO: 'numeric' },
        'sandia-cala': { DESAFIO: 'numeric', CREATIVIDAD: 'numeric', IMPLEMENTABILIDAD: 'numeric', ESCALABILIDAD: 'numeric', EBITDA: 'numeric', PRODUCTIVIDAD: 'numeric' },
        'mejora-continua': { DESAFIO: 'numeric', CREATIVIDAD: 'numeric', IMPLEMENTABILIDAD: 'numeric', ESCALABILIDAD: 'numeric', EBITDA: 'numeric', PRODUCTIVIDAD: 'numeric' },
        'pinta-pa-bueno': { DESAFIO: 'numeric', CREATIVIDAD: 'numeric', IMPLEMENTABILIDAD: 'numeric', ESCALABILIDAD: 'numeric', EBITDA: 'numeric', PRODUCTIVIDAD: 'numeric' },
        'eureka': { DESAFIO: 'numeric', CREATIVIDAD: 'numeric', IMPLEMENTABILIDAD: 'numeric', ESCALABILIDAD: 'numeric', EBITDA: 'numeric', PRODUCTIVIDAD: 'numeric' }
    });
    const [loadingPonderaciones, setLoadingPonderaciones] = useState(false);
    const [loadingSaveCategoria, setLoadingSaveCategoria] = useState(null); // Track qué categoría se está guardando
    const [nuevoCriterioNombre, setNuevoCriterioNombre] = useState({});
    const [categoriasConfig, setCategoriasConfig] = useState(CATEGORIAS_DEFECTO);
    const [nuevaCategoria, setNuevaCategoria] = useState({ nombre: '', color: '#1e88e5', emoji: '🏷️' });
    const [loadingCrearCategoria, setLoadingCrearCategoria] = useState(false);
    const [feedbackConfig, setFeedbackConfig] = useState({}); // Config de feedback por categoría

    // Estados para Gestionar Jueces
    const [accordionJuecesExpanded, setAccordionJuecesExpanded] = useState(false);
    const [finalSeleccionadaJueces, setFinalSeleccionadaJueces] = useState('');
    const [juecesDisponibles, setJuecesDisponibles] = useState([]);
    const [estadosJueces, setEstadosJueces] = useState({});
    const [loadingJueces, setLoadingJueces] = useState(false);

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

    // Handlers para descarga de archivos
    const handleDescargarPlantilla = () => {
        descargarPlantillaFormato();
        mostrarNotificacion('Plantilla descargada correctamente', 'success');
    };

    const handleDescargarProyectosFirebase = () => {
        if (proyectosGuardados.length === 0) {
            mostrarNotificacion('No hay proyectos para descargar', 'warning');
            return;
        }

        const finalNombre = finalesDisponibles.find(f => f.id === eventoSeleccionado)?.nombre || 'proyectos';
        const exito = descargarProyectosFirebase(proyectosGuardados, finalNombre);
        
        if (exito) {
            mostrarNotificacion(`✅ ${proyectosGuardados.length} proyectos descargados correctamente`, 'success');
        } else {
            mostrarNotificacion('Error al descargar proyectos', 'error');
        }
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
    const cargarTodasLasPonderaciones = async (cats) => {
        setLoadingPonderaciones(true);
        try {
            const lista = cats || categoriasConfig;
            const nuevasPonderaciones = {};
            const nuevoFeedbackConfig = {};
            const nuevosCriteriosTipo = {};
            for (const cat of lista) {
                const data = await obtenerPonderaciones(cat.id);
                // Separar ponderaciones de config feedback y tipos
                const { feedbackEnabled, feedbackRequired, criteriosTipo, ...ponderacionesLimpias } = data;
                nuevasPonderaciones[cat.id] = ponderacionesLimpias;
                nuevoFeedbackConfig[cat.id] = {
                    enabled: feedbackEnabled || false,
                    required: feedbackRequired || false
                };
                // Cargar tipos, si no existen asignar 'numeric' por defecto
                const tiposParaCategoria = {};
                Object.keys(ponderacionesLimpias).forEach(campo => {
                    tiposParaCategoria[campo] = criteriosTipo?.[campo] || 'numeric';
                });
                nuevosCriteriosTipo[cat.id] = tiposParaCategoria;
            }
            setPonderaciones(nuevasPonderaciones);
            setFeedbackConfig(nuevoFeedbackConfig);
            setCriteriosTipo(nuevosCriteriosTipo);
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
        if (!pond) return 0;
        return Object.values(pond).reduce((sum, val) => sum + (Number(val) || 0), 0);
    };

    const guardarPonderacionesCategoria = async (categoria) => {
        const suma = calcularSumaPonderaciones(categoria);
        
        if (suma !== 100) {
            mostrarNotificacion(`La suma debe ser 100%. Actualmente es ${suma}%`, 'error');
            return;
        }

        setLoadingSaveCategoria(categoria);
        try {
            const feedback = feedbackConfig[categoria] || { enabled: false, required: false };
            const tipos = criteriosTipo[categoria] || {};
            const dataToSave = {
                ...ponderaciones[categoria],
                feedbackEnabled: feedback.enabled,
                feedbackRequired: feedback.required,
                criteriosTipo: tipos
            };
            await guardarPonderaciones(categoria, dataToSave);
            mostrarNotificacion('Ponderaciones y configuración guardadas correctamente', 'success');
        } catch (error) {
            mostrarNotificacion(error.message, 'error');
        } finally {
            setLoadingSaveCategoria(null);
        }
    };

    const actualizarFeedbackConfig = (categoria, field, value) => {
        setFeedbackConfig(prev => ({
            ...prev,
            [categoria]: {
                ...prev[categoria],
                [field]: value
            }
        }));
    };

    const agregarCriterio = (categoria, nombre) => {
        const nombreLimpio = nombre.trim().toUpperCase();
        if (!nombreLimpio || ponderaciones[categoria]?.[nombreLimpio] !== undefined) return;
        setPonderaciones(prev => ({
            ...prev,
            [categoria]: { ...prev[categoria], [nombreLimpio]: 0 }
        }));
        setCriteriosTipo(prev => ({
            ...prev,
            [categoria]: { ...prev[categoria], [nombreLimpio]: 'numeric' }
        }));
        setNuevoCriterioNombre(prev => ({ ...prev, [categoria]: '' }));
    };

    const eliminarCriterio = (categoria, nombre) => {
        if (Object.keys(ponderaciones[categoria] || {}).length <= 1) return;
        const { [nombre]: _, ...resto } = ponderaciones[categoria];
        const { [nombre]: __, ...restoTipos } = criteriosTipo[categoria] || {};
        setPonderaciones(prev => ({ ...prev, [categoria]: resto }));
        setCriteriosTipo(prev => ({ ...prev, [categoria]: restoTipos }));
    };

    const actualizarTipoCriterio = (categoria, campo, tipo) => {
        setCriteriosTipo(prev => ({
            ...prev,
            [categoria]: {
                ...(prev[categoria] || {}),
                [campo]: tipo
            }
        }));
    };

    const calcularTextColor = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#000' : '#fff';
    };

    const generarId = (nombre) =>
        nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
            .replace(/[\s']+/g, '-').replace(/[^a-z0-9-]/g, '');

    const inicializarPanel = async () => {
        let cats = CATEGORIAS_DEFECTO;
        try {
            const personalizadas = await obtenerCategoriasPersonalizadas();
            if (personalizadas.length > 0) {
                const idsDefecto = new Set(CATEGORIAS_DEFECTO.map(c => c.id));
                const soloNuevas = personalizadas.filter(c => !idsDefecto.has(c.id));
                cats = [...CATEGORIAS_DEFECTO, ...soloNuevas];
                setCategoriasConfig(cats);
            }
        } catch (_) {}
        cargarTodasLasPonderaciones(cats);
    };

    const crearCategoria = async () => {
        const nombre = nuevaCategoria.nombre.trim();
        if (!nombre) return;

        const id = generarId(nombre);
        if (categoriasConfig.some(c => c.id === id)) {
            mostrarNotificacion('Ya existe una categoría con ese nombre', 'error');
            return;
        }

        const nuevaCat = {
            id,
            nombre,
            emoji: nuevaCategoria.emoji.trim() || '🏷️',
            color: nuevaCategoria.color,
            textColor: calcularTextColor(nuevaCategoria.color),
        };

        setLoadingCrearCategoria(true);
        try {
            const idsDefecto = new Set(CATEGORIAS_DEFECTO.map(c => c.id));
            const personalizadasActuales = categoriasConfig.filter(c => !idsDefecto.has(c.id));
            await guardarCategoriasPersonalizadas([...personalizadasActuales, nuevaCat]);

            const nuevasCategorias = [...categoriasConfig, nuevaCat];
            setCategoriasConfig(nuevasCategorias);
            setPonderaciones(prev => ({ ...prev, [id]: {} }));
            setNuevaCategoria({ nombre: '', color: '#1e88e5', emoji: '🏷️' });
            mostrarNotificacion(`Categoría "${nombre}" creada exitosamente`, 'success');
        } catch (error) {
            mostrarNotificacion('Error al crear la categoría', 'error');
        } finally {
            setLoadingCrearCategoria(false);
        }
    };

    // Funciones para gestionar jueces
    const cargarJuecesDeProyectos = async (finalId) => {
        if (!finalId) {
            setJuecesDisponibles([]);
            return;
        }

        setLoadingJueces(true);
        try {
            // Cargar jueces únicos de los proyectos
            const jueces = await obtenerJuecesDeProyectos(finalId);
            setJuecesDisponibles(jueces);
        } catch (error) {
            mostrarNotificacion('Error al cargar jueces', 'error');
        } finally {
            setLoadingJueces(false);
        }
    };

    const toggleEstadoJuez = async (nombreJuez) => {
        if (!finalSeleccionadaJueces) return;

        try {
            const estadoActual = estadosJueces[nombreJuez];
            const estadoVotacion = estadoActual?.estado || 'pendiente';
            
            // Si está "evaluando", cambiarlo a "pendiente"
            // Si está "pendiente" o "completado", cambiarlo a "evaluando"
            const nuevoEstado = estadoVotacion === 'evaluando' ? 'pendiente' : 'evaluando';

            await cambiarEstadoVotacionJuez(finalSeleccionadaJueces, nombreJuez, nuevoEstado);
            
            // No necesitamos actualizar el estado local, la suscripción en tiempo real lo hará automáticamente
            
            const mensaje = nuevoEstado === 'evaluando' 
                ? `${nombreJuez} marcado como "Votando"` 
                : `${nombreJuez} puede volver a votar`;
            
            mostrarNotificacion(mensaje, 'success');
        } catch (error) {
            mostrarNotificacion(error.message, 'error');
        }
    };

    // Cargar finales y final activa al montar el componente
    useEffect(() => {
        cargarFinales();
        cargarFinalActiva();
        inicializarPanel();
    }, []);

    // Ajustar el año del filtro cuando cambia la final activa
    useEffect(() => {
        if (finalActivaId && finalesDisponibles.length > 0) {
            const finalActiva = finalesDisponibles.find(f => f.id === finalActivaId);
            if (finalActiva) {
                // Actualizar año si es diferente
                if (finalActiva.anio !== anioFiltroFinalActiva) {
                    setAnioFiltroFinalActiva(finalActiva.anio);
                }
                // Actualizar tipo de final si es diferente
                const tipoFinal = finalActiva.tipo || 'Evaluacion';
                if (tipoFinal !== tipoFinalFiltro) {
                    setTipoFinalFiltro(tipoFinal);
                }
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

    // Cargar lista de jueces cuando cambia la final seleccionada para gestión de jueces
    useEffect(() => {
        if (finalSeleccionadaJueces) {
            cargarJuecesDeProyectos(finalSeleccionadaJueces);
        } else {
            setJuecesDisponibles([]);
        }
    }, [finalSeleccionadaJueces]);

    // Suscripción en tiempo real a los estados de jueces
    useEffect(() => {
        if (!finalSeleccionadaJueces) {
            setEstadosJueces({});
            return;
        }

        // Suscribirse a cambios en tiempo real
        const unsubscribe = suscribirseEstadosJueces(finalSeleccionadaJueces, (estados) => {
            const estadosMap = {};
            estados.forEach(estado => {
                estadosMap[estado.nombre] = estado;
            });
            setEstadosJueces(estadosMap);
        });

        // Limpiar suscripción al desmontar
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [finalSeleccionadaJueces]);

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

                    {/* Información sobre URLs de acceso */}
                    <Alert severity="info" icon={<CheckIcon />} sx={{ mb: 3, borderRadius: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                            🔗 Acceso Simultáneo por URL
                        </Typography>
                        <Typography variant="body2">
                            Cada final tiene su propia URL única. Múltiples finales pueden funcionar simultáneamente sin conflictos. 
                            Encuentra las URLs en la sección "Gestionar Finales" más abajo.
                        </Typography>
                    </Alert>

                    {/* Acceso Rápido a Finales */}
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" mb={1} sx={{ fontWeight: 600 }}>
                            🚀 Acceso Rápido a Finales
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
                                        >
                                            <MenuItem value="Evaluacion">Evaluación</MenuItem>
                                            <MenuItem value="Priorizacion">Priorización</MenuItem>
                                        </Select>
                                    </FormControl>

                                    {/* Selector de Final */}
                                    <FormControl fullWidth>
                                        <InputLabel>Selecciona una final</InputLabel>
                                        <Select
                                            value={finalActivaId}
                                            label="Selecciona una final"
                                            onChange={e => setFinalActivaId(e.target.value)}
                                            sx={{ borderRadius: 2 }}
                                            disabled={finalesFiltradas.length === 0}
                                        >
                                            {finalesFiltradas.map((final) => (
                                                <MenuItem key={final.id} value={final.id}>
                                                    {final.nombre}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Stack>

                                {finalActivaId && (
                                    <Stack spacing={2} sx={{ mt: 2 }}>
                                        <Alert severity="info" icon={<CheckIcon />} sx={{ borderRadius: 2 }}>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <span>URL seleccionada:</span>
                                                <Typography component="span" sx={{ fontFamily: 'monospace', fontWeight: 600, color: 'primary.main' }}>
                                                    {window.location.origin}/{finalActivaId}
                                                </Typography>
                                            </Stack>
                                        </Alert>
                                        <Stack direction="row" spacing={2}>
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                size="large"
                                                fullWidth
                                                onClick={() => window.open(`/${finalActivaId}`, '_blank')}
                                                sx={{ 
                                                    py: 1.5,
                                                    fontSize: 15,
                                                    fontWeight: 600,
                                                    borderRadius: 2,
                                                    boxShadow: '0 4px 14px rgba(46,125,50,0.3)'
                                                }}
                                            >
                                                🚀 Abrir en Nueva Pestaña
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                color="primary"
                                                size="large"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(`${window.location.origin}/${finalActivaId}`);
                                                    mostrarNotificacion('URL copiada al portapapeles', 'success');
                                                }}
                                                sx={{ 
                                                    py: 1.5,
                                                    minWidth: 150,
                                                    borderRadius: 2
                                                }}
                                            >
                                                📋 Copiar URL
                                            </Button>
                                        </Stack>
                                    </Stack>
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
                                            onClick={handleDescargarPlantilla} 
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
                                        {proyectosGuardados.length > 0 && (
                                            <Button
                                                variant="outlined"
                                                color="primary"
                                                size="small"
                                                onClick={handleDescargarProyectosFirebase}
                                                sx={{ 
                                                    borderRadius: 2, 
                                                    textTransform: 'none',
                                                    fontWeight: 600,
                                                    px: 2
                                                }}
                                            >
                                                📥 Descargar Base de Proyectos
                                            </Button>
                                        )}
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
                                            ? `${finalesDisponibles.length} final${finalesDisponibles.length !== 1 ? 'es' : ''} configurada${finalesDisponibles.length !== 1 ? 's' : ''} • Cada una con su URL única`
                                            : 'Crea finales - cada una tendrá su propia URL de acceso'
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
                                                <TableCell sx={{ fontWeight: 700 }}>URL de Acceso</TableCell>
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
                                                        <Stack direction="row" alignItems="center" spacing={1}>
                                                            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
                                                                {window.location.origin}/{final.id}
                                                            </Typography>
                                                            <IconButton
                                                                size="small"
                                                                color="primary"
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(`${window.location.origin}/${final.id}`);
                                                                    mostrarNotificacion('URL copiada al portapapeles', 'success');
                                                                }}
                                                                title="Copiar URL"
                                                            >
                                                                <CopyIcon sx={{ fontSize: 16 }} />
                                                            </IconButton>
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => eliminarFinal(final.id, final.nombre)}
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
                                    {categoriasConfig.map(cat => {
                                        const criterios = ponderaciones[cat.id] || {};
                                        const suma = calcularSumaPonderaciones(cat.id);
                                        return (
                                            <Paper key={cat.id} sx={{ p: 3 }}>
                                                <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 600, color: cat.color }}>
                                                    {cat.emoji} {cat.nombre}
                                                </Typography>

                                                {/* Criterios existentes */}
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                    {Object.entries(criterios).map(([campo, valor]) => {
                                                        const tipoCampo = criteriosTipo[cat.id]?.[campo] || 'numeric';
                                                        return (
                                                            <Box key={campo} sx={{ 
                                                                display: 'flex', 
                                                                gap: 1.5, 
                                                                alignItems: 'center',
                                                                p: 2,
                                                                bgcolor: '#fafafa',
                                                                borderRadius: 2,
                                                                border: '1px solid #e0e0e0'
                                                            }}>
                                                                <Typography 
                                                                    sx={{ 
                                                                        minWidth: 150, 
                                                                        fontWeight: 600,
                                                                        color: cat.color,
                                                                        fontSize: 14
                                                                    }}
                                                                >
                                                                    {campo}
                                                                </Typography>
                                                                <FormControl size="small" sx={{ minWidth: 140 }}>
                                                                    <InputLabel>Tipo</InputLabel>
                                                                    <Select
                                                                        value={tipoCampo}
                                                                        onChange={(e) => actualizarTipoCriterio(cat.id, campo, e.target.value)}
                                                                        label="Tipo"
                                                                    >
                                                                        <MenuItem value="numeric">🔢 Numérico (1-5)</MenuItem>
                                                                        <MenuItem value="boolean">✓ Sí / No</MenuItem>
                                                                    </Select>
                                                                </FormControl>
                                                                <TextField
                                                                    label="Peso"
                                                                    type="number"
                                                                    value={valor}
                                                                    onChange={(e) => actualizarPonderacion(cat.id, campo, e.target.value)}
                                                                    InputProps={{ endAdornment: '%' }}
                                                                    inputProps={{ min: 0, max: 100 }}
                                                                    size="small"
                                                                    sx={{ width: 100 }}
                                                                />
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => eliminarCriterio(cat.id, campo)}
                                                                    disabled={Object.keys(criterios).length <= 1}
                                                                    sx={{ color: 'error.main', flexShrink: 0 }}
                                                                >
                                                                    <DeleteIcon fontSize="small" />
                                                                </IconButton>
                                                            </Box>
                                                        );
                                                    })}
                                                </Box>

                                                {/* Agregar nuevo criterio */}
                                                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                                                    <TextField
                                                        label="Nuevo criterio"
                                                        size="small"
                                                        value={nuevoCriterioNombre[cat.id] || ''}
                                                        onChange={(e) => setNuevoCriterioNombre(prev => ({ ...prev, [cat.id]: e.target.value }))}
                                                        onKeyDown={(e) => e.key === 'Enter' && agregarCriterio(cat.id, nuevoCriterioNombre[cat.id] || '')}
                                                        placeholder="Ej: RENTABILIDAD"
                                                        sx={{ flex: 1 }}
                                                    />
                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        onClick={() => agregarCriterio(cat.id, nuevoCriterioNombre[cat.id] || '')}
                                                        disabled={!nuevoCriterioNombre[cat.id]?.trim()}
                                                        startIcon={<PlusIcon />}
                                                        sx={{ flexShrink: 0 }}
                                                    >
                                                        Agregar
                                                    </Button>
                                                </Box>

                                                {/* Total y guardar */}
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 3 }}>
                                                    <Typography variant="body2" sx={{
                                                        color: suma === 100 ? cat.color : 'error.main',
                                                        fontWeight: 600
                                                    }}>
                                                        Total: {suma}%
                                                        {suma !== 100 && ' ⚠️ Debe sumar 100%'}
                                                    </Typography>
                                                    <Button
                                                        variant="contained"
                                                        size="small"
                                                        onClick={() => guardarPonderacionesCategoria(cat.id)}
                                                        disabled={suma !== 100 || loadingSaveCategoria === cat.id}
                                                        startIcon={loadingSaveCategoria === cat.id ? <CircularProgress size={16} sx={{ color: cat.textColor }} /> : null}
                                                        sx={{
                                                            bgcolor: cat.color,
                                                            color: cat.textColor,
                                                            '&:hover': { bgcolor: cat.color, filter: 'brightness(0.9)' },
                                                            '&:disabled': { bgcolor: 'grey.300' }
                                                        }}
                                                    >
                                                        {loadingSaveCategoria === cat.id ? 'Guardando...' : 'Guardar'}
                                                    </Button>
                                                </Box>

                                                {/* Configuración de Feedback */}
                                                <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                                    <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                                                        📝 Configuración de Feedback
                                                    </Typography>
                                                    <Stack spacing={1.5}>
                                                        <FormControlLabel
                                                            control={
                                                                <Switch
                                                                    checked={feedbackConfig[cat.id]?.enabled || false}
                                                                    onChange={(e) => actualizarFeedbackConfig(cat.id, 'enabled', e.target.checked)}
                                                                    color="primary"
                                                                />
                                                            }
                                                            label={
                                                                <Box>
                                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                                        ¿Habilitar Feedback?
                                                                    </Typography>
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        Los jueces podrán agregar comentarios en la evaluación
                                                                    </Typography>
                                                                </Box>
                                                            }
                                                        />
                                                        {feedbackConfig[cat.id]?.enabled && (
                                                            <Box sx={{ pl: 4, py: 1, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                                                                <FormControlLabel
                                                                    control={
                                                                        <Switch
                                                                            checked={feedbackConfig[cat.id]?.required || false}
                                                                            onChange={(e) => actualizarFeedbackConfig(cat.id, 'required', e.target.checked)}
                                                                            color="warning"
                                                                        />
                                                                    }
                                                                    label={
                                                                        <Box>
                                                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                                                {feedbackConfig[cat.id]?.required ? '🔒 Obligatorio' : '⭕ Opcional'}
                                                                            </Typography>
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                {feedbackConfig[cat.id]?.required 
                                                                                    ? 'Los jueces deben completar el feedback para enviar'
                                                                                    : 'Los jueces pueden omitir el feedback'}
                                                                            </Typography>
                                                                        </Box>
                                                                    }
                                                                />
                                                            </Box>
                                                        )}
                                                    </Stack>
                                                </Box>
                                            </Paper>
                                        );
                                    })}

                                    {/* Formulario: Nueva Categoría */}
                                    <Paper sx={{ p: 3, border: '2px dashed', borderColor: 'divider' }}>
                                        <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 600, color: 'text.secondary' }}>
                                            ➕ Nueva Categoría
                                        </Typography>

                                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
                                            <TextField
                                                label="Nombre de la categoría"
                                                size="small"
                                                value={nuevaCategoria.nombre}
                                                onChange={(e) => setNuevaCategoria(prev => ({ ...prev, nombre: e.target.value }))}
                                                placeholder="Ej: Innovación Sostenible"
                                                fullWidth
                                            />
                                            <TextField
                                                label="Emoji"
                                                size="small"
                                                value={nuevaCategoria.emoji}
                                                onChange={(e) => setNuevaCategoria(prev => ({ ...prev, emoji: e.target.value }))}
                                                placeholder="🏷️"
                                                inputProps={{ maxLength: 4 }}
                                                sx={{ maxWidth: 120 }}
                                            />
                                        </Box>

                                        {/* Paleta de colores */}
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                            Color de la categoría
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                                            {COLORES_PALETTE.map(color => (
                                                <Box
                                                    key={color}
                                                    onClick={() => setNuevaCategoria(prev => ({ ...prev, color }))}
                                                    sx={{
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: '50%',
                                                        bgcolor: color,
                                                        cursor: 'pointer',
                                                        border: nuevaCategoria.color === color ? '3px solid #000' : '3px solid transparent',
                                                        outline: nuevaCategoria.color === color ? '2px solid' : 'none',
                                                        outlineColor: color,
                                                        outlineOffset: 2,
                                                        transition: 'transform 0.15s',
                                                        '&:hover': { transform: 'scale(1.2)' }
                                                    }}
                                                />
                                            ))}
                                        </Box>

                                        {/* Preview */}
                                        {nuevaCategoria.nombre.trim() && (
                                            <Box sx={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                px: 2,
                                                py: 0.75,
                                                borderRadius: 2,
                                                bgcolor: nuevaCategoria.color,
                                                color: calcularTextColor(nuevaCategoria.color),
                                                mb: 2,
                                                fontWeight: 600,
                                                fontSize: 14
                                            }}>
                                                {nuevaCategoria.emoji} {nuevaCategoria.nombre.trim()}
                                            </Box>
                                        )}

                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <Button
                                                variant="contained"
                                                onClick={crearCategoria}
                                                disabled={!nuevaCategoria.nombre.trim() || loadingCrearCategoria}
                                                startIcon={loadingCrearCategoria ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <PlusIcon />}
                                                sx={{ bgcolor: nuevaCategoria.color, color: calcularTextColor(nuevaCategoria.color), '&:hover': { filter: 'brightness(0.9)', bgcolor: nuevaCategoria.color }, '&:disabled': { bgcolor: 'grey.300' } }}
                                            >
                                                {loadingCrearCategoria ? 'Creando...' : 'Crear Categoría'}
                                            </Button>
                                        </Box>
                                    </Paper>
                                </Stack>
                            )}
                        </AccordionDetails>
                    </Accordion>

                    {/* Accordion: Gestionar Jueces */}
                    <Accordion
                        expanded={accordionJuecesExpanded}
                        onChange={() => {
                            setAccordionJuecesExpanded(!accordionJuecesExpanded);
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
                                borderBottom: accordionJuecesExpanded ? '1px solid' : 'none',
                                borderColor: 'divider',
                                '& .MuiAccordionSummary-content': { my: 1.5 }
                            }}
                        >
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Box sx={{
                                    bgcolor: 'warning.main',
                                    color: 'white',
                                    borderRadius: 2,
                                    width: 48,
                                    height: 48,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Typography variant="h5" sx={{ fontWeight: 700 }}>👤</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        Gestionar Jueces
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Habilita o deshabilita jueces por final
                                    </Typography>
                                </Box>
                            </Stack>
                        </AccordionSummary>

                        <AccordionDetails sx={{ p: 3, bgcolor: 'grey.50' }}>
                            {/* Selector de Final */}
                            <Paper sx={{ p: 3, mb: 3 }}>
                                <Typography variant="h6" mb={2.5} sx={{ fontWeight: 600 }}>
                                    Selecciona una Final
                                </Typography>
                                <FormControl fullWidth>
                                    <InputLabel>Final</InputLabel>
                                    <Select
                                        value={finalSeleccionadaJueces}
                                        label="Final"
                                        onChange={e => setFinalSeleccionadaJueces(e.target.value)}
                                        sx={{ borderRadius: 2 }}
                                        disabled={finalesDisponibles.length === 0}
                                    >
                                        {finalesDisponibles.map((final) => (
                                            <MenuItem key={final.id} value={final.id}>
                                                {final.nombre} {final.anio} ({(final.tipo || 'Evaluacion') === 'Evaluacion' ? 'Evaluación' : 'Priorización'})
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                {finalSeleccionadaJueces && (
                                    <Alert severity="info" icon={<CheckIcon />} sx={{ mt: 2, borderRadius: 2 }}>
                                        <span>Gestionando jueces para: <strong>{finalesDisponibles.find(f => f.id === finalSeleccionadaJueces)?.nombre || ''} {finalesDisponibles.find(f => f.id === finalSeleccionadaJueces)?.anio || ''}</strong></span>
                                    </Alert>
                                )}
                            </Paper>

                            {/* Lista de Jueces */}
                            {finalSeleccionadaJueces && (
                                <Paper sx={{ p: 3 }}>
                                    <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                            Lista de Jueces
                                        </Typography>
                                        <Box sx={{ flex: 1 }} />
                                        {loadingJueces && <CircularProgress size={20} />}
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => cargarJuecesDeProyectos(finalSeleccionadaJueces)}
                                            disabled={loadingJueces}
                                        >
                                            {loadingJueces ? 'Cargando...' : 'Recargar'}
                                        </Button>
                                    </Stack>

                                    {loadingJueces ? (
                                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                            <LinearProgress sx={{ width: '50%' }} />
                                        </Box>
                                    ) : juecesDisponibles.length === 0 ? (
                                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                                            No se encontraron jueces para esta final. Asegúrate de haber cargado proyectos con jueces asignados.
                                        </Alert>
                                    ) : (
                                        <>
                                            <Alert severity="info" icon={<CheckIcon />} sx={{ mb: 2, borderRadius: 2 }}>
                                                <span>Se encontraron <strong>{juecesDisponibles.length} jueces</strong> en esta final</span>
                                            </Alert>

                                            <TableContainer component={Paper} sx={{ mt: 2 }}>
                                                <Table>
                                                    <TableHead>
                                                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                                                            <TableCell sx={{ fontWeight: 700 }}>Juez</TableCell>
                                                            <TableCell sx={{ fontWeight: 700 }}>Estado de Votación</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 700 }}>Control</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {juecesDisponibles.map((juez) => {
                                                            const estado = estadosJueces[juez];
                                                            const estadoVotacion = estado?.estado || 'pendiente';
                                                            const estaVotando = estadoVotacion === 'evaluando';
                                                            const estaCompletado = estadoVotacion === 'completado';
                                                            
                                                            return (
                                                                <TableRow 
                                                                    key={juez} 
                                                                    sx={{ 
                                                                        '&:hover': { bgcolor: 'grey.50' },
                                                                        opacity: estaVotando ? 0.6 : 1,
                                                                        bgcolor: estaVotando ? 'grey.100' : 'inherit'
                                                                    }}
                                                                >
                                                                    <TableCell 
                                                                        sx={{ 
                                                                            fontWeight: 600,
                                                                            color: estaVotando ? 'text.disabled' : 'text.primary'
                                                                        }}
                                                                    >
                                                                        {juez}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Stack direction="row" spacing={1} alignItems="center">
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
                                                                            />
                                                                            {estaVotando && (
                                                                                <Typography variant="caption" color="error.main" sx={{ fontWeight: 600 }}>
                                                                                    🚫 Bloqueado
                                                                                </Typography>
                                                                            )}
                                                                        </Stack>
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        {estaCompletado ? (
                                                                            <Chip 
                                                                                label="✓ Evaluación Completa" 
                                                                                size="small" 
                                                                                color="success" 
                                                                                variant="outlined"
                                                                            />
                                                                        ) : (
                                                                            <FormControlLabel
                                                                                control={
                                                                                    <Switch 
                                                                                        checked={estaVotando}
                                                                                        onChange={() => toggleEstadoJuez(juez)}
                                                                                        color={estaVotando ? 'warning' : 'success'}
                                                                                    />
                                                                                }
                                                                                label={estaVotando ? 'Cambiar a Pendiente' : 'Marcar como Votando'}
                                                                                labelPlacement="start"
                                                                                sx={{
                                                                                    '& .MuiFormControlLabel-label': {
                                                                                        fontSize: 13,
                                                                                        fontWeight: 600,
                                                                                        color: estaVotando ? 'warning.main' : 'success.main'
                                                                                    }
                                                                                }}
                                                                            />
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>

                                            <Alert severity="warning" icon="⚠️" sx={{ mt: 3, borderRadius: 2 }}>
                                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                                    ¿Cómo funciona?
                                                </Typography>
                                                <Typography variant="body2">
                                                    • Cuando un juez entra a votar, automáticamente se marca como <strong>"Votando"</strong>.
                                                </Typography>
                                                <Typography variant="body2">
                                                    • Si cierra la página sin completar, queda bloqueado en estado "Votando".
                                                </Typography>
                                                <Typography variant="body2">
                                                    • Usa el switch para cambiar de <strong>"Votando"</strong> a <strong>"Pendiente"</strong> y permitirle volver a entrar.
                                                </Typography>
                                                <Typography variant="body2" sx={{ mt: 1 }}>
                                                    • Los jueces con estado <strong>"Completado"</strong> ya terminaron su evaluación.
                                                </Typography>
                                            </Alert>
                                        </>
                                    )}
                                </Paper>
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
