import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { podeAcessar, rotaInicial, type Pagina } from './permissoes';
import { useFlash } from '../components/Flash';
import { useEffect } from 'react';

const ROTA_DE_TROCA_DE_SENHA = '/senha/trocar';

/** Equivalente a api_require_login() + api_require_page($pagina). */
export function RotaProtegida({ pagina }: { pagina?: Pagina }) {
  const { autenticado, usuario } = useAuth();
  const localizacao = useLocation();
  const { definirFlash } = useFlash();
  const semPermissao = autenticado && !usuario?.senha_expirada && pagina !== undefined && !podeAcessar(usuario, pagina);

  useEffect(() => {
    if (semPermissao) definirFlash('erro', 'Você não tem permissão para acessar esta área.');
  }, [semPermissao, definirFlash]);

  if (!autenticado) return <Navigate to="/login" replace state={{ de: localizacao.pathname }} />;
  // com a senha fora da política a API recusa quase tudo: só a tela de troca fica acessível
  if (usuario?.senha_expirada && localizacao.pathname !== ROTA_DE_TROCA_DE_SENHA) return <Navigate to={ROTA_DE_TROCA_DE_SENHA} replace />;
  if (semPermissao) return <Navigate to={rotaInicial(usuario)} replace />;
  return <Outlet />;
}

/** Login/MFA: se já está logado, manda para a home do perfil. */
export function RotaPublica() {
  const { autenticado, usuario } = useAuth();
  if (autenticado) return <Navigate to={rotaInicial(usuario)} replace />;
  return <Outlet />;
}
