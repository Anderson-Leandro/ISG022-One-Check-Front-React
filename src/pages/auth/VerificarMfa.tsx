import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { armazenamentoDeTokens } from '../../auth/armazenamentoDeTokens';
import { rotaInicial } from '../../auth/permissoes';
import { CampoCodigoMfa } from '../../components/QrCodeMfa';
import { LayoutLogin } from '../../layouts/LayoutLogin';

/** public/mfa-verify.php */
export function VerificarMfa() {
  const { verificarMfa } = useAuth();
  const navegar = useNavigate();
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (!armazenamentoDeTokens.obterTempTokenMfa()) return <Navigate to="/login" replace />;

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setErro('');
    try {
      await verificarMfa(codigo);
      navegar(rotaInicial(armazenamentoDeTokens.obterUsuario()), { replace: true });
    } catch (falha) {
      setErro((falha as Error).message || 'Código inválido. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <LayoutLogin>
      <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7fa3', marginBottom: 28 }}>
        <i className="bi bi-shield-lock me-1" />
        Verificação em dois fatores
      </p>
      {erro && <div className="alert alert-danger py-2 mb-3">{erro}</div>}
      <form onSubmit={aoEnviar} autoComplete="off">
        <CampoCodigoMfa valor={codigo} aoMudar={setCodigo} />
        <button type="submit" className="btn btn-primary w-100" style={{ padding: 10 }} disabled={enviando}>
          Verificar
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 16, marginBottom: 0 }}>
        <Link to="/login" style={{ fontSize: 12 }}>
          ← Voltar ao login
        </Link>
      </p>
    </LayoutLogin>
  );
}
