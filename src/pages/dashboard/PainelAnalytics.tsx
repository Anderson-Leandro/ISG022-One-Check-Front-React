import { chaveDoMes, ultimosMeses, useDadosDoPainel } from '../../api/painel';
import { problemaEstaEncerrado, ROTULO_DA_PRIORIDADE, ROTULO_DO_STATUS_DO_PROBLEMA } from '../../api/problemas';
import { useAuth } from '../../auth/AuthContext';
import { podeAcessar } from '../../auth/permissoes';
import { STATUS_DA_VISTORIA } from '../../api/vistorias';
import { AvisoDeDadosNegados } from '../../components/AvisoDeDadosNegados';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { CartaoDeGrafico, CartaoDeIndicador, GraficoDeBarras, GraficoDeRosca } from '../../components/graficos/Graficos';
import { AbasDoPainel } from './AbasDoPainel';

const MESES_DE_HISTORICO = 12;

/** dashboard/analytics.php (vazio no PHP): tendências de vistorias e problemas. */
export function PainelAnalytics() {
  const consulta = useDadosDoPainel();
  const { usuario } = useAuth();
  const veProblemas = podeAcessar(usuario, 'problemas');
  const { checklists = [], problemas = [] } = consulta.data ?? {};

  const meses = ultimosMeses(MESES_DE_HISTORICO);
  const contarNoMes = <T,>(lista: T[], data: (registro: T) => string | null | undefined, chave: string) => lista.filter((registro) => chaveDoMes(data(registro)) === chave).length;
  const seriesDeVistorias = [
    { rotulo: 'Entrada', valores: meses.map((mes) => contarNoMes(checklists.filter((checklist) => checklist.tipo === 'inicial'), (checklist) => checklist.created_at, mes.chave)) },
    { rotulo: 'Saída', valores: meses.map((mes) => contarNoMes(checklists.filter((checklist) => checklist.tipo === 'encerramento'), (checklist) => checklist.created_at, mes.chave)) },
  ];
  const seriesDeProblemas = [{ rotulo: 'Problemas registrados', valores: meses.map((mes) => contarNoMes(problemas, (problema) => problema.created_at, mes.chave)) }];

  const aceitas = checklists.filter((checklist) => checklist.status === 'aceito').length;
  const rejeitadas = checklists.filter((checklist) => checklist.status === 'rejeitado').length;
  const taxaDeAceite = aceitas + rejeitadas ? Math.round((aceitas / (aceitas + rejeitadas)) * 100) : null;
  const resolvidos = problemas.filter((problema) => problemaEstaEncerrado(problema.status)).length;

  const fatiasDeStatusDaVistoria = ['em_preenchimento', 'pendente_aceite', 'aceito', 'rejeitado'].map((status) => ({
    rotulo: STATUS_DA_VISTORIA[status].rotulo,
    valor: checklists.filter((checklist) => checklist.status === status).length,
  }));
  const prioridades = Object.keys(ROTULO_DA_PRIORIDADE);
  const statusDosProblemas = Object.keys(ROTULO_DO_STATUS_DO_PROBLEMA);
  // uma série por status, empilhando as prioridades no eixo x
  const seriesPorPrioridade = statusDosProblemas.map((status) => ({
    rotulo: ROTULO_DO_STATUS_DO_PROBLEMA[status],
    valores: prioridades.map((prioridade) => problemas.filter((problema) => (problema.prioridade ?? 'normal') === prioridade && problema.status === status).length),
  }));

  return (
    <>
      <CabecalhoDaPagina titulo="Dashboard" subtitulo={`Analytics · últimos ${MESES_DE_HISTORICO} meses`} />
      <AbasDoPainel />
      <AvisoDeDadosNegados negados={consulta.data?.negados} />

      <EstadoDaConsulta carregando={consulta.isPending} erro={consulta.error}>
        <div className="row g-3 mb-4">
          <div className="col-6 col-xl-3">
            <CartaoDeIndicador rotulo="Vistorias registradas" valor={checklists.length} icone="bi-clipboard-data" corDoIcone="blue" />
          </div>
          <div className="col-6 col-xl-3">
            <CartaoDeIndicador rotulo="Taxa de aceite" valor={taxaDeAceite === null ? '—' : `${taxaDeAceite}%`} complemento={`${aceitas} aceitas · ${rejeitadas} rejeitadas`} icone="bi-hand-thumbs-up" corDoIcone="green" />
          </div>
          {veProblemas && (
            <>
          <div className="col-6 col-xl-3">
            <CartaoDeIndicador rotulo="Problemas registrados" valor={problemas.length} icone="bi-exclamation-triangle" corDoIcone="red" />
          </div>
          <div className="col-6 col-xl-3">
            <CartaoDeIndicador rotulo="Problemas resolvidos" valor={problemas.length ? `${Math.round((resolvidos / problemas.length) * 100)}%` : '—'} complemento={`${resolvidos} de ${problemas.length}`} icone="bi-check2-circle" corDoIcone="amber" />
          </div>
            </>
          )}
        </div>

        <div className="row g-4 mb-4">
          <div className="col-lg-8">
            <CartaoDeGrafico titulo="Vistorias por mês e tipo" subtitulo="Data de criação do checklist" categorias={meses.map((mes) => mes.rotulo)} series={seriesDeVistorias}>
              <GraficoDeBarras categorias={meses.map((mes) => mes.rotulo)} series={seriesDeVistorias} altura={220} />
            </CartaoDeGrafico>
          </div>
          <div className="col-lg-4">
            <CartaoDeGrafico titulo="Vistorias por status" categorias={fatiasDeStatusDaVistoria.map((fatia) => fatia.rotulo)} series={[{ rotulo: 'Vistorias', valores: fatiasDeStatusDaVistoria.map((fatia) => fatia.valor) }]}>
              <GraficoDeRosca fatias={fatiasDeStatusDaVistoria} altura={220} />
            </CartaoDeGrafico>
          </div>
        </div>

        {veProblemas && (
        <div className="row g-4">
          <div className="col-lg-6">
            <CartaoDeGrafico titulo="Problemas por mês" categorias={meses.map((mes) => mes.rotulo)} series={seriesDeProblemas}>
              <GraficoDeBarras categorias={meses.map((mes) => mes.rotulo)} series={seriesDeProblemas} />
            </CartaoDeGrafico>
          </div>
          <div className="col-lg-6">
            <CartaoDeGrafico titulo="Problemas por prioridade e status" categorias={prioridades.map((prioridade) => ROTULO_DA_PRIORIDADE[prioridade])} series={seriesPorPrioridade}>
              <GraficoDeBarras categorias={prioridades.map((prioridade) => ROTULO_DA_PRIORIDADE[prioridade])} series={seriesPorPrioridade} />
            </CartaoDeGrafico>
          </div>
        </div>
        )}
      </EstadoDaConsulta>
    </>
  );
}
