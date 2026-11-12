import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { armazenamentoDeTokens } from '../../auth/armazenamentoDeTokens';
import { useAuth } from '../../auth/AuthContext';
import { useFlash } from '../../components/Flash';
import { temAutenticadorConfigurado, useAtivarMeuMfa, useGerarConfiguracaoDeMfa, useMeuUsuario } from '../../api/usuarios';
import { CampoCodigoMfa, extrairQrCode, QrCodeMfa } from '../../components/QrCodeMfa';
import { LayoutLogin } from '../../layouts/LayoutLogin';

/**
 * public/mfa-setup.php — usuário logado configurando ou trocando o autenticador.
 * O POST /auth/mfa/setup só guarda o segredo novo como pendente: o autenticador atual continua
 * valendo até o activate, que exige também o código atual de quem já tem um configurado.
 */
export function ConfigurarMfa() {
  const { usuario } = useAuth();
  const { definirFlash } = useFlash();
  const navegar = useNavigate();
  const consultaDoUsuario = useMeuUsuario();
  const gerarConfiguracao = useGerarConfiguracaoDeMfa();
  const ativarMfa = useAtivarMeuMfa();
  const [codigo, setCodigo] = useState('');
  const [codigoAtual, setCodigoAtual] = useState('');
  const [erro, setErro] = useState('');

  // gera o segredo uma única vez ao abrir (o modo estrito do React roda o efeito duas vezes em desenvolvimento)
  const configuracaoPedida = useRef(false);
  const { mutate: pedirConfiguracao } = gerarConfiguracao;
  useEffect(() => {
    if (configuracaoPedida.current) return;
    configuracaoPedida.current = true;
    pedirConfiguracao();
  }, [pedirConfiguracao]);

  const trocandoDeAutenticador = consultaDoUsuario.data ? temAutenticadorConfigurado(consultaDoUsuario.data) : false;
  const { urlDoQr, segredo } = extrairQrCode(gerarConfiguracao.data);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    try {
      await ativarMfa.mutateAsync({ codigo, ...(trocandoDeAutenticador ? { codigo_atual: codigoAtual } : {}) });
      if (usuario) armazenamentoDeTokens.salvarUsuario({ ...usuario, mfa_ativo: true, mfa_enabled: true, mfa_configurado: true });
      definirFlash('sucesso', trocandoDeAutenticador ? 'Autenticador trocado com sucesso.' : 'MFA ativado com sucesso!');
      navegar('/usuarios/perfil');
    } catch (falha) {
      setErro((falha as Error).message || 'Código inválido. Confira o app autenticador.');
    }
  }

  return (
    <LayoutLogin larguraMaxima={480}>
      <h5 className="text-center mb-1" style={{ color: '#fff' }}>
        {trocandoDeAutenticador ? 'Trocar o autenticador' : 'Configurar autenticação em 2 fatores'}
      </h5>
      <p className="text-center mb-4" style={{ fontSize: 13, color: '#6b7fa3' }}>
        Escaneie o QR Code no Google Authenticator ou Authy e informe o código gerado.
        {trocandoDeAutenticador && ' O autenticador atual continua valendo até você concluir a troca.'}
      </p>

      {erro && <div className="alert alert-danger py-2 mb-3">{erro}</div>}

      {gerarConfiguracao.isError ? (
        <div className="alert alert-warning mb-3">
          <i className="bi bi-exclamation-triangle me-2" />
          Não foi possível gerar o QR Code.
          <br />
          <small>{gerarConfiguracao.error.message}</small>
          <button type="button" className="btn btn-warning btn-sm w-100 mt-3" onClick={() => pedirConfiguracao()}>
            Tentar novamente
          </button>
        </div>
      ) : !gerarConfiguracao.data ? (
        <p className="text-center mb-3" style={{ color: '#6b7fa3' }}>
          Carregando QR Code…
        </p>
      ) : (
        <QrCodeMfa urlDoQr={urlDoQr} segredo={segredo} />
      )}

      {consultaDoUsuario.isError && (
        <div className="alert alert-warning mb-3">
          <i className="bi bi-exclamation-triangle me-2" />
          Não foi possível conferir a situação do seu MFA: {consultaDoUsuario.error.message}
          <button type="button" className="btn btn-warning btn-sm w-100 mt-3" onClick={() => consultaDoUsuario.refetch()}>
            Tentar novamente
          </button>
        </div>
      )}

      {gerarConfiguracao.data && consultaDoUsuario.data && (
        <form onSubmit={aoEnviar}>
          <CampoCodigoMfa valor={codigo} aoMudar={setCodigo} rotulo={trocandoDeAutenticador ? 'Código do autenticador novo' : undefined} />
          {trocandoDeAutenticador && (
            <CampoCodigoMfa id="codigo-atual" rotulo="Código do autenticador atual" valor={codigoAtual} aoMudar={setCodigoAtual} focoAutomatico={false} preenchimentoAutomatico={false} />
          )}
          <button type="submit" className="btn btn-primary w-100" style={{ padding: 10 }} disabled={ativarMfa.isPending}>
            <i className="bi bi-shield-check me-1" />
            {trocandoDeAutenticador ? 'Trocar autenticador' : 'Ativar MFA'}
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
