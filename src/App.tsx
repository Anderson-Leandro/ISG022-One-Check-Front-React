import { lazy, type ComponentType } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RotaProtegida, RotaPublica } from './auth/RotaProtegida';
import { LayoutConformePerfil } from './layouts/LayoutConformePerfil';
import { LayoutLocatario } from './layouts/LayoutLocatario';
import { Login } from './pages/auth/Login';
import { VerificarMfa } from './pages/auth/VerificarMfa';
import { ConfigurarMfaNoLogin } from './pages/auth/ConfigurarMfaNoLogin';
import { TrocarSenhaExpirada } from './pages/auth/TrocarSenhaExpirada';
import { useAuth } from './auth/AuthContext';
import { rotaInicial } from './auth/permissoes';
import { SuspenseDaPagina } from './components/CarregandoPagina';

/** React.lazy só aceita export default; as páginas usam export nomeado. */
function carregarSobDemanda<Modulo>(importar: () => Promise<Modulo>, nome: keyof Modulo) {
  return lazy(async () => ({ default: (await importar())[nome] as ComponentType }));
}

// Login, MFA e troca obrigatória de senha ficam no bundle inicial (primeira tela); o resto vira um chunk por página.
const ConfigurarMfa = carregarSobDemanda(() => import('./pages/auth/ConfigurarMfa'), 'ConfigurarMfa');
const AreaDoLocatario = carregarSobDemanda(() => import('./pages/locatario/AreaDoLocatario'), 'AreaDoLocatario');
const ListaDeUsuarios = carregarSobDemanda(() => import('./pages/usuarios/ListaDeUsuarios'), 'ListaDeUsuarios');
const NovoUsuario = carregarSobDemanda(() => import('./pages/usuarios/NovoUsuario'), 'NovoUsuario');
const EditarUsuario = carregarSobDemanda(() => import('./pages/usuarios/EditarUsuario'), 'EditarUsuario');
const MeuPerfil = carregarSobDemanda(() => import('./pages/usuarios/MeuPerfil'), 'MeuPerfil');
const Permissoes = carregarSobDemanda(() => import('./pages/usuarios/Permissoes'), 'Permissoes');
const ListaDeImoveis = carregarSobDemanda(() => import('./pages/imoveis/ListaDeImoveis'), 'ListaDeImoveis');
const NovoImovel = carregarSobDemanda(() => import('./pages/imoveis/NovoImovel'), 'NovoImovel');
const EditarImovel = carregarSobDemanda(() => import('./pages/imoveis/EditarImovel'), 'EditarImovel');
const DetalhesDoImovel = carregarSobDemanda(() => import('./pages/imoveis/DetalhesDoImovel'), 'DetalhesDoImovel');
const ComodosDoImovel = carregarSobDemanda(() => import('./pages/imoveis/ComodosDoImovel'), 'ComodosDoImovel');
const HistoricoDoImovel = carregarSobDemanda(() => import('./pages/imoveis/HistoricoDoImovel'), 'HistoricoDoImovel');
const MapaDeImoveis = carregarSobDemanda(() => import('./pages/imoveis/MapaDeImoveis'), 'MapaDeImoveis');
const ListaDeContratos = carregarSobDemanda(() => import('./pages/contratos/ListaDeContratos'), 'ListaDeContratos');
const NovoContrato = carregarSobDemanda(() => import('./pages/contratos/NovoContrato'), 'NovoContrato');
const DetalhesDoContrato = carregarSobDemanda(() => import('./pages/contratos/DetalhesDoContrato'), 'DetalhesDoContrato');
const ListaDeProblemas = carregarSobDemanda(() => import('./pages/problemas/ListaDeProblemas'), 'ListaDeProblemas');
const NovoProblema = carregarSobDemanda(() => import('./pages/problemas/NovoProblema'), 'NovoProblema');
const DetalhesDoProblema = carregarSobDemanda(() => import('./pages/problemas/DetalhesDoProblema'), 'DetalhesDoProblema');
const HistoricoDoProblema = carregarSobDemanda(() => import('./pages/problemas/HistoricoDoProblema'), 'HistoricoDoProblema');
const ListaDeVistorias = carregarSobDemanda(() => import('./pages/vistorias/ListaDeVistorias'), 'ListaDeVistorias');
const NovaVistoria = carregarSobDemanda(() => import('./pages/vistorias/NovaVistoria'), 'NovaVistoria');
const DetalhesDaVistoria = carregarSobDemanda(() => import('./pages/vistorias/DetalhesDaVistoria'), 'DetalhesDaVistoria');
const ChecklistDaVistoria = carregarSobDemanda(() => import('./pages/vistorias/ChecklistDaVistoria'), 'ChecklistDaVistoria');
const FotosDaVistoria = carregarSobDemanda(() => import('./pages/vistorias/FotosDaVistoria'), 'FotosDaVistoria');
const ComparativoDaVistoria = carregarSobDemanda(() => import('./pages/vistorias/ComparativoDaVistoria'), 'ComparativoDaVistoria');
const RelatorioDaVistoria = carregarSobDemanda(() => import('./pages/vistorias/RelatorioDaVistoria'), 'RelatorioDaVistoria');
const PainelGeral = carregarSobDemanda(() => import('./pages/dashboard/PainelGeral'), 'PainelGeral');
const PainelOperacional = carregarSobDemanda(() => import('./pages/dashboard/PainelOperacional'), 'PainelOperacional');
const PainelFinanceiro = carregarSobDemanda(() => import('./pages/dashboard/PainelFinanceiro'), 'PainelFinanceiro');
const PainelAnalytics = carregarSobDemanda(() => import('./pages/dashboard/PainelAnalytics'), 'PainelAnalytics');
const Logs = carregarSobDemanda(() => import('./pages/dashboard/Logs'), 'Logs');

function RedirecionarParaInicio() {
  const { autenticado, usuario } = useAuth();
  return <Navigate to={autenticado ? rotaInicial(usuario) : '/login'} replace />;
}

/** Cada pasta/arquivo.php?id=X do front PHP vira /pasta/:id/acao. */
export function App() {
  return (
    <SuspenseDaPagina>
      <Routes>
        <Route element={<RotaPublica />}>
          <Route path="/login" element={<Login />} />
          <Route path="/mfa/verificar" element={<VerificarMfa />} />
          <Route path="/mfa/configurar-login" element={<ConfigurarMfaNoLogin />} />
        </Route>

        <Route element={<RotaProtegida />}>
          <Route path="/mfa/configurar" element={<ConfigurarMfa />} />
          <Route path="/senha/trocar" element={<TrocarSenhaExpirada />} />
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
    </SuspenseDaPagina>
  );
}
