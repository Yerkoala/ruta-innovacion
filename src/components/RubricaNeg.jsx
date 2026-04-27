import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Accordion, AccordionSummary, AccordionDetails, Typography, TextField, IconButton, Box, Container, FormControl, InputLabel, Select, MenuItem } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SendIcon from '@mui/icons-material/Send'
import { proyectos } from '../DB/proyectos'
import { enviarEvaluacion, getNombreColeccion } from '../funcionesFirebase'
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';


function RubricaNeg() {
    const [inputs, setInputs] = useState({})
    const { state } = useLocation()
    const bloqueSeleccionado = proyectos.bloques.find(b => b.nombre === state?.bloque)
    const nombreJurado = state?.nombre

    const [loadingProyectoId, setLoadingProyectoId] = useState(null);
    const [enviadoProyectoId, setEnviadoProyectoId] = useState(null);

    const [intentoEnvio, setIntentoEnvio] = useState({});



    const handleChange = (tema, campo, valor) => {
        setInputs((prev) => ({
            ...prev,
            [tema]: {
                ...prev[tema],
                [campo]: valor
            }
        }))
    }

    const tieneCamposVacios = (tema) => {
        const calificaciones = inputs[tema] || {};
        return camposEditables.some(campo => !calificaciones[campo]);
    }
    const camposEditables = ['DESAFIO', 'CREATIVIDAD', 'IMPLEMENTABILIDAD', 'ESCALABILIDAD'];

    const handleEnviar = async (tema, proyecto) => {
        // Marcar que se intentó enviar este proyecto
        setIntentoEnvio((prev) => ({
            ...prev,
            [tema]: true
        }));


        const calificaciones = {
            ...inputs[tema],
            EBITDA: proyecto.EBITDA ?? '',
            PAYBACK: proyecto.PAYBACK ?? ''
        };

        const tieneCamposVacios = camposEditables.some(campo => !calificaciones[campo]);

        if (tieneCamposVacios) {
            console.warn("Hay campos sin completar.");
            return;
        }

        const coleccion = getNombreColeccion(state.tipoJurado, bloqueSeleccionado.categoria);

        if (!nombreJurado || !bloqueSeleccionado?.categoria || !proyecto?.id) {
            console.error("Faltan datos para enviar la evaluación.");
            return;
        }

        setLoadingProyectoId(proyecto.id);
        setEnviadoProyectoId(null);

        try {
            await enviarEvaluacion(proyecto, nombreJurado, bloqueSeleccionado.categoria, calificaciones, coleccion);
            setEnviadoProyectoId(proyecto.id);

            setTimeout(() => {
                setEnviadoProyectoId(null);
            }, 5000);
        } catch (error) {
            console.error("Error al enviar la evaluación:", error);
        } finally {
            setLoadingProyectoId(null);
        }
    };


    if (!bloqueSeleccionado) {
        return (
            <Container maxWidth="md">
                <Typography variant="h6" textAlign="center" mt={4}>
                    No se encontró el bloque seleccionado.
                </Typography>
            </Container>
        )
    }

    const categoriaImagen = {
        "Mejora Continua": "/mc.png",
        "Sandía Calá": "/sc.png",
        "Pinta Pa' Bueno": "/ppb.png"
    }

    const imagenFondo = categoriaImagen[bloqueSeleccionado.categoria] || null

    const categoriaEstilos = {
        "Mejora Continua": {
            backgroundColor: "#a114c4", // morado
            color: "#FFFFFF"
        },
        "Sandía Calá": {
            backgroundColor: "#28aa1d", // verde
            color: "#FFFFFF"
        },
        "Pinta Pa' Bueno": {
            backgroundColor: "#f96703", // naranjo
            color: "#FFFFFF"
        }
    }

    const estilosCategoria = categoriaEstilos[bloqueSeleccionado.categoria] || {}


    return (
        <Container maxWidth="md">
            <Typography variant="h6" gutterBottom textAlign="center" mt={1} sx={{ fontWeight: "bold", color: "#424242" }}>
                {bloqueSeleccionado.categoria.toUpperCase()}
            </Typography>
            <Typography variant="h3" gutterBottom textAlign="center" color='grey'>
                {nombreJurado}
            </Typography>
            <div style={{ display: "flex", justifyContent: "center" }}>
                <img src={imagenFondo} alt="" style={{ width: "100px", height: "100px", opacity: "0.8", marginBottom: "10px" }} />
            </div>

            {bloqueSeleccionado.proyectos.map((proyecto, index) => (
                <Accordion key={index}>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon sx={{ color: estilosCategoria.color || 'inherit' }} />}
                        sx={{
                            backgroundColor: estilosCategoria.backgroundColor,
                            color: estilosCategoria.color
                        }}
                    >
                        <Typography variant="h6">{proyecto.Tema}</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography variant="body2">
                            <strong>Hora Inicio:</strong> {proyecto.HoraInicio} <br />
                            <strong>Hora Fin:</strong> {proyecto.Fin} <br />
                            <strong>Gerencia:</strong> {proyecto.Gerencia}
                        </Typography>

                        <Box mt={2} display="grid" gridTemplateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={2}>
                            {['EBITDA', 'PAYBACK', 'DESAFIO', 'CREATIVIDAD', 'IMPLEMENTABILIDAD', 'ESCALABILIDAD'].map((campo) => {
                                const esCongelado = ['EBITDA', 'PAYBACK'].includes(campo);
                                const valorCampo = esCongelado
                                    ? proyecto[campo] ?? ''
                                    : inputs[proyecto.Tema]?.[campo] ?? '';

                                const mostrarError = !esCongelado && intentoEnvio[proyecto.Tema] && valorCampo === '';

                                return (
                                    <FormControl key={campo} fullWidth error={mostrarError}>
                                        <InputLabel>{campo}</InputLabel>
                                        <Select
                                            value={valorCampo}
                                            onChange={
                                                esCongelado
                                                    ? undefined
                                                    : (e) => handleChange(proyecto.Tema, campo, e.target.value)
                                            }
                                            label={campo}
                                            disabled={esCongelado}
                                        >
                                            <MenuItem value="">Selecciona</MenuItem>
                                            {[1, 2, 3, 4, 5].map((valor) => (
                                                <MenuItem key={valor} value={valor}>{valor}</MenuItem>
                                            ))}
                                        </Select>
                                        {mostrarError && (
                                            <Typography variant="caption" color="error">
                                                Este campo es obligatorio
                                            </Typography>
                                        )}
                                    </FormControl>
                                );
                            })}
                        </Box>

                        <Box mt={2} textAlign="right">
                            <IconButton color="primary" onClick={() => handleEnviar(proyecto.Tema, proyecto)}>
                                {loadingProyectoId === proyecto.id ? (
                                    <CircularProgress size={24} />
                                ) : enviadoProyectoId === proyecto.id ? (
                                    <CheckCircleIcon color="success" />
                                ) : (
                                    <SendIcon />
                                )}
                            </IconButton>
                        </Box>
                    </AccordionDetails>
                </Accordion>
            ))}
        </Container>
    )
}



export default RubricaNeg