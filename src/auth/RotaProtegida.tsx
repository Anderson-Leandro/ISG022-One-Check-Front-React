import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { podeAcessar, rotaInicial, type Pagina } from './permissoes';
import { useFlash } from '../components/Flash';
import { useEffect } from 'react';

/** Equivalente a api_require_login() + api_require_page($pagina). */
export function RotaProtegida({ pagina }: { pagina?: Pagina }) {
  const { autenticado, usuario } = useAuth();
  const localizacao = useLocation();
  const { definirFlash } = useFlash();
  const semPermissao = autenticado && pagina !== undefined && !podeAcessar(usuario, pagina);

  useEffect(() => {
    if (semPermissao) definirFlash('erro', 'Você não tem permissão para acessar esta área.');
  }, [semPermissao, definirFlash]);

  if (!autenticado) return <Navigate to="/login" replace state={{ de: localizacao.pathname }} />;
  if (semPermissao) return <Navigate to={rotaInicial(usuario)} replace />;
  return <Outlet />;
}

/** Login/MFA: se já está logado, manda para a home do perfil. */
export function RotaPublica() {
  const { autenticado, usuario } = useAuth();
  if (autenticado) return <Navigate to={rotaInicial(usuario)} replace />;
  return <Outlet />;
}
