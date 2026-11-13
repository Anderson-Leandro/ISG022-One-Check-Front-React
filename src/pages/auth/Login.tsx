import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { rotaInicial } from '../../auth/permissoes';
import { armazenamentoDeTokens } from '../../auth/armazenamentoDeTokens';
import { useFlash } from '../../components/Flash';
import { LayoutLogin } from '../../layouts/LayoutLogin';

/** public/login.php */
export function Login() {
  const { entrar } = useAuth();
  const navegar = useNavigate();
  const { definirFlash, limparFlash } = useFlash();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  // o aviso de sessão encerrada vira uma mensagem comum da tela, mostrada uma vez: some ao enviar, ao navegar
  // ou ao recarregar a página, em vez de ficar ao lado de outras mensagens
  useEffect(() => {
    const aviso = armazenamentoDeTokens.obterAvisoDeSessao();
    if (!aviso) return;
    armazenamentoDeTokens.limparAvisoDeSessao();
    definirFlash('aviso', aviso);
  }, [definirFlash]);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    if (!email.trim() || !senha) {
      limparFlash();
      setErro('Informe e-mail e senha.');
      return;
    }

    // uma mensagem por vez: a de logout ou de sessão encerrada sai assim que a pessoa tenta entrar
    limparFlash();
    setEnviando(true);
    setErro('');
    try {
      const resultado = await entrar(email.trim(), senha);
      if (resultado === 'autenticado') navegar(rotaInicial(armazenamentoDeTokens.obterUsuario()), { replace: true });
      else if (resultado === 'mfa_configuracao_obrigatoria') navegar('/mfa/configurar-login');
      else navegar('/mfa/verificar');
    } catch (falha) {
      setErro((falha as Error).message || 'Credenciais inválidas.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <LayoutLogin>
      <p style={{ textAlign: 'center', fontSize: 14, color: '#94A3B8', marginBottom: 32 }}>Sistema de gestão de imóveis</p>

      {erro && (
        <div className="alert alert-danger py-2 mb-3" role="alert">
          {erro}
        </div>
      )}

      {/* autocomplete de login (username/current-password): o gerenciador de senhas preenche e não sugere senha nova */}
      <form onSubmit={aoEnviar}>
        <div className="mb-3">
          <label className="form-label" htmlFor="email">
            <i className="bi bi-envelope me-1" />
            E-mail
          </label>
          <input
            type="email"
            className="form-control"
            id="email"
            required
            autoComplete="username"
            placeholder="seu@email.com"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="form-label" htmlFor="senha">
            <i className="bi bi-lock me-1" />
            Senha
          </label>
          <input
            type="password"
            className="form-control"
            id="senha"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary w-100"
          disabled={enviando}
          style={{ padding: 14, fontSize: 16, fontWeight: 600, borderRadius: 12, minHeight: 52 }}
        >
          {enviando ? 'Entrando…' : 'Entrar'} <i className="bi bi-arrow-right ms-1" />
        </button>
      </form>
      <p style={{ fontSize: 11, color: '#4a5568', textAlign: 'center', marginTop: 20, marginBottom: 0 }}>
        Admin, gestor e vistoriador: MFA obrigatório, configurado no primeiro acesso.
      </p>
    </LayoutLogin>
  );
}
