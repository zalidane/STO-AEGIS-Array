import "vuetify/styles";
import { createVuetify } from "vuetify";

const stoTheme = {
  dark: true,

  colors: {
    background: "#0f141b",
    surface: "#151d28",

    primary: "#3fa7ff",
    secondary: "#ff9f1c",

    success: "#4caf50",
    warning: "#ff9800",
    error: "#f44336",
    info: "#2196f3",

    federation: "#3fa7ff",
    klingon: "#d32f2f",
    romulan: "#00c853",
    dominion: "#9c27b0",
    neutral: "#9e9e9e",

    tactical: "#f44336",
    engineering: "#ffb300",
    science: "#2196f3",
    universal: "#bdbdbd",

    dilithium: "#7e57c2",
    zen: "#d4af37",
    lobi: "#c0c0c0",
    phoenix: "#e53935",
    research: "#1976d2",
  },
};

export default createVuetify({
  theme: {
    defaultTheme: "stoTheme",

    themes: { stoTheme },
  },
});
