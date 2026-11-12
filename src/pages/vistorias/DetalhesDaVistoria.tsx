import { useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { urlDeArquivo } from '../../api/client';
import { idCurto } from '../../api/contratos';
import { useNomeDoUsuario } from '../../api/usuarios';
import {
  agruparItensPorComodo,
  baixarPdfDaVistoria,
  permissoesDaVistoria,
  useChecklist,
  useExcluirVistoria,
  useMudarStatusDaVistoria,
  useNomesDaVistoria,
  type AcaoDeStatus,
} from '../../api/vistorias';
import { useAuth } from '../../auth/AuthContext';
import { podeAcessar, podeCriar } from '../../auth/permissoes';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { useFlash } from '../../components/Flash';
import { salvarArquivo } from '../../utils/arquivos';
import { formatarData, formatarDataHora } from '../../utils/formatar';
import { BadgeEstadoDoItem, BadgeStatusDaVistoria, BadgeTipoDaVistoria } from './BadgesDaVistoria';

const MENSAGEM_DE_SUCESSO: Record<AcaoDeStatus, string> = {
  submeter: 'Vistoria submetida — aguardando aceite do locatário.',
  'enviar-para-aceite': 'Vistoria enviada para aceite.',
  aceitar: 'Vistoria aceita com sucesso.',
  rejeitar: 'Vistoria rejeitada.',
};

/** vistorias/detalhes.php + vistorias/checklist.php (visualização) — unificados numa tela só. */
export function DetalhesDaVistoria() {
  const { id = '' } = useParams();
  const { usuario } = useAuth();
  const { definirFlash } = useFlash();
  const consulta = useChecklist(id);
  const checklist = consulta.data;
  const { nomeDoItem, nomeDoComodo } = useNomesDaVistoria(checklist);
  const nomeDoUsuario = useNomeDoUsuario();
  const mudarStatus = useMudarStatusDaVistoria(id);
  const excluirVistoria = useExcluirVistoria(id);
  const navegar = useNavigate();
  const pode = permissoesDaVistoria(checklist, usuario);

  useEffect(() => {
    if (consulta.isError) definirFlash('erro', 'Vistoria não encontrada.');
  }, [consulta.isError, definirFlash]);

  if (!id || consulta.isError) return <Navigate to="/vistorias" replace />;

  const grupos = agruparItensPorComodo(checklist);
  const aceite = checklist?.aceite as { status?: string; motivo_rejeicao?: string | null; created_at?: string } | null | undefined;

  async function executar(acao: AcaoDeStatus) {
    let motivo: string | undefined;
    if (acao === 'rejeitar') {
      const resposta = window.prompt('Motivo da rejeição (opcional):');
      if (resposta === null) return;
      motivo = resposta.trim();
    }
    try {
      await mudarStatus.mutateAsync({ acao, motivo });
      definirFlash('sucesso', MENSAGEM_DE_SUCESSO[acao]);
    } catch (falha) {
      definirFlash('erro', (falha as Error).message || 'Erro ao executar ação.');
    }
  }

  async function aoExcluir() {
    if (!window.confirm('Excluir esta vistoria? Ela some de todas as listagens e não pode ser recuperada pela tela.')) return;
    try {
      await excluirVistoria.mutateAsync();
      definirFlash('sucesso', 'Vistoria excluída.');
      navegar('/vistorias', { replace: true });
    } catch (falha) {
      definirFlash('erro', (falha as Error).message || 'Erro ao excluir a vistoria.');
    }
  }

  async function aoBaixarPdf() {
    try {
      salvarArquivo(await baixarPdfDaVistoria(id), `vistoria-${id.slice(0, 8)}.pdf`);
    } catch (falha) {
      definirFlash('erro', (falha as Error).message || 'Erro ao gerar o PDF.');
    }
  }

  return (
    <EstadoDaConsulta carregando={consulta.isPending} erro={null}>
      {checklist && (
        <>
          <CabecalhoDaPagina
            titulo="Vistoria"
            subtitulo={`Contrato ${idCurto(checklist.contrato_id)} · Data: ${formatarData(checklist.data_vistoria)}`}
            acoes={
              <>
                {pode.editarItens && (
                  <Link to={`/vistorias/${id}/checklist`} className="btn btn-primary btn-sm">
                    <i className="bi bi-pencil-square me-1" />
                    Preencher checklist
                  </Link>
                )}
                <Link to={`/vistorias/${id}/fotos`} className="btn btn-outline-secondary btn-sm">
                  Fotos
                </Link>
                <Link to={`/vistorias/${id}/comparativo`} className="btn btn-outline-secondary btn-sm">
                  Comparativo
                </Link>
                <Link to={`/vistorias/${id}/relatorio`} className="btn btn-outline-secondary btn-sm">
                  Relatório
                </Link>
                {podeCriar(usuario, 'problemas') && (
                  <Link to={`/problemas/novo?contrato_id=${checklist.contrato_id}`} className="btn btn-outline-danger btn-sm">
                    Registrar problema
                  </Link>
                )}
                {pode.excluir && (
                  <button type="button" className="btn btn-outline-danger btn-sm" onClick={aoExcluir} disabled={excluirVistoria.isPending}>
                    <i className="bi bi-trash me-1" />
                    Excluir
                  </button>
                )}
                <Link to="/vistorias" className="btn btn-link btn-sm">
                  Voltar
                </Link>
              </>
            }
          />

          {pode.aceitarOuRejeitar && (
            <div className="card mb-4 border-info">
              <div className="card-body d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <strong>
                    <i className="bi bi-hand-index me-1" />
                    Vistoria aguardando aceite
                  </strong>
                  <p className="mb-0 small text-muted">Revise os itens abaixo e confirme ou rejeite a vistoria enviada pelo vistoriador.</p>
                </div>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-success btn-sm" onClick={() => executar('aceitar')} disabled={mudarStatus.isPending}>
                    <i className="bi bi-check-lg me-1" />
                    Aceitar vistoria
                  </button>
                  <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => executar('rejeitar')} disabled={mudarStatus.isPending}>
                    <i className="bi bi-x-lg me-1" />
                    Rejeitar
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="row g-4">
            <div className="col-lg-4">
              <div className="card border-0 shadow-sm mb-3">
                <div className="card-header fw-semibold">Informações</div>
                <div className="card-body small">
                  <dl className="row mb-0">
                    <dt className="col-5">Status</dt>
                    <dd className="col-7">
                      <BadgeStatusDaVistoria status={checklist.status} />
                    </dd>
                    <dt className="col-5">Tipo</dt>
                    <dd className="col-7">
                      <BadgeTipoDaVistoria tipo={checklist.tipo} />
                    </dd>
                    <dt className="col-5">Data</dt>
                    <dd className="col-7">{formatarData(checklist.data_vistoria)}</dd>
                    <dt className="col-5">Vistoriador</dt>
                    <dd className="col-7">{nomeDoUsuario(checklist.vistoriador_id) ?? idCurto(checklist.vistoriador_id)}</dd>
                    <dt className="col-5">Contrato</dt>
                    <dd className="col-7">
                      {podeAcessar(usuario, 'contratos') ? <Link to={`/contratos/${checklist.contrato_id}`}>{idCurto(checklist.contrato_id)}</Link> : idCurto(checklist.contrato_id)}
                    </dd>
                    <dt className="col-5">Itens</dt>
                    <dd className="col-7">{checklist.itens?.length ?? 0}</dd>
                  </dl>
                  {aceite?.status && (
                    <div className="mt-3 small">
                      <strong>Aceite:</strong> {aceite.status} em {formatarDataHora(aceite.created_at)}
                      {aceite.motivo_rejeicao && <div className="text-muted">Motivo: {aceite.motivo_rejeicao}</div>}
                    </div>
                  )}
                </div>
              </div>

              {(pode.submeter || pode.enviarParaAceite) && (
                <div className="card border-0 shadow-sm mb-3">
                  <div className="card-header fw-semibold">Ações</div>
                  <div className="card-body d-flex flex-column gap-2">
                    {pode.submeter && (
                      <button type="button" className="btn btn-primary btn-sm w-100" onClick={() => executar('submeter')} disabled={mudarStatus.isPending || !checklist.itens?.length}>
                        Submeter
                      </button>
                    )}
                    {pode.enviarParaAceite && (
                      <button type="button" className="btn btn-warning btn-sm w-100" onClick={() => executar('enviar-para-aceite')} disabled={mudarStatus.isPending}>
                        Enviar para aceite
                      </button>
                    )}
                    {pode.submeter && !checklist.itens?.length && <small className="text-muted">Preencha ao menos um item antes de submeter.</small>}
                  </div>
                </div>
              )}

              <button type="button" className="btn btn-outline-secondary btn-sm w-100" onClick={aoBaixarPdf}>
                <i className="bi bi-file-earmark-pdf me-1" />
                Baixar PDF
              </button>
            </div>

            <div className="col-lg-8">
              {grupos.length === 0 ? (
                <div className="card">
                  <div className="card-body text-center py-5">
                    <i className="bi bi-clipboard-check" style={{ fontSize: 48, color: 'var(--oc-border)' }} />
                    <p className="mt-3 mb-1" style={{ color: 'var(--oc-muted)' }}>
                      Nenhum item preenchido ainda.
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--oc-hint)' }}>O vistoriador preenche este checklist pelo app mobile ou em “Preencher checklist”.</p>
                  </div>
                </div>
              ) : (
                grupos.map(({ comodoId, itens }) => (
                  <div key={comodoId} className="oc-checklist-room">
                    <div className="oc-checklist-room-header">
                      <i className="bi bi-door-open me-2" style={{ color: 'var(--oc-primary)' }} />
                      {nomeDoComodo(comodoId)}
                    </div>
                    {itens.map((item) => (
                      <div key={item.id} className="oc-item-card">
                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                          <div className="oc-item-label">{nomeDoItem(item.item_vistoria_id)}</div>
                          <BadgeEstadoDoItem estado={item.estado} />
                        </div>
                        {item.observacao && (
                          <div className="oc-item-meta mt-2">
                            <i className="bi bi-chat-left-text me-1" />
                            {item.observacao}
                          </div>
                        )}
                        {!!item.fotos?.length && (
                          <div className="d-flex flex-wrap gap-2 mt-3">
                            {item.fotos.map((foto) => (
                              <a key={foto.id} href={urlDeArquivo(foto.url)} target="_blank" rel="noopener noreferrer">
                                <img src={urlDeArquivo(foto.url)} alt="Foto do item" className="oc-photo-thumb" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </EstadoDaConsulta>
  );
}
