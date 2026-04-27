import { createTheme } from '@mui/material';

export const theme = createTheme({
    palette: {
        primary: { 
            main: '#2E7D32', 
            light: '#4CAF50', 
            dark: '#1B5E20', 
            contrastText: '#fff' 
        },
        secondary: { 
            main: '#546E7A' 
        },
        background: { 
            default: '#F0F2F0', 
            paper: '#FFFFFF' 
        },
    },
    shape: { 
        borderRadius: 10 
    },
    typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
        h4: { fontWeight: 700 },
        h6: { fontWeight: 600 }
    },
    components: {
        MuiPaper: { 
            styleOverrides: { 
                root: { 
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)' 
                } 
            } 
        },
        MuiButton: { 
            styleOverrides: { 
                root: { 
                    textTransform: 'none', 
                    fontWeight: 600, 
                    borderRadius: 8 
                } 
            } 
        },
    }
});
