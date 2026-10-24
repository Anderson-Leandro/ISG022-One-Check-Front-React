import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ErroApi, extrairMensagemDeErro, obterDados } from './client';
import type { components } from './schema';
import type { Comodo } from './imoveis';
import type { Contrato } from './contratos';
import type { Usuario } from '../auth/tipos';
import { ROTULO_DO_COMODO } from '../config/imoveis';

export interface FotoDoItem {
  id: string;
  url: string;
  [campo: string]: unknown;
}

export interface ItemDoChecklist {
  id: string;
  comodo_id?: string | null;
  item_vistoria_id?: string | null;
  estado?: string | null;
  observacao?: string | null;
  fotos?: FotoDoItem[];
}

export interface Checklist {
  id: string;
  contrato_id: string;
  vistoriador_id?: string | null;
  tipo?: string;
  status?: string;
  data_vistoria?: string | null;
  created_at?: string;
  aceite?: unknown;
  itens?: ItemDoChecklist[];
  comodos?: (Comodo & { nome?: string })[];
}

export interface ChecklistComContrato extends Checklist {
  contrato: Contrato;
}

export interface ItemDeVistoria {
  id: string;
  nome: string;
  categoria?: string;
}

export const ROTULO_DO_TIPO_DE_VISTORIA: Record<string, string> = {
  inicial: 'Entrada (inicial)',
  encerramento: 'Saída (encerramento)',
};

/** Status e cores de vistorias/index.php. */
export const STATUS_DA_VISTORIA: Record<string, { rotulo: string; classe: string }> = {
  em_preenchimento: { rotulo: 'Em preenchimento', classe: 'bg-warning text-dark' },
  pendente_aceite: { rotulo: 'Pendente aceite', classe: 'bg-info text-dark' },
  aceito: { rotulo: 'Aceito', classe: 'bg-success' },
  rejeitado: { rotulo: 'Rejeitado', classe: 'bg-danger' },
  pendente_revisao: { rotulo: 'Pendente revisão', classe: 'bg-warning text-dark' },
};

/** Estados de item com estilo próprio em style.css (.oc-estado-*). */
export const ESTADOS_DO_ITEM = ['otimo', 'bom', 'regular', 'ruim'] as const;
export const ROTULO_DO_ESTADO: Record<string, string> = { otimo: 'Ótimo', bom: 'Bom', regular: 'Regular', ruim: 'Ruim' };

export type AcaoDeStatus = 'submeter' | 'enviar-para-aceite' | 'aceitar' | 'rejeitar';

const chaves = {
  todos: ['vistorias'] as const,
  lista: ['vistorias', 'lista'] as const,
  detalhe: (id: string) => ['vistorias', 'detalhe', id] as const,
  catalogo: ['vistorias', 'itens-vistoria'] as const,
};

const caminhoDoChecklist = (id: string) => ({ params: { path: { checklist_id: id } } });

/** Como no PHP: busca os contratos e os checklists de cada um, em paralelo. */
export function useTodasAsVistorias() {
  return useQuery({
    queryKey: chaves.lista,
    queryFn: async () => {
      const contratos = await obterDados<Contrato[]>(api.GET('/api/v1/contratos', { params: { query: { por_pagina: 100 } } }));
      let contratosNegados = 0;
      const porContrato = await Promise.all(
        contratos.map(async (contrato) => {
          try {
            const checklists = await obterDados<Checklist[]>(
              api.GET('/api/v1/contratos/{contrato_id}/checklists', { params: { path: { contrato_id: contrato.id } } }),
            );
            return checklists.map((checklist): ChecklistComContrato => ({ ...checklist, contrato_id: checklist.contrato_id ?? contrato.id, contrato }));
          } catch (erro) {
            if (erro instanceof ErroApi && erro.status === 403) contratosNegados += 1;
            return [];
          }
        }),
      );
      const vistorias = porContrato.flat().sort((primeira, segunda) => String(segunda.created_at ?? '').localeCompare(String(primeira.created_at ?? '')));
      return { vistorias, contratosNegados };
    },
  });
}

export function useChecklist(id: string) {
  return useQuery({
    queryKey: chaves.detalhe(id),
    queryFn: () => obterDados<Checklist>(api.GET('/api/v1/checklists/{checklist_id}', caminhoDoChecklist(id))),
    enabled: Boolean(id),
  });
}

