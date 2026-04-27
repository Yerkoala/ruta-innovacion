import { getFirestore, collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";


/**
 * Lee todos los documentos de una colección específica.
 * @param {string} nombreColeccion - Nombre de la colección en Firestore.
 * @returns {Promise<Array>} - Arreglo con los datos de los documentos.
 */
export const leerColeccion = async (nombreColeccion) => {
    try {
        const coleccionRef = collection(db, nombreColeccion);
        const snapshot = await getDocs(coleccionRef);

        const datos = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return datos;
    } catch (error) {
        console.error(`❌ Error al leer la colección ${nombreColeccion}:`, error);
        return [];
    }
}