import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, obterDados } from '../../api/client';
import { armazenamentoDeTokens } from '../../auth/armazenamentoDeTokens';
import { useAuth } from '../../auth/AuthContext';
import { useFlash } from '../../components/Flash';
import { mfaEstaAtivo } from '../../api/usuarios';
import { CampoCodigoMfa, extrairQrCode, QrCodeMfa, type DadosDeConfiguracaoMfa } from '../../components/QrCodeMfa';
import { LayoutLogin } from '../../layouts/LayoutLogin';

/** public/mfa-setup.php — usuário logado ativando MFA a partir do perfil. */
export function ConfigurarMfa() {
  const { usuario } = useAuth();
  const { definirFlash } = useFlash();
  const navegar = useNavigate();
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  // GET /auth/mfa/setup troca o segredo na hora (antes do activate): quem já tem MFA perderia o autenticador
  // atual só por abrir a página. Por isso a reconfiguração pede confirmação antes de gerar o QR Code.
  const reconfigurando = usuario ? mfaEstaAtivo(usuario) : false;
  const [reconfiguracaoConfirmada, setReconfiguracaoConfirmada] = useState(false);

  const configuracao = useQuery({
    queryKey: ['mfa', 'setup'],
    queryFn: () => obterDados<DadosDeConfiguracaoMfa>(api.GET('/api/v1/auth/mfa/setup')),
    enabled: !reconfigurando || reconfiguracaoConfirmada,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });
  const { urlDoQr, segredo } = extrairQrCode(configuracao.data);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setErro('');
    try {
      await obterDados(api.POST('/api/v1/auth/mfa/activate', { body: { codigo } }));
      if (usuario) armazenamentoDeTokens.salvarUsuario({ ...usuario, mfa_ativo: true, mfa_enabled: true });
      definirFlash('sucesso', 'MFA ativado com sucesso!');
      navegar('/usuarios/perfil');
    } catch (falha) {
      setErro((falha as Error).message || 'Código inválido. Confira o app autenticador.');
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
        Escaneie o QR Code no Google Authenticator ou Authy e informe o código gerado.
      </p>

      {erro && <div className="alert alert-danger py-2 mb-3">{erro}</div>}

      {reconfigurando && !reconfiguracaoConfirmada ? (
        <div className="alert alert-warning mb-3">
          <i className="bi bi-exclamation-triangle me-2" />
          Ao gerar um novo QR Code, o código do autenticador atual <strong>deixa de funcionar imediatamente</strong>. Conclua a configuração
          nesta tela para não perder o acesso.
          <button type="button" className="btn btn-warning btn-sm w-100 mt-3" onClick={() => setReconfiguracaoConfirmada(true)}>
            Gerar novo QR Code
          </button>
        </div>
      ) : configuracao.isPending ? (
        <p className="text-center mb-3" style={{ color: '#6b7fa3' }}>
          Carregando QR Code…
        </p>
      ) : urlDoQr ? (
        <QrCodeMfa urlDoQr={urlDoQr} segredo={segredo} />
      ) : (
        <div className="alert alert-warning mb-3">
          <i className="bi bi-exclamation-triangle me-2" />
          Não foi possível carregar o QR Code.
          {configuracao.error && (
            <>
              <br />
              <small>{configuracao.error.message}</small>
            </>
          )}
        </div>
      )}

      {(!reconfigurando || reconfiguracaoConfirmada) && (
        <form onSubmit={aoEnviar}>
          <CampoCodigoMfa valor={codigo} aoMudar={setCodigo} />
          <button type="submit" className="btn btn-primary w-100" style={{ padding: 10 }} disabled={enviando}>
            <i className="bi bi-shield-check me-1" />
            Ativar MFA
          </button>
        </form>
      )}

      <p className="text-center mt-3 mb-0">
        <Link to="/usuarios/perfil" style={{ fontSize: 12 }}>
          ← Voltar ao perfil
        </Link>
      </p>
    </LayoutLogin>
  );
}
