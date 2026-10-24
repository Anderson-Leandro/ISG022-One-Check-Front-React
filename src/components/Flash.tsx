import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/** Substitui flash_set()/flash_render() de includes/partials.php. */
export type TipoDeFlash = 'sucesso' | 'erro' | 'aviso' | 'info';

interface MensagemFlash {
  tipo: TipoDeFlash;
  texto: string;
}

interface ValorDoFlash {
  mensagem: MensagemFlash | null;
  definirFlash(tipo: TipoDeFlash, texto: string): void;
  limparFlash(): void;
}

const ContextoDeFlash = createContext<ValorDoFlash | null>(null);

const CLASSE_POR_TIPO: Record<TipoDeFlash, string> = {
  sucesso: 'success',
  erro: 'danger',
  aviso: 'warning',
  info: 'info',
};

export function ProvedorDeFlash({ children }: { children: ReactNode }) {
  const [mensagem, setMensagem] = useState<MensagemFlash | null>(null);
  const definirFlash = useCallback((tipo: TipoDeFlash, texto: string) => setMensagem({ tipo, texto }), []);
  const limparFlash = useCallback(() => setMensagem(null), []);
  const valor = useMemo(() => ({ mensagem, definirFlash, limparFlash }), [mensagem, definirFlash, limparFlash]);
  return <ContextoDeFlash.Provider value={valor}>{children}</ContextoDeFlash.Provider>;
}

export function useFlash(): ValorDoFlash {
  const contexto = useContext(ContextoDeFlash);
  if (!contexto) throw new Error('useFlash deve ser usado dentro de <ProvedorDeFlash>');
  return contexto;
}

export function ExibirFlash() {
  const { mensagem, limparFlash } = useFlash();
  if (!mensagem) return null;
  return (
    <div className={`alert alert-${CLASSE_POR_TIPO[mensagem.tipo]} alert-dismissible fade show`} role="alert">
      {mensagem.texto}
      <button type="button" className="btn-close" aria-label="Fechar" onClick={limparFlash} />
    </div>
  );
}
