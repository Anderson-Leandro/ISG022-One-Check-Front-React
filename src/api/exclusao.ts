import { useQueryClient } from '@tanstack/react-query';

/** Raízes das chaves de consulta que podem mostrar um contrato, uma vistoria ou um problema. */
const RAIZES_AFETADAS = ['contratos', 'vistorias', 'problemas', 'imoveis', 'painel', 'locatario'];

/**
 * Depois de uma exclusão lógica, recarrega listas, painéis e históricos, mas deixa de fora as consultas
 * do próprio registro (as que levam o id na chave): elas dariam 404 enquanto a tela de detalhes
 * ainda está aberta, e o aviso de "não encontrado" tomaria o lugar da mensagem de sucesso.
 */
export function useInvalidarAposExcluir(id: string) {
  const clienteDeConsultas = useQueryClient();
  return () => {
    void clienteDeConsultas.invalidateQueries({
      predicate: (consulta) => RAIZES_AFETADAS.includes(String(consulta.queryKey[0])) && !consulta.queryKey.includes(id),
    });
  };
}
