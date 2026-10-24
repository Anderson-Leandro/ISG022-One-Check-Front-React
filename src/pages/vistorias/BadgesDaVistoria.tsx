import { ROTULO_DO_ESTADO, ROTULO_DO_TIPO_DE_VISTORIA, STATUS_DA_VISTORIA } from '../../api/vistorias';

export function BadgeStatusDaVistoria({ status }: { status: string | undefined }) {
  const configuracao = STATUS_DA_VISTORIA[status ?? ''] ?? { rotulo: status || '—', classe: 'bg-secondary' };
  return <span className={`badge ${configuracao.classe}`}>{configuracao.rotulo}</span>;
}

/** Classes badge-inicial / badge-final do style.css. */
export function BadgeTipoDaVistoria({ tipo }: { tipo: string | undefined }) {
  return <span className={`badge ${tipo === 'encerramento' ? 'badge-final' : 'badge-inicial'}`}>{ROTULO_DO_TIPO_DE_VISTORIA[tipo ?? ''] ?? tipo ?? '—'}</span>;
}

/** Classes oc-estado-* do style.css. */
export function BadgeEstadoDoItem({ estado }: { estado: string | null | undefined }) {
  if (!estado) return <span className="badge bg-secondary">Não preenchido</span>;
  return <span className={`oc-estado oc-estado-${estado}`}>{ROTULO_DO_ESTADO[estado] ?? estado}</span>;
}
