import { PERFIS, ROTULO_DO_PERFIL } from '../../api/usuarios';
import { PERFIS_POR_PAGINA, PERFIS_QUE_CRIAM, type Pagina, type RecursoCriavel } from '../../auth/permissoes';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';

const ROTULO_DA_AREA: Record<Pagina, string> = {
  dashboard: 'Dashboard',
  imoveis: 'Imóveis',
  vistorias: 'Vistorias',
  contratos: 'Contratos',
  problemas: 'Problemas',
  mapa: 'Mapa',
  usuarios: 'Usuários',
  logs: 'Logs',
  locatario: 'Área do locatário',
};

function Marcador({ permitido }: { permitido: boolean }) {
  return permitido ? <i className="bi bi-check-circle-fill text-success" title="Permitido" /> : <i className="bi bi-dash text-muted" title="Sem acesso" />;
}

/**
 * usuarios/permissoes.php estava vazio no PHP; aqui vira a matriz (somente leitura)
 * das regras de src/auth/permissoes.ts. Admin acessa tudo.
 */
export function Permissoes() {
  const perfisSemAdmin = PERFIS.filter((perfil) => perfil !== 'admin');
  const linhas: { rotulo: string; perfis: string[] }[] = [
    ...(Object.keys(PERFIS_POR_PAGINA) as Pagina[]).map((pagina) => ({ rotulo: `Acessar ${ROTULO_DA_AREA[pagina]}`, perfis: PERFIS_POR_PAGINA[pagina] })),
    ...(Object.keys(PERFIS_QUE_CRIAM) as RecursoCriavel[]).map((recurso) => ({ rotulo: `Criar em ${ROTULO_DA_AREA[recurso]}`, perfis: PERFIS_QUE_CRIAM[recurso] })),
  ];

  return (
    <>
      <CabecalhoDaPagina titulo="Permissões" subtitulo="O que cada perfil pode fazer na interface. Administradores têm acesso total." />
      <div className="card">
        <div className="card-body p-0 table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>Permissão</th>
                {perfisSemAdmin.map((perfil) => (
                  <th key={perfil} className="text-center">
                    {ROTULO_DO_PERFIL[perfil]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <tr key={linha.rotulo}>
                  <td>{linha.rotulo}</td>
                  {perfisSemAdmin.map((perfil) => (
                    <td key={perfil} className="text-center">
                      <Marcador permitido={linha.perfis.includes(perfil)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
