import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebaseconfig';

/**
 * Obtiene la final que está marcada como activa
 * @returns {Promise<Object|null>} Objeto con datos de la final activa (id, nombre, anio, etc.) o null si no existe
 */
export const obtenerFinalActiva = async () => {
    try {
        const finalesRef = collection(db, 'finales');
        const q = query(finalesRef, where('activa', '==', true));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return {
                id: doc.id,
                ...doc.data()
            };
        }
        return null;
    } catch (error) {
        return null;
    }
};

/**
 * Obtiene una final específica por su ID
 * @param {string} finalId - ID de la final (ej: "match-ruta-proveedores-2026")
 * @returns {Promise<Object|null>} Objeto con datos de la final o null si no existe
 */
export const obtenerFinalPorId = async (finalId) => {
    try {
        const finalDoc = doc(db, 'finales', finalId);
        const snapshot = await getDoc(finalDoc);
        
        if (snapshot.exists()) {
            return {
                id: snapshot.id,
                ...snapshot.data()
            };
        }
        return null;
    } catch (error) {
        console.error('Error al obtener final por ID:', error);
        return null;
    }
};

/**
 * Carga todas las finales desde Firebase
 * @returns {Promise<Array>} Array de finales
 */
export const cargarFinalesDesdeFirebase = async () => {
    try {
        const finalesRef = collection(db, 'finales');
        const snapshot = await getDocs(finalesRef);
        const finales = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return finales.sort((a, b) => b.anio - a.anio || a.nombre.localeCompare(b.nombre));
    } catch (error) {
        throw new Error('Error al cargar finales desde Firebase');
    }
};

/**
 * Crea una nueva final en Firebase
 * @param {string} nombre - Nombre de la final
 * @param {number} anio - Año de la final
 * @returns {Promise<string>} ID de la final creada
 */
export const crearFinalEnFirebase = async (nombre, anio, tipo = 'Evaluacion') => {
    try {
        const nombreCorto = nombre
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '-');
        
        const finalId = `${nombreCorto}-${anio}`;

        await setDoc(doc(db, 'finales', finalId), {
            nombre,
            nombreCorto,
            anio,
            tipo,
            activa: false,
            fechaCreacion: new Date()
        });

        return finalId;
    } catch (error) {
        throw new Error('Error al crear la final en Firebase');
    }
};

/**
 * Duplica todas las finales de un año a otro
 * @param {number} anioOrigen - Año origen
 * @param {number} anioDestino - Año destino
 * @returns {Promise<number>} Cantidad de finales duplicadas
 */
export const duplicarFinalesEnFirebase = async (anioOrigen, anioDestino) => {
    try {
        const finalesRef = collection(db, 'finales');
        const q = query(finalesRef, where('anio', '==', anioOrigen));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            throw new Error(`No hay finales del año ${anioOrigen} para duplicar`);
        }

        for (const docSnap of snapshot.docs) {
            const finalOrigen = docSnap.data();
            const nuevoId = `${finalOrigen.nombreCorto}-${anioDestino}`;

            await setDoc(doc(db, 'finales', nuevoId), {
                ...finalOrigen,
                anio: anioDestino,
                activa: false,
                fechaCreacion: new Date()
            });
        }

        return snapshot.size;
    } catch (error) {
        throw error;
    }
};

/**
 * Marca una final como activa y desactiva las demás
 * @param {string} finalId - ID de la final a activar
 * @returns {Promise<void>}
 */
export const marcarFinalComoActiva = async (finalId) => {
    try {
        // Primero desactivar todas
        const finalesRef = collection(db, 'finales');
        const snapshot = await getDocs(finalesRef);
        
        for (const docSnap of snapshot.docs) {
            if (docSnap.data().activa) {
                await updateDoc(doc(db, 'finales', docSnap.id), { activa: false });
            }
        }

        // Luego activar la seleccionada
        await updateDoc(doc(db, 'finales', finalId), { activa: true });

        // Actualizar configuración global
        await setDoc(doc(db, 'configuracion', 'global'), {
            finalActivaId: finalId,
            ultimaActualizacion: new Date()
        });
    } catch (error) {
        throw new Error('Error al actualizar la final activa');
    }
};

