import type { Usuario } from './tipos';

/** Espelha includes/rbac.php — RBAC no front é só de interface; a API valida de verdade. */
export type Pagina =
  | 'dashboard'
  | 'imoveis'
  | 'vistorias'
  | 'contratos'
  | 'problemas'
  | 'mapa'
  | 'usuarios'
  | 'logs'
  | 'locatario';

export type RecursoCriavel = 'imoveis' | 'contratos' | 'vistorias' | 'problemas' | 'usuarios';

const PERFIS_POR_PAGINA: Record<Pagina, string[]> = {
  dashboard: ['admin', 'gestor', 'vistoriador', 'visualizador'],
  imoveis: ['admin', 'gestor', 'vistoriador', 'visualizador'],
  vistorias: ['admin', 'gestor', 'vistoriador', 'visualizador', 'locatario'],
  contratos: ['admin', 'gestor', 'visualizador'],
  problemas: ['admin', 'gestor', 'vistoriador', 'visualizador', 'locatario'],
  mapa: ['admin', 'gestor', 'vistoriador', 'visualizador'],
  usuarios: ['admin', 'gestor'],
  logs: ['admin'],
  locatario: ['locatario'],
};

const PERFIS_QUE_CRIAM: Record<RecursoCriavel, string[]> = {
  imoveis: ['admin', 'gestor'],
  contratos: ['admin', 'gestor'],
  vistorias: ['admin', 'gestor', 'vistoriador'],
  problemas: ['admin', 'gestor', 'vistoriador', 'locatario'],
  usuarios: ['admin'],
};

export function perfilDo(usuario: Usuario | null): string {
  return String(usuario?.role ?? 'visualizador').toLowerCase();
}

export function podeAcessar(usuario: Usuario | null, pagina: Pagina): boolean {
  const perfil = perfilDo(usuario);
  return perfil === 'admin' || PERFIS_POR_PAGINA[pagina].includes(perfil);
}

export function podeCriar(usuario: Usuario | null, recurso: RecursoCriavel): boolean {
  const perfil = perfilDo(usuario);
  return perfil === 'admin' || PERFIS_QUE_CRIAM[recurso].includes(perfil);
}

/** Equivalente a api_home_url(). */
export function rotaInicial(usuario: Usuario | null): string {
  return perfilDo(usuario) === 'locatario' ? '/locatario' : '/dashboard';
}

export type ItemDeMenu =
  | { secao: string }
  | { id: string; rotulo: string; icone: string; rota: string; pagina: Pagina };

const ITENS_DE_MENU: ItemDeMenu[] = [
  { secao: 'Principal' },
  { id: 'dashboard', rotulo: 'Dashboard', icone: 'bi-speedometer2', rota: '/dashboard', pagina: 'dashboard' },
  { id: 'imoveis', rotulo: 'Imóveis', icone: 'bi-building', rota: '/imoveis', pagina: 'imoveis' },
  { id: 'vistorias', rotulo: 'Vistorias', icone: 'bi-camera', rota: '/vistorias', pagina: 'vistorias' },
  { id: 'contratos', rotulo: 'Contratos', icone: 'bi-file-earmark-text', rota: '/contratos', pagina: 'contratos' },
  { secao: 'Gestão' },
  { id: 'problemas', rotulo: 'Problemas', icone: 'bi-exclamation-triangle', rota: '/problemas', pagina: 'problemas' },
  { id: 'mapa', rotulo: 'Mapa', icone: 'bi-map', rota: '/imoveis/mapa', pagina: 'mapa' },
  { id: 'usuarios', rotulo: 'Usuários', icone: 'bi-people', rota: '/usuarios', pagina: 'usuarios' },
  { secao: 'Sistema' },
  { id: 'logs', rotulo: 'Logs', icone: 'bi-list-ul', rota: '/dashboard/logs', pagina: 'logs' },
];

/** Equivalente a api_menu_items(): remove itens sem permissão e seções vazias. */
export function itensDeMenuPara(usuario: Usuario | null): ItemDeMenu[] {
  const resultado: ItemDeMenu[] = [];
  let secaoPendente: ItemDeMenu | null = null;

  for (const item of ITENS_DE_MENU) {
    if ('secao' in item) {
      secaoPendente = item;
      continue;
    }
    if (!podeAcessar(usuario, item.pagina)) continue;
    if (secaoPendente) {
      resultado.push(secaoPendente);
      secaoPendente = null;
    }
    resultado.push(item);
  }
  return resultado;
}
