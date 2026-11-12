import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ErroApi } from '../../api/client';
import { useTrocarMinhaSenha, useSituacaoDaMinhaSenha } from '../../api/usuarios';
import { useAuth } from '../../auth/AuthContext';
import { rotaInicial } from '../../auth/permissoes';
import { useFlash } from '../../components/Flash';
import { LayoutLogin } from '../../layouts/LayoutLogin';

/**
 * Conta marcada com senha_expirada: a senha usada no login não atende à política atual.
 * Até a troca, a API só responde GET /usuarios/me, PUT /usuarios/me/senha e POST /auth/logout.
 */
export function TrocarSenhaExpirada() {
  const { usuario, sair } = useAuth();
  const navegar = useNavigate();
  const { definirFlash } = useFlash();
  const trocarSenha = useTrocarMinhaSenha();
  // confere na API se a marca guardada ainda vale (a senha pode ter sido trocada em outro dispositivo)
  useSituacaoDaMinhaSenha();
  const [formulario, setFormulario] = useState({ senhaAtual: '', novaSenha: '', confirmacao: '' });
  const [erro, setErro] = useState('');

  if (!usuario?.senha_expirada) return <Navigate to={rotaInicial(usuario)} replace />;

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    if (formulario.novaSenha !== formulario.confirmacao) {
      setErro('A confirmação não confere com a nova senha.');
      return;
    }
    setErro('');
    try {
      await trocarSenha.mutateAsync({ senha_atual: formulario.senhaAtual, nova_senha: formulario.novaSenha });
      definirFlash('sucesso', 'Senha alterada.');
      // a troca limpa a marca, e o guarda acima leva à página inicial do perfil
    } catch (falha) {
      const mensagemDoCampo = falha instanceof ErroApi ? falha.erros.nova_senha : undefined;
      setErro(mensagemDoCampo || (falha as Error).message || 'Erro ao alterar a senha.');
    }
  }

  async function aoSair() {
    await sair();
    navegar('/login?logout=1', { replace: true });
  }

  return (
    <LayoutLogin larguraMaxima={480}>
      <h5 className="text-center mb-1" style={{ color: '#fff' }}>
        Troque a sua senha
      </h5>
      <p className="text-center mb-4" style={{ fontSize: 13, color: '#6b7fa3' }}>
        A sua senha atual não atende mais à política de segurança. Escolha uma nova para continuar.
      </p>

      {erro && <div className="alert alert-danger py-2 mb-3">{erro}</div>}

      <form onSubmit={aoEnviar}>
        <div className="mb-3">
          <label className="form-label" htmlFor="senha-atual">
            Senha atual
          </label>
          <input id="senha-atual" type="password" className="form-control" required autoFocus autoComplete="current-password" value={formulario.senhaAtual} onChange={(evento) => setFormulario({ ...formulario, senhaAtual: evento.target.value })} />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="nova-senha">
            Nova senha
          </label>
          <input id="nova-senha" type="password" className="form-control" required minLength={10} autoComplete="new-password" aria-describedby="ajuda-da-nova-senha" value={formulario.novaSenha} onChange={(evento) => setFormulario({ ...formulario, novaSenha: evento.target.value })} />
          <div id="ajuda-da-nova-senha" className="form-text" style={{ color: '#6b7fa3' }}>
            Pelo menos 10 caracteres. Não use só números e símbolos, palavras comuns nem sequências do teclado.
          </div>
        </div>
        <div className="mb-4">
          <label className="form-label" htmlFor="confirmacao">
            Confirme a nova senha
          </label>
          <input id="confirmacao" type="password" className="form-control" required autoComplete="new-password" value={formulario.confirmacao} onChange={(evento) => setFormulario({ ...formulario, confirmacao: evento.target.value })} />
        </div>
        <button type="submit" className="btn btn-primary w-100" style={{ padding: 10 }} disabled={trocarSenha.isPending}>
          <i className="bi bi-key me-1" />
          Alterar senha
        </button>
      </form>

      <p className="text-center mt-3 mb-0">
        <button type="button" className="btn btn-link p-0" style={{ fontSize: 12 }} onClick={aoSair}>
          Sair
        </button>
      </p>
    </LayoutLogin>
  );
}
