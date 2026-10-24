import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ITENS_POR_PAGINA, mfaEstaAtivo, perfilDoUsuario, useListaDeUsuarios } from '../../api/usuarios';
import { useAuth } from '../../auth/AuthContext';
import { podeCriar } from '../../auth/permissoes';
import { BadgeMfa, BadgePerfil } from '../../components/BadgePerfil';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { Paginacao } from '../../components/Paginacao';
import { formatarData } from '../../utils/formatar';

/** usuarios/index.php */
export function ListaDeUsuarios() {
  const { usuario } = useAuth();
  const [parametros, setParametros] = useSearchParams();
  const perfilFiltrado = parametros.get('role') ?? '';
  const pagina = Math.max(1, Number(parametros.get('pagina') ?? 1) || 1);
  const [perfilSelecionado, setPerfilSelecionado] = useState(perfilFiltrado);

  const consulta = useListaDeUsuarios(pagina, perfilFiltrado);
  const usuarios = consulta.data?.dados ?? [];
  const total = consulta.data?.paginacao?.total ?? usuarios.length;
  const totalDePaginas = Math.ceil(total / ITENS_POR_PAGINA);

  function aplicarFiltros(perfil: string, novaPagina = 1) {
    const novosParametros = new URLSearchParams();
    if (perfil) novosParametros.set('role', perfil);
    if (novaPagina > 1) novosParametros.set('pagina', String(novaPagina));
    setParametros(novosParametros);
  }

  function aoFiltrar(evento: FormEvent) {
    evento.preventDefault();
    aplicarFiltros(perfilSelecionado);
  }

  function aoLimpar() {
    setPerfilSelecionado('');
    aplicarFiltros('');
  }

  return (
    <>
      <CabecalhoDaPagina
        titulo="Usuários"
        subtitulo={`${total} usuário(s) cadastrado(s)`}
        acoes={
          podeCriar(usuario, 'usuarios') && (
            <Link to="/usuarios/novo" className="btn btn-primary btn-sm">
              <i className="bi bi-plus-lg me-1" />
              Novo usuário
            </Link>
          )
        }
      />

      <div className="card mb-3">
        <div className="card-body py-3">
          <form className="row g-2 align-items-end" onSubmit={aoFiltrar}>
            <div className="col-md-4">
              <label className="form-label" htmlFor="filtro-perfil">
                Perfil
              </label>
              <select
                id="filtro-perfil"
                className="form-select form-select-sm"
                value={perfilSelecionado}
                onChange={(evento) => setPerfilSelecionado(evento.target.value)}
              >
                <option value="">Todos</option>
                <option value="admin">Admin</option>
                <option value="gestor">Gestor</option>
                <option value="vistoriador">Vistoriador</option>
                <option value="visualizador">Visualizador</option>
                <option value="locatario">Locatário</option>
              </select>
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
            {usuarios.length === 0 ? (
              <div className="p-4" style={{ color: '#6b7fa3', fontSize: 13 }}>
                <i className="bi bi-people me-2" />
                Nenhum usuário encontrado.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Perfil</th>
                      <th>MFA</th>
                      <th>Cadastrado em</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((itemDaLista) => (
                      <tr key={itemDaLista.id}>
                        <td>{itemDaLista.nome || '—'}</td>
                        <td style={{ fontSize: 12 }}>{itemDaLista.email || '—'}</td>
                        <td>
                          <BadgePerfil perfil={perfilDoUsuario(itemDaLista)} />
                        </td>
                        <td>
                          <BadgeMfa ativo={mfaEstaAtivo(itemDaLista)} />
                        </td>
                        <td style={{ fontSize: 12, color: '#6b7fa3' }}>{formatarData(itemDaLista.created_at as string)}</td>
                        <td>
                          <Link
                            to={`/usuarios/${itemDaLista.id}/editar`}
                            className="btn btn-outline-secondary btn-sm py-0 px-2"
                            title="Editar"
                          >
                            <i className="bi bi-pencil" />
                          </Link>
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

      <Paginacao paginaAtual={pagina} totalDePaginas={totalDePaginas} aoMudar={(novaPagina) => aplicarFiltros(perfilFiltrado, novaPagina)} />
    </>
  );
}
