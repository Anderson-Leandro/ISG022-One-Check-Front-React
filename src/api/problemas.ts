import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ErroApi, obterDados } from './client';
import type { paths } from './schema';
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
  autor_id?: string | null;
  usuario_nome?: string | null;
  autor?: string | null;
  created_at?: string;
}

/** Valores aceitos pela API, tirados dos enums do OpenAPI para acompanharem o `gen:api`. */
type CorpoDeNovoProblema = NonNullable<paths['/api/v1/contratos/{contrato_id}/problemas']['post']['requestBody']>['content']['application/json'];
type CorpoDeStatusDoProblema = NonNullable<paths['/api/v1/problemas/{problema_id}/status']['patch']['requestBody']>['content']['application/json'];
export type PrioridadeDoProblema = NonNullable<CorpoDeNovoProblema['prioridade']>;
export type StatusDoProblema = CorpoDeStatusDoProblema['status'];

/** Mínimo exigido pela API no texto de uma atualização (sem contar os espaços das pontas). */
export const TAMANHO_MINIMO_DA_ATUALIZACAO = 5;

const ROTULOS_DE_STATUS: Record<StatusDoProblema, string> = {
  aberto: 'Aberto',
  em_analise: 'Em análise',
  em_andamento: 'Em andamento',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
};
/** Indexável por qualquer texto, porque o status chega da API como string. */
export const ROTULO_DO_STATUS_DO_PROBLEMA: Record<string, string> = ROTULOS_DE_STATUS;

/** Resolvido e fechado encerram o problema: não contam como pendência nem aceitam comentário do locatário. */
export function problemaEstaEncerrado(status: string | null | undefined): boolean {
  return status === 'resolvido' || status === 'fechado';
}

export const ROTULO_DA_PRIORIDADE: Record<string, string> = {
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
};

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
      let contratosNegados = 0;
      const problemasPorContrato = await Promise.all(
        contratos.map(async (contrato) => {
          try {
            const problemas = await obterDados<Problema[]>(
              api.GET('/api/v1/contratos/{contrato_id}/problemas', { params: { path: { contrato_id: contrato.id } } }),
            );
            return problemas.map((problema): ProblemaComContrato => ({ ...problema, contrato_id: problema.contrato_id ?? contrato.id, contrato }));
          } catch (erro) {
            // o vistoriador recebe 403 nesta rota; contamos para avisar na tela
            if (erro instanceof ErroApi && erro.status === 403) contratosNegados += 1;
            return [];
          }
        }),
      );
      const problemas = problemasPorContrato.flat().sort((primeiro, segundo) => String(segundo.created_at ?? '').localeCompare(String(primeiro.created_at ?? '')));
      return { problemas, contratosNegados };
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
    // o problema nasce sempre "aberto": a API recusa outro status na criação, então o campo não é enviado
    mutationFn: ({ contratoId, titulo, descricao, prioridade }: { contratoId: string; titulo: string; descricao: string | null; prioridade: PrioridadeDoProblema }) =>
      obterDados<Problema>(
        api.POST('/api/v1/contratos/{contrato_id}/problemas', {
          params: { path: { contrato_id: contratoId } },
          body: { titulo, descricao, prioridade },
        }),
      ),
    onSuccess: invalidar,
  });
}

export function useAtualizarStatusDoProblema(id: string) {
  const invalidar = useInvalidarProblemas();
  return useMutation({
    mutationFn: (status: StatusDoProblema) =>
      obterDados(api.PATCH('/api/v1/problemas/{problema_id}/status', { params: { path: { problema_id: id } }, body: { status } })),
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
          body: { descricao: texto },
        }),
      ),
    onSuccess: invalidar,
  });
}
