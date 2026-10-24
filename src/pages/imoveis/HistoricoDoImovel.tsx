import { Link, useParams } from 'react-router-dom';
import { useContratosDoImovel, useImovel } from '../../api/imoveis';
import { BadgeStatus } from '../../components/BadgeStatus';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { rotuloDoTipoDeImovel } from '../../config/imoveis';
import { formatarData } from '../../utils/formatar';

/**
 * imoveis/historico.php estava vazio no PHP. A API não tem endpoint de histórico do imóvel,
 * então aqui ele mostra todos os contratos do imóvel (GET /contratos?imovel_id=).
 */
export function HistoricoDoImovel() {
  const { id = '' } = useParams();
  const { data: imovel } = useImovel(id);
  const consultaDosContratos = useContratosDoImovel(id, 100);
  const contratos = consultaDosContratos.data ?? [];

  return (
    <>
      <CabecalhoDaPagina
        titulo={`Histórico — ${imovel?.titulo || rotuloDoTipoDeImovel(imovel?.tipo)}`}
        subtitulo="Contratos do imóvel"
        acoes={
          <Link to={`/imoveis/${id}`} className="btn btn-link btn-sm">
            Voltar
          </Link>
        }
      />
      <div className="card">
        <EstadoDaConsulta carregando={consultaDosContratos.isPending} erro={consultaDosContratos.error}>
          <ul className="list-group list-group-flush">
            {contratos.length === 0 ? (
              <li className="list-group-item text-muted">Nenhum contrato para este imóvel.</li>
            ) : (
              contratos.map((contrato) => (
                <li key={contrato.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <Link to={`/contratos/${contrato.id}`}>
                    {formatarData(contrato.data_inicio)} — {formatarData(contrato.data_fim)}
                  </Link>
                  <BadgeStatus grupo="contrato" valor={contrato.status} />
                </li>
              ))
            )}
          </ul>
        </EstadoDaConsulta>
      </div>
    </>
  );
}
