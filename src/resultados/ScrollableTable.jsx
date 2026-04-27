import React, { useState } from 'react';
import {
  Box, Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Button
} from '@mui/material';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const ProyectoRubricas = ({ data, rubricasIA }) => {
  const descargarJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "proyectos_completos.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  descargarJSON();
  const calcularPromedioProyecto = (proyecto) => {
    const todas = [];

    Object.values(proyecto.rubricas).forEach(tipo => {
      tipo.forEach(evaluacion => {
        if (typeof evaluacion.promedio === 'number') {
          todas.push(evaluacion.promedio);
        }
      });
    });

    const evaluacionIA = rubricasIA.find(doc => parseInt(doc.id) === proyecto.id);
    const valorIA = parseFloat(evaluacionIA?.evaluaciones?.[0]?.calificaciones?.["Valoracion IA"]);
    if (!isNaN(valorIA)) {
      todas.push(valorIA);
    }

    return todas.length > 0
      ? parseFloat((todas.reduce((a, b) => a + b, 0) / todas.length).toFixed(2))
      : 0;
  };

  const dataOrdenada = [...data].sort((a, b) => {
    return calcularPromedioProyecto(b) - calcularPromedioProyecto(a);
  });

  const [selectedId, setSelectedId] = useState(dataOrdenada[0]?.id || '');

  const handleChange = (event) => {
    setSelectedId(event.target.value);
  };

  const proyectoSeleccionado = dataOrdenada.find((item) => item.id === selectedId);
  const evaluacionIA = rubricasIA.find((doc) => parseInt(doc.id) === selectedId);

  const renderTablaRubrica = (rubricaNombre, rubricaData) => {
    const criterios = rubricaData[0] ? Object.keys(rubricaData[0].calificaciones) : [];
    const alturaTabla = rubricaNombre === 'Negocio' ? 230 : 110;

    return (
      <Box>
        <TableContainer component={Paper} sx={{ width: "100%", height: alturaTabla, overflow: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ py: 1, minWidth: 130 }}>Juez - {rubricaNombre}</TableCell>
                <TableCell sx={{ py: 1 }}>Promedio</TableCell>
                {criterios.map((key) => (
                  <TableCell key={key} sx={{ py: 1 }}>{key}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rubricaData.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.juez}</TableCell>
                  <TableCell>{item.promedio}</TableCell>
                  {criterios.map((key) => (
                    <TableCell key={key}>{item.calificaciones[key]}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  const renderTablaIA = (evaluacion) => {
    const valorIA = parseFloat(evaluacion?.evaluaciones?.[0]?.calificaciones?.["Valoracion IA"]);
    return (
      <Box>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Juez - IA</TableCell>
                <TableCell>Promedio</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>IA</TableCell>
                <TableCell>{!isNaN(valorIA) ? valorIA : 'N/A'}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };
  const exportarExcel = () => {
    const wb = XLSX.utils.book_new();

    const ordenCriterios = [
      "CREATIVIDAD",
      "DESAFIO",
      "EBITDA",
      "IMPLEMENTABILIDAD",
      "ESCALABILIDAD",
      "PAYBACK"
    ];

    dataOrdenada.forEach(proyecto => {
      const hojaDatos = [];

      // Fila con nombre del proyecto
      hojaDatos.push({ Proyecto: `${proyecto.id} - ${proyecto.tema}` });

      const agregarDatosRubrica = (nombre, datos) => {
        if (!datos || datos.length === 0) return;

        datos.forEach(item => {
          const fila = {
            Rubrica: nombre,
            Juez: item.juez,
            Promedio: item.promedio,
          };

          // Agregar criterios en orden fijo
          ordenCriterios.forEach(criterio => {
            fila[criterio] = item.calificaciones[criterio] ?? "";
          });

          hojaDatos.push(fila);
        });
      };

      agregarDatosRubrica('TI', proyecto.rubricas.TI);
      agregarDatosRubrica('Metodológico', proyecto.rubricas.metodologico);
      agregarDatosRubrica('Negocio', proyecto.rubricas.negocio);

      const evaluacionIA = rubricasIA.find(doc => parseInt(doc.id) === proyecto.id);
      const valorIA = parseFloat(evaluacionIA?.evaluaciones?.[0]?.calificaciones?.["Valoracion IA"]);
      if (!isNaN(valorIA)) {
        hojaDatos.push({
          Rubrica: 'IA',
          Juez: 'IA',
          Promedio: valorIA
        });
      }

      const ws = XLSX.utils.json_to_sheet(hojaDatos, { skipHeader: false });
      const nombreHoja = `Proyecto_${proyecto.id}`;
      XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
    });

    const nombreArchivo = `Evaluaciones_Proyectos.xlsx`;
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, nombreArchivo);
  };

  return (
    <Box sx={{ p: 1 }}>
      <FormControl fullWidth>
        <InputLabel>Selecciona Tema</InputLabel>
        <Select value={selectedId} label="Selecciona Tema" onChange={handleChange}>
          {dataOrdenada.map((item) => (
            <MenuItem key={item.id} value={item.id}>
              {item.id} - {item.tema}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button variant="contained" color="primary" onClick={exportarExcel} sx={{ my: 2 }}>
        Exportar todos a Excel
      </Button>

      {proyectoSeleccionado && (
        <>
          {renderTablaRubrica('TI', proyectoSeleccionado.rubricas.TI)}
          {renderTablaRubrica('Metodológico', proyectoSeleccionado.rubricas.metodologico)}
          {renderTablaRubrica('Negocio', proyectoSeleccionado.rubricas.negocio)}
          {renderTablaIA(evaluacionIA)}
        </>
      )}
    </Box>
  );
};

export default ProyectoRubricas;