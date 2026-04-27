import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where, getDoc } from 'firebase/firestore';
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
                grupo: proyecto.Grupo || null,
                fechaCarga: new Date()
            };

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
