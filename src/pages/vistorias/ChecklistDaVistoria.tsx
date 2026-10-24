import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { urlDeArquivo } from '../../api/client';
import {
  agruparItensPorComodo,
  ESTADOS_DO_ITEM,
  permissoesDaVistoria,
  ROTULO_DO_ESTADO,
  useAdicionarItem,
  useAtualizarItem,
  useChecklist,
  useEnviarFoto,
  useNomesDaVistoria,
  useRemoverFoto,
  type ItemDoChecklist,
} from '../../api/vistorias';
import { useAuth } from '../../auth/AuthContext';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { useFlash } from '../../components/Flash';
import { BadgeStatusDaVistoria } from './BadgesDaVistoria';

const TIPOS_DE_FOTO_ACEITOS = 'image/jpeg,image/png';

function EditorDoItem({ checklistId, item, rotulo }: { checklistId: string; item: ItemDoChecklist; rotulo: string }) {
  const { definirFlash } = useFlash();
  const atualizarItem = useAtualizarItem(checklistId);
  const enviarFoto = useEnviarFoto(checklistId);
  const removerFoto = useRemoverFoto(checklistId);
  const seletorDeArquivo = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState(item.estado ?? 'bom');
  const [observacao, setObservacao] = useState(item.observacao ?? '');
  const alterado = estado !== (item.estado ?? 'bom') || observacao !== (item.observacao ?? '');

  async function aoSalvar() {
    try {
      await atualizarItem.mutateAsync({ itemId: item.id, dados: { estado, observacao: observacao.trim() || null } });
      definirFlash('sucesso', `${rotulo} atualizado.`);
    } catch (falha) {
      definirFlash('erro', (falha as Error).message || 'Erro ao salvar item.');
    }
  }

  async function aoEscolherFoto(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!arquivo) return;
    try {
      await enviarFoto.mutateAsync({ itemId: item.id, arquivo });
      definirFlash('sucesso', 'Foto enviada.');
    } catch (falha) {
      definirFlash('erro', (falha as Error).message || 'Erro ao enviar foto.');
    }
  }

  async function aoRemoverFoto(fotoId: string) {
    if (!window.confirm('Remover esta foto?')) return;
    try {
      await removerFoto.mutateAsync({ itemId: item.id, fotoId });
    } catch (falha) {
      definirFlash('erro', (falha as Error).message || 'Erro ao remover foto.');
    }
  }

  return (
    <div className="oc-item-card">
      <div className="oc-item-label mb-2">{rotulo}</div>
      <div className="row g-2 align-items-end">
        <div className="col-md-3">
          <select className="form-select form-select-sm" aria-label="Estado" value={estado} onChange={(evento) => setEstado(evento.target.value)}>
            {ESTADOS_DO_ITEM.map((opcao) => (
              <option key={opcao} value={opcao}>
                {ROTULO_DO_ESTADO[opcao]}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-6">
          <input className="form-control form-control-sm" placeholder="Observação" aria-label="Observação" value={observacao} onChange={(evento) => setObservacao(evento.target.value)} />
        </div>
        <div className="col-md-3 d-flex gap-1">
          <button type="button" className="btn btn-primary btn-sm flex-grow-1" onClick={aoSalvar} disabled={!alterado || atualizarItem.isPending}>
            Salvar
          </button>
          <button type="button" className="btn btn-outline-secondary btn-sm" title="Adicionar foto" onClick={() => seletorDeArquivo.current?.click()} disabled={enviarFoto.isPending}>
            {enviarFoto.isPending ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-camera" />}
          </button>
          <input ref={seletorDeArquivo} type="file" accept={TIPOS_DE_FOTO_ACEITOS} capture="environment" hidden onChange={aoEscolherFoto} />
        </div>
      </div>
      {!!item.fotos?.length && (
        <div className="d-flex flex-wrap gap-2 mt-3">
          {item.fotos.map((foto) => (
            <div key={foto.id} className="position-relative">
              <img src={urlDeArquivo(foto.url)} alt="Foto do item" className="oc-photo-thumb" />
              <button
                type="button"
                className="btn btn-danger btn-sm position-absolute top-0 end-0 py-0 px-1"
                title="Remover foto"
                onClick={() => aoRemoverFoto(foto.id)}
                disabled={removerFoto.isPending}
              >
                <i className="bi bi-x" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Preenchimento do checklist pela web (no PHP só existia visualização; o preenchimento era pelo app). */
export function ChecklistDaVistoria() {
  const { id = '' } = useParams();
  const { usuario } = useAuth();
  const { definirFlash } = useFlash();
  const consulta = useChecklist(id);
  const checklist = consulta.data;
  const { catalogo, nomeDoItem, nomeDoComodo } = useNomesDaVistoria(checklist);
  const adicionarItem = useAdicionarItem(id);
  const pode = permissoesDaVistoria(checklist, usuario);
  const [novoItem, setNovoItem] = useState({ comodoId: '', itemVistoriaId: '', estado: 'bom', observacao: '' });

  const comodos = useMemo(() => checklist?.comodos ?? [], [checklist?.comodos]);
  useEffect(() => {
    if (!novoItem.comodoId && comodos[0]) setNovoItem((anterior) => ({ ...anterior, comodoId: comodos[0].id }));
    if (!novoItem.itemVistoriaId && catalogo[0]) setNovoItem((anterior) => ({ ...anterior, itemVistoriaId: catalogo[0].id }));
  }, [comodos, catalogo, novoItem.comodoId, novoItem.itemVistoriaId]);

  if (!id || consulta.isError) return <Navigate to="/vistorias" replace />;
  if (checklist && !pode.editarItens) return <Navigate to={`/vistorias/${id}`} replace />;

  const jaAdicionado = (checklist?.itens ?? []).some((item) => item.comodo_id === novoItem.comodoId && item.item_vistoria_id === novoItem.itemVistoriaId);

  async function aoAdicionar(evento: FormEvent) {
    evento.preventDefault();
    try {
      await adicionarItem.mutateAsync({
        comodo_id: novoItem.comodoId,
        item_vistoria_id: novoItem.itemVistoriaId,
        estado: novoItem.estado,
        observacao: novoItem.observacao.trim() || null,
      });
      setNovoItem((anterior) => ({ ...anterior, observacao: '' }));
      definirFlash('sucesso', 'Item adicionado.');
    } catch (falha) {
      definirFlash('erro', (falha as Error).message || 'Erro ao adicionar item.');
    }
  }

  return (
    <EstadoDaConsulta carregando={consulta.isPending} erro={null}>
      {checklist && (
        <>
          <CabecalhoDaPagina
            titulo="Preencher checklist"
            subtitulo={<BadgeStatusDaVistoria status={checklist.status} />}
            acoes={
              <Link to={`/vistorias/${id}`} className="btn btn-outline-secondary btn-sm">
                <i className="bi bi-arrow-left me-1" />
                Concluir
              </Link>
            }
          />

          <div className="card mb-4">
            <div className="card-header fw-semibold">Adicionar item</div>
            <div className="card-body">
              <form className="row g-2 align-items-end" onSubmit={aoAdicionar}>
                <div className="col-md-3">
                  <label className="form-label small" htmlFor="novo-comodo">
                    Cômodo
                  </label>
                  <select id="novo-comodo" className="form-select form-select-sm" required value={novoItem.comodoId} onChange={(evento) => setNovoItem({ ...novoItem, comodoId: evento.target.value })}>
                    {comodos.map((comodo) => (
                      <option key={comodo.id} value={comodo.id}>
                        {nomeDoComodo(comodo.id)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label small" htmlFor="novo-item">
                    Item
                  </label>
                  <select id="novo-item" className="form-select form-select-sm" required value={novoItem.itemVistoriaId} onChange={(evento) => setNovoItem({ ...novoItem, itemVistoriaId: evento.target.value })}>
                    {catalogo.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label small" htmlFor="novo-estado">
                    Estado
                  </label>
                  <select id="novo-estado" className="form-select form-select-sm" value={novoItem.estado} onChange={(evento) => setNovoItem({ ...novoItem, estado: evento.target.value })}>
                    {ESTADOS_DO_ITEM.map((estado) => (
                      <option key={estado} value={estado}>
                        {ROTULO_DO_ESTADO[estado]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label small" htmlFor="nova-observacao">
                    Observação
                  </label>
                  <input id="nova-observacao" className="form-control form-control-sm" value={novoItem.observacao} onChange={(evento) => setNovoItem({ ...novoItem, observacao: evento.target.value })} />
                </div>
                <div className="col-md-1">
                  <button className="btn btn-primary btn-sm w-100" disabled={adicionarItem.isPending || !novoItem.comodoId || !novoItem.itemVistoriaId}>
                    <i className="bi bi-plus-lg" />
                  </button>
                </div>
                {jaAdicionado && <div className="col-12 small text-warning">Este item já foi lançado neste cômodo — edite-o abaixo.</div>}
              </form>
              {comodos.length === 0 && <p className="small text-muted mt-2 mb-0">O imóvel não tem cômodos cadastrados. Cadastre-os na tela de cômodos do imóvel.</p>}
            </div>
          </div>

          {agruparItensPorComodo(checklist).map(({ comodoId, itens }) => (
            <div key={comodoId} className="oc-checklist-room">
              <div className="oc-checklist-room-header">
                <i className="bi bi-door-open me-2" style={{ color: 'var(--oc-primary)' }} />
                {nomeDoComodo(comodoId)}
              </div>
              {itens.map((item) => (
                // key com estado/observação: recria o editor quando a API devolve valores novos
                <EditorDoItem key={`${item.id}-${item.estado}-${item.observacao}`} checklistId={id} item={item} rotulo={nomeDoItem(item.item_vistoria_id)} />
              ))}
            </div>
          ))}
        </>
      )}
    </EstadoDaConsulta>
  );
}
