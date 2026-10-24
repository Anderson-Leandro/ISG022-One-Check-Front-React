import { Link, useParams } from 'react-router-dom';
import { useChecklist, useChecklistsCompletosDoContrato, useNomesDaVistoria, ESTADOS_DO_ITEM, type Checklist } from '../../api/vistorias';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { formatarData } from '../../utils/formatar';
import { BadgeEstadoDoItem } from './BadgesDaVistoria';

/** Quanto maior o índice em ESTADOS_DO_ITEM (otimo → ruim), pior o estado. */
function piorou(estadoDeEntrada: string | null | undefined, estadoDeSaida: string | null | undefined): boolean {
  const indice = (estado: string | null | undefined) => ESTADOS_DO_ITEM.indexOf((estado ?? '') as (typeof ESTADOS_DO_ITEM)[number]);
  return indice(estadoDeEntrada) >= 0 && indice(estadoDeSaida) > indice(estadoDeEntrada);
}

/** A mais recente de cada tipo (pode haver mais de uma vistoria de encerramento). */
function maisRecente(checklists: Checklist[], tipo: string): Checklist | undefined {
  return checklists.filter((checklist) => checklist.tipo === tipo).sort((primeiro, segundo) => String(segundo.created_at ?? '').localeCompare(String(primeiro.created_at ?? '')))[0];
}

/**
 * vistorias/comparativo.php estava vazio no PHP. Compara, item a item, a vistoria de entrada
 * com a de saída do mesmo contrato e destaca o que piorou.
 */
export function ComparativoDaVistoria() {
  const { id = '' } = useParams();
  const { data: atual, isPending: carregandoAtual } = useChecklist(id);
  const consultaDoContrato = useChecklistsCompletosDoContrato(atual?.contrato_id);
  const checklists = consultaDoContrato.data ?? [];
  const entrada = maisRecente(checklists, 'inicial');
  const saida = maisRecente(checklists, 'encerramento');
  const { nomeDoItem, nomeDoComodo } = useNomesDaVistoria(entrada ?? saida ?? atual);

  const chaveDoItem = (comodoId?: string | null, itemId?: string | null) => `${comodoId}|${itemId}`;
  const itensDaSaida = new Map((saida?.itens ?? []).map((item) => [chaveDoItem(item.comodo_id, item.item_vistoria_id), item]));
  const chaves = [...new Set([...(entrada?.itens ?? []), ...(saida?.itens ?? [])].map((item) => chaveDoItem(item.comodo_id, item.item_vistoria_id)))];
  const itensDaEntrada = new Map((entrada?.itens ?? []).map((item) => [chaveDoItem(item.comodo_id, item.item_vistoria_id), item]));
  const totalQuePiorou = chaves.filter((chave) => piorou(itensDaEntrada.get(chave)?.estado, itensDaSaida.get(chave)?.estado)).length;

  return (
    <>
      <CabecalhoDaPagina
        titulo="Comparativo entrada × saída"
        subtitulo={entrada && saida ? `${totalQuePiorou} item(ns) pioraram desde a entrada` : undefined}
        acoes={
          <Link to={`/vistorias/${id}`} className="btn btn-outline-secondary btn-sm">
            Voltar
          </Link>
        }
      />
      <EstadoDaConsulta carregando={carregandoAtual || consultaDoContrato.isPending} erro={consultaDoContrato.error}>
        {!entrada || !saida ? (
          <div className="alert alert-info">
            O comparativo precisa de uma vistoria de <strong>entrada</strong> e uma de <strong>saída</strong> no mesmo contrato.
            {!entrada && ' Falta a de entrada.'}
            {!saida && ' Falta a de saída.'}
          </div>
        ) : (
          <div className="card">
            <div className="card-body p-0 table-responsive">
              <table className="table mb-0">
                <thead>
                  <tr>
                    <th>Cômodo</th>
                    <th>Item</th>
                    <th>Entrada · {formatarData(entrada.data_vistoria)}</th>
                    <th>Saída · {formatarData(saida.data_vistoria)}</th>
                  </tr>
                </thead>
                <tbody>
                  {chaves.map((chave) => {
                    const deEntrada = itensDaEntrada.get(chave);
                    const deSaida = itensDaSaida.get(chave);
                    const referencia = deEntrada ?? deSaida;
                    const destaque = piorou(deEntrada?.estado, deSaida?.estado);
                    return (
                      <tr key={chave} className={destaque ? 'table-danger' : undefined}>
                        <td>{nomeDoComodo(referencia?.comodo_id)}</td>
                        <td>
                          {nomeDoItem(referencia?.item_vistoria_id)}
                          {destaque && <i className="bi bi-arrow-down-circle-fill text-danger ms-2" title="Piorou" />}
                        </td>
                        <td>
                          {deEntrada ? <BadgeEstadoDoItem estado={deEntrada.estado} /> : <span className="text-muted small">Não vistoriado</span>}
                          {deEntrada?.observacao && <div className="small text-muted">{deEntrada.observacao}</div>}
                        </td>
                        <td>
                          {deSaida ? <BadgeEstadoDoItem estado={deSaida.estado} /> : <span className="text-muted small">Não vistoriado</span>}
                          {deSaida?.observacao && <div className="small text-muted">{deSaida.observacao}</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </EstadoDaConsulta>
    </>
  );
}