/**
 * Elimina una final de Firebase
 * @param {string} finalId - ID de la final a eliminar
 * @returns {Promise<void>}
 */
export const eliminarFinalDeFirebase = async (finalId) => {
    try {
        await deleteDoc(doc(db, 'finales', finalId));
    } catch (error) {
        throw new Error('Error al eliminar la final');
    }
};

/**
 * Inicializa las finales predeterminadas en Firebase si no existen
 * @param {number} anio - Año para las finales iniciales
 * @returns {Promise<number>} Cantidad de finales creadas
 */
export const inicializarFinalesPredeterminadas = async (anio) => {
    try {
        const finalesIniciales = [
            'Final Animal Champions 1',
            'Final Animal Champions 2',
            'Final Avalancha',
            'Final Pulso',
            'Final Olimpiadas Industrial',
            'Final Comercial',
            'Final Asuntos Corporativos',
            'Semifinal Ruta Innovacion',
            'Final Ruta Innovación'
        ];

        const finalesRef = collection(db, 'finales');
        const snapshot = await getDocs(finalesRef);

        // Si ya existen finales, no crear
        if (!snapshot.empty) {
            return 0;
        }

        let creadas = 0;
        for (const nombre of finalesIniciales) {
            const nombreCorto = nombre
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '-');
            
            const finalId = `${nombreCorto}-${anio}`;

            await setDoc(doc(db, 'finales', finalId), {
                nombre,
                nombreCorto,
                anio,
                tipo: 'Evaluacion', // Por defecto todas son de tipo Evaluacion
                activa: nombre === 'Final Ruta Innovación', // La última es la activa por defecto
                fechaCreacion: new Date()
            });

            creadas++;
        }

        // Configurar la final activa por defecto
        if (creadas > 0) {
            const finalActivaId = `final-ruta-innovacion-${anio}`;
            await setDoc(doc(db, 'configuracion', 'global'), {
                finalActivaId: finalActivaId,
                ultimaActualizacion: new Date()
            });
        }

        return creadas;
    } catch (error) {
        throw new Error('Error al crear las finales predeterminadas');
    }
};

/**
 * Guarda múltiples proyectos en Firebase para una final específica
 * @param {string} finalId - ID de la final
 * @param {Array} proyectos - Array de proyectos a guardar
 * @param {boolean} reemplazar - Si debe reemplazar proyectos existentes
 * @returns {Promise<number>} Cantidad de proyectos guardados
 */
export const guardarProyectosEnFirebase = async (finalId, proyectos, reemplazar = false) => {
    try {
        if (!finalId || !proyectos || proyectos.length === 0) {
            throw new Error('Datos inválidos para guardar proyectos');
        }

        const proyectosRef = collection(db, 'proyectos');
        let guardados = 0;

        for (const proyecto of proyectos) {
            const proyectoData = {
                finalId: finalId,
                numero: proyecto.Numero || proyecto['N°'] || null,
                proyecto: proyecto.Proyecto || '',
                gerencia: proyecto.Gerencia || '',
                categoria: proyecto.Categoria || '',
                lider: proyecto.Lider || proyecto.Líder || '',
                descripcion: proyecto.Descripcion || proyecto.Descripción || '',
                problema: proyecto.Problema || '',
                impacto: proyecto.Impacto || '',
                grupo: proyecto.Grupo || null,
                juez: proyecto.Juez || proyecto.juez || '', // Campo para jueces separados por coma
                fechaCarga: new Date()
            };

            // Agregar campos opcionales solo si existen
            if (proyecto.Costo_implementacion) proyectoData.Costo_implementacion = proyecto.Costo_implementacion;
            if (proyecto.Costo_piloto) proyectoData.Costo_piloto = proyecto.Costo_piloto;
            if (proyecto.Casos) proyectoData.Casos = proyecto.Casos;
            if (proyecto.Empresa) proyectoData.Empresa = proyecto.Empresa;

            // Usar ID único basado en finalId + numero para permitir actualizaciones
            const proyectoId = `${finalId}-p${proyectoData.numero}`;
            
            await setDoc(doc(proyectosRef, proyectoId), proyectoData);
            guardados++;
        }

        return guardados;
    } catch (error) {
        throw new Error(`Error al guardar proyectos: ${error.message}`);
    }
};

