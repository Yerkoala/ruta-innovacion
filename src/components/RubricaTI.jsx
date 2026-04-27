import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Accordion, AccordionSummary, AccordionDetails, Typography, FormControl, InputLabel, Select, MenuItem, IconButton, Box, Container } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SendIcon from '@mui/icons-material/Send'
import { rubricaTecnica } from '../DB/rubricatecnica'
import { proyectos } from '../DB/proyectos'
import { enviarEvaluacionTI, getNombreColeccion, aliasCamposTecnicos } from '../funcionesFirebase';

import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';



function RubricaTI() {
    const [inputs, setInputs] = useState({})
    const { state } = useLocation()
    const bloqueSeleccionado = proyectos.bloques.find(b => b.nombre === state?.bloque)
    const nombreJurado = state?.nombre

    const [loadingProyectoId, setLoadingProyectoId] = useState(null);
    const [enviadoProyectoId, setEnviadoProyectoId] = useState(null);

    const handleChange = (tema, campo, valor) => {
        setInputs((prev) => ({
            ...prev,
            [tema]: {
                ...prev[tema],
                [campo]: valor
            }
        }))
    }

    const handleEnviar = async (tema, proyecto) => {
        const coleccion = getNombreColeccion(state.tipoJurado, bloqueSeleccionado.categoria);
        const respuestasOriginales = inputs[tema] || {};
        const calificaciones = {};

        Object.entries(respuestasOriginales).forEach(([campoLargo, valor]) => {
            const alias = aliasCamposTecnicos[campoLargo]; // campoLargo debe ser item.descripcion
            if (alias) {
                calificaciones[alias] = valor;
            }
        });

        if (!nombreJurado || !bloqueSeleccionado?.categoria || !proyecto?.id) {
            console.error("Faltan datos para enviar la evaluación.");
            return;
        }

        setLoadingProyectoId(proyecto.id);
        setEnviadoProyectoId(null);

        try {
            await enviarEvaluacionTI(
                proyecto,
                nombreJurado,
                bloqueSeleccionado.categoria,
                calificaciones,
                coleccion
            );
            setEnviadoProyectoId(proyecto.id);
            setTimeout(() => {
                setEnviadoProyectoId(null);
            }, 5000);
        } catch (error) {
            console.error("❌ Error al enviar la evaluación técnica:", error);
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
            <Typography variant="h6" gutterBottom textAlign="center" mt={1} sx={{ fontWeight: "bold" }}>
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
                        <Typography variant="body2" mb={1}>
                            <strong>Hora Inicio:</strong> {proyecto.HoraInicio} <br />
                            <strong>Hora Fin:</strong> {proyecto.Fin} <br />
                            <strong>Gerencia:</strong> {proyecto.Gerencia}
                        </Typography>

                        {rubricaTecnica.map((item, i) => (
                            <Box key={i} mb={1}>
                                <Typography variant="subtitle1" fontWeight="bold">
                                    {item.ambito}
                                </Typography>
                                <Typography variant="body2" mb={1}>
                                    {item.descripcion}
                                </Typography>

                                <FormControl fullWidth>
                                    <InputLabel id={`label-${item}`} sx={{ fontSize: '14px' }}>
                                        Evaluación
                                    </InputLabel>
                                    <Select
                                        labelId={`label-${item.descripcion}`}
                                        id={`select-${item.descripcion}`}
                                        value={inputs[proyecto.Tema]?.[item.descripcion] || ''}
                                        onChange={(e) => handleChange(proyecto.Tema, item.descripcion, e.target.value)}
                                        label="Evaluación"
                                        sx={{
                                            height: '40px',
                                            fontSize: '14px',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <MenuItem value="Sí">Sí</MenuItem>
                                        <MenuItem value="Parcial">Parcial</MenuItem>
                                        <MenuItem value="No">No</MenuItem>
                                        <MenuItem value="N/A">N/A</MenuItem>
                                    </Select>
                                </FormControl>

                                <Typography variant="caption" color="text.secondary">
                                    {item.sugerencia}
                                </Typography>
                            </Box>
                        ))}

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

export default RubricaTI