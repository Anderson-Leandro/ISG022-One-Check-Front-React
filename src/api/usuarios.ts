import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, desembrulhar, obterDados } from './client';
import type { components } from './schema';
import type { Usuario } from '../auth/tipos';
import { armazenamentoDeTokens } from '../auth/armazenamentoDeTokens';
import { useAuth } from '../auth/AuthContext';
import { podeListarUsuarios } from '../auth/permissoes';
import type { DadosDeConfiguracaoMfa } from '../components/QrCodeMfa';

export const ITENS_POR_PAGINA = 20;

export { PERFIS } from '../auth/tipos';

export const ROTULO_DO_PERFIL: Record<string, string> = {
  admin: 'Administrador',
  gestor: 'Gestor',
  vistoriador: 'Vistoriador',
  locatario: 'Locatário',
};

type DadosDeNovoUsuario = components['schemas']['UsuarioCreate'];
type DadosDeEdicaoDeUsuario = components['schemas']['UsuarioUpdate'];
type DadosDeEdicaoDoPerfil = components['schemas']['UsuarioUpdateMe'];

/** A API às vezes devolve "perfil" no lugar de "role" e "mfa_enabled" no lugar de "mfa_ativo". */
export function perfilDoUsuario(usuario: Usuario): string {
  return String(usuario.role ?? usuario.perfil ?? '');
}

export function mfaEstaAtivo(usuario: Usuario): boolean {
  return Boolean(usuario.mfa_ativo ?? usuario.mfa_enabled ?? false);
}

/** MFA exigido da conta (mfa_enabled), mesmo que o autenticador ainda não tenha sido configurado. */
export function mfaEstaExigido(usuario: Usuario): boolean {
  return Boolean(usuario.mfa_enabled ?? usuario.mfa_ativo ?? false);
}

/** Com autenticador configurado, trocar ou desabilitar o MFA exige o código atual. */
export function temAutenticadorConfigurado(usuario: Usuario): boolean {
  return Boolean(usuario.mfa_configurado ?? mfaEstaAtivo(usuario));
}

const chaves = {
  todos: ['usuarios'] as const,
  lista: (pagina: number, perfil: string) => ['usuarios', 'lista', pagina, perfil] as const,
  detalhe: (id: string) => ['usuarios', 'detalhe', id] as const,
  eu: ['usuarios', 'me'] as const,
};

