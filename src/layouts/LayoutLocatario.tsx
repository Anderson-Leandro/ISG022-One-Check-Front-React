import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ExibirFlash } from '../components/Flash';
import { Marca } from '../components/Marca';

const LINKS_DO_LOCATARIO = [
  { rota: '/locatario', rotulo: 'Início', icone: 'bi-house' },
  { rota: '/vistorias', rotulo: 'Vistorias', icone: 'bi-camera' },
  { rota: '/problemas', rotulo: 'Problemas', icone: 'bi-exclamation-triangle' },
  { rota: '/usuarios/perfil', rotulo: 'Meu perfil', icone: 'bi-person' },
];

/** locatario/_header.php + _footer.php — também envolve vistorias/problemas/perfil quando o perfil é locatário. */
export function LayoutLocatario() {
  const { usuario, sair } = useAuth();
  const navegar = useNavigate();

  async function aoSair() {
    await sair();
    navegar('/login?logout=1', { replace: true });
  }

  return (
    <>
      <nav className="navbar app-navbar">
        <div className="container">
          <Link className="navbar-brand" to="/locatario" style={{ fontWeight: 700, letterSpacing: '-.3px', fontSize: 16 }}>
            <Marca />
            <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--oc-muted)', marginLeft: 8 }}>Locatário</span>
          </Link>
          <div className="d-flex gap-2 align-items-center">
            <span className="d-none d-sm-inline" style={{ fontSize: 12, color: 'var(--oc-muted)' }}>
              {usuario?.nome}
            </span>
            <button className="btn btn-sm btn-outline-light" onClick={aoSair}>
              <i className="bi bi-box-arrow-right me-1" />
              Sair
            </button>
          </div>
        </div>
      </nav>
      <div className="container">
        <ul className="nav nav-pills gap-1 pt-3">
          {LINKS_DO_LOCATARIO.map((link) => (
            <li key={link.rota} className="nav-item">
              <NavLink to={link.rota} end={link.rota === '/locatario'} className={({ isActive }) => `nav-link py-1 px-3 ${isActive ? 'active' : ''}`} style={{ fontSize: 13 }}>
                <i className={`bi ${link.icone} me-1`} />
                {link.rotulo}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
      <main className="container py-4">
        <ExibirFlash />
        <Outlet />
      </main>
    </>
  );
}
