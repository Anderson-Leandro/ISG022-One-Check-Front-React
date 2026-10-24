/** Aviso quando a API negou (403) parte dos dados de um painel para o perfil logado. */
export function AvisoDeDadosNegados({ negados }: { negados: { checklists: number; problemas: number; agendamentos: number } | undefined }) {
  if (!negados) return null;
  const tipos = [negados.checklists && 'vistorias', negados.problemas && 'problemas', negados.agendamentos && 'agendamentos'].filter(Boolean);
  if (tipos.length === 0) return null;
  return (
    <div className="alert alert-warning">
      <i className="bi bi-lock me-2" />
      Seu perfil não tem permissão na API para ver {tipos.join(', ')} de alguns contratos — os números abaixo podem estar incompletos.
    </div>
  );
}
