import { PERFIS, type Usuario } from './tipos';

/** Nasceu de includes/rbac.php e hoje segue as regras da API. RBAC no front é só de interface; a API valida de verdade. */
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

export const PERFIS_POR_PAGINA: Record<Pagina, string[]> = {
  dashboard: ['admin', 'gestor', 'vistoriador'],
  imoveis: ['admin', 'gestor', 'vistoriador'],
  vistorias: ['admin', 'gestor', 'vistoriador', 'locatario'],
  contratos: ['admin', 'gestor'],
  // o vistoriador recebe 403 em toda rota de problemas
  problemas: ['admin', 'gestor', 'locatario'],
  mapa: ['admin', 'gestor', 'vistoriador'],
  usuarios: ['admin', 'gestor'],
  logs: ['admin'],
  locatario: ['locatario'],
};

export const PERFIS_QUE_CRIAM: Record<RecursoCriavel, string[]> = {
  imoveis: ['admin', 'gestor'],
  contratos: ['admin', 'gestor'],
  // POST /contratos/{id}/checklists é só de admin e gestor; o vistoriador preenche a vistoria que recebe
  vistorias: ['admin', 'gestor'],
  problemas: ['admin', 'gestor', 'locatario'],
  usuarios: ['admin', 'gestor'],
};

/** Sem usuário (ou sem perfil) devolve '', que não acessa nada. */
export function perfilDo(usuario: Usuario | null): string {
  return String(usuario?.role ?? usuario?.perfil ?? '').toLowerCase();
}

function perfilEhValido(perfil: string): boolean {
  return (PERFIS as readonly string[]).includes(perfil);
}

const PERFIS_DE_GESTAO = ['admin', 'gestor'];
/** O gestor só cria, edita, desativa e reseta contas destes perfis; admin e gestor ficam com o admin. */
const PERFIS_QUE_O_GESTOR_GERENCIA = ['vistoriador', 'locatario'];

/** GET /usuarios só responde para admin e gestor; os outros perfis não devem nem chamar. */
export function podeListarUsuarios(usuario: Usuario | null): boolean {
  return PERFIS_DE_GESTAO.includes(perfilDo(usuario));
}

/** Perfis que o usuário logado pode atribuir no cadastro e na edição. */
export function perfisAtribuiveisPor(usuario: Usuario | null): string[] {
  const perfil = perfilDo(usuario);
  if (perfil === 'admin') return [...PERFIS];
  return perfil === 'gestor' ? PERFIS_QUE_O_GESTOR_GERENCIA : [];
}

/**
 * A gestão de usuários recusa o próprio ID (a própria conta usa /usuarios/me),
 * e o gestor não mexe em contas de admin nem de gestor.
 */
export function podeGerenciarUsuario(usuario: Usuario | null, alvo: { id: string; role?: unknown; perfil?: unknown }): boolean {
  if (!usuario || usuario.id === alvo.id) return false;
  // o admin alcança também contas com perfil fora da lista (ex.: o antigo "visualizador"), para corrigi-las
  if (perfilDo(usuario) === 'admin') return true;
  return perfisAtribuiveisPor(usuario).includes(perfilDo(alvo as Usuario));
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
  const perfil = perfilDo(usuario);
  // perfil fora da lista não acessa o dashboard: o perfil é a única página que não depende de permissão
  if (!perfilEhValido(perfil)) return '/usuarios/perfil';
  return perfil === 'locatario' ? '/locatario' : '/dashboard';
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
