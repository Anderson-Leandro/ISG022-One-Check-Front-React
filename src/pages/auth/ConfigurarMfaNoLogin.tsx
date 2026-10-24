import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, obterDados } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { armazenamentoDeTokens } from '../../auth/armazenamentoDeTokens';
import { rotaInicial } from '../../auth/permissoes';
import { CampoCodigoMfa, extrairQrCode, QrCodeMfa, type DadosDeConfiguracaoMfa } from '../../components/QrCodeMfa';
import { LayoutLogin } from '../../layouts/LayoutLogin';

/** public/mfa-setup-login.php — primeiro acesso com MFA obrigatório. */
export function ConfigurarMfaNoLogin() {
  const { ativarMfaNoLogin } = useAuth();
  const navegar = useNavigate();
  const tempToken = armazenamentoDeTokens.obterTempTokenMfa();
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const configuracao = useQuery({
    queryKey: ['mfa', 'setup-login', tempToken],
    queryFn: () =>
      obterDados<DadosDeConfiguracaoMfa>(
        api.GET('/api/v1/auth/mfa/setup-login', { params: { query: { temp_token: tempToken ?? '' } } }),
      ),
    enabled: Boolean(tempToken),
    staleTime: Infinity,
    retry: false,
  });

  if (!tempToken) return <Navigate to="/login" replace />;
  const { urlDoQr, segredo } = extrairQrCode(configuracao.data);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setErro('');
    try {
      await ativarMfaNoLogin(codigo);
      navegar(rotaInicial(armazenamentoDeTokens.obterUsuario()), { replace: true });
    } catch (falha) {
      setErro((falha as Error).message || 'Código inválido. Confira o app autenticador e tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <LayoutLogin larguraMaxima={480}>
      <h5 className="text-center mb-1" style={{ color: '#fff' }}>
        Configurar autenticação em 2 fatores
      </h5>
      <p className="text-center mb-4" style={{ fontSize: 13, color: '#6b7fa3' }}>
        O MFA foi habilitado para sua conta. Escaneie o QR Code no Google Authenticator ou Authy e informe o código
        gerado para concluir o login.
      </p>

      {erro && <div className="alert alert-danger py-2 mb-3">{erro}</div>}

      {configuracao.isPending ? (
        <p className="text-center mb-3" style={{ color: '#6b7fa3' }}>
          Carregando QR Code…
        </p>
      ) : configuracao.isError ? (
        <div className="alert alert-danger py-2 mb-3">
          <i className="bi bi-exclamation-triangle me-2" />
          Não foi possível gerar o QR Code: {configuracao.error.message}
        </div>
      ) : urlDoQr ? (
        <QrCodeMfa urlDoQr={urlDoQr} segredo={segredo} />
      ) : (
        <div className="alert alert-warning mb-3">
          <i className="bi bi-exclamation-triangle me-2" />
          Não foi possível carregar o QR Code. Tente fazer login novamente.
        </div>
      )}

      <form onSubmit={aoEnviar}>
        <CampoCodigoMfa valor={codigo} aoMudar={setCodigo} />
        <button type="submit" className="btn btn-primary w-100" style={{ padding: 10 }} disabled={enviando}>
          <i className="bi bi-shield-check me-1" />
          Ativar e entrar
        </button>
      </form>

      <p className="text-center mt-3 mb-0">
        <Link to="/login" style={{ fontSize: 12 }}>
          ← Voltar ao login
        </Link>
      </p>
    </LayoutLogin>
  );
}
