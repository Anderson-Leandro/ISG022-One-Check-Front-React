/** Dados de POST /auth/mfa/setup e GET /auth/mfa/setup-login. */
export interface DadosDeConfiguracaoMfa {
  /** Imagem do QR Code gerada pela API, como data URI (data:image/png;base64,…). Só serve como src de <img>. */
  qr_url?: string;
  secret?: string;
}

export function extrairQrCode(dados: DadosDeConfiguracaoMfa | undefined): { urlDoQr: string; segredo: string } {
  return { urlDoQr: dados?.qr_url ?? '', segredo: dados?.secret ?? '' };
}

/** Sem a imagem, a chave manual ainda permite configurar o autenticador. */
export function QrCodeMfa({ urlDoQr, segredo }: { urlDoQr: string; segredo: string }) {
  return (
    <>
      {urlDoQr ? (
        <div className="text-center mb-3">
          <img
            src={urlDoQr}
            alt="QR Code MFA"
            width={200}
            height={200}
            style={{ border: '1px solid #2a3347', borderRadius: 8, background: '#fff', padding: 8 }}
          />
        </div>
      ) : (
        <div className="alert alert-warning mb-3">
          <i className="bi bi-exclamation-triangle me-2" />
          Não foi possível carregar o QR Code.{segredo && ' Digite a chave manual abaixo no app autenticador.'}
        </div>
      )}
      {segredo && (
        <p className="text-center mb-4" style={{ fontSize: 12, color: '#6b7fa3' }}>
          Chave manual: <code style={{ color: '#4f8ef7' }}>{segredo}</code>
        </p>
      )}
    </>
  );
}

interface PropriedadesDoCampoCodigo {
  valor: string;
  aoMudar(valor: string): void;
  id?: string;
  rotulo?: string;
  focoAutomatico?: boolean;
  /** Só um campo por tela deve receber o preenchimento automático de código. */
  preenchimentoAutomatico?: boolean;
}

export function CampoCodigoMfa({ valor, aoMudar, id = 'code', rotulo = 'Código de 6 dígitos', focoAutomatico = true, preenchimentoAutomatico = true }: PropriedadesDoCampoCodigo) {
  return (
    <div className="mb-3">
      <label className="form-label" htmlFor={id}>
        <i className="bi bi-key me-1" />
        {rotulo}
      </label>
      <input
        type="text"
        className="form-control text-center"
        id={id}
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        autoFocus={focoAutomatico}
        autoComplete={preenchimentoAutomatico ? 'one-time-code' : 'off'}
        placeholder="000000"
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value.replace(/\D/g, ''))}
        style={{ letterSpacing: '.3em', fontSize: '1.3rem', fontWeight: 700 }}
      />
    </div>
  );
}
