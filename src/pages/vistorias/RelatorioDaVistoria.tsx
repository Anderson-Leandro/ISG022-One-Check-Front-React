import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { baixarPdfDaVistoria } from '../../api/vistorias';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { salvarArquivo } from '../../utils/arquivos';

/** vistorias/relatorio.php estava vazio no PHP; aqui exibe o PDF gerado pela API (/download-pdf). */
export function RelatorioDaVistoria() {
  const { id = '' } = useParams();
  const consulta = useQuery({ queryKey: ['vistorias', 'pdf', id], queryFn: () => baixarPdfDaVistoria(id), enabled: Boolean(id), staleTime: 0, gcTime: 0 });
  const [urlDoPdf, setUrlDoPdf] = useState('');

  useEffect(() => {
    if (!consulta.data) return;
    const url = URL.createObjectURL(consulta.data);
    setUrlDoPdf(url);
    return () => URL.revokeObjectURL(url);
  }, [consulta.data]);

  return (
    <>
      <CabecalhoDaPagina
        titulo="Relatório da vistoria"
        acoes={
          <>
            <button type="button" className="btn btn-primary btn-sm" disabled={!consulta.data} onClick={() => consulta.data && salvarArquivo(consulta.data, `vistoria-${id.slice(0, 8)}.pdf`)}>
              <i className="bi bi-download me-1" />
              Baixar PDF
            </button>
            <Link to={`/vistorias/${id}`} className="btn btn-outline-secondary btn-sm">
              Voltar
            </Link>
          </>
        }
      />
      <div className="card">
        <EstadoDaConsulta carregando={consulta.isPending} erro={consulta.error}>
          {urlDoPdf && <iframe title="Relatório da vistoria em PDF" src={urlDoPdf} style={{ width: '100%', height: '75vh', border: 0, borderRadius: 12 }} />}
        </EstadoDaConsulta>
      </div>
    </>
  );
}
