import "vuetify/styles";
import { createVuetify } from "vuetify";

const stoTheme = {
  dark: true,

  colors: {
    background: "#0f141b",
    surface: "#151d28",

    primary: "#3fa7ff",
    secondary: "#ff9f1c",

    "card-bg": "#182235",
    "panel-bg": "#121a24",

    success: "#4caf50",
    warning: "#ff9800",
    error: "#f44336",
    info: "#2196f3",
  },
};

export default createVuetify({
  theme: {
    defaultTheme: "stoTheme",

    themes: { stoTheme },
  },
});
