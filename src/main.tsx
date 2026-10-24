import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.min.css';
import './styles/style.css';
import { App } from './App';
import { ProvedorDeAutenticacao } from './auth/AuthContext';
import { ProvedorDeFlash } from './components/Flash';
import { ErroApi } from './api/client';

const clienteDeConsultas = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // não insiste em 401/403/404/422 — só em falhas de rede/5xx
      retry: (tentativas, erro) => !(erro instanceof ErroApi && erro.status >= 400 && erro.status < 500) && tentativas < 2,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={clienteDeConsultas}>
      <BrowserRouter>
        <ProvedorDeFlash>
          <ProvedorDeAutenticacao>
            <App />
          </ProvedorDeAutenticacao>
        </ProvedorDeFlash>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
