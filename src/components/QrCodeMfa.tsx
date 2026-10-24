/** Dados de /auth/mfa/setup e /auth/mfa/setup-login — a API pode variar o nome dos campos. */
export interface DadosDeConfiguracaoMfa {
  qr_url?: string;
  qr_code_url?: string;
  qrcode_url?: string;
  qr?: string;
  otpauth_uri?: string;
  secret?: string;
  totp_secret?: string;
  mfa_secret?: string;
}

export function extrairQrCode(dados: DadosDeConfiguracaoMfa | undefined): { urlDoQr: string; segredo: string } {
  let urlDoQr = dados?.qr_url ?? dados?.qr_code_url ?? dados?.qrcode_url ?? dados?.qr ?? '';
  if (!urlDoQr && dados?.otpauth_uri) {
    urlDoQr = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(dados.otpauth_uri)}`;
  }
  const segredo = dados?.secret ?? dados?.totp_secret ?? dados?.mfa_secret ?? '';
  return { urlDoQr, segredo };
}

export function QrCodeMfa({ urlDoQr, segredo }: { urlDoQr: string; segredo: string }) {
  return (
    <>
      <div className="text-center mb-3">
        <img
          src={urlDoQr}
          alt="QR Code MFA"
          width={200}
          height={200}
          style={{ border: '1px solid #2a3347', borderRadius: 8, background: '#fff', padding: 8 }}
        />
      </div>
      {segredo && (
        <p className="text-center mb-4" style={{ fontSize: 12, color: '#6b7fa3' }}>
          Chave manual: <code style={{ color: '#4f8ef7' }}>{segredo}</code>
        </p>
      )}
    </>
  );
}

export function CampoCodigoMfa({ valor, aoMudar }: { valor: string; aoMudar(valor: string): void }) {
  return (
    <div className="mb-3">
      <label className="form-label" htmlFor="code">
        <i className="bi bi-key me-1" />
        Código de 6 dígitos
      </label>
      <input
        type="text"
        className="form-control text-center"
        id="code"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        autoFocus
        autoComplete="one-time-code"
        placeholder="000000"
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value.replace(/\D/g, ''))}
        style={{ letterSpacing: '.3em', fontSize: '1.3rem', fontWeight: 700 }}
      />
    </div>
  );
}
