/** Dispara o download de um Blob (ex.: PDF que exige token e não pode ser link direto). */
export function salvarArquivo(arquivo: Blob, nomeDoArquivo: string): void {
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeDoArquivo;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
