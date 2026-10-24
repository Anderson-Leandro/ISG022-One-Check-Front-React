import { Link, useParams } from 'react-router-dom';
import { useProblema } from '../../api/problemas';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { LinhaDoTempoDoProblema } from './LinhaDoTempoDoProblema';

/** problemas/historico.php estava vazio no PHP; aqui mostra só a linha do tempo de atualizações. */
export function HistoricoDoProblema() {
  const { id = '' } = useParams();
  const { data: problema } = useProblema(id);

  return (
    <>
      <CabecalhoDaPagina
        titulo={`Histórico — ${problema?.titulo ?? 'Problema'}`}
        acoes={
          <Link to={`/problemas/${id}`} className="btn btn-link btn-sm">
            Voltar
          </Link>
        }
      />
      <LinhaDoTempoDoProblema problemaId={id} podeComentar={false} />
    </>
  );
}
