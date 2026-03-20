import { createTheme } from '@mui/material/styles';

const brand = {
  primary: '#225038',
  secondary: '#ff9f1c',
  background: '#f6f8fb',
  surface: '#ffffff'
};

const theme = createTheme({
  palette: {
    primary: {
      main: brand.primary
    },
    secondary: {
      main: brand.secondary
    },
    background: {
      default: brand.background,
      paper: brand.surface
    }
  },
  typography: {
    fontFamily: ['Roboto', 'Inter', 'Helvetica', 'Arial', 'sans-serif'].join(',')
  },
  components: {
    MuiAppBar: {
      defaultProps: {
        elevation: 0
      }
    }
  }
});

export default theme;
