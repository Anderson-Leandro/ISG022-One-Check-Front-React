import { Navigate, Route, Routes } from 'react-router-dom';
import { RotaProtegida, RotaPublica } from './auth/RotaProtegida';
import { LayoutApp } from './layouts/LayoutApp';
import { LayoutLocatario } from './layouts/LayoutLocatario';
import { Login } from './pages/auth/Login';
import { VerificarMfa } from './pages/auth/VerificarMfa';
import { ConfigurarMfaNoLogin } from './pages/auth/ConfigurarMfaNoLogin';
import { ConfigurarMfa } from './pages/auth/ConfigurarMfa';
import { EmMigracao } from './pages/EmMigracao';
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
          <Route path="/imoveis" element={<EmMigracao titulo="Imóveis" origemPhp="imoveis/index.php" />} />
          <Route path="/imoveis/novo" element={<EmMigracao titulo="Novo imóvel" origemPhp="imoveis/novo.php" />} />
          <Route path="/imoveis/:id" element={<EmMigracao titulo="Imóvel" origemPhp="imoveis/detalhes.php" />} />
          <Route path="/imoveis/:id/editar" element={<EmMigracao titulo="Editar imóvel" origemPhp="imoveis/editar.php" />} />
          <Route path="/imoveis/:id/comodos" element={<EmMigracao titulo="Cômodos" origemPhp="imoveis/comodos.php" />} />
          <Route path="/imoveis/:id/historico" element={<EmMigracao titulo="Histórico" origemPhp="imoveis/historico.php" />} />
        </Route>
        <Route element={<RotaProtegida pagina="mapa" />}>
          <Route path="/imoveis/mapa" element={<EmMigracao titulo="Mapa" origemPhp="imoveis/mapa.php" />} />
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
          <Route path="/contratos" element={<EmMigracao titulo="Contratos" origemPhp="contratos/index.php" />} />
          <Route path="/contratos/novo" element={<EmMigracao titulo="Novo contrato" origemPhp="contratos/novo.php" />} />
          <Route path="/contratos/:id" element={<EmMigracao titulo="Contrato" origemPhp="contratos/detalhes.php" />} />
          <Route path="/contratos/:id/anexos" element={<EmMigracao titulo="Anexos" origemPhp="contratos/anexos.php" />} />
          <Route path="/contratos/:id/assinatura" element={<EmMigracao titulo="Assinatura" origemPhp="contratos/assinatura.php" />} />
        </Route>

        <Route element={<RotaProtegida pagina="problemas" />}>
          <Route path="/problemas" element={<EmMigracao titulo="Problemas" origemPhp="problemas/index.php" />} />
          <Route path="/problemas/novo" element={<EmMigracao titulo="Novo problema" origemPhp="problemas/novo.php" />} />
          <Route path="/problemas/:id" element={<EmMigracao titulo="Problema" origemPhp="problemas/detalhes.php" />} />
          <Route path="/problemas/:id/historico" element={<EmMigracao titulo="Histórico" origemPhp="problemas/historico.php" />} />
        </Route>

        <Route element={<RotaProtegida />}>
          <Route path="/usuarios/perfil" element={<EmMigracao titulo="Meu perfil" origemPhp="usuarios/perfil.php" />} />
        </Route>
        <Route element={<RotaProtegida pagina="usuarios" />}>
          <Route path="/usuarios" element={<EmMigracao titulo="Usuários" origemPhp="usuarios/index.php" />} />
          <Route path="/usuarios/novo" element={<EmMigracao titulo="Novo usuário" origemPhp="usuarios/novo.php" />} />
          <Route path="/usuarios/:id/editar" element={<EmMigracao titulo="Editar usuário" origemPhp="usuarios/editar.php" />} />
          <Route path="/usuarios/:id/permissoes" element={<EmMigracao titulo="Permissões" origemPhp="usuarios/permissoes.php" />} />
        </Route>
      </Route>

      <Route path="*" element={<RedirecionarParaInicio />} />
    </Routes>
  );
}
