import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, desembrulhar, ErroApi, obterDados } from './client';
import type { Agendamento, Contrato } from './contratos';
import type { Imovel } from './imoveis';
import type { Problema } from './problemas';
import type { Checklist } from './vistorias';
import { useAuth } from '../auth/AuthContext';
import { podeAcessar } from '../auth/permissoes';

/**
 * Os 4 totais de GET /dashboard, com o mesmo recorte das listagens de cada perfil.
 * Um total que o perfil não acessa vem null (ex.: problemas_abertos para o vistoriador): não exibir.
 */
export interface ResumoDoPainel {
  imoveis_locados: number | null;
  checklists_pendentes: number | null;
  problemas_abertos: number | null;
  vistorias_agendadas: number | null;
}

export interface RegistroDeLog {
  id: string;
  usuario_id?: string | null;
  acao: string;
  entidade?: string | null;
  entidade_id?: string | null;
  detalhes?: string | null;
  /** Nas edições novas: {"campos": ["nome", …]}, só os nomes dos campos alterados. Eventos antigos trazem null. */
  payload?: { campos?: unknown } | null;
  ip?: string | null;
  created_at: string;
}

export interface FiltrosDeLog {
  pagina: number;
  acao: string;
  entidade: string;
  de: string;
  ate: string;
}

export const ITENS_POR_PAGINA_DE_LOG = 20;

export function useResumoDoPainel() {
  return useQuery({ queryKey: ['painel', 'resumo'], queryFn: () => obterDados<ResumoDoPainel>(api.GET('/api/v1/dashboard')) });
}

/**
 * Ignora falhas de um contrato para não derrubar o painel, mas conta os 403 para a tela avisar.
 */
async function porContrato<T>(contratos: Contrato[], buscar: (contratoId: string) => Promise<T[]>) {
  let negados = 0;
  const resultados = await Promise.all(
    contratos.map(async (contrato) => {
      try {
        return (await buscar(contrato.id)).map((registro) => ({ ...registro, contrato }));
      } catch (erro) {
        if (erro instanceof ErroApi && erro.status === 403) negados += 1;
        return [];
      }
    }),
  );
  return { registros: resultados.flat(), negados };
}

/**
 * Base de dados dos painéis (o PHP fazia isso dentro de dashboard_vistorias_mensal):
 * imóveis e contratos (até 100) + checklists, problemas e agendamentos de cada contrato, em paralelo.
 */
export function useDadosDoPainel() {
  const { usuario } = useAuth();
  // o vistoriador recebe 403 em problemas: nada é pedido, em vez de um 403 por contrato
  const veProblemas = podeAcessar(usuario, 'problemas');
  return useQuery({
    queryKey: ['painel', 'dados', veProblemas],
    queryFn: async () => {
      const [imoveis, contratos] = await Promise.all([
        obterDados<Imovel[]>(api.GET('/api/v1/imoveis', { params: { query: { por_pagina: 100 } } })),
        obterDados<Contrato[]>(api.GET('/api/v1/contratos', { params: { query: { por_pagina: 100 } } })),
      ]);
      const caminho = (contratoId: string) => ({ params: { path: { contrato_id: contratoId } } });
      const [checklists, problemas, agendamentos] = await Promise.all([
        porContrato(contratos, (id) => obterDados<Checklist[]>(api.GET('/api/v1/contratos/{contrato_id}/checklists', caminho(id)))),
        porContrato(veProblemas ? contratos : [], (id) => obterDados<Problema[]>(api.GET('/api/v1/contratos/{contrato_id}/problemas', caminho(id)))),
        porContrato(contratos, (id) => obterDados<Agendamento[]>(api.GET('/api/v1/contratos/{contrato_id}/agendamentos', caminho(id)))),
      ]);
      return {
        imoveis,
        contratos,
        checklists: checklists.registros,
        problemas: problemas.registros,
        agendamentos: agendamentos.registros,
        /** Quantos contratos a API negou (403), por tipo de dado. */
        negados: { checklists: checklists.negados, problemas: problemas.negados, agendamentos: agendamentos.negados },
      };
    },
    staleTime: 60_000,
  });
}

/** Nomes dos campos alterados numa edição, quando o evento os registra. */
export function camposAlteradosNoLog(log: RegistroDeLog): string[] {
  const campos = log.payload?.campos;
  return Array.isArray(campos) ? campos.filter((campo): campo is string => typeof campo === 'string') : [];
}

export function useLogs(filtros: FiltrosDeLog) {
  return useQuery({
    queryKey: ['painel', 'logs', filtros],
    queryFn: () =>
      desembrulhar<RegistroDeLog[]>(
        api.GET('/api/v1/logs', {
          params: {
            query: {
              pagina: filtros.pagina,
              por_pagina: ITENS_POR_PAGINA_DE_LOG,
              ...(filtros.acao ? { acao: filtros.acao } : {}),
              ...(filtros.entidade ? { entidade: filtros.entidade } : {}),
              ...(filtros.de ? { de: filtros.de } : {}),
              ...(filtros.ate ? { ate: filtros.ate } : {}),
            },
          },
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** Últimos N meses (o atual por último), com chave "AAAA-MM" e rótulo "Out". */
export function ultimosMeses(quantidade: number, referencia = new Date()) {
  return Array.from({ length: quantidade }, (_, indice) => {
    const data = new Date(referencia.getFullYear(), referencia.getMonth() - (quantidade - 1 - indice), 1);
    return { chave: `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`, rotulo: `${MESES[data.getMonth()]}/${String(data.getFullYear()).slice(2)}` };
  });
}

/** Próximos N meses a partir do atual. */
export function proximosMeses(quantidade: number, referencia = new Date()) {
  return ultimosMeses(quantidade, new Date(referencia.getFullYear(), referencia.getMonth() + quantidade - 1, 1));
}

export function chaveDoMes(data: string | null | undefined): string {
  return (data ?? '').slice(0, 7);
}
