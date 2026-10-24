import type { ReactNode } from 'react';

/** Cabeçalho padrão das listagens/formulários (bloco oc-page-header do PHP). */
export function CabecalhoDaPagina({ titulo, subtitulo, acoes }: { titulo: string; subtitulo?: ReactNode; acoes?: ReactNode }) {
  return (
    <div className="d-flex justify-content-between align-items-start mb-4 gap-2 flex-wrap">
      <div className="oc-page-header mb-0">
        <h2>{titulo}</h2>
        {subtitulo !== undefined && <p>{subtitulo}</p>}
      </div>
      {acoes && <div className="d-flex gap-2 flex-wrap">{acoes}</div>}
    </div>
  );
}
