import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAdicionarComodo, useComodos, useImovel, useRemoverComodo } from '../../api/imoveis';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { useFlash } from '../../components/Flash';
import { ROTULO_DO_COMODO, rotuloDoTipoDeImovel } from '../../config/imoveis';

const TIPOS_DE_COMODO = Object.keys(ROTULO_DO_COMODO);

/** imoveis/comodos.php */
export function ComodosDoImovel() {
  const { id = '' } = useParams();
  const { definirFlash } = useFlash();
  const consultaDoImovel = useImovel(id);
  const consultaDosComodos = useComodos(id);
  const adicionarComodo = useAdicionarComodo(id);
  const removerComodo = useRemoverComodo(id);
  const [tipo, setTipo] = useState(TIPOS_DE_COMODO[0]);
  const [descricao, setDescricao] = useState('');

  useEffect(() => {
    if (consultaDoImovel.isError) definirFlash('erro', 'Imóvel não encontrado.');
  }, [consultaDoImovel.isError, definirFlash]);

  if (!id || consultaDoImovel.isError) return <Navigate to="/imoveis" replace />;

  const imovel = consultaDoImovel.data;
  const comodos = consultaDosComodos.data ?? [];

  async function aoAdicionar(evento: FormEvent) {
    evento.preventDefault();
    try {
      await adicionarComodo.mutateAsync({ tipo, descricao: descricao.trim() });
      setDescricao('');
      definirFlash('sucesso', 'Cômodo adicionado.');
    } catch (falha) {
      definirFlash('erro', (falha as Error).message || 'Erro ao adicionar.');
    }
  }

  async function aoRemover(comodoId: string) {
    if (!window.confirm('Remover este cômodo?')) return;
    try {
      await removerComodo.mutateAsync(comodoId);
      definirFlash('sucesso', 'Cômodo removido.');
    } catch (falha) {
      definirFlash('erro', (falha as Error).message || 'Erro ao remover.');
    }
  }

  return (
    <>
      <CabecalhoDaPagina
        titulo={`Cômodos — ${imovel?.titulo || rotuloDoTipoDeImovel(imovel?.tipo)}`}
        subtitulo={imovel?.tamanho ?? ''}
        acoes={
          <Link to={`/imoveis/${id}`} className="btn btn-link btn-sm">
            Voltar
          </Link>
        }
      />

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header fw-semibold">Adicionar cômodo</div>
            <div className="card-body">
              <form onSubmit={aoAdicionar}>
                <div className="mb-3">
                  <label className="form-label" htmlFor="tipo-comodo">
                    Tipo
                  </label>
                  <select id="tipo-comodo" className="form-select" required value={tipo} onChange={(evento) => setTipo(evento.target.value)}>
                    {TIPOS_DE_COMODO.map((tipoDeComodo) => (
                      <option key={tipoDeComodo} value={tipoDeComodo}>
                        {ROTULO_DO_COMODO[tipoDeComodo]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="descricao-comodo">
                    Descrição (opcional)
                  </label>
                  <input id="descricao-comodo" className="form-control" placeholder="Ex: Quarto 2, Suíte master" value={descricao} onChange={(evento) => setDescricao(evento.target.value)} />
                </div>
                <button className="btn btn-primary w-100" disabled={adicionarComodo.isPending}>
                  Adicionar
                </button>
              </form>
            </div>
          </div>
        </div>
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header fw-semibold">Cômodos cadastrados ({comodos.length})</div>
            <EstadoDaConsulta carregando={consultaDosComodos.isPending} erro={consultaDosComodos.error}>
              <ul className="list-group list-group-flush">
                {comodos.length === 0 ? (
                  <li className="list-group-item text-muted">Nenhum cômodo cadastrado.</li>
                ) : (
                  comodos.map((comodo) => (
                    <li key={comodo.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{ROTULO_DO_COMODO[comodo.tipo] ?? comodo.tipo}</strong>
                        {comodo.descricao && <span className="text-muted"> — {comodo.descricao}</span>}
                      </div>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => aoRemover(comodo.id)} disabled={removerComodo.isPending}>
                        Remover
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </EstadoDaConsulta>
          </div>
        </div>
      </div>
    </>
  );
}
