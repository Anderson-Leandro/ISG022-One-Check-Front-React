export const TAMANHO_MINIMO_DA_SENHA = 10;
const LIMITE_DE_BYTES_DA_SENHA = 72;
const MINIMO_DE_CARACTERES_DISTINTOS = 5;

export const AJUDA_DA_SENHA_NOVA = `Pelo menos ${TAMANHO_MINIMO_DA_SENHA} caracteres. Não use só números e símbolos, palavras comuns nem sequências do teclado.`;

/**
 * Parte da política de senha da API que dá para conferir no navegador; devolve a mensagem ou null.
 * Palavras comuns, sequências de teclado e senhas vazadas só a API recusa (422 com erros.<campo>).
 */
export function validarSenhaNova(senha: string): string | null {
  if (senha.length < TAMANHO_MINIMO_DA_SENHA) return `A senha deve ter pelo menos ${TAMANHO_MINIMO_DA_SENHA} caracteres.`;
  if (new TextEncoder().encode(senha).length > LIMITE_DE_BYTES_DA_SENHA) return 'A senha é longa demais (o limite é de 72 bytes; letras acentuadas contam por duas).';
  if (!/\p{L}/u.test(senha)) return 'A senha não pode ter só números e símbolos.';
  if (new Set(senha).size < MINIMO_DE_CARACTERES_DISTINTOS) return `A senha deve ter pelo menos ${MINIMO_DE_CARACTERES_DISTINTOS} caracteres diferentes.`;
  return null;
}
