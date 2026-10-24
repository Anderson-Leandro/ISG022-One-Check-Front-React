import { Suspense, type ReactNode } from 'react';

/** Fallback exibido enquanto o chunk de uma página carregada sob demanda é baixado. */
export function CarregandoPagina() {
  return (
    <div className="p-4 text-center" style={{ color: 'var(--oc-muted)' }} role="status">
      <span className="spinner-border spinner-border-sm me-2" />
      Carregando…
    </div>
  );
}

/** Suspense com o fallback padrão — usado em volta do Outlet de cada layout para manter a navegação visível. */
export function SuspenseDaPagina({ children }: { children: ReactNode }) {
  return <Suspense fallback={<CarregandoPagina />}>{children}</Suspense>;
}
