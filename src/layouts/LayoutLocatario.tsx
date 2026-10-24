import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ExibirFlash } from '../components/Flash';
import { Marca } from '../components/Marca';

/** locatario/_header.php + _footer.php */
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
      <main className="container py-4">
        <ExibirFlash />
        <Outlet />
      </main>
    </>
  );
}
