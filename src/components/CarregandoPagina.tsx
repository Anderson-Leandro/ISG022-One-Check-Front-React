import { Suspense, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { LimiteDeErro } from './LimiteDeErro';

/** Fallback exibido enquanto o chunk de uma página carregada sob demanda é baixado. */
export function CarregandoPagina() {
  return (
    <div className="p-4 text-center" style={{ color: 'var(--oc-muted)' }} role="status">
      <span className="spinner-border spinner-border-sm me-2" />
      Carregando…
    </div>
  );
}

/**
 * Suspense com o fallback padrão e um limite de erro, usado em volta do Outlet de cada layout: a navegação
 * continua visível enquanto a página carrega ou se ela falhar, e trocar de rota tira a tela de erro.
 */
export function SuspenseDaPagina({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <LimiteDeErro chaveDeReinicio={pathname}>
      <Suspense fallback={<CarregandoPagina />}>{children}</Suspense>
    </LimiteDeErro>
  );
}
