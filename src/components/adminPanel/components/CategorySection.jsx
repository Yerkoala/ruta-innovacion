import React from 'react';
import { Box, Typography, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { getCategoryColors } from '../const/colors';
import { TableIcon, ChevronIcon } from './Icons';

export const CategorySection = ({ categoria, proyectos, expanded, onToggle }) => {
    const color = getCategoryColors(categoria);

    return (
        <Box sx={{ mb: 2, border: `1px solid ${color.border}`, borderRadius: 2, overflow: 'hidden' }}>
            <Box
                onClick={onToggle}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 2.5,
                    py: 1.5,
                    bgcolor: color.bg,
                    cursor: 'pointer',
                    userSelect: 'none'
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <TableIcon />
                    <Typography sx={{ fontWeight: 700, fontSize: 14, color: color.text }}>
                        {categoria}
                    </Typography>
                    <Box sx={{
                        px: 1.2,
                        py: 0.3,
                        borderRadius: 10,
                        bgcolor: color.border,
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 700
                    }}>
                        {proyectos.length} proyecto{proyectos.length !== 1 ? 's' : ''}
                    </Box>
                </Stack>
                <Box sx={{
                    color: color.text,
                    transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform .2s'
                }}>
                    <ChevronIcon />
                </Box>
            </Box>

            {expanded && (
                <TableContainer>
                    <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                                <TableCell sx={{
                                    width: 36,
                                    fontWeight: 700,
                                    fontSize: 11,
                                    color: 'text.secondary',
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                    py: 1.2
                                }}>
                                    N°
                                </TableCell>
                                <TableCell sx={{
                                    width: '8%',
                                    fontWeight: 700,
                                    fontSize: 11,
                                    color: 'text.secondary',
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                    py: 1.2
                                }}>
                                    Grupo
                                </TableCell>
                                <TableCell sx={{
                                    width: '24%',
                                    fontWeight: 700,
                                    fontSize: 11,
                                    color: 'text.secondary',
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                    py: 1.2
                                }}>
                                    Proyecto
                                </TableCell>
                                <TableCell sx={{
                                    width: '16%',
                                    fontWeight: 700,
                                    fontSize: 11,
                                    color: 'text.secondary',
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                    py: 1.2
                                }}>
                                    Gerencia
                                </TableCell>
                                <TableCell sx={{
                                    width: '18%',
                                    fontWeight: 700,
                                    fontSize: 11,
                                    color: 'text.secondary',
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                    py: 1.2
                                }}>
                                    Líder
                                </TableCell>
                                <TableCell sx={{
                                    fontWeight: 700,
                                    fontSize: 11,
                                    color: 'text.secondary',
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                    py: 1.2
                                }}>
                                    Descripción
                                </TableCell>
                                <TableCell sx={{
                                    fontWeight: 700,
                                    fontSize: 11,
                                    color: 'text.secondary',
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                    py: 1.2
                                }}>
                                    Problema
                                </TableCell>
                                <TableCell sx={{
                                    fontWeight: 700,
                                    fontSize: 11,
                                    color: 'text.secondary',
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                    py: 1.2
                                }}>
                                    Impacto
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {proyectos.map((p, i) => (
                                <TableRow
                                    key={i}
                                    sx={{
                                        '&:last-child td': { border: 0 },
                                        '&:hover': { bgcolor: 'grey.50' },
                                        verticalAlign: 'top'
                                    }}
                                >
                                    <TableCell sx={{
                                        color: 'text.disabled',
                                        fontWeight: 700,
                                        fontSize: 13,
                                        pt: 1.5
                                    }}>
                                        {p.Numero || p.numero || i + 1}
                                    </TableCell>
                                    <TableCell sx={{
                                        fontSize: 13,
                                        pt: 1.5,
                                        fontWeight: 600,
                                        color: 'primary.main'
                                    }}>
                                        {p.Grupo || p.grupo || '-'}
                                    </TableCell>
                                    <TableCell sx={{
                                        fontWeight: 600,
                                        fontSize: 13,
                                        pt: 1.5,
                                        wordBreak: 'break-word'
                                    }}>
                                        {p.Proyecto || p.proyecto}
                                    </TableCell>
                                    <TableCell sx={{
                                        fontSize: 13,
                                        pt: 1.5,
                                        wordBreak: 'break-word'
                                    }}>
                                        {p.Gerencia || p.gerencia}
                                    </TableCell>
                                    <TableCell sx={{
                                        fontSize: 13,
                                        pt: 1.5,
                                        wordBreak: 'break-word'
                                    }}>
                                        {p.Lider || p.lider}
                                    </TableCell>
                                    <TableCell sx={{
                                        fontSize: 12,
                                        color: 'text.secondary',
                                        pt: 1.5,
                                        lineHeight: 1.5,
                                        wordBreak: 'break-word'
                                    }}>
                                        {p.Descripcion || p.descripcion}
                                    </TableCell>
                                    <TableCell sx={{
                                        fontSize: 12,
                                        color: 'text.secondary',
                                        pt: 1.5,
                                        lineHeight: 1.5,
                                        wordBreak: 'break-word'
                                    }}>
                                        {p.Problema || p.problema || '-'}
                                    </TableCell>
                                    <TableCell sx={{
                                        fontSize: 12,
                                        color: 'text.secondary',
                                        pt: 1.5,
                                        lineHeight: 1.5,
                                        wordBreak: 'break-word'
                                    }}>
                                        {p.Impacto || p.impacto || '-'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};
