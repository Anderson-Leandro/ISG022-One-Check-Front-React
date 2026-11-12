import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

/** Substitui flash_set()/flash_render() de includes/partials.php. */
export type TipoDeFlash = 'sucesso' | 'erro' | 'aviso' | 'info';

interface MensagemFlash {
  id: number;
  tipo: TipoDeFlash;
  texto: string;
  criadaEm: number;
  /** Já sobreviveu a uma troca de tela: a próxima troca a apaga. */
  atravessouNavegacao: boolean;
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

/** Sucesso e informação somem sozinhos; erro e aviso ficam até fechar ou até a próxima troca de tela. */
export const TEMPO_DE_EXIBICAO_EM_MS = 5000;
const TIPOS_QUE_SOMEM_SOZINHOS: TipoDeFlash[] = ['sucesso', 'info'];

/**
 * Uma mensagem criada logo antes de navegar ("salvar e voltar para a lista") precisa aparecer na tela seguinte.
 * Por isso a troca de tela que acontece até este tempo depois da criação não a apaga; a seguinte, sim.
 */
const JANELA_PARA_ATRAVESSAR_EM_MS = 1000;

let proximoId = 1;

export function ProvedorDeFlash({ children }: { children: ReactNode }) {
  const [mensagem, setMensagem] = useState<MensagemFlash | null>(null);
  const { pathname } = useLocation();

  const definirFlash = useCallback((tipo: TipoDeFlash, texto: string) => {
    setMensagem({ id: proximoId++, tipo, texto, criadaEm: Date.now(), atravessouNavegacao: false });
  }, []);
  const limparFlash = useCallback(() => setMensagem(null), []);

  // a cada troca de tela: mensagem recém-criada atravessa uma vez; qualquer outra é apagada
  const caminhoAnterior = useRef(pathname);
  useEffect(() => {
    if (caminhoAnterior.current === pathname) return;
    caminhoAnterior.current = pathname;
    setMensagem((atual) => {
      if (!atual) return null;
      const recemCriada = Date.now() - atual.criadaEm <= JANELA_PARA_ATRAVESSAR_EM_MS;
      return !atual.atravessouNavegacao && recemCriada ? { ...atual, atravessouNavegacao: true } : null;
    });
  }, [pathname]);

  const idQueSomeSozinho = mensagem && TIPOS_QUE_SOMEM_SOZINHOS.includes(mensagem.tipo) ? mensagem.id : null;
  useEffect(() => {
    if (idQueSomeSozinho === null) return;
    const temporizador = setTimeout(() => setMensagem((atual) => (atual?.id === idQueSomeSozinho ? null : atual)), TEMPO_DE_EXIBICAO_EM_MS);
    return () => clearTimeout(temporizador);
  }, [idQueSomeSozinho]);

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
  const ehUrgente = mensagem.tipo === 'erro' || mensagem.tipo === 'aviso';
  return (
    // key: cada mensagem nova é anunciada de novo pelo leitor de tela, mesmo com o mesmo texto
    <div key={mensagem.id} className={`alert alert-${CLASSE_POR_TIPO[mensagem.tipo]} alert-dismissible fade show`} role={ehUrgente ? 'alert' : 'status'}>
      {mensagem.texto}
      <button type="button" className="btn-close" aria-label="Fechar" onClick={limparFlash} />
    </div>
  );
}
