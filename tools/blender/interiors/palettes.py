from lib import mkpal
# Paletas de MUNDO REAL (sem rosa-doce, exceto a suite da Casa dos Sonhos). Espelhadas em src/game/interiors/layouts/*.ts
PALS = {
 "shared": mkpal("Compartilhado", "#efe6da", "#d9ccb8", "#a8553b", "#e0d4c0", "#3a3128", "#d9ccb6", "gold", glass="#dfe6e6", glow="#ffe9c4", leaf="#5f8a5e"),
 "casa": mkpal("Casa dos Sonhos", "#f1e1dc", "#e3bcc4", "#b9677d", "#efd6d4", "#6e4350", "#e8c0c8", "gold", glass="#f3d9de", glow="#ffe3b8", white="#fbf5f0", leaf="#5f8a5e"),
 "cafe": mkpal("Cafe Rose", "#8fa88c", "#f1e6d2", "#a8553b", "#d9c3a0", "#4a3426", "#9bb39a", "rose_gold", glass="#d8e6dd", glow="#ffe2ae", glow2="#ffb27a", white="#f6efe0", leaf="#5f8a5e"),
 "salao": mkpal("Salao & Spa", "#b9ae9f", "#f2ece0", "#2b2a29", "#d8cfc2", "#3b3835", "#c9bfae", "gold", glass="#dfe6e6", glow="#ffeccf", white="#f6f1e8", leaf="#5f8a5e"),
 "boutique": mkpal("Boutique", "#efe8da", "#2a2826", "#b08a5a", "#d9ccb8", "#1f1d1c", "#d8c8ae", "champagne", glass="#e3ebee", glow="#fff0cf", white="#fbf7ef", leaf="#5f8a5e"),
 "joalheria": mkpal("Joalheria", "#17151a", "#26222b", "#6e1f33", "#3a343f", "#0c0b0e", "#6e1f33", "champagne", glass="#cdd5df", glow="#ffe6b0", white="#e6d8b8", leaf="#4f7a55", sheen=0.25),
 "estudio": mkpal("Estudio de Fotos", "#8b8d90", "#f1f1ef", "#c79a6b", "#c9cbcd", "#1e1f21", "#4a4c50", "chrome", glass="#dbe3e8", glow="#fff3df", glow2="#ffd9a8", white="#fafafa", leaf="#5f8a5e"),
 "palco": mkpal("Palco Neon", "#1e212c", "#2a3350", "#3b6bff", "#3a3f52", "#0d0f14", "#2b3558", "silver", glass="#9fd8ff", glow="#ff4fd0", glow2="#38e8ff", white="#e8ecf6", leaf="#4f7a55", glow_str=4.0),
}
