import { createTheme } from '@mui/material/styles';
export const theme = createTheme({
  palette: {
    mode: 'dark', primary: { main: '#00d4ff', light: '#38bdf8', dark: '#0a8cb8' },
    secondary: { main: '#ffd700', light: '#ffb347', dark: '#c4a000' },
    background: { default: '#0b0f1c', paper: '#0f1422' },
    text: { primary: '#ffffff', secondary: '#b0bedb', disabled: '#6c86a3' },
    success: { main: '#00ff88' }, error: { main: '#ff4466' }, divider: '#2a3440'
  },
  typography: { fontFamily: '"Segoe UI", "Arial", sans-serif',
    h1:{fontFamily:'"Georgia", "Segoe UI", serif'}, h2:{fontFamily:'"Georgia", "Segoe UI", serif'},
    h3:{fontFamily:'"Georgia", "Segoe UI", serif'}, h4:{fontFamily:'"Georgia", "Segoe UI", serif'},
    h5:{fontFamily:'"Georgia", "Segoe UI", serif'}, h6:{fontFamily:'"Georgia", "Segoe UI", serif'} },
  shape: { borderRadius: 16 },
  components: {
    MuiPaper:{styleOverrides:{root:{backgroundImage:'none',border:'1px solid #2a3440'}}},
    MuiButton:{styleOverrides:{root:{textTransform:'none',fontWeight:600,borderRadius:60,padding:'10px 24px'},
      contained:{boxShadow:'none','&:hover':{boxShadow:'0 0 20px rgba(0,212,255,0.3)'}},
      outlined:{borderColor:'#00d4ff','&:hover':{borderColor:'#38bdf8',boxShadow:'0 0 20px rgba(0,212,255,0.15)'}}}},
    MuiCard:{styleOverrides:{root:{borderRadius:16,border:'1px solid #2a3440',background:'#0f1422'}}},
    MuiTextField:{styleOverrides:{root:{'& .MuiOutlinedInput-root':{borderRadius:12,'& fieldset':{borderColor:'#2a3440'},'&:hover fieldset':{borderColor:'#00d4ff'},'&.Mui-focused fieldset':{borderColor:'#00d4ff'}}}}}
  }
});