export function useListaDeUsuarios(pagina: number, perfil: string) {
  return useQuery({
    queryKey: chaves.lista(pagina, perfil),
    queryFn: () =>
      desembrulhar<Usuario[]>(
        api.GET('/api/v1/usuarios', {
          params: { query: { pagina, por_pagina: ITENS_POR_PAGINA, ...(perfil ? { role: perfil } : {}) } },
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useUsuario(id: string) {
  return useQuery({
    queryKey: chaves.detalhe(id),
    queryFn: () => obterDados<Usuario>(api.GET('/api/v1/usuarios/{usuario_id}', { params: { path: { usuario_id: id } } })),
    enabled: Boolean(id),
  });
}

export function useMeuUsuario() {
  return useQuery({
    queryKey: chaves.eu,
    queryFn: () => obterDados<Usuario>(api.GET('/api/v1/usuarios/me')),
  });
}

/** Após qualquer escrita, recarrega listas e detalhes de usuários. */
function useInvalidarUsuarios() {
  const clienteDeConsultas = useQueryClient();
  return () => clienteDeConsultas.invalidateQueries({ queryKey: chaves.todos });
}

export function useCriarUsuario() {
  const invalidar = useInvalidarUsuarios();
  return useMutation({
    mutationFn: (dados: DadosDeNovoUsuario) => obterDados<Usuario>(api.POST('/api/v1/usuarios', { body: dados })),
    onSuccess: invalidar,
  });
}

export function useAtualizarUsuario(id: string) {
  const invalidar = useInvalidarUsuarios();
  return useMutation({
    mutationFn: (dados: DadosDeEdicaoDeUsuario) =>
      obterDados<Usuario>(api.PUT('/api/v1/usuarios/{usuario_id}', { params: { path: { usuario_id: id } }, body: dados })),
    onSuccess: invalidar,
  });
}

/**
 * Desativa a conta de outro usuário (DELETE /usuarios/{id}): ele perde o acesso na hora, porque a API encerra
 * as sessões dele. A API recusa o próprio ID, e o gestor não desativa admin nem gestor.
 * As listas de usuários são recarregadas, mas não o detalhe de quem saiu, que poderia responder 404 com a tela aberta.
 */
export function useDesativarUsuario(id: string) {
  const clienteDeConsultas = useQueryClient();
  return useMutation({
    mutationFn: () => obterDados(api.DELETE('/api/v1/usuarios/{usuario_id}', { params: { path: { usuario_id: id } } })),
    // as listas (gestão, nomes, locatários, vistoriadores), mas não o detalhe de quem saiu nem a própria conta (/usuarios/me)
    onSuccess: () => {
      void clienteDeConsultas.invalidateQueries({
        predicate: ({ queryKey }) => queryKey[0] === 'usuarios' && queryKey[1] !== 'me' && !queryKey.includes(id),
      });
    },
  });
}

/**
 * MFA de outro usuário (usuarios/editar.php). Ninguém vê nem escolhe o segredo de outra pessoa:
 * "exigir" só liga a exigência, e "resetar" apaga o autenticador. Nos dois casos o próprio usuário
 * configura o autenticador no próximo login, e as sessões dele são encerradas.
 */
export function useMfaDoUsuario(id: string) {
  const invalidar = useInvalidarUsuarios();
  return useMutation({
    mutationFn: (acao: 'exigir' | 'resetar') => {
      const parametros = { params: { path: { usuario_id: id } } };
      return obterDados(
        acao === 'exigir' ? api.POST('/api/v1/usuarios/{usuario_id}/mfa/enable', parametros) : api.DELETE('/api/v1/usuarios/{usuario_id}/mfa', parametros),
      );
    },
    onSuccess: invalidar,
  });
}

/**
 * Trocar senha, autenticador ou MFA encerra todas as sessões da conta; a resposta traz em dados.sessao
 * o único par de tokens que continua valendo, gravado aqui antes de recarregar as consultas.
 */
function useAoTrocarCredencial() {
  const invalidar = useInvalidarUsuarios();
  return (dados: unknown) => {
    armazenamentoDeTokens.aplicarSessao(dados);
    // sem esperar a recarga: a tela segue adiante assim que a troca é confirmada
    void invalidar();
  };
}

export function useAtualizarMeuPerfil() {
  const aoTrocarCredencial = useAoTrocarCredencial();
  return useMutation({
    mutationFn: (dados: DadosDeEdicaoDoPerfil) => obterDados<Usuario>(api.PATCH('/api/v1/usuarios/me', { body: dados })),
    onSuccess: aoTrocarCredencial,
  });
}

/** Troca obrigatória de quem entrou com uma senha fora da política (senha_expirada). */
export function useTrocarMinhaSenha() {
  const aoTrocarCredencial = useAoTrocarCredencial();
  return useMutation({
    mutationFn: (dados: components['schemas']['AlterarSenhaRequest']) => obterDados(api.PUT('/api/v1/usuarios/me/senha', { body: dados })),
    onSuccess: (dados) => {
      aoTrocarCredencial(dados);
      const usuario = armazenamentoDeTokens.obterUsuario();
      if (usuario) armazenamentoDeTokens.salvarUsuario({ ...usuario, senha_expirada: false });
    },
  });
}

/** GET /usuarios/me responde mesmo com a senha expirada; se a marca já caiu na API, cai aqui também. */
export function useSituacaoDaMinhaSenha() {
  return useQuery({
    queryKey: [...chaves.eu, 'senha'],
    queryFn: async () => {
      const atual = await obterDados<Usuario>(api.GET('/api/v1/usuarios/me'));
      const guardado = armazenamentoDeTokens.obterUsuario();
      if (guardado?.senha_expirada && !atual.senha_expirada) armazenamentoDeTokens.salvarUsuario({ ...guardado, senha_expirada: false });
      return Boolean(atual.senha_expirada);
    },
    retry: false,
  });
}

/** Gera o segredo novo e o QR Code. O segredo fica pendente na API até o activate. */
export function useGerarConfiguracaoDeMfa() {
  return useMutation({ mutationFn: () => obterDados<DadosDeConfiguracaoMfa>(api.POST('/api/v1/auth/mfa/setup')) });
}

/** Confirma o autenticador novo; codigo_atual é obrigatório para quem já tem um configurado. */
export function useAtivarMeuMfa() {
  const aoTrocarCredencial = useAoTrocarCredencial();
  return useMutation({
    mutationFn: (dados: components['schemas']['MfaActivateRequest']) => obterDados(api.POST('/api/v1/auth/mfa/activate', { body: dados })),
    onSuccess: aoTrocarCredencial,
  });
}

/** Só o locatário desliga o próprio MFA; nos outros perfis ele é obrigatório e a API responde 403. */
export function useDesabilitarMeuMfa() {
  const aoTrocarCredencial = useAoTrocarCredencial();
  return useMutation({
    mutationFn: (dados: components['schemas']['MfaDisableSelfRequest']) => obterDados(api.POST('/api/v1/auth/mfa/desabilitar', { body: dados })),
    onSuccess: aoTrocarCredencial,
  });
}

/**
 * Mapa id → nome de todos os usuários (até 100), para exibir autores.
 * Só admin e gestor listam usuários; nos outros perfis nada é pedido e o nome fica null.
 */
export function useNomeDoUsuario() {
  const { usuario } = useAuth();
  const consulta = useQuery({
    queryKey: ['usuarios', 'nomes'],
    queryFn: () => obterDados<Usuario[]>(api.GET('/api/v1/usuarios', { params: { query: { por_pagina: 100 } } })),
    staleTime: 5 * 60_000,
    retry: false,
    enabled: podeListarUsuarios(usuario),
  });
  const nomes = new Map((consulta.data ?? []).map((usuario) => [usuario.id, usuario.nome]));
  return (id: string | null | undefined): string | null => (id ? (nomes.get(id) ?? null) : null);
}
