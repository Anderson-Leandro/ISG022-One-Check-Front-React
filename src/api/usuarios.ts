import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, desembrulhar, obterDados } from './client';
import type { components } from './schema';
import type { Usuario } from '../auth/tipos';
import { armazenamentoDeTokens } from '../auth/armazenamentoDeTokens';
import type { DadosDeConfiguracaoMfa } from '../components/QrCodeMfa';

export const ITENS_POR_PAGINA = 20;

export const PERFIS = ['admin', 'gestor', 'vistoriador', 'visualizador', 'locatario'] as const;

export const ROTULO_DO_PERFIL: Record<string, string> = {
  admin: 'Administrador',
  gestor: 'Gestor',
  vistoriador: 'Vistoriador',
  visualizador: 'Visualizador',
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

/** Admin liga/desliga o MFA de outro usuário (usuarios/editar.php). */
export function useAlternarMfaDoUsuario(id: string) {
  const invalidar = useInvalidarUsuarios();
  return useMutation({
    mutationFn: (habilitar: boolean) => {
      const parametros = { params: { path: { usuario_id: id } } };
      return obterDados(
        habilitar
          ? api.POST('/api/v1/usuarios/{usuario_id}/mfa/habilitar', parametros)
          : api.POST('/api/v1/usuarios/{usuario_id}/mfa/desabilitar', parametros),
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

/** Mapa id → nome de todos os usuários (até 100), para exibir autores. Cai para null se a API negar. */
export function useNomeDoUsuario() {
  const consulta = useQuery({
    queryKey: ['usuarios', 'nomes'],
    queryFn: () => obterDados<Usuario[]>(api.GET('/api/v1/usuarios', { params: { query: { por_pagina: 100 } } })),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const nomes = new Map((consulta.data ?? []).map((usuario) => [usuario.id, usuario.nome]));
  return (id: string | null | undefined): string | null => (id ? (nomes.get(id) ?? null) : null);
}
