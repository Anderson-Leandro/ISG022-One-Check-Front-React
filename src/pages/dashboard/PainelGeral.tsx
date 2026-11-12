import { Link } from 'react-router-dom';
import { ROTULO_DO_STATUS_DO_CONTRATO } from '../../api/contratos';
import { chaveDoMes, ultimosMeses, useDadosDoPainel, useResumoDoPainel } from '../../api/painel';
import { problemaEstaEncerrado } from '../../api/problemas';
import { useAuth } from '../../auth/AuthContext';
import { podeAcessar, podeCriar } from '../../auth/permissoes';
import { AvisoDeDadosNegados } from '../../components/AvisoDeDadosNegados';
import { BadgeStatus } from '../../components/BadgeStatus';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { CartaoDeGrafico, CartaoDeIndicador, GraficoDeBarras, GraficoDeRosca } from '../../components/graficos/Graficos';
import { ROTULO_DO_STATUS_DO_IMOVEL, rotuloDoTipoDeImovel } from '../../config/imoveis';
import { formatarData, formatarDataHora } from '../../utils/formatar';
import { AbasDoPainel } from './AbasDoPainel';

const STATUS_NO_GRAFICO = ['locado', 'disponivel', 'em_vistoria', 'manutencao'] as const;
/** Como no PHP: "concluídas" = vistorias aceitas ou já submetidas (pendentes de aceite). */
const STATUS_CONCLUIDOS = ['aceito', 'pendente_aceite'];

const recentes = <T extends { created_at?: string }>(lista: T[], quantidade: number) =>
  [...lista].sort((primeiro, segundo) => String(segundo.created_at ?? '').localeCompare(String(primeiro.created_at ?? ''))).slice(0, quantidade);

