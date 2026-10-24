import { Link, useParams } from 'react-router-dom';
import { urlDeArquivo } from '../../api/client';
import { useChecklist, useNomesDaVistoria, ROTULO_DO_TIPO_DE_VISTORIA } from '../../api/vistorias';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { formatarData } from '../../utils/formatar';
import { BadgeEstadoDoItem } from './BadgesDaVistoria';

/** vistorias/fotos.php — galeria com todas as fotos dos itens do checklist. */
export function FotosDaVistoria() {
  const { id = '' } = useParams();
  const consulta = useChecklist(id);
  const checklist = consulta.data;
  const { nomeDoItem, nomeDoComodo } = useNomesDaVistoria(checklist);
  const fotos = (checklist?.itens ?? []).flatMap((item) => (item.fotos ?? []).map((foto) => ({ foto, item })));

  return (
    <>
      <CabecalhoDaPagina
        titulo="Fotos da vistoria"
        subtitulo={checklist && `${ROTULO_DO_TIPO_DE_VISTORIA[checklist.tipo ?? ''] ?? checklist.tipo} · ${formatarData(checklist.data_vistoria)} · ${fotos.length} foto(s)`}
        acoes={
          <Link to={`/vistorias/${id}`} className="btn btn-outline-secondary btn-sm">
            Voltar
          </Link>
        }
      />
      <EstadoDaConsulta carregando={consulta.isPending} erro={consulta.error}>
        {fotos.length === 0 ? (
          <div className="alert alert-info">Nenhuma foto registrada nesta vistoria.</div>
        ) : (
          <div className="row g-3">
            {fotos.map(({ foto, item }) => (
              <div key={foto.id} className="col-6 col-md-4 col-lg-3">
                <div className="card photo-card h-100 shadow-sm">
                  <a href={urlDeArquivo(foto.url)} target="_blank" rel="noopener noreferrer">
                    <img src={urlDeArquivo(foto.url)} alt={`Foto — ${nomeDoItem(item.item_vistoria_id)}`} style={{ width: '100%', height: 180, objectFit: 'cover' }} />
                  </a>
                  <div className="card-body p-2">
                    <div className="fw-semibold small">
                      {nomeDoComodo(item.comodo_id)} · {nomeDoItem(item.item_vistoria_id)}
                    </div>
                    <div className="mt-1">
                      <BadgeEstadoDoItem estado={item.estado} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </EstadoDaConsulta>
    </>
  );
}
