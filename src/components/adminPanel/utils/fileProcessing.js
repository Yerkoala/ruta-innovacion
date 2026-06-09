import * as XLSX from 'xlsx';

/**
 * Procesa un archivo Excel/CSV y extrae los datos de proyectos
 * @param {File} file - Archivo a procesar
 * @returns {Promise<Array>} - Array con los proyectos mapeados
 */
export const procesarArchivoExcel = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

                if (!rows.length) {
                    reject(new Error('El archivo está vacío o no tiene el formato esperado.'));
                    return;
                }

                const mapped = rows.map((row, i) => ({
                    Numero: row['N°'] || row['N'] || row['Nro'] || row['Numero'] || (i + 1),
                    Proyecto: row['Proyecto'] || row['proyecto'] || '',
                    Gerencia: row['Gerencia'] || row['gerencia'] || '',
                    Categoria: row['Categoria'] || row['Categoría'] || row['categoria'] || '',
                    Lider: row['Lider'] || row['Líder'] || row['lider'] || '',
                    Descripcion: row['Descripcion'] || row['Descripción'] || row['descripcion'] || '',
                    Problema: row['Problema'] || row['problema'] || '',
                    Impacto: row['Impacto'] || row['impacto'] || '',
                    Grupo: row['Grupo'] || row['grupo'] || null,
                    Juez: row['Juez'] || row['juez'] || '', // Campo para jueces separados por coma
                    Costo_implementacion: row['Costo_implementacion'] || row['costo_implementacion'] || '',
                    Costo_piloto: row['Costo_piloto'] || row['costo_piloto'] || '',
                    Casos: row['Casos'] || row['casos'] || '',
                    Empresa: row['Empresa'] || row['empresa'] || '',
                    Ficha: row['Ficha'] || row['ficha'] || '',
                }));

                resolve(mapped);
            } catch (err) {
                reject(new Error('Error al leer el archivo. Verifica que sea un Excel válido.'));
            }
        };

        reader.onerror = () => {
            reject(new Error('Error al leer el archivo'));
        };

        reader.readAsArrayBuffer(file);
    });
};

/**
 * Valida si un archivo es un Excel o CSV válido
 * @param {File} file - Archivo a validar
 * @returns {boolean} - true si es válido
 */
export const validarArchivoExcel = (file) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    return validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
};
