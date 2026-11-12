export type Perfil = 'admin' | 'gestor' | 'vistoriador' | 'visualizador' | 'locatario';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: Perfil | string;
  mfa_ativo?: boolean;
  /** true obriga a troca de senha: até lá a API responde 403 em quase todas as rotas. */
  senha_expirada?: boolean;
  [campo: string]: unknown;
}

/** Retorno de /auth/login, /auth/mfa/verify e /auth/mfa/activate-login. */
export interface RespostaDeLogin {
  access_token?: string;
  refresh_token?: string;
  usuario?: Usuario;
  mfa_required?: boolean;
  mfa_setup_required?: boolean;
  temp_token?: string;
}