/**
 * Obtiene todos los proyectos de una final específica
 * @param {string} finalId - ID de la final
 * @returns {Promise<Array>} Array de proyectos
 */
export const obtenerProyectosPorFinal = async (finalId) => {
    try {
        const proyectosRef = collection(db, 'proyectos');
        const q = query(proyectosRef, where('finalId', '==', finalId));
        const snapshot = await getDocs(q);
        
        const proyectos = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return proyectos.sort((a, b) => (a.numero || 0) - (b.numero || 0));
    } catch (error) {
        throw new Error('Error al obtener proyectos');
    }
};

/**
 * Elimina todos los proyectos de una final específica
 * @param {string} finalId - ID de la final
 * @returns {Promise<number>} Cantidad de proyectos eliminados
 */
export const eliminarProyectosPorFinal = async (finalId) => {
    try {
        const proyectosRef = collection(db, 'proyectos');
        const q = query(proyectosRef, where('finalId', '==', finalId));
        const snapshot = await getDocs(q);
        
        let eliminados = 0;
        for (const docSnap of snapshot.docs) {
            await deleteDoc(doc(db, 'proyectos', docSnap.id));
            eliminados++;
        }

        return eliminados;
    } catch (error) {
        throw new Error('Error al eliminar proyectos');
    }
};

/**
 * Obtiene las ponderaciones de una categoría
 * @param {string} categoria - Nombre normalizado de la categoría
 * @returns {Promise<Object>} Objeto con las ponderaciones de cada criterio
 */
export const obtenerPonderaciones = async (categoria) => {
    try {
        const ponderacionRef = doc(db, 'ponderaciones', categoria);
        const ponderacionSnap = await getDoc(ponderacionRef);
        
        if (ponderacionSnap.exists()) {
            const data = ponderacionSnap.data();
            // Eliminar campos no numéricos como fechaActualizacion
            const { fechaActualizacion, ...ponderacionesLimpias } = data;
            return ponderacionesLimpias;
        }
        
        // Ponderaciones por defecto según categoría
        if (categoria === 'chispeza') {
            return {
                DESAFIO: 20,
                CREATIVIDAD: 20,
                IMPLEMENTABILIDAD: 20,
                ESCALABILIDAD: 20,
                IMPACTO: 20
            };
        }
        
        // Ponderaciones por defecto para otras categorías
        return {
            DESAFIO: 20,
            CREATIVIDAD: 15,
            IMPLEMENTABILIDAD: 20,
            ESCALABILIDAD: 15,
            EBITDA: 20,
            PRODUCTIVIDAD: 10
        };
    } catch (error) {
        throw new Error('Error al obtener ponderaciones');
    }
};

/**
 * Guarda las ponderaciones de una categoría
 * @param {string} categoria - Nombre normalizado de la categoría
 * @param {Object} ponderaciones - Objeto con las ponderaciones de cada criterio
 * @returns {Promise<void>}
 */
export const guardarPonderaciones = async (categoria, ponderaciones) => {
    try {
        const ponderacionRef = doc(db, 'ponderaciones', categoria);
        await setDoc(ponderacionRef, {
            ...ponderaciones,
            fechaActualizacion: new Date()
        });
    } catch (error) {
        throw new Error('Error al guardar ponderaciones');
    }
};

