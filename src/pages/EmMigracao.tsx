/** Marca as telas ainda não convertidas do PHP. Some à medida que as fases avançam. */
export function EmMigracao({ titulo, origemPhp }: { titulo: string; origemPhp: string }) {
  return (
    <div className="oc-page-header">
      <h2>{titulo}</h2>
      <p>
        Tela em migração — origem: <code>front/{origemPhp}</code>
      </p>
    </div>
  );
}
