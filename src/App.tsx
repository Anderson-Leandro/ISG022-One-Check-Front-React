import { Navigate, Route, Routes } from 'react-router-dom';
import { RotaProtegida, RotaPublica } from './auth/RotaProtegida';
import { LayoutConformePerfil } from './layouts/LayoutConformePerfil';
import { LayoutLocatario } from './layouts/LayoutLocatario';
import { Login } from './pages/auth/Login';
import { VerificarMfa } from './pages/auth/VerificarMfa';
import { ConfigurarMfaNoLogin } from './pages/auth/ConfigurarMfaNoLogin';
import { ConfigurarMfa } from './pages/auth/ConfigurarMfa';
import { AreaDoLocatario } from './pages/locatario/AreaDoLocatario';
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
import { ListaDeVistorias } from './pages/vistorias/ListaDeVistorias';
import { NovaVistoria } from './pages/vistorias/NovaVistoria';
import { DetalhesDaVistoria } from './pages/vistorias/DetalhesDaVistoria';
import { ChecklistDaVistoria } from './pages/vistorias/ChecklistDaVistoria';
import { FotosDaVistoria } from './pages/vistorias/FotosDaVistoria';
import { ComparativoDaVistoria } from './pages/vistorias/ComparativoDaVistoria';
import { RelatorioDaVistoria } from './pages/vistorias/RelatorioDaVistoria';
import { PainelGeral } from './pages/dashboard/PainelGeral';
import { PainelOperacional } from './pages/dashboard/PainelOperacional';
import { PainelFinanceiro } from './pages/dashboard/PainelFinanceiro';
import { PainelAnalytics } from './pages/dashboard/PainelAnalytics';
import { Logs } from './pages/dashboard/Logs';
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
          <Route path="/locatario" element={<AreaDoLocatario />} />
        </Route>
      </Route>

      <Route element={<LayoutConformePerfil />}>
        <Route element={<RotaProtegida pagina="dashboard" />}>
          <Route path="/dashboard" element={<PainelGeral />} />
          <Route path="/dashboard/analytics" element={<PainelAnalytics />} />
          <Route path="/dashboard/financeiro" element={<PainelFinanceiro />} />
          <Route path="/dashboard/operacional" element={<PainelOperacional />} />
        </Route>
        <Route element={<RotaProtegida pagina="logs" />}>
          <Route path="/dashboard/logs" element={<Logs />} />
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
          <Route path="/vistorias" element={<ListaDeVistorias />} />
          <Route path="/vistorias/nova" element={<NovaVistoria />} />
          <Route path="/vistorias/:id" element={<DetalhesDaVistoria />} />
          <Route path="/vistorias/:id/checklist" element={<ChecklistDaVistoria />} />
          <Route path="/vistorias/:id/fotos" element={<FotosDaVistoria />} />
          <Route path="/vistorias/:id/comparativo" element={<ComparativoDaVistoria />} />
          <Route path="/vistorias/:id/relatorio" element={<RelatorioDaVistoria />} />
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
