/** Paginação numérica usada nas listagens (mesmo markup do PHP). */
export function Paginacao({ paginaAtual, totalDePaginas, aoMudar }: { paginaAtual: number; totalDePaginas: number; aoMudar(pagina: number): void }) {
  if (totalDePaginas <= 1) return null;
  const paginas = Array.from({ length: totalDePaginas }, (_, indice) => indice + 1);

  return (
    <nav className="mt-3">
      <ul className="pagination pagination-sm justify-content-end">
        {paginas.map((pagina) => (
          <li key={pagina} className={`page-item ${pagina === paginaAtual ? 'active' : ''}`}>
            <button type="button" className="page-link" onClick={() => aoMudar(pagina)}>
              {pagina}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
