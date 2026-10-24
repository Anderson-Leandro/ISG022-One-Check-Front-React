import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { imovelTemGaragem, useComodos, useContratosDoImovel, useEnderecoDoImovel, useImovel } from '../../api/imoveis';
import { BadgeStatus } from '../../components/BadgeStatus';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { useFlash } from '../../components/Flash';
import { MapaComPontos } from '../../components/mapa/MapaComPontos';
import { ROTULO_DO_COMODO, ROTULO_DO_STATUS_DO_IMOVEL, rotuloDoTipoDeImovel } from '../../config/imoveis';
import { coordenadasDoEndereco, resumoDoEndereco } from '../../utils/endereco';
import { formatarData } from '../../utils/formatar';

/** imoveis/detalhes.php — as 4 consultas rodam em paralelo (substitui ApiClient::multi_get). */
export function DetalhesDoImovel() {
  const { id = '' } = useParams();
  const { definirFlash } = useFlash();
  const consultaDoImovel = useImovel(id);
  const { data: endereco } = useEnderecoDoImovel(id);
  const { data: comodos = [] } = useComodos(id);
  const { data: contratos = [] } = useContratosDoImovel(id, 5);

  useEffect(() => {
    if (consultaDoImovel.isError) definirFlash('erro', 'Imóvel não encontrado.');
  }, [consultaDoImovel.isError, definirFlash]);

  if (!id || consultaDoImovel.isError) return <Navigate to="/imoveis" replace />;

  const imovel = consultaDoImovel.data;
  const tipo = rotuloDoTipoDeImovel(imovel?.tipo);
  const coordenadas = coordenadasDoEndereco(endereco);

  return (
    <EstadoDaConsulta carregando={consultaDoImovel.isPending} erro={null}>
      {imovel && (
        <>
          <CabecalhoDaPagina
            titulo={`${imovel.titulo || tipo}${imovel.tamanho ? ` · ${imovel.tamanho}` : ''}`}
            subtitulo={endereco ? resumoDoEndereco(endereco) : tipo}
            acoes={
              <>
                <Link to="/imoveis/mapa" className="btn btn-outline-secondary btn-sm">
                  Mapa
                </Link>
                <Link to={`/imoveis/${id}/comodos`} className="btn btn-outline-secondary btn-sm">
                  Cômodos
                </Link>
                <Link to={`/imoveis/${id}/historico`} className="btn btn-outline-secondary btn-sm">
                  Histórico
                </Link>
                <Link to={`/imoveis/${id}/editar`} className="btn btn-outline-secondary btn-sm">
                  Editar
                </Link>
                <Link to={`/vistorias/nova?imovel_id=${id}`} className="btn btn-primary btn-sm">
                  Nova vistoria
                </Link>
                <Link to="/imoveis" className="btn btn-link btn-sm">
                  Voltar
                </Link>
              </>
            }
          />

          <div className="row g-4">
            <div className="col-lg-4">
              <div className="card border-0 shadow-sm mb-3">
                <div className="card-header fw-semibold">Dados do imóvel</div>
                <div className="card-body small">
                  <dl className="row mb-0">
                    <dt className="col-5">Status</dt>
                    <dd className="col-7">
                      <BadgeStatus grupo="imovel" valor={imovel.status} rotulo={ROTULO_DO_STATUS_DO_IMOVEL[imovel.status ?? '']} />
                    </dd>
                    <dt className="col-5">Tipo</dt>
                    <dd className="col-7">{tipo}</dd>
                    <dt className="col-5">Tamanho</dt>
                    <dd className="col-7">{imovel.tamanho || '—'}</dd>
                    <dt className="col-5">Garagem</dt>
                    <dd className="col-7">{imovelTemGaragem(imovel) ? `${imovel.garagem_vagas || 1} vaga(s)` : 'Não'}</dd>
                    <dt className="col-5">CEP</dt>
                    <dd className="col-7">{endereco?.cep || '—'}</dd>
                    <dt className="col-5">Cômodos</dt>
                    <dd className="col-7">{comodos.length}</dd>
                  </dl>
                  {imovel.observacoes && <p className="mt-3 mb-0 text-muted">{imovel.observacoes}</p>}
                </div>
              </div>

              {coordenadas ? (
                <div className="card border-0 shadow-sm">
                  <div className="card-header fw-semibold">Localização</div>
                  <div className="card-body p-0">
                    <MapaComPontos altura={220} pontos={[{ id, ...coordenadas }]} />
                  </div>
                  <div className="card-footer small text-muted">
                    {coordenadas.latitude}, {coordenadas.longitude}
                  </div>
                </div>
              ) : (
                <div className="alert alert-warning small">Sem coordenadas GPS. Edite o imóvel para definir a localização.</div>
              )}
            </div>

            <div className="col-lg-8">
              <div className="card border-0 shadow-sm mb-3">
                <div className="card-header d-flex justify-content-between">
                  <span className="fw-semibold">Cômodos</span>
                  <Link to={`/imoveis/${id}/comodos`} className="small">
                    Gerenciar
                  </Link>
                </div>
                <div className="card-body py-2">
                  {comodos.length === 0 ? (
                    <span className="text-muted small">Nenhum cômodo cadastrado.</span>
                  ) : (
                    <div className="d-flex flex-wrap gap-1">
                      {comodos.map((comodo) => (
                        <span key={comodo.id} className="badge text-bg-light text-dark border">
                          {ROTULO_DO_COMODO[comodo.tipo] ?? comodo.tipo}
                          {comodo.descricao ? ` · ${comodo.descricao}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="card border-0 shadow-sm mb-3">
                <div className="card-header d-flex justify-content-between">
                  <span className="fw-semibold">Contratos recentes</span>
                  <Link to={`/imoveis/${id}/historico`} className="small">
                    Ver todos
                  </Link>
                </div>
                <ul className="list-group list-group-flush">
                  {contratos.length === 0 ? (
                    <li className="list-group-item text-muted small">Nenhum contrato.</li>
                  ) : (
                    contratos.map((contrato) => (
                      <li key={contrato.id} className="list-group-item d-flex justify-content-between align-items-center small">
                        <Link to={`/contratos/${contrato.id}`}>
                          {formatarData(contrato.data_inicio)} — {formatarData(contrato.data_fim)}
                        </Link>
                        <BadgeStatus grupo="contrato" valor={contrato.status} />
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div className="row g-3">
                <div className="col-md-6">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-header fw-semibold">Vistorias</div>
                    <div className="card-body d-flex align-items-center">
                      <Link to="/vistorias" className="btn btn-outline-secondary btn-sm">
                        Ver vistorias
                      </Link>
                      <Link to={`/vistorias/nova?imovel_id=${id}`} className="btn btn-primary btn-sm ms-2">
                        Nova vistoria
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-header fw-semibold">Problemas</div>
                    <div className="card-body d-flex align-items-center">
                      <Link to="/problemas" className="btn btn-outline-secondary btn-sm">
                        Ver problemas
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </EstadoDaConsulta>
  );
}
