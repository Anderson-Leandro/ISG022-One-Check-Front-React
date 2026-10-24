import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useNomesParaContratos } from '../../api/contratos';
import { ROTULO_DA_PRIORIDADE, useContratosAtivos, useRegistrarProblema } from '../../api/problemas';
import { useAuth } from '../../auth/AuthContext';
import { podeCriar } from '../../auth/permissoes';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { useFlash } from '../../components/Flash';
import { formatarData } from '../../utils/formatar';

/** problemas/novo.php — aceita ?contrato_id= vindo dos detalhes do contrato. */
export function NovoProblema() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const [parametros] = useSearchParams();
  const { definirFlash } = useFlash();
  const consultaDosContratos = useContratosAtivos();
  const { nomeDoImovel } = useNomesParaContratos();
  const registrarProblema = useRegistrarProblema();
  const [formulario, setFormulario] = useState({ contratoId: parametros.get('contrato_id') ?? '', titulo: '', prioridade: 'normal', descricao: '' });
  const [erro, setErro] = useState('');

  if (!podeCriar(usuario, 'problemas')) return <Navigate to="/problemas" replace />;

  const contratos = consultaDosContratos.data ?? [];

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    const titulo = formulario.titulo.trim();
    if (!formulario.contratoId || !titulo) {
      setErro('Contrato e título são obrigatórios.');
      return;
    }
    setErro('');
    try {
      const criado = await registrarProblema.mutateAsync({
        contratoId: formulario.contratoId,
        titulo,
        descricao: formulario.descricao.trim() || null,
        prioridade: formulario.prioridade,
      });
      definirFlash('sucesso', 'Problema registrado.');
      navegar(criado?.id ? `/problemas/${criado.id}` : '/problemas');
    } catch (falha) {
      setErro((falha as Error).message || 'Erro ao registrar problema.');
    }
  }

  return (
    <>
      <CabecalhoDaPagina
        titulo="Registrar problema"
        acoes={
          <Link to="/problemas" className="btn btn-outline-secondary btn-sm">
            Voltar
          </Link>
        }
      />

      {erro && <div className="alert alert-danger">{erro}</div>}

      <div className="card">
        <div className="card-body">
          <EstadoDaConsulta carregando={consultaDosContratos.isPending} erro={consultaDosContratos.error}>
            {contratos.length === 0 ? (
              <div className="alert alert-warning mb-0">Nenhum contrato ativo. Crie um contrato antes de registrar problemas.</div>
            ) : (
              <form onSubmit={aoEnviar} className="row g-3" autoComplete="off">
                <div className="col-12">
                  <label className="form-label" htmlFor="contrato">
                    Contrato <span className="text-danger">*</span>
                  </label>
                  <select id="contrato" className="form-select" required value={formulario.contratoId} onChange={(evento) => setFormulario({ ...formulario, contratoId: evento.target.value })}>
                    <option value="">Selecione...</option>
                    {contratos.map((contrato) => (
                      <option key={contrato.id} value={contrato.id}>
                        {nomeDoImovel(contrato.imovel_id)} · início {formatarData(contrato.data_inicio)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="titulo">
                    Título <span className="text-danger">*</span>
                  </label>
                  <input id="titulo" className="form-control" required placeholder="Ex: Infiltração no banheiro" value={formulario.titulo} onChange={(evento) => setFormulario({ ...formulario, titulo: evento.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label" htmlFor="prioridade">
                    Prioridade
                  </label>
                  <select id="prioridade" className="form-select" value={formulario.prioridade} onChange={(evento) => setFormulario({ ...formulario, prioridade: evento.target.value })}>
                    {Object.entries(ROTULO_DA_PRIORIDADE).map(([valor, rotulo]) => (
                      <option key={valor} value={valor}>
                        {rotulo}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="descricao">
                    Descrição
                  </label>
                  <textarea id="descricao" className="form-control" rows={4} value={formulario.descricao} onChange={(evento) => setFormulario({ ...formulario, descricao: evento.target.value })} />
                </div>
                <div className="col-12">
                  <button className="btn btn-primary" disabled={registrarProblema.isPending}>
                    <i className="bi bi-check-lg me-1" />
                    {registrarProblema.isPending ? 'Salvando…' : 'Salvar'}
                  </button>
                </div>
              </form>
            )}
          </EstadoDaConsulta>
        </div>
      </div>
    </>
  );
}
