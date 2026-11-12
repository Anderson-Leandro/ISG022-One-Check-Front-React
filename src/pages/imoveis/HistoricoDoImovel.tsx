import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ROTULO_DO_STATUS_DO_CONTRATO } from '../../api/contratos';
import { useHistoricoDoImovel, useImovel, type EventoDoHistorico } from '../../api/imoveis';
import { ROTULO_DO_STATUS_DO_PROBLEMA } from '../../api/problemas';
import { ROTULO_DO_TIPO_DE_VISTORIA } from '../../api/vistorias';
import { useAuth } from '../../auth/AuthContext';
import { podeAcessar, type Pagina } from '../../auth/permissoes';
import { BadgeStatus } from '../../components/BadgeStatus';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { rotuloDoTipoDeImovel } from '../../config/imoveis';
import { formatarData, formatarDataHora } from '../../utils/formatar';
import { BadgeStatusDaVistoria } from '../vistorias/BadgesDaVistoria';

interface ApresentacaoDoEvento {
  icone: string;
  rotulo: string;
  titulo: string;
  rota: string;
  pagina: Pagina;
  badge: ReactNode;
}

function apresentar({ tipo, dados }: EventoDoHistorico): ApresentacaoDoEvento {
  if (tipo === 'contrato') {
    return {
      icone: 'bi-file-earmark-text',
      rotulo: 'Contrato',
      titulo: `${formatarData(dados.data_inicio)} — ${formatarData(dados.data_fim)}`,
      rota: `/contratos/${dados.id}`,
      pagina: 'contratos',
      badge: <BadgeStatus grupo="contrato" valor={dados.status} rotulo={ROTULO_DO_STATUS_DO_CONTRATO[dados.status ?? '']} />,
    };
  }
  if (tipo === 'vistoria') {
    return {
      icone: 'bi-camera',
      rotulo: 'Vistoria',
      titulo: `${ROTULO_DO_TIPO_DE_VISTORIA[dados.tipo ?? ''] ?? 'Vistoria'}${dados.data_vistoria ? ` · ${formatarData(dados.data_vistoria)}` : ''}`,
      rota: `/vistorias/${dados.id}`,
      pagina: 'vistorias',
      badge: <BadgeStatusDaVistoria status={dados.status} />,
    };
  }
  return {
    icone: 'bi-exclamation-triangle',
    rotulo: 'Problema',
    titulo: dados.titulo || 'Problema',
    rota: `/problemas/${dados.id}`,
    pagina: 'problemas',
    badge: <BadgeStatus grupo="problema" valor={dados.status} rotulo={ROTULO_DO_STATUS_DO_PROBLEMA[dados.status ?? '']} />,
  };
}

/** imoveis/historico.php estava vazio no PHP: linha do tempo de contratos, vistorias e problemas do imóvel. */
export function HistoricoDoImovel() {
  const { id = '' } = useParams();
  const { usuario } = useAuth();
  const { data: imovel } = useImovel(id);
  const consulta = useHistoricoDoImovel(id);
  // a API devolve do mais antigo para o mais novo; na tela o mais recente vem primeiro
  const eventos = [...(consulta.data?.eventos ?? [])].reverse();

  return (
    <>
      <CabecalhoDaPagina
        titulo={`Histórico — ${imovel?.titulo || rotuloDoTipoDeImovel(imovel?.tipo)}`}
        subtitulo="Contratos, vistorias e problemas do imóvel"
        acoes={
          <Link to={`/imoveis/${id}`} className="btn btn-link btn-sm">
            Voltar
          </Link>
        }
      />
      <div className="card">
        <EstadoDaConsulta carregando={consulta.isPending} erro={consulta.error}>
          <ul className="list-group list-group-flush">
            {eventos.length === 0 ? (
              <li className="list-group-item text-muted">Nenhum registro para este imóvel.</li>
            ) : (
              eventos.map((evento) => {
                const { icone, rotulo, titulo, rota, pagina, badge } = apresentar(evento);
                return (
                  <li key={`${evento.tipo}-${evento.dados.id}`} className="list-group-item d-flex justify-content-between align-items-center gap-3">
                    <div>
                      <span className="small text-muted">
                        <i className={`bi ${icone} me-1`} />
                        {rotulo} · {formatarDataHora(evento.data)}
                      </span>
                      <div>{podeAcessar(usuario, pagina) ? <Link to={rota}>{titulo}</Link> : titulo}</div>
                    </div>
                    {badge}
                  </li>
                );
              })
            )}
          </ul>
        </EstadoDaConsulta>
      </div>
    </>
  );
}
