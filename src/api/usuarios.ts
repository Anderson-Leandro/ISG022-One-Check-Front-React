import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, desembrulhar, obterDados } from './client';
import type { components } from './schema';
import type { Usuario } from '../auth/tipos';

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

export function useAtualizarMeuPerfil() {
  const invalidar = useInvalidarUsuarios();
  return useMutation({
    mutationFn: (dados: DadosDeEdicaoDoPerfil) => obterDados<Usuario>(api.PATCH('/api/v1/usuarios/me', { body: dados })),
    onSuccess: invalidar,
  });
}

/** Usuário logado liga/desliga o próprio MFA (usuarios/perfil.php). */
export function useAlternarMeuMfa() {
  const invalidar = useInvalidarUsuarios();
  return useMutation({
    mutationFn: (habilitar: boolean) =>
      obterDados(habilitar ? api.POST('/api/v1/auth/mfa/habilitar') : api.POST('/api/v1/auth/mfa/desabilitar')),
    onSuccess: invalidar,
  });
}
