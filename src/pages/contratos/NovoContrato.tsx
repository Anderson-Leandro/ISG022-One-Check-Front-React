import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useCriarContrato, useImoveisDisponiveis, useLocatarios } from '../../api/contratos';
import { useAuth } from '../../auth/AuthContext';
import { podeCriar } from '../../auth/permissoes';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { useFlash } from '../../components/Flash';
import { rotuloDoTipoDeImovel } from '../../config/imoveis';

const Obrigatorio = () => <span style={{ color: '#f87171' }}>*</span>;

/** contratos/novo.php — aceita ?imovel_id= para vir pré-selecionado. */
export function NovoContrato() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const [parametros] = useSearchParams();
  const { definirFlash } = useFlash();
  const { data: imoveis = [], isPending: carregandoImoveis } = useImoveisDisponiveis();
  const { data: locatarios = [], isPending: carregandoLocatarios } = useLocatarios();
  const criarContrato = useCriarContrato();
  const [formulario, setFormulario] = useState({
    imovelId: parametros.get('imovel_id') ?? '',
    locatarioId: '',
    dataInicio: '',
    dataFim: '',
    valorMensal: '',
  });
  const [erro, setErro] = useState('');

  if (!podeCriar(usuario, 'contratos')) return <Navigate to="/contratos" replace />;

  function alterarCampo(campo: keyof typeof formulario, valor: string) {
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    const { imovelId, locatarioId, dataInicio, dataFim, valorMensal } = formulario;
    if (!imovelId || !locatarioId || !dataInicio || !dataFim) {
      setErro('Imóvel, locatário, data início e data fim são obrigatórios.');
      return;
    }
    if (dataFim < dataInicio) {
      setErro('A data fim deve ser posterior à data início.');
      return;
    }

    setErro('');
    try {
      const criado = await criarContrato.mutateAsync({
        imovel_id: imovelId,
        locatario_id: locatarioId,
        data_inicio: dataInicio,
        data_fim: dataFim,
        valor_mensal: valorMensal !== '' ? Number(valorMensal) : null,
      });
      definirFlash('sucesso', 'Contrato criado.');
      navegar(`/contratos/${criado.id}`);
    } catch (falha) {
      setErro((falha as Error).message || 'Erro ao criar contrato.');
    }
  }

  return (
    <>
      <CabecalhoDaPagina
        titulo="Novo contrato"
        subtitulo="Vincule um imóvel a um locatário"
        acoes={
          <Link to="/contratos" className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-arrow-left me-1" />
            Voltar
          </Link>
        }
      />

      {erro && (
        <div className="alert alert-danger mb-3">
          <i className="bi bi-exclamation-triangle me-2" />
          {erro}
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <form onSubmit={aoEnviar} autoComplete="off">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label" htmlFor="imovel">
                  Imóvel <Obrigatorio />
                </label>
                <select id="imovel" className="form-select" required value={formulario.imovelId} onChange={(evento) => alterarCampo('imovelId', evento.target.value)}>
                  <option value="">{carregandoImoveis ? 'Carregando…' : 'Selecione um imóvel...'}</option>
                  {imoveis.map((imovel) => (
                    <option key={imovel.id} value={imovel.id}>
                      {imovel.titulo || rotuloDoTipoDeImovel(imovel.tipo)} — {imovel.tamanho ?? ''}
                    </option>
                  ))}
                  {!carregandoImoveis && imoveis.length === 0 && <option disabled>Nenhum imóvel disponível</option>}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="locatario">
                  Locatário <Obrigatorio />
                </label>
                <select id="locatario" className="form-select" required value={formulario.locatarioId} onChange={(evento) => alterarCampo('locatarioId', evento.target.value)}>
                  <option value="">{carregandoLocatarios ? 'Carregando…' : 'Selecione um locatário...'}</option>
                  {locatarios.map((locatario) => (
                    <option key={locatario.id} value={locatario.id}>
                      {locatario.nome} — {locatario.email}
                    </option>
                  ))}
                  {!carregandoLocatarios && locatarios.length === 0 && <option disabled>Nenhum locatário cadastrado</option>}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="data-inicio">
                  Data início <Obrigatorio />
                </label>
                <input id="data-inicio" type="date" className="form-control" required value={formulario.dataInicio} onChange={(evento) => alterarCampo('dataInicio', evento.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="data-fim">
                  Data fim <Obrigatorio />
                </label>
                <input id="data-fim" type="date" className="form-control" required min={formulario.dataInicio || undefined} value={formulario.dataFim} onChange={(evento) => alterarCampo('dataFim', evento.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="valor">
                  Valor mensal (R$)
                </label>
                <div className="input-group">
                  <span className="input-group-text">R$</span>
                  <input id="valor" type="number" step="0.01" min="0" className="form-control" placeholder="1500.00" value={formulario.valorMensal} onChange={(evento) => alterarCampo('valorMensal', evento.target.value)} />
                </div>
              </div>
            </div>
            <div className="mt-4 d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={criarContrato.isPending}>
                <i className="bi bi-check-lg me-1" />
                {criarContrato.isPending ? 'Criando…' : 'Criar contrato'}
              </button>
              <Link to="/contratos" className="btn btn-outline-secondary">
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
