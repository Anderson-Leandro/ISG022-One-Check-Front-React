import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ITENS_POR_PAGINA_DE_LOG, useLogs } from '../../api/painel';
import { useNomeDoUsuario } from '../../api/usuarios';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { Paginacao } from '../../components/Paginacao';
import { formatarDataHora } from '../../utils/formatar';

/** A API grava ações em minúsculas (login, mfa_verify, create…); a cor segue o tipo de operação. */
function classeDaAcao(acao: string): string {
  const normalizada = acao.toLowerCase();
  if (normalizada.includes('create') || normalizada.includes('criar')) return 'bg-success';
  if (normalizada.includes('update') || normalizada.includes('atualiz')) return 'bg-warning text-dark';
  if (normalizada.includes('delete') || normalizada.includes('remov')) return 'bg-danger';
  if (normalizada.includes('login') || normalizada.includes('mfa') || normalizada.includes('logout')) return 'bg-info text-dark';
  return 'bg-secondary';
}

const CAMPOS_DE_FILTRO = ['acao', 'entidade', 'de', 'ate'] as const;

/** dashboard/logs.php — com os filtros que a API oferece (acao, entidade, de, ate). */
export function Logs() {
  const [parametros, setParametros] = useSearchParams();
  const filtros = {
    pagina: Math.max(1, Number(parametros.get('pagina') ?? 1) || 1),
    acao: parametros.get('acao') ?? '',
    entidade: parametros.get('entidade') ?? '',
    de: parametros.get('de') ?? '',
    ate: parametros.get('ate') ?? '',
  };
  const [rascunho, setRascunho] = useState({ acao: filtros.acao, entidade: filtros.entidade, de: filtros.de, ate: filtros.ate });
  const consulta = useLogs(filtros);
  const nomeDoUsuario = useNomeDoUsuario();
  const logs = consulta.data?.dados ?? [];
  const total = consulta.data?.paginacao?.total ?? logs.length;

  function aplicar(valores: typeof rascunho, pagina = 1) {
    const novosParametros = new URLSearchParams();
    for (const campo of CAMPOS_DE_FILTRO) if (valores[campo]) novosParametros.set(campo, valores[campo]);
    if (pagina > 1) novosParametros.set('pagina', String(pagina));
    setParametros(novosParametros);
  }

  function aoFiltrar(evento: FormEvent) {
    evento.preventDefault();
    aplicar(rascunho);
  }

  function aoLimpar() {
    const vazio = { acao: '', entidade: '', de: '', ate: '' };
    setRascunho(vazio);
    aplicar(vazio);
  }

  return (
    <>
      <CabecalhoDaPagina titulo="Logs de operações" subtitulo={`${total} registro(s) de auditoria`} />

      <div className="card mb-3">
        <div className="card-body py-3">
          <form className="row g-2 align-items-end" onSubmit={aoFiltrar}>
            <div className="col-md-3">
              <label className="form-label" htmlFor="filtro-acao">
                Ação
              </label>
              <input id="filtro-acao" className="form-control form-control-sm" placeholder="ex.: login" value={rascunho.acao} onChange={(evento) => setRascunho({ ...rascunho, acao: evento.target.value })} />
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="filtro-entidade">
                Entidade
              </label>
              <input id="filtro-entidade" className="form-control form-control-sm" placeholder="ex.: usuario" value={rascunho.entidade} onChange={(evento) => setRascunho({ ...rascunho, entidade: evento.target.value })} />
            </div>
            <div className="col-md-2">
              <label className="form-label" htmlFor="filtro-de">
                De
              </label>
              <input id="filtro-de" type="date" className="form-control form-control-sm" value={rascunho.de} onChange={(evento) => setRascunho({ ...rascunho, de: evento.target.value })} />
            </div>
            <div className="col-md-2">
              <label className="form-label" htmlFor="filtro-ate">
                Até
              </label>
              <input id="filtro-ate" type="date" className="form-control form-control-sm" value={rascunho.ate} onChange={(evento) => setRascunho({ ...rascunho, ate: evento.target.value })} />
            </div>
            <div className="col-auto">
              <button className="btn btn-primary btn-sm">Filtrar</button>
              <button type="button" className="btn btn-outline-secondary btn-sm ms-1" onClick={aoLimpar}>
                Limpar
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <EstadoDaConsulta carregando={consulta.isPending} erro={consulta.error}>
            {logs.length === 0 ? (
              <div className="p-4" style={{ color: '#6b7fa3', fontSize: 13 }}>
                <i className="bi bi-list-ul me-2" />
                Nenhum log encontrado.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Ação</th>
                      <th>Entidade</th>
                      <th>Usuário</th>
                      <th>Detalhes</th>
                      <th>IP</th>
                      <th>Data/Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <span className={`badge ${classeDaAcao(log.acao)}`}>{log.acao}</span>
                        </td>
                        <td>{log.entidade || '—'}</td>
                        <td style={{ fontSize: 12 }}>{nomeDoUsuario(log.usuario_id) ?? '—'}</td>
                        <td style={{ fontSize: 12, color: '#6b7fa3' }}>{log.detalhes || '—'}</td>
                        <td style={{ fontSize: 12, color: '#6b7fa3' }}>{log.ip || '—'}</td>
                        <td style={{ fontSize: 12, color: '#6b7fa3' }} className="text-nowrap">
                          {formatarDataHora(log.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </EstadoDaConsulta>
        </div>
      </div>

      <Paginacao paginaAtual={filtros.pagina} totalDePaginas={Math.ceil(total / ITENS_POR_PAGINA_DE_LOG)} aoMudar={(pagina) => aplicar(filtros, pagina)} />
    </>
  );
}
