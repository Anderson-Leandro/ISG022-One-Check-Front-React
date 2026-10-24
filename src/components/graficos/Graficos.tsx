import { useState, type ReactNode } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { COR_DA_GRADE, COR_DA_SUPERFICIE, CORES_DAS_SERIES } from './configurarGraficos';

export interface Serie {
  rotulo: string;
  valores: number[];
}

/** Legenda HTML com contagem por série (sempre presente com 2+ séries). */
function Legenda({ itens }: { itens: { rotulo: string; cor: string; total: number }[] }) {
  return (
    <div className="chart-legend">
      {itens.map((item) => (
        <span key={item.rotulo}>
          <b style={{ background: item.cor }} />
          {item.rotulo} ({item.total})
        </span>
      ))}
    </div>
  );
}

/** Alternativa acessível: os mesmos números em tabela. */
function TabelaDosDados({ categorias, series }: { categorias: string[]; series: Serie[] }) {
  return (
    <table className="table table-sm small mb-0 mt-2">
      <thead>
        <tr>
          <th />
          {series.map((serie) => (
            <th key={serie.rotulo} className="text-end">
              {serie.rotulo}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {categorias.map((categoria, indice) => (
          <tr key={categoria}>
            <td>{categoria}</td>
            {series.map((serie) => (
              <td key={serie.rotulo} className="text-end">
                {serie.valores[indice]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Card com título, subtítulo e o botão "ver tabela". */
export function CartaoDeGrafico({
  titulo,
  subtitulo,
  categorias,
  series,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  categorias: string[];
  series: Serie[];
  children: ReactNode;
}) {
  const [verTabela, setVerTabela] = useState(false);
  return (
    <div className="card h-100">
      <div className="card-header d-flex justify-content-between align-items-center">
        <div>
          {titulo}
          {subtitulo && <div style={{ fontSize: 11, color: '#6b7fa3', fontWeight: 400 }}>{subtitulo}</div>}
        </div>
        <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setVerTabela(!verTabela)}>
          {verTabela ? 'Ver gráfico' : 'Ver tabela'}
        </button>
      </div>
      <div className="card-body">{verTabela ? <TabelaDosDados categorias={categorias} series={series} /> : children}</div>
    </div>
  );
}

/** Barras agrupadas (até 4 séries), cantos de 4px, eixo y a partir de zero. */
export function GraficoDeBarras({ categorias, series, altura = 200 }: { categorias: string[]; series: Serie[]; altura?: number }) {
  const multiplasSeries = series.length > 1;
  return (
    <>
      {multiplasSeries && (
        <Legenda itens={series.map((serie, indice) => ({ rotulo: serie.rotulo, cor: CORES_DAS_SERIES[indice], total: serie.valores.reduce((soma, valor) => soma + valor, 0) }))} />
      )}
      <div style={{ position: 'relative', height: altura }}>
        <Bar
          data={{
            labels: categorias,
            datasets: series.map((serie, indice) => ({
              label: serie.rotulo,
              data: serie.valores,
              backgroundColor: CORES_DAS_SERIES[indice],
              borderRadius: 4,
              borderSkipped: 'start',
              barPercentage: 0.7,
              categoryPercentage: 0.7,
            })),
          }}
          options={{
            interaction: { mode: 'index', intersect: false },
            scales: {
              x: { grid: { display: false } },
              y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: COR_DA_GRADE } },
            },
          }}
        />
      </div>
    </>
  );
}

/** Rosca com total no centro; fatias separadas por 2px da cor da superfície. */
export function GraficoDeRosca({ fatias, altura = 200, rotuloDoTotal = 'TOTAL' }: { fatias: { rotulo: string; valor: number }[]; altura?: number; rotuloDoTotal?: string }) {
  const total = fatias.reduce((soma, fatia) => soma + fatia.valor, 0);
  if (total === 0) {
    return (
      <div style={{ height: altura }} className="d-flex flex-column align-items-center justify-content-center gap-2">
        <i className="bi bi-pie-chart" style={{ fontSize: 36, color: '#2a3347' }} />
        <span style={{ fontSize: 12, color: '#4a5568' }}>Sem dados</span>
      </div>
    );
  }
  return (
    <>
      <Legenda itens={fatias.map((fatia, indice) => ({ rotulo: fatia.rotulo, cor: CORES_DAS_SERIES[indice], total: fatia.valor }))} />
      <div style={{ position: 'relative', height: altura }}>
        <Doughnut
          data={{
            labels: fatias.map((fatia) => fatia.rotulo),
            datasets: [{ data: fatias.map((fatia) => fatia.valor), backgroundColor: CORES_DAS_SERIES.slice(0, fatias.length), borderColor: COR_DA_SUPERFICIE, borderWidth: 2, hoverOffset: 6 }],
          }}
          options={{ cutout: '70%' }}
        />
        <div className="position-absolute top-50 start-50 translate-middle text-center" style={{ pointerEvents: 'none' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--oc-text)' }}>{total}</div>
          <div style={{ fontSize: 11, color: '#6b7fa3' }}>{rotuloDoTotal}</div>
        </div>
      </div>
    </>
  );
}

/** Cartão de indicador (stat-card do style.css). */
export function CartaoDeIndicador({
  rotulo,
  valor,
  complemento,
  icone,
  corDoIcone,
  negativo = false,
}: {
  rotulo: string;
  valor: ReactNode;
  complemento?: string;
  icone: string;
  corDoIcone: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  negativo?: boolean;
}) {
  return (
    <div className="stat-card card h-100">
      <div className="card-body p-3">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <span className="stat-label">{rotulo}</span>
          <div className={`stat-icon icon-${corDoIcone}`}>
            <i className={`bi ${icone}`} />
          </div>
        </div>
        <div className="stat-value">{valor}</div>
        {complemento && <div className={`stat-change ${negativo ? 'down' : ''}`}>{complemento}</div>}
      </div>
    </div>
  );
}
