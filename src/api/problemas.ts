import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, corpoNaoTipado, obterDados } from './client';
import type { Contrato } from './contratos';

export interface Problema {
  id: string;
  contrato_id: string;
  titulo?: string;
  descricao?: string | null;
  prioridade?: string;
  status?: string;
  foto_url?: string | null;
  comodo_id?: string | null;
  created_at?: string;
}

/** Problema com o contrato de origem, para a listagem geral. */
export interface ProblemaComContrato extends Problema {
  contrato: Contrato;
}

export interface AtualizacaoDeProblema {
  id: string;
  descricao?: string | null;
  mensagem?: string | null;
  texto?: string | null;
  status?: string | null;
  usuario_nome?: string | null;
  autor?: string | null;
  created_at?: string;
}

export const ROTULO_DO_STATUS_DO_PROBLEMA: Record<string, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  resolvido: 'Resolvido',
};

export const ROTULO_DA_PRIORIDADE: Record<string, string> = {
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
};

/**
 * O OpenAPI não descreve o corpo de POST /problemas/{id}/atualizacoes.
 * Usamos "descricao" (mesmo nome do campo do problema) — confirmar com o time da API.
 */
const CAMPO_DO_TEXTO_DA_ATUALIZACAO = 'descricao';

export function textoDaAtualizacao(atualizacao: AtualizacaoDeProblema): string {
  return atualizacao.descricao ?? atualizacao.mensagem ?? atualizacao.texto ?? '';
}

const chaves = {
  todos: ['problemas'] as const,
  lista: ['problemas', 'lista'] as const,
  detalhe: (id: string) => ['problemas', 'detalhe', id] as const,
  atualizacoes: (id: string) => ['problemas', 'atualizacoes', id] as const,
};

/**
 * A API só lista problemas por contrato, então — como o PHP — busca os contratos
 * e depois os problemas de cada um, agora em paralelo.
 */
export function useTodosOsProblemas() {
  return useQuery({
    queryKey: chaves.lista,
    queryFn: async () => {
      const contratos = await obterDados<Contrato[]>(api.GET('/api/v1/contratos', { params: { query: { por_pagina: 100 } } }));
      const problemasPorContrato = await Promise.all(
        contratos.map(async (contrato) => {
          const problemas = await obterDados<Problema[]>(
            api.GET('/api/v1/contratos/{contrato_id}/problemas', { params: { path: { contrato_id: contrato.id } } }),
          ).catch(() => []);
          return problemas.map((problema): ProblemaComContrato => ({ ...problema, contrato_id: problema.contrato_id ?? contrato.id, contrato }));
        }),
      );
      return problemasPorContrato.flat().sort((primeiro, segundo) => String(segundo.created_at ?? '').localeCompare(String(primeiro.created_at ?? '')));
    },
  });
}

export function useProblema(id: string) {
  return useQuery({
    queryKey: chaves.detalhe(id),
    queryFn: () => obterDados<Problema>(api.GET('/api/v1/problemas/{problema_id}', { params: { path: { problema_id: id } } })),
    enabled: Boolean(id),
  });
}

export function useAtualizacoesDoProblema(id: string) {
  return useQuery({
    queryKey: chaves.atualizacoes(id),
    queryFn: () => obterDados<AtualizacaoDeProblema[]>(api.GET('/api/v1/problemas/{problema_id}/atualizacoes', { params: { path: { problema_id: id } } })),
    enabled: Boolean(id),
  });
}

/** Contratos ativos para o select de novo problema. */
export function useContratosAtivos() {
  return useQuery({
    queryKey: ['contratos', 'ativos'],
    queryFn: () => obterDados<Contrato[]>(api.GET('/api/v1/contratos', { params: { query: { por_pagina: 100, status: 'ativo' } } })),
  });
}

function useInvalidarProblemas() {
  const clienteDeConsultas = useQueryClient();
  // problemas também aparecem nos detalhes do contrato
  return () =>
    Promise.all([chaves.todos, ['contratos']].map((queryKey) => clienteDeConsultas.invalidateQueries({ queryKey })));
}

export function useRegistrarProblema() {
  const invalidar = useInvalidarProblemas();
  return useMutation({
    mutationFn: ({ contratoId, titulo, descricao, prioridade }: { contratoId: string; titulo: string; descricao: string | null; prioridade: string }) =>
      obterDados<Problema>(
        api.POST('/api/v1/contratos/{contrato_id}/problemas', {
          params: { path: { contrato_id: contratoId } },
          ...corpoNaoTipado({ titulo, descricao, prioridade, status: 'aberto' }),
        }),
      ),
    onSuccess: invalidar,
  });
}

export function useAtualizarStatusDoProblema(id: string) {
  const invalidar = useInvalidarProblemas();
  return useMutation({
    mutationFn: (status: string) =>
      obterDados(api.PATCH('/api/v1/problemas/{problema_id}/status', { params: { path: { problema_id: id } }, ...corpoNaoTipado({ status }) })),
    onSuccess: invalidar,
  });
}

export function useRegistrarAtualizacao(id: string) {
  const invalidar = useInvalidarProblemas();
  return useMutation({
    mutationFn: (texto: string) =>
      obterDados<AtualizacaoDeProblema>(
        api.POST('/api/v1/problemas/{problema_id}/atualizacoes', {
          params: { path: { problema_id: id } },
          ...corpoNaoTipado({ [CAMPO_DO_TEXTO_DA_ATUALIZACAO]: texto }),
        }),
      ),
    onSuccess: invalidar,
  });
}
