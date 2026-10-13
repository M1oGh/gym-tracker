import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { applyTheme, watchSystemTheme } from './theme';
import '@fontsource/big-shoulders-display/latin-800';
import '@fontsource/inter-tight/latin-400';
import '@fontsource/inter-tight/latin-500';
import '@fontsource/inter-tight/latin-600';
import '@fontsource/instrument-serif/latin-400-italic';
import '@fontsource/ibm-plex-mono/latin-400';
import '@fontsource/ibm-plex-mono/latin-500';
import './index.css';

applyTheme();
watchSystemTheme();
registerSW({ immediate: true });

// Ask the browser not to evict our IndexedDB data under storage pressure.
void navigator.storage?.persist?.();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
