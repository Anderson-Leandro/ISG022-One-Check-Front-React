import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ErroApi } from '../../api/client';
import { mfaEstaExigido, perfilDoUsuario, ROTULO_DO_PERFIL, temAutenticadorConfigurado, useAtualizarUsuario, useDesativarUsuario, useMfaDoUsuario, useUsuario } from '../../api/usuarios';
import { useAuth } from '../../auth/AuthContext';
import { perfisAtribuiveisPor, podeGerenciarUsuario } from '../../auth/permissoes';
import { BadgeMfa } from '../../components/BadgePerfil';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { CampoDeSenhaNova } from '../../components/CampoDeSenhaNova';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { useFlash } from '../../components/Flash';
import { validarSenhaNova } from '../../utils/senha';

/** usuarios/editar.php */
export function EditarUsuario() {
  const { id = '' } = useParams();
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const { definirFlash } = useFlash();
  const ehAPropriaConta = id === usuario?.id;
  // a API recusa o próprio ID na gestão de usuários: a própria conta é editada em Meu perfil
  const consulta = useUsuario(ehAPropriaConta ? '' : id);
  const atualizarUsuario = useAtualizarUsuario(id);
  const mfaDoUsuario = useMfaDoUsuario(id);
  const desativarUsuario = useDesativarUsuario(id);
  const [formulario, setFormulario] = useState({ nome: '', perfil: '', senha: '' });
  const [erroDaSenha, setErroDaSenha] = useState<string | null>(null);

  const alvo = consulta.data;
  const semPermissao = Boolean(alvo) && !podeGerenciarUsuario(usuario, alvo!);
  // preenche uma vez por usuário: as recargas (ex.: depois de exigir ou resetar o MFA) não apagam o que foi digitado
  const idPreenchido = useRef<string | null>(null);
  useEffect(() => {
    if (!alvo || idPreenchido.current === alvo.id) return;
    idPreenchido.current = alvo.id;
    setFormulario({ nome: alvo.nome ?? '', perfil: perfilDoUsuario(alvo), senha: '' });
  }, [alvo]);

  useEffect(() => {
    if (consulta.isError) definirFlash('erro', consulta.error.message || 'Usuário não encontrado.');
    else if (semPermissao) definirFlash('erro', 'Você não pode editar um usuário com este perfil.');
  }, [consulta.isError, consulta.error, semPermissao, definirFlash]);

  if (ehAPropriaConta) return <Navigate to="/usuarios/perfil" replace />;
  if (!id || consulta.isError || semPermissao) return <Navigate to="/usuarios" replace />;

  const mfaExigido = alvo ? mfaEstaExigido(alvo) : false;
  const autenticadorConfigurado = alvo ? temAutenticadorConfigurado(alvo) : false;
  const perfisDisponiveis = perfisAtribuiveisPor(usuario);

  async function aoMudarMfa(acao: 'exigir' | 'resetar') {
    if (acao === 'resetar' && !window.confirm('Resetar o MFA apaga o autenticador deste usuário e encerra as sessões dele. Confirmar?')) return;
    try {
      await mfaDoUsuario.mutateAsync(acao);
      definirFlash('sucesso', acao === 'exigir' ? 'MFA exigido. O usuário configura o autenticador no próximo login.' : 'MFA resetado. O autenticador do usuário foi apagado.');
    } catch (falha) {
      definirFlash('erro', (falha as Error).message || 'Erro ao alterar o MFA.');
    }
  }

  async function aoDesativar() {
    const nome = alvo?.nome || 'este usuário';
    if (!window.confirm(`Desativar ${nome}? A pessoa perde o acesso na hora e as sessões dela são encerradas.`)) return;
    try {
      await desativarUsuario.mutateAsync();
      definirFlash('sucesso', `${nome} foi desativado e não consegue mais entrar.`);
      navegar('/usuarios', { replace: true });
    } catch (falha) {
      definirFlash('erro', (falha as Error).message || 'Erro ao desativar o usuário.');
    }
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    const nome = formulario.nome.trim();
    if (!nome) {
      definirFlash('erro', 'Nome é obrigatório.');
      return;
    }
    const senhaInvalida = formulario.senha ? validarSenhaNova(formulario.senha) : null;
    setErroDaSenha(senhaInvalida);
    if (senhaInvalida) return;
    if (!perfisDisponiveis.includes(formulario.perfil)) {
      definirFlash('erro', 'Escolha um perfil válido para este usuário.');
      return;
    }
    try {
      await atualizarUsuario.mutateAsync({ nome, role: formulario.perfil, ...(formulario.senha ? { senha: formulario.senha } : {}) });
      definirFlash('sucesso', 'Usuário atualizado.');
      navegar('/usuarios');
    } catch (falha) {
      if (falha instanceof ErroApi && falha.erros.senha) setErroDaSenha(falha.erros.senha);
      else definirFlash('erro', (falha as Error).message || 'Erro ao atualizar usuário.');
    }
  }

  return (
    <EstadoDaConsulta carregando={consulta.isPending} erro={null}>
      <CabecalhoDaPagina titulo={`Editar ${alvo?.nome ?? ''}`} subtitulo={alvo?.email} />

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="d-flex align-items-center gap-2 mb-4 p-3" style={{ background: '#0f172a', borderRadius: 8, border: '1px solid #1e293b' }}>
            <div className="flex-grow-1">
              <span className="small text-muted">MFA</span>
              <div className="mt-1 d-flex gap-2">
                <BadgeMfa ativo={mfaExigido} rotuloAtivo="Exigido" rotuloInativo="Não exigido" />
                {mfaExigido && <BadgeMfa ativo={autenticadorConfigurado} rotuloAtivo="Autenticador configurado" rotuloInativo="Autenticador pendente" />}
              </div>
            </div>
            {!mfaExigido && (
              <button type="button" className="btn btn-sm btn-outline-success" onClick={() => aoMudarMfa('exigir')} disabled={mfaDoUsuario.isPending}>
                <i className="bi bi-shield-check me-1" />
                Exigir MFA
              </button>
            )}
            {(mfaExigido || autenticadorConfigurado) && (
              <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => aoMudarMfa('resetar')} disabled={mfaDoUsuario.isPending}>
                <i className="bi bi-shield-x me-1" />
                Resetar MFA
              </button>
            )}
          </div>

          <form onSubmit={aoEnviar} className="row g-3" noValidate>
            <div className="col-md-6">
              <label className="form-label" htmlFor="nome">
                Nome
              </label>
              <input id="nome" className="form-control" required value={formulario.nome} onChange={(evento) => setFormulario({ ...formulario, nome: evento.target.value })} />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="email">
                E-mail
              </label>
              <input id="email" className="form-control" value={alvo?.email ?? ''} disabled />
            </div>
            <div className="col-md-6">
              <CampoDeSenhaNova id="senha" rotulo="Nova senha (opcional)" valor={formulario.senha} aoMudar={(senha) => setFormulario({ ...formulario, senha })} erro={erroDaSenha} />
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="perfil">
                Perfil
              </label>
              <select id="perfil" className="form-select" value={formulario.perfil} onChange={(evento) => setFormulario({ ...formulario, perfil: evento.target.value })}>
                {!perfisDisponiveis.includes(formulario.perfil) && (
                  <option value={formulario.perfil} disabled>
                    {formulario.perfil ? `${formulario.perfil} (perfil inválido)` : 'Selecione...'}
                  </option>
                )}
                {perfisDisponiveis.map((perfil) => (
                  <option key={perfil} value={perfil}>
                    {ROTULO_DO_PERFIL[perfil]}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="cpf">
                CPF
              </label>
              {/* só leitura: o detalhe traz o CPF completo, e a edição não o altera */}
              <input id="cpf" className="form-control" value={typeof alvo?.cpf === 'string' ? alvo.cpf : '—'} disabled />
            </div>
            <div className="col-12">
              <button className="btn btn-primary" disabled={atualizarUsuario.isPending}>
                Salvar
              </button>
              <Link to="/usuarios" className="btn btn-outline-secondary ms-2">
                Cancelar
              </Link>
            </div>
          </form>

          {/* a tela só abre para quem pode gerenciar esta conta (podeGerenciarUsuario), e nunca para a própria */}
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-4 pt-3 border-top">
            <span className="small text-muted">Desativar tira o acesso da pessoa imediatamente.</span>
            <button type="button" className="btn btn-outline-danger btn-sm" onClick={aoDesativar} disabled={desativarUsuario.isPending}>
              <i className="bi bi-person-x me-1" />
              Desativar usuário
            </button>
          </div>
        </div>
      </div>
    </EstadoDaConsulta>
  );
}
