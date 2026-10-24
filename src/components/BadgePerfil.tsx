const BADGE_POR_PERFIL: Record<string, { classe: string; rotulo: string }> = {
  admin: { classe: 'bg-danger', rotulo: 'Admin' },
  gestor: { classe: 'bg-warning text-dark', rotulo: 'Gestor' },
  vistoriador: { classe: 'bg-primary', rotulo: 'Vistoriador' },
  locatario: { classe: 'bg-success', rotulo: 'Locatário' },
  visualizador: { classe: 'bg-info text-dark', rotulo: 'Visualizador' },
};

/** Badge colorido do perfil (match de usuarios/index.php). */
export function BadgePerfil({ perfil }: { perfil: string }) {
  const badge = BADGE_POR_PERFIL[perfil] ?? { classe: 'bg-secondary', rotulo: perfil || '—' };
  return <span className={`badge ${badge.classe}`}>{badge.rotulo}</span>;
}

export function BadgeMfa({ ativo, rotuloAtivo = 'Ativo', rotuloInativo = 'Inativo' }: { ativo: boolean; rotuloAtivo?: string; rotuloInativo?: string }) {
  return ativo ? (
    <span className="badge bg-success">
      <i className="bi bi-shield-check me-1" />
      {rotuloAtivo}
    </span>
  ) : (
    <span className="badge bg-secondary">
      <i className="bi bi-shield me-1" />
      {rotuloInativo}
    </span>
  );
}
