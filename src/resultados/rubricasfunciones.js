
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseconfig";

/**
 * Escucha en tiempo real los cambios en una colección específica.
 * @param {string} nombreColeccion - Nombre de la colección en Firestore.
 * @param {(datos: Array) => void} callback - Función que recibe los datos actualizados.
 * @returns {() => void} - Función para cancelar la suscripción.
 */
export const leerColeccion = (nombreColeccion, callback) => {
    const coleccionRef = collection(db, nombreColeccion);

    const unsubscribe = onSnapshot(coleccionRef, (snapshot) => {
        const datos = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(datos);
    }, (error) => {
        console.error(`❌ Error al escuchar la colección ${nombreColeccion}:`, error);
        callback([]);
    });

    return unsubscribe;
};

const crearEscuchaRubricas = (nombresColecciones, callbackFinal) => {
    const datosPorColeccion = {
        negocio: [],
        metodologico: [],
        TI: []
    };

    const unsubscribes = [];

    const procesarYEnviar = () => {
        const proyectosMap = new Map();

        const agregarRubricas = (docs, tipo) => {
            docs.forEach(({ id, tema, categoria, evaluaciones }) => {
                if (!proyectosMap.has(id)) {
                    proyectosMap.set(id, {
                        id,
                        tema,
                        categoria,
                        rubricas: {
                            negocio: [],
                            metodologico: [],
                            TI: []
                        }
                    });
                }

                const proyecto = proyectosMap.get(id);

                evaluaciones.forEach(({ juez, calificaciones }) => {
                    proyecto.rubricas[tipo].push({ juez, calificaciones });
                });
            });
        };

        agregarRubricas(datosPorColeccion.negocio, "negocio");
        agregarRubricas(datosPorColeccion.metodologico, "metodologico");
        agregarRubricas(datosPorColeccion.TI, "TI");

        callbackFinal(Array.from(proyectosMap.values()));
    };

    unsubscribes.push(
        leerColeccion(nombresColecciones[0], (docs) => {
            datosPorColeccion.negocio = docs;
            procesarYEnviar();
        })
    );
    unsubscribes.push(
        leerColeccion(nombresColecciones[1], (docs) => {
            datosPorColeccion.metodologico = docs;
            procesarYEnviar();
        })
    );
    unsubscribes.push(
        leerColeccion(nombresColecciones[2], (docs) => {
            datosPorColeccion.TI = docs;
            procesarYEnviar();
        })
    );

    return () => unsubscribes.forEach(unsub => unsub());
};

export const leerRubricasPPB = (callbackFinal) => {
    const nombresColecciones = [
        "rubricaNegPPB",
        "rubricaMetPPB",
        "rubricaTIPPB"
    ];
    return crearEscuchaRubricas(nombresColecciones, callbackFinal);
};

export const leerRubricasSC = (callbackFinal) => {
    const nombresColecciones = [
        "rubricaNegSC",
        "rubricaMetSC",
        "rubricaTISC"
    ];
    return crearEscuchaRubricas(nombresColecciones, callbackFinal);
};

export const leerRubricasMC = (callbackFinal) => {
    const nombresColecciones = [
        "rubricaNegMC",
        "rubricaMetMC",
        "rubricaTIMC"
    ];
    return crearEscuchaRubricas(nombresColecciones, callbackFinal);
};

export const leerRubricasIA = (callbackFinal) => {
  return leerColeccion("RubricaIA", callbackFinal);
};