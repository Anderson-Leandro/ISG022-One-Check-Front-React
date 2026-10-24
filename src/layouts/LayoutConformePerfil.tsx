import { useAuth } from '../auth/AuthContext';
import { perfilDo } from '../auth/permissoes';
import { LayoutApp } from './LayoutApp';
import { LayoutLocatario } from './LayoutLocatario';

/** O locatário navega por vistorias/problemas/perfil sem sair do layout dele (no PHP caía no layout administrativo). */
export function LayoutConformePerfil() {
  const { usuario } = useAuth();
  return perfilDo(usuario) === 'locatario' ? <LayoutLocatario /> : <LayoutApp />;
}
