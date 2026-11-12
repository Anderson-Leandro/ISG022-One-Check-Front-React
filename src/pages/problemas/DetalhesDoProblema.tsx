import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { urlDeArquivo } from '../../api/client';
import { idCurto } from '../../api/contratos';
import { problemaEstaEncerrado, ROTULO_DA_PRIORIDADE, ROTULO_DO_STATUS_DO_PROBLEMA, useAtualizarStatusDoProblema, useExcluirProblema, useProblema, type StatusDoProblema } from '../../api/problemas';
import { useAuth } from '../../auth/AuthContext';
import { perfilDo, podeAcessar } from '../../auth/permissoes';
import { BadgeStatus } from '../../components/BadgeStatus';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { useFlash } from '../../components/Flash';
import { formatarDataHora } from '../../utils/formatar';
import { LinhaDoTempoDoProblema } from './LinhaDoTempoDoProblema';

/** Só admin e gestor mudam o status (PATCH /status) e registram andamento. */
const PERFIS_QUE_ATUALIZAM = ['admin', 'gestor'];

/** problemas/detalhes.php */
export function DetalhesDoProblema() {
  const { id = '' } = useParams();
  const { usuario } = useAuth();
  const { definirFlash } = useFlash();
  const consulta = useProblema(id);
  const atualizarStatus = useAtualizarStatusDoProblema(id);
  const [statusSelecionado, setStatusSelecionado] = useState('');
  const problema = consulta.data;
  const podeAtualizar = PERFIS_QUE_ATUALIZAM.includes(perfilDo(usuario));
  // o locatário dono do contrato comenta enquanto o problema não estiver resolvido nem fechado (depois a API responde 409)
  const podeComentar = podeAtualizar || (perfilDo(usuario) === 'locatario' && Boolean(problema) && !problemaEstaEncerrado(problema?.status));
  // a API só exclui problema aberto e sem atualizações; o segundo caso volta como 409 com a mensagem
  const podeExcluir = podeAtualizar && problema?.status === 'aberto';
  const excluirProblema = useExcluirProblema(id);
  const navegar = useNavigate();

  useEffect(() => {
    if (problema?.status) setStatusSelecionado(problema.status);
  }, [problema?.status]);

  useEffect(() => {
    if (consulta.isError) definirFlash('erro', 'Problema não encontrado.');
  }, [consulta.isError, definirFlash]);

  if (!id || consulta.isError) return <Navigate to="/problemas" replace />;

  async function aoSalvarStatus(evento: FormEvent) {
    evento.preventDefault();
    try {
      await atualizarStatus.mutateAsync(statusSelecionado as StatusDoProblema);
      definirFlash('sucesso', 'Status atualizado.');
    } catch (falha) {
      definirFlash('erro', (falha as Error).message || 'Erro ao atualizar.');
    }
  }

  async function aoExcluir() {
    if (!window.confirm('Excluir este problema? Ele some de todas as listagens e não pode ser recuperado pela tela.')) return;
    try {
      await excluirProblema.mutateAsync();
      definirFlash('sucesso', 'Problema excluído.');
      navegar('/problemas', { replace: true });
    } catch (falha) {
      definirFlash('erro', (falha as Error).message || 'Erro ao excluir o problema.');
    }
  }

  const urlDaFoto = urlDeArquivo(problema?.foto_url);

  return (
    <EstadoDaConsulta carregando={consulta.isPending} erro={null}>
      {problema && (
        <>
          <CabecalhoDaPagina
            titulo={problema.titulo || 'Problema'}
            subtitulo={`Contrato: ${idCurto(problema.contrato_id)}`}
            acoes={
              <>
                <Link to={`/problemas/${id}/historico`} className="btn btn-outline-secondary btn-sm">
                  Histórico
                </Link>
                {podeExcluir && (
                  <button type="button" className="btn btn-outline-danger btn-sm" onClick={aoExcluir} disabled={excluirProblema.isPending}>
                    <i className="bi bi-trash me-1" />
                    Excluir
                  </button>
                )}
                <Link to="/problemas" className="btn btn-link btn-sm">
                  Voltar
                </Link>
              </>
            }
          />

          <div className="row g-4">
            <div className="col-lg-8">
              <div className="card border-0 shadow-sm mb-3">
                <div className="card-body">
                  <p className="mb-2 d-flex gap-2">
                    <BadgeStatus grupo="problema" valor={problema.status} rotulo={ROTULO_DO_STATUS_DO_PROBLEMA[problema.status ?? '']} />
                    <BadgeStatus grupo="prioridade" valor={problema.prioridade ?? 'normal'} rotulo={ROTULO_DA_PRIORIDADE[problema.prioridade ?? 'normal']} />
                  </p>
                  {problema.descricao ? <p style={{ whiteSpace: 'pre-line' }}>{problema.descricao}</p> : <p className="text-muted">Sem descrição.</p>}

                  {urlDaFoto && (
                    <div className="mb-3">
                      <a href={urlDaFoto} target="_blank" rel="noopener noreferrer">
                        <img src={urlDaFoto} alt="Foto do problema" style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 4 }} />
                      </a>
                    </div>
                  )}

                  <hr />
                  <dl className="row small mb-0">
                    <dt className="col-sm-3">Contrato</dt>
                    <dd className="col-sm-9">
                      {podeAcessar(usuario, 'contratos') ? <Link to={`/contratos/${problema.contrato_id}`}>{idCurto(problema.contrato_id)}</Link> : idCurto(problema.contrato_id)}
                    </dd>
                    {problema.comodo_id && (
                      <>
                        <dt className="col-sm-3">Cômodo</dt>
                        <dd className="col-sm-9">{problema.comodo_id}</dd>
                      </>
                    )}
                    <dt className="col-sm-3">Criado em</dt>
                    <dd className="col-sm-9">{formatarDataHora(problema.created_at)}</dd>
                  </dl>
                </div>
              </div>

              <LinhaDoTempoDoProblema problemaId={id} podeComentar={podeComentar} />
            </div>

            {podeAtualizar && (
              <div className="col-lg-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-header fw-semibold">Atualizar status</div>
                  <div className="card-body">
                    <form onSubmit={aoSalvarStatus}>
                      <select className="form-select mb-2" aria-label="Status" value={statusSelecionado} onChange={(evento) => setStatusSelecionado(evento.target.value)}>
                        {Object.entries(ROTULO_DO_STATUS_DO_PROBLEMA).map(([valor, rotulo]) => (
                          <option key={valor} value={valor}>
                            {rotulo}
                          </option>
                        ))}
                      </select>
                      <button className="btn btn-primary w-100" disabled={atualizarStatus.isPending || statusSelecionado === problema.status}>
                        Salvar
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </EstadoDaConsulta>
  );
}