/**
 * Obtiene las categorías personalizadas creadas por el admin
 * @returns {Promise<Array>} Lista de categorías personalizadas
 */
export const obtenerCategoriasPersonalizadas = async () => {
    try {
        const ref = doc(db, 'config', 'categorias');
        const snap = await getDoc(ref);
        if (snap.exists()) return snap.data().lista || [];
        return [];
    } catch (error) {
        throw new Error('Error al obtener categorías personalizadas');
    }
};

/**
 * Guarda las categorías personalizadas creadas por el admin
 * @param {Array} lista - Lista de categorías personalizadas a guardar
 */
export const guardarCategoriasPersonalizadas = async (lista) => {
    try {
        const ref = doc(db, 'config', 'categorias');
        await setDoc(ref, { lista, fechaActualizacion: new Date() });
    } catch (error) {
        throw new Error('Error al guardar categorías');
    }
};

/**
 * Obtiene el estado de un juez en una final específica
 * @param {string} finalId - ID de la final
 * @param {string} nombreJuez - Nombre del juez
 * @returns {Promise<Object|null>} Estado del juez o null si no existe
 */
export const obtenerEstadoJuez = async (finalId, nombreJuez) => {
    try {
        const estadoRef = doc(db, 'finales', finalId, 'estadoJueces', nombreJuez);
        const estadoSnap = await getDoc(estadoRef);
        
        if (estadoSnap.exists()) {
            return {
                id: estadoSnap.id,
                ...estadoSnap.data()
            };
        }
        return null;
    } catch (error) {
        console.error('Error al obtener estado del juez:', error);
        return null;
    }
};

/**
 * Obtiene todos los estados de jueces de una final
 * @param {string} finalId - ID de la final
 * @returns {Promise<Array>} Array con estados de todos los jueces
 */
export const obtenerEstadosJueces = async (finalId) => {
    try {
        const estadosRef = collection(db, 'finales', finalId, 'estadoJueces');
        const snapshot = await getDocs(estadosRef);
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            nombre: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error al obtener estados de jueces:', error);
        return [];
    }
};

/**
 * Suscribe a cambios en tiempo real de los estados de jueces de una final
 * @param {string} finalId - ID de la final
 * @param {function} callback - Función que se ejecuta cuando hay cambios, recibe el array de estados
 * @returns {function} Función para cancelar la suscripción
 */
export const suscribirseEstadosJueces = (finalId, callback) => {
    try {
        const estadosRef = collection(db, 'finales', finalId, 'estadoJueces');
        
        const unsubscribe = onSnapshot(estadosRef, (snapshot) => {
            const estados = snapshot.docs.map(doc => ({
                id: doc.id,
                nombre: doc.id,
                ...doc.data()
            }));
            callback(estados);
        }, (error) => {
            console.error('Error en suscripción a estados de jueces:', error);
            callback([]);
        });
        
        return unsubscribe;
    } catch (error) {
        console.error('Error al suscribirse a estados de jueces:', error);
        return () => {}; // Retornar función vacía si falla
    }
};

/**
 * Registra que un juez comenzó a evaluar (marca como "evaluando")
 * Verifica el estado actual antes de permitir la entrada para evitar duplicados
 * @param {string} finalId - ID de la final
 * @param {string} nombreJuez - Nombre del juez
 * @param {string} grupo - Grupo asignado al juez
 * @returns {Promise<{success: boolean, message: string}>} Resultado de la operación
 */
