import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, desembrulhar, ErroApi, obterDados } from './client';
import type { components } from './schema';
import type { Endereco } from '../utils/endereco';

export const ITENS_POR_PAGINA = 20;

export interface Imovel {
  id: string;
  codigo?: string | null;
  titulo?: string | null;
  tipo?: string | null;
  tamanho?: string | null;
  garagem?: boolean | number | string | null;
  garagem_vagas?: number | null;
  status?: string | null;
  observacoes?: string | null;
  endereco?: Endereco | string | null;
  created_at?: string;
}

export interface Comodo {
  id: string;
  tipo: string;
  descricao?: string | null;
}

export interface ContratoResumido {
  id: string;
  data_inicio?: string;
  data_fim?: string;
  status?: string;
}

type DadosDoImovel = components['schemas']['ImovelCreate'];
type DadosDeEndereco = components['schemas']['EnderecoCreate'];

export function imovelTemGaragem(imovel: Imovel): boolean {
  return imovel.garagem === true || imovel.garagem === 1 || imovel.garagem === 'sim' || imovel.garagem === '1';
}

/** Últimos 5 caracteres do UUID, como o PHP exibia. */
export function codigoCurto(imovel: Pick<Imovel, 'id'>): string {
  return String(imovel.id ?? '').slice(-5);
}

const chaves = {
  todos: ['imoveis'] as const,
  lista: (pagina: number, status: string) => ['imoveis', 'lista', pagina, status] as const,
  mapa: ['imoveis', 'mapa'] as const,
  detalhe: (id: string) => ['imoveis', 'detalhe', id] as const,
  endereco: (id: string) => ['imoveis', 'endereco', id] as const,
  comodos: (id: string) => ['imoveis', 'comodos', id] as const,
  contratos: (id: string, limite: number) => ['imoveis', 'contratos', id, limite] as const,
};

const caminhoDoImovel = (id: string) => ({ params: { path: { imovel_id: id } } });

export function useListaDeImoveis(pagina: number, status: string) {
  return useQuery({
    queryKey: chaves.lista(pagina, status),
    queryFn: () =>
      desembrulhar<Imovel[]>(
        api.GET('/api/v1/imoveis', { params: { query: { pagina, por_pagina: ITENS_POR_PAGINA, ...(status ? { status } : {}) } } }),
      ),
    placeholderData: keepPreviousData,
  });
}

/** imoveis/mapa.php — até 100 imóveis já com endereço/coordenadas. */
export function useImoveisDoMapa() {
  return useQuery({
    queryKey: chaves.mapa,
    queryFn: () => obterDados<Imovel[]>(api.GET('/api/v1/imoveis', { params: { query: { por_pagina: 100, com_endereco: true } } })),
  });
}

export function useImovel(id: string) {
  return useQuery({
    queryKey: chaves.detalhe(id),
    queryFn: () => obterDados<Imovel>(api.GET('/api/v1/imoveis/{imovel_id}', caminhoDoImovel(id))),
    enabled: Boolean(id),
  });
}

/** Endereço inexistente (404) vira null em vez de erro. */
export async function buscarEnderecoDoImovel(id: string): Promise<Endereco | null> {
  try {
    return await obterDados<Endereco>(api.GET('/api/v1/imoveis/{imovel_id}/endereco', caminhoDoImovel(id)));
  } catch (erro) {
    if (erro instanceof ErroApi && erro.status === 404) return null;
    throw erro;
  }
}

export function useEnderecoDoImovel(id: string) {
  return useQuery({ queryKey: chaves.endereco(id), queryFn: () => buscarEnderecoDoImovel(id), enabled: Boolean(id) });
}

export function useComodos(id: string) {
  return useQuery({
    queryKey: chaves.comodos(id),
    queryFn: () => obterDados<Comodo[]>(api.GET('/api/v1/imoveis/{imovel_id}/comodos', caminhoDoImovel(id))),
    enabled: Boolean(id),
  });
}

export function useContratosDoImovel(id: string, limite: number) {
  return useQuery({
    queryKey: chaves.contratos(id, limite),
    queryFn: () => obterDados<ContratoResumido[]>(api.GET('/api/v1/contratos', { params: { query: { imovel_id: id, por_pagina: limite } } })),
    enabled: Boolean(id),
  });
}

/** Um registro do histórico; `dados` tem o mesmo formato das listagens de contratos, checklists e problemas. */
export interface EventoDoHistorico {
  tipo: 'contrato' | 'vistoria' | 'problema';
  data: string;
  dados: { id: string; status?: string; tipo?: string; titulo?: string; data_inicio?: string; data_fim?: string | null; data_vistoria?: string | null; prioridade?: string };
}

/**
 * Contratos, vistorias e problemas do imóvel, em ordem cronológica de registro.
 * Cada perfil só recebe o que já vê nas listagens (o vistoriador, por exemplo, não recebe problemas).
 */
export function useHistoricoDoImovel(id: string) {
  return useQuery({
    queryKey: [...chaves.todos, 'historico', id],
    queryFn: () => obterDados<{ imovel_id: string; eventos: EventoDoHistorico[] }>(api.GET('/api/v1/imoveis/{imovel_id}/historico', caminhoDoImovel(id))),
    enabled: Boolean(id),
  });
}

function useInvalidarImoveis() {
  const clienteDeConsultas = useQueryClient();
  return () => clienteDeConsultas.invalidateQueries({ queryKey: chaves.todos });
}

async function salvarEndereco(id: string, endereco: DadosDeEndereco | null): Promise<void> {
  if (endereco) await obterDados(api.POST('/api/v1/imoveis/{imovel_id}/endereco', { ...caminhoDoImovel(id), body: endereco }));
}

/** Como no PHP: cria o imóvel e, se houver endereço válido, grava em seguida via /endereco. */
export function useCriarImovel() {
  const invalidar = useInvalidarImoveis();
  return useMutation({
    mutationFn: async ({ imovel, endereco }: { imovel: DadosDoImovel; endereco: DadosDeEndereco | null }) => {
      const criado = await obterDados<Imovel>(api.POST('/api/v1/imoveis', { body: imovel }));
      await salvarEndereco(criado.id, endereco);
      return criado;
    },
    onSuccess: invalidar,
  });
}

export function useAtualizarImovel(id: string) {
  const invalidar = useInvalidarImoveis();
  return useMutation({
    mutationFn: async ({ imovel, endereco }: { imovel: DadosDoImovel; endereco: DadosDeEndereco | null }) => {
      const atualizado = await obterDados<Imovel>(api.PUT('/api/v1/imoveis/{imovel_id}', { ...caminhoDoImovel(id), body: imovel }));
      await salvarEndereco(id, endereco);
      return atualizado;
    },
    onSuccess: invalidar,
  });
}

export function useAdicionarComodo(id: string) {
  const invalidar = useInvalidarImoveis();
  return useMutation({
    mutationFn: (comodo: components['schemas']['ComodoCreate']) =>
      obterDados<Comodo>(api.POST('/api/v1/imoveis/{imovel_id}/comodos', { ...caminhoDoImovel(id), body: comodo })),
    onSuccess: invalidar,
  });
}

export function useRemoverComodo(id: string) {
  const invalidar = useInvalidarImoveis();
  return useMutation({
    mutationFn: (comodoId: string) =>
      obterDados(api.DELETE('/api/v1/imoveis/{imovel_id}/comodos/{comodo_id}', { params: { path: { imovel_id: id, comodo_id: comodoId } } })),
    onSuccess: invalidar,
  });
}
