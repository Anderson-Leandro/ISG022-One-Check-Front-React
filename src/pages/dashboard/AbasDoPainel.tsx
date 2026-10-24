import { NavLink } from 'react-router-dom';

const ABAS = [
  { rota: '/dashboard', rotulo: 'Visão geral' },
  { rota: '/dashboard/operacional', rotulo: 'Operacional' },
  { rota: '/dashboard/financeiro', rotulo: 'Financeiro' },
  { rota: '/dashboard/analytics', rotulo: 'Analytics' },
];

/** Navegação entre os painéis (no PHP, analytics/financeiro/operacional existiam só como arquivos vazios). */
export function AbasDoPainel() {
  return (
    <ul className="nav nav-pills mb-4 gap-1">
      {ABAS.map((aba) => (
        <li key={aba.rota} className="nav-item">
          <NavLink to={aba.rota} end className={({ isActive }) => `nav-link py-1 px-3 ${isActive ? 'active' : ''}`} style={{ fontSize: 13 }}>
            {aba.rotulo}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}