/** dashboard/index.php */
export function PainelGeral() {
  const { usuario } = useAuth();
  const consulta = useDadosDoPainel();
  // totais oficiais da API, já no recorte do perfil; null = o perfil não acessa aquele dado
  const { data: resumo } = useResumoDoPainel();
  const { imoveis = [], contratos = [], checklists = [], problemas = [] } = consulta.data ?? {};

  const meses = ultimosMeses(6);
  const vistoriasNoMes = (chave: string, concluidas: boolean) =>
    checklists.filter((checklist) => chaveDoMes(checklist.created_at ?? checklist.data_vistoria) === chave && (!concluidas || STATUS_CONCLUIDOS.includes(checklist.status ?? ''))).length;
  const seriesDeVistorias = [
    { rotulo: 'Vistorias', valores: meses.map((mes) => vistoriasNoMes(mes.chave, false)) },
    { rotulo: 'Concluídas', valores: meses.map((mes) => vistoriasNoMes(mes.chave, true)) },
  ];
  const fatiasDeStatus = STATUS_NO_GRAFICO.map((status) => ({ rotulo: ROTULO_DO_STATUS_DO_IMOVEL[status], valor: imoveis.filter((imovel) => (imovel.status ?? 'disponivel') === status).length }));
  const contratosAtivos = contratos.filter((contrato) => contrato.status === 'ativo').length;
  const imoveisLocados = imoveis.filter((imovel) => imovel.status === 'locado').length;
  const pendentesDeAceite = checklists.filter((checklist) => checklist.status === 'pendente_aceite').length;
  const problemasNaoResolvidos = problemas.filter((problema) => !problemaEstaEncerrado(problema.status));
  const semAtendimento = problemasNaoResolvidos.filter((problema) => problema.status === 'aberto').length;

  return (
    <>
      <CabecalhoDaPagina
        titulo="Dashboard"
        subtitulo={`Visão geral · ${formatarDataHora(new Date().toISOString())}`}
        acoes={
          podeCriar(usuario, 'imoveis') && (
            <Link to="/imoveis/novo" className="btn btn-primary btn-sm">
              <i className="bi bi-plus-lg me-1" />
              Novo imóvel
            </Link>
          )
        }
      />
      <AbasDoPainel />

      <AvisoDeDadosNegados negados={consulta.data?.negados} />

      <div className="row g-3 mb-4">
        <div className="col-6 col-xl-3">
          <Link to="/imoveis" className="text-decoration-none">
            <CartaoDeIndicador rotulo="Total de imóveis" valor={imoveis.length} complemento={`${resumo?.imoveis_locados ?? imoveisLocados} locados`} icone="bi-building" corDoIcone="blue" />
          </Link>
        </div>
        <div className="col-6 col-xl-3">
          <Link to="/contratos?status=ativo" className="text-decoration-none">
            {/* o PHP mostrava o total de contratos com o rótulo "ativos"; aqui conta só os ativos */}
            <CartaoDeIndicador rotulo="Contratos ativos" valor={contratosAtivos} complemento={`de ${contratos.length} no total`} icone="bi-file-earmark-text" corDoIcone="amber" />
          </Link>
        </div>
        {/* com o total da API, o cartão mostra o número dela; sem ele (carregando ou falha), o da listagem, com o rótulo próprio */}
        {resumo?.checklists_pendentes !== null && (
          <div className="col-6 col-xl-3">
            <Link to="/vistorias" className="text-decoration-none">
              {typeof resumo?.checklists_pendentes === 'number' ? (
                <CartaoDeIndicador rotulo="Checklists pendentes" valor={resumo.checklists_pendentes} complemento={`${pendentesDeAceite} aguardando aceite`} icone="bi-clipboard-check" corDoIcone="purple" />
              ) : (
                <CartaoDeIndicador rotulo="Aguardando aceite" valor={pendentesDeAceite} complemento="vistorias enviadas" icone="bi-clipboard-check" corDoIcone="purple" />
              )}
            </Link>
          </div>
        )}
        {resumo?.problemas_abertos !== null && podeAcessar(usuario, 'problemas') && (
          <div className="col-6 col-xl-3">
            <Link to="/problemas" className="text-decoration-none">
              {typeof resumo?.problemas_abertos === 'number' ? (
                <CartaoDeIndicador rotulo="Problemas abertos" valor={resumo.problemas_abertos} complemento={`${semAtendimento} sem atendimento`} icone="bi-exclamation-triangle" corDoIcone="red" negativo />
              ) : (
                <CartaoDeIndicador rotulo="Problemas não resolvidos" valor={problemasNaoResolvidos.length} complemento={`${semAtendimento} sem atendimento`} icone="bi-exclamation-triangle" corDoIcone="red" negativo />
              )}
            </Link>
          </div>
        )}
      </div>

      <EstadoDaConsulta carregando={consulta.isPending} erro={consulta.error}>
        <div className="row g-4 mb-4">
          <div className="col-lg-7">
            <CartaoDeGrafico titulo="Vistorias por mês" subtitulo="Últimos 6 meses" categorias={meses.map((mes) => mes.rotulo)} series={seriesDeVistorias}>
              <GraficoDeBarras categorias={meses.map((mes) => mes.rotulo)} series={seriesDeVistorias} />
            </CartaoDeGrafico>
          </div>
          <div className="col-lg-5">
            <CartaoDeGrafico
              titulo="Status dos imóveis"
              subtitulo="Distribuição atual"
              categorias={fatiasDeStatus.map((fatia) => fatia.rotulo)}
              series={[{ rotulo: 'Imóveis', valores: fatiasDeStatus.map((fatia) => fatia.valor) }]}
            >
              <GraficoDeRosca fatias={fatiasDeStatus} />
            </CartaoDeGrafico>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-lg-6">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                Imóveis recentes
                <Link to="/imoveis" className="badge bg-primary text-decoration-none">
                  Ver todos
                </Link>
              </div>
              <ul className="list-group list-group-flush">
                {imoveis.length === 0 ? (
                  <li className="list-group-item py-3" style={{ color: '#6b7fa3', fontSize: 13 }}>
                    <i className="bi bi-building me-2" />
                    Nenhum imóvel cadastrado.
                  </li>
                ) : (
                  recentes(imoveis, 5).map((imovel) => (
                    <li key={imovel.id} className="list-group-item d-flex justify-content-between align-items-center py-3">
                      <div>
                        <Link to={`/imoveis/${imovel.id}`} style={{ fontSize: 13 }}>
                          {imovel.titulo || rotuloDoTipoDeImovel(imovel.tipo)} · {imovel.tamanho ?? ''}
                        </Link>
                        <div style={{ fontSize: 11, color: '#6b7fa3', marginTop: 2 }}>{formatarData(imovel.created_at)}</div>
                      </div>
                      <BadgeStatus grupo="imovel" valor={imovel.status} rotulo={ROTULO_DO_STATUS_DO_IMOVEL[imovel.status ?? '']} />
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                Contratos recentes
                <Link to="/contratos" className="badge bg-success text-decoration-none">
                  Ver todos
                </Link>
              </div>
              <ul className="list-group list-group-flush">
                {contratos.length === 0 ? (
                  <li className="list-group-item py-3" style={{ color: '#6b7fa3', fontSize: 13 }}>
                    <i className="bi bi-file-earmark-text me-2" />
                    Nenhum contrato registrado.
                  </li>
                ) : (
                  recentes(contratos, 5).map((contrato) => (
                    <li key={contrato.id} className="list-group-item d-flex justify-content-between align-items-center py-3">
                      <div>
                        <Link to={`/contratos/${contrato.id}`} style={{ fontSize: 13 }}>
                          {imoveis.find((imovel) => imovel.id === contrato.imovel_id)?.titulo ?? 'Contrato'}
                        </Link>
                        <div style={{ fontSize: 11, color: '#6b7fa3', marginTop: 2 }}>
                          {formatarData(contrato.data_inicio)} → {formatarData(contrato.data_fim)}
                        </div>
                      </div>
                      <BadgeStatus grupo="contrato" valor={contrato.status} rotulo={ROTULO_DO_STATUS_DO_CONTRATO[contrato.status ?? '']} />
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      </EstadoDaConsulta>
    </>
  );
}
