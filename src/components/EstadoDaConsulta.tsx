import type { ReactNode } from 'react';

/** Mostra carregando/erro de uma consulta TanStack Query antes do conteúdo. */
export function EstadoDaConsulta({ carregando, erro, children }: { carregando: boolean; erro: Error | null; children: ReactNode }) {
  if (carregando) {
    return (
      <div className="p-4 text-center" style={{ color: 'var(--oc-muted)' }}>
        <span className="spinner-border spinner-border-sm me-2" />
        Carregando…
      </div>
    );
  }
  if (erro) {
    return (
      <div className="alert alert-danger m-3">
        <i className="bi bi-exclamation-triangle me-2" />
        {erro.message}
      </div>
    );
  }
  return <>{children}</>;
}
