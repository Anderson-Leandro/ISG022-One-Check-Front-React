import { useState, type FormEvent } from 'react';
import { ROTULO_DO_STATUS_DO_PROBLEMA, textoDaAtualizacao, useAtualizacoesDoProblema, useRegistrarAtualizacao } from '../../api/problemas';
import { BadgeStatus } from '../../components/BadgeStatus';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { useFlash } from '../../components/Flash';
import { formatarDataHora } from '../../utils/formatar';

/** Atualizações do problema (GET/POST /problemas/{id}/atualizacoes) — não existia no PHP. */
export function LinhaDoTempoDoProblema({ problemaId, podeComentar }: { problemaId: string; podeComentar: boolean }) {
  const { definirFlash } = useFlash();
  const consulta = useAtualizacoesDoProblema(problemaId);
  const registrarAtualizacao = useRegistrarAtualizacao(problemaId);
  const [texto, setTexto] = useState('');
  const atualizacoes = [...(consulta.data ?? [])].sort((primeira, segunda) => String(segunda.created_at ?? '').localeCompare(String(primeira.created_at ?? '')));

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    if (!texto.trim()) return;
    try {
      await registrarAtualizacao.mutateAsync(texto.trim());
      setTexto('');
      definirFlash('sucesso', 'Atualização registrada.');
    } catch (falha) {
      definirFlash('erro', (falha as Error).message || 'Erro ao registrar atualização.');
    }
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header fw-semibold">Atualizações</div>
      {podeComentar && (
        <div className="card-body border-bottom">
          <form onSubmit={aoEnviar} className="d-flex gap-2">
            <input className="form-control form-control-sm" placeholder="Descreva o andamento…" aria-label="Nova atualização" value={texto} onChange={(evento) => setTexto(evento.target.value)} />
            <button className="btn btn-primary btn-sm text-nowrap" disabled={registrarAtualizacao.isPending || !texto.trim()}>
              Registrar
            </button>
          </form>
        </div>
      )}
      <EstadoDaConsulta carregando={consulta.isPending} erro={consulta.error}>
        <ul className="list-group list-group-flush">
          {atualizacoes.length === 0 ? (
            <li className="list-group-item text-muted small">Nenhuma atualização.</li>
          ) : (
            atualizacoes.map((atualizacao) => (
              <li key={atualizacao.id} className="list-group-item small">
                <div className="d-flex justify-content-between gap-2">
                  <span className="text-muted">
                    {formatarDataHora(atualizacao.created_at)}
                    {(atualizacao.usuario_nome || atualizacao.autor) && ` · ${atualizacao.usuario_nome || atualizacao.autor}`}
                  </span>
                  {atualizacao.status && <BadgeStatus grupo="problema" valor={atualizacao.status} rotulo={ROTULO_DO_STATUS_DO_PROBLEMA[atualizacao.status]} />}
                </div>
                {textoDaAtualizacao(atualizacao) && <div className="mt-1" style={{ whiteSpace: 'pre-line' }}>{textoDaAtualizacao(atualizacao)}</div>}
              </li>
            ))
          )}
        </ul>
      </EstadoDaConsulta>
    </div>
  );
}
