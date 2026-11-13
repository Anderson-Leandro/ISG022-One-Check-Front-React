import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Offcanvas } from 'react-bootstrap';
import { useAuth } from '../auth/AuthContext';
import { itensDeMenuPara, rotaInicial } from '../auth/permissoes';
import { SuspenseDaPagina } from '../components/CarregandoPagina';
import { ExibirFlash } from '../components/Flash';
import { useSairDaConta } from '../auth/useSairDaConta';
import { Marca } from '../components/Marca';

/** Equivalente a includes/header.php + navbar.php + sidebar.php + footer.php. */
export function LayoutApp() {
  const { usuario, iniciais } = useAuth();
  const aoSair = useSairDaConta();
  const { pathname } = useLocation();
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const itensDeMenu = itensDeMenuPara(usuario);

  useEffect(() => setMenuMobileAberto(false), [pathname]);

  const navegacao = (
    <nav className="nav flex-column">
      {itensDeMenu.map((item) =>
        'secao' in item ? (
          <div key={`secao-${item.secao}`} className="nav-section">
            {item.secao}
          </div>
        ) : (
          <NavLink key={item.id} to={item.rota} end={item.rota === '/dashboard' || item.rota === '/imoveis'} className="nav-link">
            <i className={`bi ${item.icone}`} />
            {item.rotulo}
          </NavLink>
        ),
      )}
    </nav>
  );

  return (
    <>
      <nav className="navbar app-navbar">
        <div className="container-fluid">
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-outline-light btn-sm d-lg-none"
              type="button"
              aria-label="Abrir menu"
              onClick={() => setMenuMobileAberto(true)}
            >
              <i className="bi bi-list" />
            </button>
            <Link className="navbar-brand" to={rotaInicial(usuario)} style={{ fontWeight: 700, letterSpacing: '-.3px', fontSize: 16 }}>
              <Marca />
            </Link>
          </div>
          {usuario && (
            <div className="d-flex align-items-center gap-2">
              <Link to="/usuarios/perfil" className="d-flex align-items-center gap-2 text-decoration-none" title="Meu perfil">
                <span className="d-none d-md-inline" style={{ fontSize: 12, color: '#6b7fa3' }}>
                  {usuario.nome}
                </span>
                <div className="oc-avatar" style={{ cursor: 'pointer' }}>
                  {iniciais}
                </div>
              </Link>
              <button className="btn btn-outline-light btn-sm" onClick={aoSair} title="Sair">
                <i className="bi bi-box-arrow-right" />
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="container-fluid">
        <div className="row">
          <aside className="col-lg-2 col-xl-2 d-none d-lg-block app-sidebar">{navegacao}</aside>

          <Offcanvas show={menuMobileAberto} onHide={() => setMenuMobileAberto(false)} className="d-lg-none">
            <Offcanvas.Header closeButton>
              <Offcanvas.Title>
                <Marca />
              </Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body className="pt-0">{navegacao}</Offcanvas.Body>
          </Offcanvas>

          <main className="col-lg-10 col-xl-10 ms-auto px-4 py-4 app-main">
            <ExibirFlash />
            <SuspenseDaPagina>
              <Outlet />
            </SuspenseDaPagina>
          </main>
        </div>
      </div>
    </>
  );
}
