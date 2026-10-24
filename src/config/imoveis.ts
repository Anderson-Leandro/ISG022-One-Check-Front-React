/** Espelha front/config/imoveis.php e as opções fixas de imoveis/_form_campos.php. */

export const ROTULO_DO_STATUS_DO_IMOVEL: Record<string, string> = {
  disponivel: 'Disponível',
  locado: 'Locado',
  em_vistoria: 'Em vistoria',
  manutencao: 'Manutenção',
  inativo: 'Inativo',
};

/** Status oferecidos no formulário (o PHP não oferecia "inativo"). */
export const STATUS_EDITAVEIS_DO_IMOVEL = ['disponivel', 'locado', 'em_vistoria', 'manutencao'] as const;

/** O formulário PHP grava o rótulo como valor — mantido para não quebrar os dados existentes. */
export const TIPOS_DE_IMOVEL = ['Apartamento', 'Casa', 'Comercial', 'Galpão', 'Terreno'] as const;

const ROTULO_DO_TIPO_LEGADO: Record<string, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  comercial: 'Comercial',
  galpao: 'Galpão',
  outro: 'Outro',
};

export function rotuloDoTipoDeImovel(tipo: string | null | undefined): string {
  if (!tipo) return '—';
  return ROTULO_DO_TIPO_LEGADO[tipo] ?? tipo;
}

export const ROTULO_DO_COMODO: Record<string, string> = {
  sala: 'Sala',
  cozinha: 'Cozinha',
  quarto: 'Quarto',
  suite: 'Suíte',
  banheiro: 'Banheiro',
  area_servico: 'Área de serviço',
  varanda: 'Varanda',
  garagem: 'Garagem',
  escritorio: 'Escritório',
  outro: 'Outro',
};
