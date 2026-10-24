import { useQuery } from '@tanstack/react-query';
import { api, obterDados } from './client';
import type { Contrato } from './contratos';
import { buscarEnderecoDoImovel, type Imovel } from './imoveis';
import type { Problema } from './problemas';
import type { Checklist } from './vistorias';

export interface ContratoDoLocatario {
  contrato: Contrato;
  imovel: Imovel | null;
  endereco: Awaited<ReturnType<typeof buscarEnderecoDoImovel>>;
  checklists: Checklist[];
  problemas: Problema[];
}

/**
 * locatario/index.php: a API já devolve só os contratos do locatário logado.
 * Agendamentos ficam de fora — a API responde 403 para o locatário (confirmado em teste).
 */
export function useAreaDoLocatario() {
  return useQuery({
    queryKey: ['locatario', 'area'],
    queryFn: async () => {
      const contratos = await obterDados<Contrato[]>(api.GET('/api/v1/contratos', { params: { query: { por_pagina: 100 } } }));
      const ativos = contratos.filter((contrato) => contrato.status === 'ativo');
      const detalhados = await Promise.all(
        ativos.map(async (contrato): Promise<ContratoDoLocatario> => {
          const caminho = { params: { path: { contrato_id: contrato.id } } };
          const [imovel, endereco, checklists, problemas] = await Promise.all([
            obterDados<Imovel>(api.GET('/api/v1/imoveis/{imovel_id}', { params: { path: { imovel_id: contrato.imovel_id } } })).catch(() => null),
            buscarEnderecoDoImovel(contrato.imovel_id).catch(() => null),
            obterDados<Checklist[]>(api.GET('/api/v1/contratos/{contrato_id}/checklists', caminho)).catch(() => []),
            obterDados<Problema[]>(api.GET('/api/v1/contratos/{contrato_id}/problemas', caminho)).catch(() => []),
          ]);
          return { contrato, imovel, endereco, checklists, problemas };
        }),
      );
      return { ativos: detalhados, encerrados: contratos.filter((contrato) => contrato.status !== 'ativo') };
    },
  });
}
