import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { mfaEstaAtivo, perfilDoUsuario, useAlternarMeuMfa, useAtualizarMeuPerfil, useMeuUsuario } from '../../api/usuarios';
import { useAuth } from '../../auth/AuthContext';
import { armazenamentoDeTokens } from '../../auth/armazenamentoDeTokens';
import { rotaInicial } from '../../auth/permissoes';
import { BadgeMfa, BadgePerfil } from '../../components/BadgePerfil';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { useFlash } from '../../components/Flash';

/** usuarios/perfil.php — usa /usuarios/me no lugar de /usuarios/{id}. */
export function MeuPerfil() {
  const { usuario } = useAuth();
  const { definirFlash } = useFlash();
  const consulta = useMeuUsuario();
  const atualizarPerfil = useAtualizarMeuPerfil();
  const alternarMfa = useAlternarMeuMfa();
  const [formulario, setFormulario] = useState({ nome: '', senhaAtual: '', senhaNova: '' });

  const dados = consulta.data ?? usuario;
  useEffect(() => {
    if (consulta.data) setFormulario((anterior) => ({ ...anterior, nome: consulta.data.nome ?? '' }));
  }, [consulta.data]);

  const mfaHabilitado = dados ? mfaEstaAtivo(dados) : false;

  function atualizarUsuarioGuardado(alteracoes: Record<string, unknown>) {
    if (usuario) armazenamentoDeTokens.salvarUsuario({ ...usuario, ...alteracoes });
  }

  async function aoAlternarMfa() {
    const habilitar = !mfaHabilitado;
    if (!habilitar && !window.confirm('Desabilitar MFA apagará sua configuração TOTP. Confirmar?')) return;
    try {
      await alternarMfa.mutateAsync(habilitar);
      atualizarUsuarioGuardado({ mfa_ativo: habilitar, mfa_enabled: habilitar });
      definirFlash('sucesso', habilitar ? 'MFA habilitado. Configure o autenticador no próximo login.' : 'MFA desabilitado. A configuração TOTP foi apagada.');
    } catch (falha) {
      definirFlash('erro', (falha as Error).message || `Erro ao ${habilitar ? 'habilitar' : 'desabilitar'} MFA.`);
    }
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    const nome = formulario.nome.trim();
    if (!nome) {
      definirFlash('erro', 'Nome é obrigatório.');
      return;
    }
    try {
      await atualizarPerfil.mutateAsync({
        nome,
        ...(formulario.senhaNova ? { senha_atual: formulario.senhaAtual, senha_nova: formulario.senhaNova } : {}),
      });
      atualizarUsuarioGuardado({ nome });
      setFormulario({ nome, senhaAtual: '', senhaNova: '' });
      definirFlash('sucesso', 'Perfil atualizado.');
    } catch (falha) {
      definirFlash('erro', (falha as Error).message || 'Erro ao atualizar perfil.');
    }
  }

  return (
    <>
      <CabecalhoDaPagina titulo="Meu perfil" subtitulo={dados?.email} />
      <div className="row justify-content-center">
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <EstadoDaConsulta carregando={consulta.isPending && !dados} erro={null}>
                <p className="mb-3 d-flex gap-2">
                  {dados && <BadgePerfil perfil={perfilDoUsuario(dados)} />}
                  <BadgeMfa ativo={mfaHabilitado} rotuloAtivo="MFA ativo" rotuloInativo="MFA desabilitado" />
                </p>

                <div className="d-flex gap-2 mb-3">
                  {mfaHabilitado && (
                    <Link to="/mfa/configurar" className="btn btn-outline-primary btn-sm">
                      <i className="bi bi-arrow-repeat me-1" />
                      Reconfigurar autenticador
                    </Link>
                  )}
                  <button
                    type="button"
                    className={`btn btn-sm ${mfaHabilitado ? 'btn-outline-danger' : 'btn-outline-success'}`}
                    onClick={aoAlternarMfa}
                    disabled={alternarMfa.isPending}
                  >
                    <i className={`bi ${mfaHabilitado ? 'bi-shield-x' : 'bi-shield-check'} me-1`} />
                    {mfaHabilitado ? 'Desabilitar MFA' : 'Habilitar MFA'}
                  </button>
                </div>

                <form onSubmit={aoEnviar} className="row g-3">
                  <div className="col-12">
                    <label className="form-label" htmlFor="nome">
                      Nome
                    </label>
                    <input id="nome" className="form-control" required value={formulario.nome} onChange={(evento) => setFormulario({ ...formulario, nome: evento.target.value })} />
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="email">
                      E-mail
                    </label>
                    <input id="email" className="form-control" value={dados?.email ?? ''} disabled />
                  </div>
                  <div className="col-12">
                    <hr />
                    <p className="small text-muted mb-0">Alterar senha (opcional)</p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="senha-atual">
                      Senha atual
                    </label>
                    <input id="senha-atual" type="password" className="form-control" autoComplete="current-password" required={Boolean(formulario.senhaNova)} value={formulario.senhaAtual} onChange={(evento) => setFormulario({ ...formulario, senhaAtual: evento.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="senha-nova">
                      Nova senha
                    </label>
                    <input id="senha-nova" type="password" className="form-control" minLength={6} autoComplete="new-password" value={formulario.senhaNova} onChange={(evento) => setFormulario({ ...formulario, senhaNova: evento.target.value })} />
                  </div>
                  <div className="col-12">
                    <button className="btn btn-primary" disabled={atualizarPerfil.isPending}>
                      Salvar
                    </button>
                    <Link to={rotaInicial(usuario)} className="btn btn-link">
                      Voltar
                    </Link>
                  </div>
                </form>
              </EstadoDaConsulta>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
