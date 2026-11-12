import { capitalizar } from '../utils/formatar';

/** Equivalente a badge_status($grupo, $valor) de includes/partials.php. */
const CORES_POR_GRUPO: Record<string, Record<string, string>> = {
  imovel: { disponivel: 'success', locado: 'primary', ocupado: 'primary', em_vistoria: 'info', manutencao: 'warning', inativo: 'secondary' },
  vistoria: { rascunho: 'secondary', em_andamento: 'info', concluida: 'success', cancelada: 'dark' },
  contrato: { rascunho: 'secondary', ativo: 'success', encerrado: 'dark', cancelado: 'danger' },
  problema: { aberto: 'danger', em_andamento: 'warning', em_analise: 'warning', resolvido: 'success', fechado: 'secondary', cancelado: 'secondary' },
  prioridade: { baixa: 'secondary', normal: 'info', media: 'info', alta: 'warning', urgente: 'danger' },
};

export type GrupoDeStatus = 'imovel' | 'vistoria' | 'contrato' | 'problema' | 'prioridade';

export function BadgeStatus({ grupo, valor, rotulo }: { grupo: GrupoDeStatus; valor: string | null | undefined; rotulo?: string }) {
  const valorNormalizado = String(valor ?? '');
  const cor = CORES_POR_GRUPO[grupo][valorNormalizado] ?? 'secondary';
  return <span className={`badge text-bg-${cor}`}>{rotulo ?? (valorNormalizado ? capitalizar(valorNormalizado) : '—')}</span>;
}
