import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, desembrulhar, obterDados } from './client';
import type { components } from './schema';
import type { Imovel } from './imoveis';
import type { Usuario } from '../auth/tipos';

export const ITENS_POR_PAGINA = 20;

export interface Contrato {
  id: string;
  imovel_id: string;
  locatario_id: string;
  data_inicio?: string;
  data_fim?: string;
  valor_mensal?: number | string | null;
  status?: string;
  created_at?: string;
  [campo: string]: unknown;
}

export interface Agendamento {
  id: string;
  tipo: string;
  data_agendada: string;
  observacao?: string | null;
}

export interface ChecklistResumido {
  id: string;
  tipo?: string;
  status?: string;
  data_vistoria?: string | null;
  created_at?: string;
}

export interface ProblemaResumido {
  id: string;
  titulo?: string;
  descricao?: string;
  status?: string;
  prioridade?: string;
  created_at?: string;
}

export const ROTULO_DO_STATUS_DO_CONTRATO: Record<string, string> = {
  ativo: 'Ativo',
  encerrado: 'Encerrado',
  cancelado: 'Cancelado',
};

/** Tipos de agendamento/vistoria usados no front PHP (mock_data.php e vistorias/nova.php). */
export const ROTULO_DO_TIPO_DE_AGENDAMENTO: Record<string, string> = {
  inicial: 'Vistoria inicial',
  final: 'Vistoria final',
  periodica: 'Vistoria periódica',
};

export function idCurto(id: string | null | undefined): string {
  return id ? `${id.slice(0, 8)}…` : '—';
}

const chaves = {
  todos: ['contratos'] as const,
  lista: (pagina: number, status: string) => ['contratos', 'lista', pagina, status] as const,
  detalhe: (id: string) => ['contratos', 'detalhe', id] as const,
  agendamentos: (id: string) => ['contratos', 'agendamentos', id] as const,
  checklists: (id: string) => ['contratos', 'checklists', id] as const,
  problemas: (id: string) => ['contratos', 'problemas', id] as const,
};

const caminhoDoContrato = (id: string) => ({ params: { path: { contrato_id: id } } });

export function useListaDeContratos(pagina: number, status: string) {
  return useQuery({
    queryKey: chaves.lista(pagina, status),
    queryFn: () =>
      desembrulhar<Contrato[]>(
        api.GET('/api/v1/contratos', { params: { query: { pagina, por_pagina: ITENS_POR_PAGINA, ...(status ? { status } : {}) } } }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useContrato(id: string) {
  return useQuery({
    queryKey: chaves.detalhe(id),
    queryFn: () => obterDados<Contrato>(api.GET('/api/v1/contratos/{contrato_id}', caminhoDoContrato(id))),
    enabled: Boolean(id),
  });
}

export function useAgendamentosDoContrato(id: string) {
  return useQuery({
    queryKey: chaves.agendamentos(id),
    queryFn: () => obterDados<Agendamento[]>(api.GET('/api/v1/contratos/{contrato_id}/agendamentos', caminhoDoContrato(id))),
    enabled: Boolean(id),
  });
}

export function useChecklistsDoContrato(id: string) {
  return useQuery({
    queryKey: chaves.checklists(id),
    queryFn: () => obterDados<ChecklistResumido[]>(api.GET('/api/v1/contratos/{contrato_id}/checklists', caminhoDoContrato(id))),
    enabled: Boolean(id),
  });
}

export function useProblemasDoContrato(id: string) {
  return useQuery({
    queryKey: chaves.problemas(id),
    queryFn: () => obterDados<ProblemaResumido[]>(api.GET('/api/v1/contratos/{contrato_id}/problemas', caminhoDoContrato(id))),
    enabled: Boolean(id),
  });
}

/** Opções do formulário de novo contrato (contratos/novo.php). */
export function useImoveisDisponiveis() {
  return useQuery({
    queryKey: ['imoveis', 'disponiveis'],
    queryFn: () => obterDados<Imovel[]>(api.GET('/api/v1/imoveis', { params: { query: { status: 'disponivel', por_pagina: 100 } } })),
  });
}

export function useLocatarios() {
  return useQuery({
    queryKey: ['usuarios', 'locatarios'],
    queryFn: () => obterDados<Usuario[]>(api.GET('/api/v1/usuarios', { params: { query: { role: 'locatario', por_pagina: 100 } } })),
    retry: false, // perfis sem acesso a /usuarios recebem 403 — a tela cai para o ID
  });
}

/** Mapa id → nome, para mostrar imóvel e locatário no lugar do UUID truncado. */
export function useNomesParaContratos() {
  const imoveis = useQuery({
    queryKey: ['imoveis', 'nomes'],
    queryFn: () => obterDados<Imovel[]>(api.GET('/api/v1/imoveis', { params: { query: { por_pagina: 100 } } })),
    staleTime: 5 * 60_000,
  });
  const locatarios = useLocatarios();

  const nomeDoImovel = new Map((imoveis.data ?? []).map((imovel) => [imovel.id, imovel.titulo || [imovel.tipo, imovel.tamanho].filter(Boolean).join(' — ')]));
  const nomeDoLocatario = new Map((locatarios.data ?? []).map((locatario) => [locatario.id, locatario.nome]));
  return {
    nomeDoImovel: (id: string) => nomeDoImovel.get(id) || idCurto(id),
    nomeDoLocatario: (id: string) => nomeDoLocatario.get(id) || idCurto(id),
  };
}

function useInvalidar(...chavesExtras: readonly (readonly string[])[]) {
  const clienteDeConsultas = useQueryClient();
  return () =>
    Promise.all([chaves.todos, ...chavesExtras].map((queryKey) => clienteDeConsultas.invalidateQueries({ queryKey })));
}

export function useCriarContrato() {
  // criar contrato muda o status do imóvel na API
  const invalidar = useInvalidar(['imoveis']);
  return useMutation({
    mutationFn: (dados: components['schemas']['ContratoCreate']) => obterDados<Contrato>(api.POST('/api/v1/contratos', { body: dados })),
    onSuccess: invalidar,
  });
}

/** Encerrar/cancelar — o PHP usava PATCH; a API aceita POST e PATCH. */
export function useMudarStatusDoContrato(id: string) {
  const invalidar = useInvalidar(['imoveis']);
  return useMutation({
    mutationFn: (acao: 'encerrar' | 'cancelar') =>
      obterDados(
        acao === 'encerrar'
          ? api.PATCH('/api/v1/contratos/{contrato_id}/encerrar', caminhoDoContrato(id))
          : api.PATCH('/api/v1/contratos/{contrato_id}/cancelar', caminhoDoContrato(id)),
      ),
    onSuccess: invalidar,
  });
}

export function useCriarAgendamento(contratoId: string) {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (dados: components['schemas']['AgendamentoCreate']) =>
      obterDados<Agendamento>(api.POST('/api/v1/contratos/{contrato_id}/agendamentos', { ...caminhoDoContrato(contratoId), body: dados })),
    onSuccess: invalidar,
  });
}

export function useAtualizarAgendamento() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: components['schemas']['AgendamentoUpdate'] }) =>
      obterDados<Agendamento>(api.PUT('/api/v1/agendamentos/{agendamento_id}', { params: { path: { agendamento_id: id } }, body: dados })),
    onSuccess: invalidar,
  });
}

export function useRemoverAgendamento() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (id: string) => obterDados(api.DELETE('/api/v1/agendamentos/{agendamento_id}', { params: { path: { agendamento_id: id } } })),
    onSuccess: invalidar,
  });
}
