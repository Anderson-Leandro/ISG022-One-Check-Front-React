import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { mfaEstaAtivo, perfilDoUsuario, temAutenticadorConfigurado, useAtualizarMeuPerfil, useDesabilitarMeuMfa, useMeuUsuario } from '../../api/usuarios';
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
  const desabilitarMfa = useDesabilitarMeuMfa();
  const [desabilitando, setDesabilitando] = useState(false);
  const [confirmacao, setConfirmacao] = useState({ senha: '', codigo: '' });
  const [formulario, setFormulario] = useState({ nome: '', senhaAtual: '', senhaNova: '' });

  const dados = consulta.data ?? usuario;
  useEffect(() => {
    if (consulta.data) setFormulario((anterior) => ({ ...anterior, nome: consulta.data.nome ?? '' }));
  }, [consulta.data]);

  const mfaHabilitado = dados ? mfaEstaAtivo(dados) : false;
  const autenticadorConfigurado = dados ? temAutenticadorConfigurado(dados) : false;
  // nos outros perfis o MFA é obrigatório e a API recusa (403) o desligamento
  const podeDesabilitarMfa = mfaHabilitado && dados !== null && perfilDoUsuario(dados) === 'locatario';

  function atualizarUsuarioGuardado(alteracoes: Record<string, unknown>) {
    if (usuario) armazenamentoDeTokens.salvarUsuario({ ...usuario, ...alteracoes });
  }

  function fecharConfirmacao() {
    setDesabilitando(false);
    setConfirmacao({ senha: '', codigo: '' });
  }

  async function aoDesabilitarMfa(evento: FormEvent) {
    evento.preventDefault();
    try {
      await desabilitarMfa.mutateAsync({ senha: confirmacao.senha, ...(autenticadorConfigurado ? { codigo: confirmacao.codigo } : {}) });
      atualizarUsuarioGuardado({ mfa_ativo: false, mfa_enabled: false, mfa_configurado: false });
      fecharConfirmacao();
      definirFlash('sucesso', 'MFA desabilitado. A configuração do autenticador foi apagada.');
    } catch (falha) {
      definirFlash('erro', (falha as Error).message || 'Erro ao desabilitar MFA.');
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
                  <Link to="/mfa/configurar" className={`btn btn-sm ${autenticadorConfigurado ? 'btn-outline-primary' : 'btn-outline-success'}`}>
                    <i className={`bi ${autenticadorConfigurado ? 'bi-arrow-repeat' : 'bi-shield-check'} me-1`} />
                    {autenticadorConfigurado ? 'Trocar autenticador' : 'Configurar MFA'}
                  </Link>
                  {podeDesabilitarMfa && !desabilitando && (
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setDesabilitando(true)}>
                      <i className="bi bi-shield-x me-1" />
                      Desabilitar MFA
                    </button>
                  )}
                </div>

                {podeDesabilitarMfa && desabilitando && (
                  <form onSubmit={aoDesabilitarMfa} className="row g-2 align-items-end mb-4 p-3" style={{ background: '#0f172a', borderRadius: 8, border: '1px solid #1e293b' }}>
                    <p className="small text-muted col-12 mb-1">Desabilitar o MFA apaga a configuração do autenticador. Confirme com a sua senha{autenticadorConfigurado && ' e o código atual'}.</p>
                    <div className="col-md-5">
                      <label className="form-label" htmlFor="senha-para-desabilitar">
                        Senha
                      </label>
                      <input id="senha-para-desabilitar" type="password" className="form-control form-control-sm" required autoComplete="current-password" value={confirmacao.senha} onChange={(evento) => setConfirmacao({ ...confirmacao, senha: evento.target.value })} />
                    </div>
                    {autenticadorConfigurado && (
                      <div className="col-md-3">
                        <label className="form-label" htmlFor="codigo-para-desabilitar">
                          Código
                        </label>
                        <input id="codigo-para-desabilitar" className="form-control form-control-sm" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" placeholder="000000" value={confirmacao.codigo} onChange={(evento) => setConfirmacao({ ...confirmacao, codigo: evento.target.value.replace(/\D/g, '') })} />
                      </div>
                    )}
                    <div className="col-auto">
                      <button className="btn btn-danger btn-sm" disabled={desabilitarMfa.isPending}>
                        Desabilitar
                      </button>
                      <button type="button" className="btn btn-outline-secondary btn-sm ms-1" onClick={fecharConfirmacao}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}

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
