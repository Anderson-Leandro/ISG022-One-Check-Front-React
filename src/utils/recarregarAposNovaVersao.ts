const CHAVE_DA_ULTIMA_RECARGA = 'onecheck.recarga_por_nova_versao';
/** Uma recarga automática por este intervalo: se a página continuar faltando, a tela de erro assume. */
const INTERVALO_MINIMO_EM_MS = 30_000;

/**
 * Depois de um deploy, os arquivos de cada página mudam de nome. Uma aba aberta antes dele tenta baixar o
 * arquivo antigo, que não existe mais, e o import da página falha. Recarregar traz a versão nova.
 */
export function ehFalhaDeCarregamentoDePagina(erro: unknown): boolean {
  const mensagem = erro instanceof Error ? `${erro.name} ${erro.message}` : String(erro);
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Unable to preload CSS/i.test(mensagem);
}

/** Recarrega a página se não houve outra recarga automática há pouco; devolve se recarregou. */
export function recarregarAposNovaVersao(): boolean {
  try {
    const ultima = Number(sessionStorage.getItem(CHAVE_DA_ULTIMA_RECARGA) ?? 0);
    if (Date.now() - ultima < INTERVALO_MINIMO_EM_MS) return false;
    sessionStorage.setItem(CHAVE_DA_ULTIMA_RECARGA, String(Date.now()));
  } catch {
    return false; // sem armazenamento não há como evitar recargas em sequência
  }
  window.location.reload();
  return true;
}
