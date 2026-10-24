import { Link } from 'react-router-dom';
import { ROTULO_DO_STATUS_DO_CONTRATO } from '../../api/contratos';
import { proximosMeses, useDadosDoPainel } from '../../api/painel';
import { BadgeStatus } from '../../components/BadgeStatus';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { CartaoDeGrafico, CartaoDeIndicador, GraficoDeBarras, GraficoDeRosca } from '../../components/graficos/Graficos';
import { formatarData, formatarMoeda } from '../../utils/formatar';
import { AbasDoPainel } from './AbasDoPainel';

const DIAS_PARA_VENCIMENTO = 60;
const MESES_DE_PROJECAO = 12;

/**
 * dashboard/financeiro.php (vazio no PHP). A API não tem pagamentos/recebimentos,
 * então tudo é derivado do valor_mensal dos contratos — é receita contratada, não recebida.
 */
export function PainelFinanceiro() {
  const consulta = useDadosDoPainel();
  const { imoveis = [], contratos = [] } = consulta.data ?? {};
  const ativos = contratos.filter((contrato) => contrato.status === 'ativo');
  const valorDe = (valor: unknown) => Number(valor ?? 0) || 0;

  const receitaMensal = ativos.reduce((soma, contrato) => soma + valorDe(contrato.valor_mensal), 0);
  const ticketMedio = ativos.length ? receitaMensal / ativos.length : 0;
  const locados = imoveis.filter((imovel) => imovel.status === 'locado').length;
  const taxaDeOcupacao = imoveis.length ? Math.round((locados / imoveis.length) * 100) : 0;

  // receita contratada por mês: contratos ativos vigentes em cada mês futuro
  const meses = proximosMeses(MESES_DE_PROJECAO);
  const receitaPorMes = meses.map((mes) =>
    Math.round(ativos.filter((contrato) => (contrato.data_inicio ?? '').slice(0, 7) <= mes.chave && (contrato.data_fim ?? '9999').slice(0, 7) >= mes.chave).reduce((soma, contrato) => soma + valorDe(contrato.valor_mensal), 0)),
  );

  const hoje = new Date().toISOString().slice(0, 10);
  const limite = new Date(Date.now() + DIAS_PARA_VENCIMENTO * 86_400_000).toISOString().slice(0, 10);
  const vencendo = ativos.filter((contrato) => (contrato.data_fim ?? '') >= hoje && (contrato.data_fim ?? '') <= limite).sort((primeiro, segundo) => String(primeiro.data_fim).localeCompare(String(segundo.data_fim)));

  const fatiasDeStatus = Object.entries(ROTULO_DO_STATUS_DO_CONTRATO).map(([status, rotulo]) => ({ rotulo, valor: contratos.filter((contrato) => contrato.status === status).length }));
  const nomeDoImovel = (imovelId: string) => imoveis.find((imovel) => imovel.id === imovelId)?.titulo ?? 'Imóvel';

  return (
    <>
      <CabecalhoDaPagina titulo="Dashboard" subtitulo="Financeiro · receita contratada (valor mensal dos contratos)" />
      <AbasDoPainel />

      <EstadoDaConsulta carregando={consulta.isPending} erro={consulta.error}>
        <div className="row g-3 mb-4">
          <div className="col-6 col-xl-3">
            <CartaoDeIndicador rotulo="Receita mensal contratada" valor={formatarMoeda(receitaMensal)} complemento={`${ativos.length} contrato(s) ativo(s)`} icone="bi-cash-stack" corDoIcone="green" />
          </div>
          <div className="col-6 col-xl-3">
            <CartaoDeIndicador rotulo="Ticket médio" valor={formatarMoeda(ticketMedio)} complemento="por contrato ativo" icone="bi-receipt" corDoIcone="blue" />
          </div>
          <div className="col-6 col-xl-3">
            <CartaoDeIndicador rotulo="Taxa de ocupação" valor={`${taxaDeOcupacao}%`} complemento={`${locados} de ${imoveis.length} imóveis locados`} icone="bi-house-check" corDoIcone="amber" />
          </div>
          <div className="col-6 col-xl-3">
            <CartaoDeIndicador rotulo={`Vencem em ${DIAS_PARA_VENCIMENTO} dias`} valor={vencendo.length} complemento="contratos a renovar" icone="bi-calendar-x" corDoIcone="red" negativo={vencendo.length > 0} />
          </div>
        </div>

        <div className="row g-4 mb-4">
          <div className="col-lg-8">
            <CartaoDeGrafico
              titulo="Receita contratada por mês"
              subtitulo={`Próximos ${MESES_DE_PROJECAO} meses · contratos ativos vigentes (R$)`}
              categorias={meses.map((mes) => mes.rotulo)}
              series={[{ rotulo: 'Receita (R$)', valores: receitaPorMes }]}
            >
              <GraficoDeBarras categorias={meses.map((mes) => mes.rotulo)} series={[{ rotulo: 'Receita (R$)', valores: receitaPorMes }]} altura={220} />
            </CartaoDeGrafico>
          </div>
          <div className="col-lg-4">
            <CartaoDeGrafico titulo="Contratos por status" categorias={fatiasDeStatus.map((fatia) => fatia.rotulo)} series={[{ rotulo: 'Contratos', valores: fatiasDeStatus.map((fatia) => fatia.valor) }]}>
              <GraficoDeRosca fatias={fatiasDeStatus} altura={220} />
            </CartaoDeGrafico>
          </div>
        </div>

        <div className="card">
          <div className="card-header">Contratos vencendo nos próximos {DIAS_PARA_VENCIMENTO} dias</div>
          <ul className="list-group list-group-flush">
            {vencendo.length === 0 ? (
              <li className="list-group-item small text-muted">Nenhum contrato vence nesse período.</li>
            ) : (
              vencendo.map((contrato) => (
                <li key={contrato.id} className="list-group-item d-flex justify-content-between align-items-center small">
                  <div>
                    <Link to={`/contratos/${contrato.id}`}>{nomeDoImovel(contrato.imovel_id)}</Link>
                    <div className="text-muted">
                      Vence em {formatarData(contrato.data_fim)} · {formatarMoeda(valorDe(contrato.valor_mensal))}/mês
                    </div>
                  </div>
                  <BadgeStatus grupo="contrato" valor={contrato.status} rotulo={ROTULO_DO_STATUS_DO_CONTRATO[contrato.status ?? '']} />
                </li>
              ))
            )}
          </ul>
        </div>
      </EstadoDaConsulta>
    </>
  );
}
