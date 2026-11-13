import type { ReactNode } from 'react';
import { AJUDA_DA_SENHA_NOVA, TAMANHO_MINIMO_DA_SENHA } from '../utils/senha';

interface PropriedadesDoCampoDeSenhaNova {
  id: string;
  rotulo: ReactNode;
  valor: string;
  aoMudar(valor: string): void;
  /** Mensagem da validação local ou do 422 da API (erros.senha, erros.nova_senha, erros.senha_nova). */
  erro?: string | null;
  obrigatorio?: boolean;
  corDaAjuda?: string;
}

/** Campo de senha nova com a política atual: usado no cadastro, na edição, no perfil e na troca obrigatória. */
export function CampoDeSenhaNova({ id, rotulo, valor, aoMudar, erro, obrigatorio = false, corDaAjuda }: PropriedadesDoCampoDeSenhaNova) {
  const idDaAjuda = `${id}-ajuda`;
  return (
    <>
      <label className="form-label" htmlFor={id}>
        {rotulo}
      </label>
      <input
        id={id}
        type="password"
        className={`form-control ${erro ? 'is-invalid' : ''}`}
        required={obrigatorio}
        minLength={TAMANHO_MINIMO_DA_SENHA}
        autoComplete="new-password"
        aria-describedby={idDaAjuda}
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
      />
      {erro && <div className="invalid-feedback">{erro}</div>}
      <div id={idDaAjuda} className="form-text" style={corDaAjuda ? { color: corDaAjuda } : undefined}>
        {AJUDA_DA_SENHA_NOVA}
      </div>
    </>
  );
}
