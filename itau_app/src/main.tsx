import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ClienteProvider} from './features/cliente/ClienteContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClienteProvider>
      <App />
    </ClienteProvider>
  </StrictMode>,
);