/** Checklists de um contrato com os itens completos — usado no comparativo entrada × saída. */
export function useChecklistsCompletosDoContrato(contratoId: string | undefined) {
  return useQuery({
    queryKey: ['vistorias', 'contrato', contratoId],
    queryFn: async () => {
      const resumos = await obterDados<Checklist[]>(
        api.GET('/api/v1/contratos/{contrato_id}/checklists', { params: { path: { contrato_id: contratoId ?? '' } } }),
      );
      return Promise.all(resumos.map((resumo) => obterDados<Checklist>(api.GET('/api/v1/checklists/{checklist_id}', caminhoDoChecklist(resumo.id)))));
    },
    enabled: Boolean(contratoId),
  });
}

/** Catálogo de itens (Paredes, Pintura…) — nomes para item_vistoria_id. */
export function useCatalogoDeItens() {
  return useQuery({
    queryKey: chaves.catalogo,
    queryFn: () => obterDados<ItemDeVistoria[]>(api.GET('/api/v1/itens-vistoria')),
    staleTime: 30 * 60_000,
  });
}

export function useVistoriadores() {
  return useQuery({
    queryKey: ['usuarios', 'vistoriadores'],
    queryFn: () => obterDados<Usuario[]>(api.GET('/api/v1/usuarios', { params: { query: { role: 'vistoriador', por_pagina: 100 } } })),
    retry: false,
  });
}

function useInvalidarVistorias() {
  const clienteDeConsultas = useQueryClient();
  // checklists também aparecem nos detalhes do contrato
  return () => Promise.all([chaves.todos, ['contratos']].map((queryKey) => clienteDeConsultas.invalidateQueries({ queryKey })));
}

export function useCriarVistoria() {
  const invalidar = useInvalidarVistorias();
  return useMutation({
    mutationFn: ({ contratoId, dados }: { contratoId: string; dados: components['schemas']['ChecklistCreate'] }) =>
      obterDados<Checklist>(api.POST('/api/v1/contratos/{contrato_id}/checklists', { params: { path: { contrato_id: contratoId } }, body: dados })),
    onSuccess: invalidar,
  });
}

/** submeter / enviar-para-aceite / aceitar / rejeitar — todos PATCH na API (o PHP usava POST em aceitar/rejeitar). */
export function useMudarStatusDaVistoria(id: string) {
  const invalidar = useInvalidarVistorias();
  return useMutation({
    mutationFn: ({ acao, motivo }: { acao: AcaoDeStatus; motivo?: string }) => {
      const caminho = caminhoDoChecklist(id);
      switch (acao) {
        case 'submeter':
          return obterDados(api.PATCH('/api/v1/checklists/{checklist_id}/submeter', caminho));
        case 'enviar-para-aceite':
          return obterDados(api.PATCH('/api/v1/checklists/{checklist_id}/enviar-para-aceite', caminho));
        case 'aceitar':
          return obterDados(api.PATCH('/api/v1/checklists/{checklist_id}/aceitar', caminho));
        case 'rejeitar':
          return obterDados(api.PATCH('/api/v1/checklists/{checklist_id}/rejeitar', { ...caminho, body: { motivo: motivo || null, motivo_rejeicao: motivo || null } }));
      }
    },
    onSuccess: invalidar,
  });
}

export function useAdicionarItem(checklistId: string) {
  const invalidar = useInvalidarVistorias();
  return useMutation({
    mutationFn: (dados: components['schemas']['AddChecklistItemRequest']) =>
      obterDados<ItemDoChecklist>(api.POST('/api/v1/checklists/{checklist_id}/itens', { ...caminhoDoChecklist(checklistId), body: dados })),
    onSuccess: invalidar,
  });
}

export function useAtualizarItem(checklistId: string) {
  const invalidar = useInvalidarVistorias();
  return useMutation({
    mutationFn: ({ itemId, dados }: { itemId: string; dados: components['schemas']['ItemUpdateRequest'] }) =>
      obterDados<ItemDoChecklist>(
        api.PUT('/api/v1/checklists/{checklist_id}/itens/{item_id}', { params: { path: { checklist_id: checklistId, item_id: itemId } }, body: dados }),
      ),
    onSuccess: invalidar,
  });
}

