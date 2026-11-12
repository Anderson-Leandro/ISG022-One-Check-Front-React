import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

/** Substitui flash_set()/flash_render() de includes/partials.php. */
export type TipoDeFlash = 'sucesso' | 'erro' | 'aviso' | 'info';

interface MensagemFlash {
  id: number;
  tipo: TipoDeFlash;
  texto: string;
  criadaEm: number;
}

interface ValorDoFlash {
  mensagem: MensagemFlash | null;
  definirFlash(tipo: TipoDeFlash, texto: string): void;
  limparFlash(): void;
  /** Enquanto o mouse ou o foco estão na mensagem de id informado, ela não some sozinha; null retoma. */
  pausarSaidaAutomatica(idDaMensagem: number | null): void;
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
 * Uma mensagem criada logo antes de navegar ("salvar e voltar para a lista") precisa aparecer na tela seguinte,
 * mesmo que haja um redirecionamento no caminho. Por isso as trocas de tela até este tempo depois da criação
 * não a apagam; a primeira troca depois disso, sim.
 */
const JANELA_PARA_ATRAVESSAR_EM_MS = 1000;

let proximoId = 1;

export function ProvedorDeFlash({ children }: { children: ReactNode }) {
  const [mensagem, setMensagem] = useState<MensagemFlash | null>(null);
  const { pathname } = useLocation();

  const definirFlash = useCallback((tipo: TipoDeFlash, texto: string) => {
    setMensagem({ id: proximoId++, tipo, texto, criadaEm: Date.now() });
  }, []);
  const limparFlash = useCallback(() => setMensagem(null), []);

  // a cada troca de tela: mensagem recém-criada continua; qualquer outra é apagada
  const caminhoAnterior = useRef(pathname);
  useEffect(() => {
    if (caminhoAnterior.current === pathname) return;
    caminhoAnterior.current = pathname;
    setMensagem((atual) => (atual && Date.now() - atual.criadaEm <= JANELA_PARA_ATRAVESSAR_EM_MS ? atual : null));
  }, [pathname]);

  // o tempo recomeça do zero quando a pausa termina, para quem estava lendo terminar a leitura.
  // A pausa vale só para a mensagem em que começou: se ela sair da tela com o mouse em cima, a próxima não herda
  const [idPausado, setIdPausado] = useState<number | null>(null);
  const pausarSaidaAutomatica = useCallback((idDaMensagem: number | null) => setIdPausado(idDaMensagem), []);
  const pausada = mensagem !== null && idPausado === mensagem.id;
  const idQueSomeSozinho = mensagem && TIPOS_QUE_SOMEM_SOZINHOS.includes(mensagem.tipo) ? mensagem.id : null;
  useEffect(() => {
    if (idQueSomeSozinho === null || pausada) return;
    const temporizador = setTimeout(() => setMensagem((atual) => (atual?.id === idQueSomeSozinho ? null : atual)), TEMPO_DE_EXIBICAO_EM_MS);
    return () => clearTimeout(temporizador);
  }, [idQueSomeSozinho, pausada]);

  const valor = useMemo(() => ({ mensagem, definirFlash, limparFlash, pausarSaidaAutomatica }), [mensagem, definirFlash, limparFlash, pausarSaidaAutomatica]);
  return <ContextoDeFlash.Provider value={valor}>{children}</ContextoDeFlash.Provider>;
}

export function useFlash(): ValorDoFlash {
  const contexto = useContext(ContextoDeFlash);
  if (!contexto) throw new Error('useFlash deve ser usado dentro de <ProvedorDeFlash>');
  return contexto;
}

export function ExibirFlash() {
  const { mensagem, limparFlash, pausarSaidaAutomatica } = useFlash();
  if (!mensagem) return null;
  const ehUrgente = mensagem.tipo === 'erro' || mensagem.tipo === 'aviso';
  return (
    // key: cada mensagem nova é anunciada de novo pelo leitor de tela, mesmo com o mesmo texto
    <div
      key={mensagem.id}
      className={`alert alert-${CLASSE_POR_TIPO[mensagem.tipo]} alert-dismissible fade show`}
      role={ehUrgente ? 'alert' : 'status'}
      onMouseEnter={() => pausarSaidaAutomatica(mensagem.id)}
      onMouseLeave={() => pausarSaidaAutomatica(null)}
      onFocus={() => pausarSaidaAutomatica(mensagem.id)}
      onBlur={() => pausarSaidaAutomatica(null)}
    >
      {mensagem.texto}
      <button
        type="button"
        className="btn-close"
        aria-label="Fechar"
        onClick={limparFlash}
      />
    </div>
  );
}
