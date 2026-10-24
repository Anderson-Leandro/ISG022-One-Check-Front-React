import { Navigate, Route, Routes } from 'react-router-dom';
import { RotaProtegida, RotaPublica } from './auth/RotaProtegida';
import { LayoutApp } from './layouts/LayoutApp';
import { LayoutLocatario } from './layouts/LayoutLocatario';
import { Login } from './pages/auth/Login';
import { VerificarMfa } from './pages/auth/VerificarMfa';
import { ConfigurarMfaNoLogin } from './pages/auth/ConfigurarMfaNoLogin';
import { ConfigurarMfa } from './pages/auth/ConfigurarMfa';
import { EmMigracao } from './pages/EmMigracao';
import { ListaDeUsuarios } from './pages/usuarios/ListaDeUsuarios';
import { NovoUsuario } from './pages/usuarios/NovoUsuario';
import { EditarUsuario } from './pages/usuarios/EditarUsuario';
import { MeuPerfil } from './pages/usuarios/MeuPerfil';
import { Permissoes } from './pages/usuarios/Permissoes';
import { ListaDeImoveis } from './pages/imoveis/ListaDeImoveis';
import { NovoImovel } from './pages/imoveis/NovoImovel';
import { EditarImovel } from './pages/imoveis/EditarImovel';
import { DetalhesDoImovel } from './pages/imoveis/DetalhesDoImovel';
import { ComodosDoImovel } from './pages/imoveis/ComodosDoImovel';
import { HistoricoDoImovel } from './pages/imoveis/HistoricoDoImovel';
import { MapaDeImoveis } from './pages/imoveis/MapaDeImoveis';
import { ListaDeContratos } from './pages/contratos/ListaDeContratos';
import { NovoContrato } from './pages/contratos/NovoContrato';
import { DetalhesDoContrato } from './pages/contratos/DetalhesDoContrato';
import { ListaDeProblemas } from './pages/problemas/ListaDeProblemas';
import { NovoProblema } from './pages/problemas/NovoProblema';
import { DetalhesDoProblema } from './pages/problemas/DetalhesDoProblema';
import { HistoricoDoProblema } from './pages/problemas/HistoricoDoProblema';
import { useAuth } from './auth/AuthContext';
import { rotaInicial } from './auth/permissoes';

function RedirecionarParaInicio() {
  const { autenticado, usuario } = useAuth();
  return <Navigate to={autenticado ? rotaInicial(usuario) : '/login'} replace />;
}

/** Cada pasta/arquivo.php?id=X do front PHP vira /pasta/:id/acao. */
export function App() {
  return (
    <Routes>
      <Route element={<RotaPublica />}>
        <Route path="/login" element={<Login />} />
        <Route path="/mfa/verificar" element={<VerificarMfa />} />
        <Route path="/mfa/configurar-login" element={<ConfigurarMfaNoLogin />} />
      </Route>

      <Route element={<RotaProtegida />}>
        <Route path="/mfa/configurar" element={<ConfigurarMfa />} />
      </Route>

      <Route element={<RotaProtegida pagina="locatario" />}>
        <Route element={<LayoutLocatario />}>
          <Route path="/locatario" element={<EmMigracao titulo="Área do locatário" origemPhp="locatario/index.php" />} />
        </Route>
      </Route>

      <Route element={<LayoutApp />}>
        <Route element={<RotaProtegida pagina="dashboard" />}>
          <Route path="/dashboard" element={<EmMigracao titulo="Dashboard" origemPhp="dashboard/index.php" />} />
          <Route path="/dashboard/analytics" element={<EmMigracao titulo="Analytics" origemPhp="dashboard/analytics.php" />} />
          <Route path="/dashboard/financeiro" element={<EmMigracao titulo="Financeiro" origemPhp="dashboard/financeiro.php" />} />
          <Route path="/dashboard/operacional" element={<EmMigracao titulo="Operacional" origemPhp="dashboard/operacional.php" />} />
        </Route>
        <Route element={<RotaProtegida pagina="logs" />}>
          <Route path="/dashboard/logs" element={<EmMigracao titulo="Logs" origemPhp="dashboard/logs.php" />} />
        </Route>

        <Route element={<RotaProtegida pagina="imoveis" />}>
          <Route path="/imoveis" element={<ListaDeImoveis />} />
          <Route path="/imoveis/novo" element={<NovoImovel />} />
          <Route path="/imoveis/:id" element={<DetalhesDoImovel />} />
          <Route path="/imoveis/:id/editar" element={<EditarImovel />} />
          <Route path="/imoveis/:id/comodos" element={<ComodosDoImovel />} />
          <Route path="/imoveis/:id/historico" element={<HistoricoDoImovel />} />
        </Route>
        <Route element={<RotaProtegida pagina="mapa" />}>
          <Route path="/imoveis/mapa" element={<MapaDeImoveis />} />
        </Route>

        <Route element={<RotaProtegida pagina="vistorias" />}>
          <Route path="/vistorias" element={<EmMigracao titulo="Vistorias" origemPhp="vistorias/index.php" />} />
          <Route path="/vistorias/nova" element={<EmMigracao titulo="Nova vistoria" origemPhp="vistorias/nova.php" />} />
          <Route path="/vistorias/:id" element={<EmMigracao titulo="Vistoria" origemPhp="vistorias/detalhes.php" />} />
          <Route path="/vistorias/:id/checklist" element={<EmMigracao titulo="Checklist" origemPhp="vistorias/checklist.php" />} />
          <Route path="/vistorias/:id/fotos" element={<EmMigracao titulo="Fotos" origemPhp="vistorias/fotos.php" />} />
          <Route path="/vistorias/:id/comparativo" element={<EmMigracao titulo="Comparativo" origemPhp="vistorias/comparativo.php" />} />
          <Route path="/vistorias/:id/relatorio" element={<EmMigracao titulo="Relatório" origemPhp="vistorias/relatorio.php" />} />
        </Route>

        <Route element={<RotaProtegida pagina="contratos" />}>
          <Route path="/contratos" element={<ListaDeContratos />} />
          <Route path="/contratos/novo" element={<NovoContrato />} />
          <Route path="/contratos/:id" element={<DetalhesDoContrato />} />
        </Route>

        <Route element={<RotaProtegida pagina="problemas" />}>
          <Route path="/problemas" element={<ListaDeProblemas />} />
          <Route path="/problemas/novo" element={<NovoProblema />} />
          <Route path="/problemas/:id" element={<DetalhesDoProblema />} />
          <Route path="/problemas/:id/historico" element={<HistoricoDoProblema />} />
        </Route>

        <Route element={<RotaProtegida />}>
          <Route path="/usuarios/perfil" element={<MeuPerfil />} />
        </Route>
        <Route element={<RotaProtegida pagina="usuarios" />}>
          <Route path="/usuarios" element={<ListaDeUsuarios />} />
          <Route path="/usuarios/novo" element={<NovoUsuario />} />
          <Route path="/usuarios/:id/editar" element={<EditarUsuario />} />
          <Route path="/usuarios/:id/permissoes" element={<Permissoes />} />
        </Route>
      </Route>

      <Route path="*" element={<RedirecionarParaInicio />} />
    </Routes>
  );
}