export function useEnviarFoto(checklistId: string) {
  const invalidar = useInvalidarVistorias();
  return useMutation({
    mutationFn: ({ itemId, arquivo }: { itemId: string; arquivo: File }) => {
      const formulario = new FormData();
      formulario.append('foto', arquivo);
      return obterDados<FotoDoItem>(
        api.POST('/api/v1/checklists/{checklist_id}/itens/{item_id}/fotos', {
          params: { path: { checklist_id: checklistId, item_id: itemId } },
          // multipart: com FormData o openapi-fetch deixa o navegador definir o Content-Type com boundary
          body: formulario as never,
          bodySerializer: (corpo: unknown) => corpo as FormData,
        }),
      );
    },
    onSuccess: invalidar,
  });
}

export function useRemoverFoto(checklistId: string) {
  const invalidar = useInvalidarVistorias();
  return useMutation({
    mutationFn: ({ itemId, fotoId }: { itemId: string; fotoId: string }) =>
      obterDados(
        api.DELETE('/api/v1/checklists/{checklist_id}/itens/{item_id}/fotos/{foto_id}', {
          params: { path: { checklist_id: checklistId, item_id: itemId, foto_id: fotoId } },
        }),
      ),
    onSuccess: invalidar,
  });
}

/** PDF do relatório: precisa do token, então vem como Blob em vez de link direto. */
export async function baixarPdfDaVistoria(id: string): Promise<Blob> {
  const { data, error, response } = await api.GET('/api/v1/checklists/{checklist_id}/download-pdf', { ...caminhoDoChecklist(id), parseAs: 'blob' });
  if (!response.ok || !(data instanceof Blob)) {
    const corpo = error ?? (await response.clone().json().catch(() => null));
    throw new ErroApi(extrairMensagemDeErro(corpo, response.status), response.status, corpo);
  }
  return data;
}

export function useBaixarPdf() {
  return useMutation({ mutationFn: baixarPdfDaVistoria });
}

/**
 * Fluxo confirmado em teste contra a API:
 * em_preenchimento --submeter (≥1 item)--> pendente_aceite --aceitar|rejeitar--> aceito | rejeitado (finais).
 * enviar-para-aceite (admin/gestor) também leva de em_preenchimento/pendente_revisao para pendente_aceite.
 */
export function permissoesDaVistoria(checklist: Checklist | undefined, usuario: Usuario | null) {
  const perfil = String(usuario?.role ?? '').toLowerCase();
  const status = checklist?.status ?? '';
  const ehGestao = perfil === 'admin' || perfil === 'gestor';
  const ehVistoriadorDesignado = perfil === 'vistoriador' && Boolean(usuario?.id) && checklist?.vistoriador_id === usuario?.id;
  const emEdicao = status === 'em_preenchimento' || status === 'pendente_revisao';

  return {
    editarItens: emEdicao && (ehGestao || ehVistoriadorDesignado),
    submeter: status === 'em_preenchimento' && (ehGestao || ehVistoriadorDesignado),
    enviarParaAceite: emEdicao && ehGestao,
    aceitarOuRejeitar: status === 'pendente_aceite' && (ehGestao || perfil === 'locatario'),
  };
}

/** Nomes legíveis para cômodos (do checklist) e itens (do catálogo). */
export function useNomesDaVistoria(checklist: Checklist | undefined) {
  const { data: catalogo = [] } = useCatalogoDeItens();
  const nomeDoItem = new Map(catalogo.map((item) => [item.id, item.nome]));
  const nomeDoComodo = new Map(
    (checklist?.comodos ?? []).map((comodo) => [comodo.id, comodo.nome || comodo.descricao || ROTULO_DO_COMODO[comodo.tipo] || comodo.tipo]),
  );
  return {
    catalogo,
    nomeDoItem: (id: string | null | undefined) => (id && nomeDoItem.get(id)) || 'Item de vistoria',
    nomeDoComodo: (id: string | null | undefined) => (id && nomeDoComodo.get(id)) || 'Cômodo',
  };
}

/** Agrupa os itens por cômodo, na ordem em que os cômodos aparecem no checklist. */
export function agruparItensPorComodo(checklist: Checklist | undefined) {
  const grupos = new Map<string, ItemDoChecklist[]>();
  for (const item of checklist?.itens ?? []) {
    const chave = item.comodo_id ?? 'sem-comodo';
    grupos.set(chave, [...(grupos.get(chave) ?? []), item]);
  }
  return [...grupos.entries()].map(([comodoId, itens]) => ({ comodoId, itens }));
}