export const registrarJuezEvaluando = async (finalId, nombreJuez, grupo) => {
    try {
        const estadoRef = doc(db, 'finales', finalId, 'estadoJueces', nombreJuez);
        
        // Primero verificar el estado actual del juez directamente desde Firebase
        const estadoSnap = await getDoc(estadoRef);
        
        if (estadoSnap.exists()) {
            const estadoActual = estadoSnap.data();
            
            // Si ya está evaluando, no permitir entrada
            if (estadoActual.estado === 'evaluando') {
                return {
                    success: false,
                    message: `${nombreJuez} ya está votando actualmente. Por favor espera o contacta al administrador.`
                };
            }
            
            // Si está en cualquier otro estado (pendiente, completado), permitir entrada y actualizar
        }
        
        // Actualizar/crear el estado como "evaluando"
        await setDoc(estadoRef, {
            nombre: nombreJuez,
            grupo: grupo,
            estado: 'evaluando',
            inicioEvaluacion: new Date(),
            ultimaActualizacion: new Date()
        });
        
        return {
            success: true,
            message: 'Acceso permitido'
        };
    } catch (error) {
        console.error('Error al registrar el estado del juez:', error);
        throw new Error('Error al registrar el estado del juez');
    }
};

/**
 * Marca un juez como "completado" cuando termina de evaluar
 * @param {string} finalId - ID de la final
 * @param {string} nombreJuez - Nombre del juez
 * @returns {Promise<void>}
 */
export const marcarJuezCompletado = async (finalId, nombreJuez) => {
    try {
        const estadoRef = doc(db, 'finales', finalId, 'estadoJueces', nombreJuez);
        await updateDoc(estadoRef, {
            estado: 'completado',
            finEvaluacion: new Date(),
            ultimaActualizacion: new Date()
        });
    } catch (error) {
        throw new Error('Error al actualizar el estado del juez');
    }
};

/**
 * Obtiene la lista de jueces únicos de una final a partir de los proyectos
 * @param {string} finalId - ID de la final
 * @returns {Promise<Array>} Array de nombres de jueces únicos
 */
export const obtenerJuecesDeProyectos = async (finalId) => {
    try {
        const proyectosRef = collection(db, 'proyectos');
        const q = query(proyectosRef, where('finalId', '==', finalId));
        const snapshot = await getDocs(q);
        
        const juecesSet = new Set();
        
        snapshot.docs.forEach(doc => {
            const proyecto = doc.data();
            if (proyecto.juez) {
                const jueces = String(proyecto.juez).split(',').map(j => j.trim());
                jueces.forEach(juez => {
                    if (juez) juecesSet.add(juez);
                });
            }
        });
        
        return Array.from(juecesSet).sort();
    } catch (error) {
        console.error('Error al obtener jueces de proyectos:', error);
        return [];
    }
};

/**
 * Cambia el estado de votación de un juez entre "evaluando" y "pendiente"
 * @param {string} finalId - ID de la final
 * @param {string} nombreJuez - Nombre del juez
 * @param {string} nuevoEstado - Nuevo estado: 'evaluando' o 'pendiente'
 * @returns {Promise<void>}
 */
export const cambiarEstadoVotacionJuez = async (finalId, nombreJuez, nuevoEstado) => {
    try {
        const estadoRef = doc(db, 'finales', finalId, 'estadoJueces', nombreJuez);
        const estadoSnap = await getDoc(estadoRef);
        
        if (estadoSnap.exists()) {
            // Actualizar estado existente
            const updateData = {
                estado: nuevoEstado,
                ultimaActualizacion: new Date()
            };
            
            // Si se cambia a pendiente, limpiar las fechas de evaluación
            if (nuevoEstado === 'pendiente') {
                updateData.inicioEvaluacion = null;
                updateData.finEvaluacion = null;
            }
            
            await updateDoc(estadoRef, updateData);
        } else {
            // Crear nuevo registro si no existe
            await setDoc(estadoRef, {
                nombre: nombreJuez,
                estado: nuevoEstado,
                ultimaActualizacion: new Date()
            });
        }
    } catch (error) {
        throw new Error('Error al cambiar el estado de votación del juez');
    }
};
