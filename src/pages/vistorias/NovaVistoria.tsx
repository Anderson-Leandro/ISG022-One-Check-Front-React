import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useNomesParaContratos } from '../../api/contratos';
import { useContratosAtivos } from '../../api/problemas';
import { ROTULO_DO_TIPO_DE_VISTORIA, useCriarVistoria, useVistoriadores } from '../../api/vistorias';
import { useAuth } from '../../auth/AuthContext';
import { podeCriar } from '../../auth/permissoes';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { useFlash } from '../../components/Flash';
import { formatarData } from '../../utils/formatar';

function hojeNoFormatoIso(): string {
  const agora = new Date();
  return new Date(agora.getTime() - agora.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/**
 * vistorias/nova.php — aceita ?contrato_id= ou ?imovel_id= (usa o contrato ativo do imóvel).
 * A regra "um contrato só tem uma vistoria inicial" é validada pela própria API.
 */
export function NovaVistoria() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const [parametros] = useSearchParams();
  const { definirFlash } = useFlash();
  const consultaDosContratos = useContratosAtivos();
  const { data: vistoriadores = [] } = useVistoriadores();
  const { nomeDoImovel } = useNomesParaContratos();
  const criarVistoria = useCriarVistoria();
  const [formulario, setFormulario] = useState({
    contratoId: parametros.get('contrato_id') ?? '',
    vistoriadorId: '',
    tipo: 'inicial',
    data: hojeNoFormatoIso(),
  });
  const [erro, setErro] = useState('');
  const contratos = useMemo(() => consultaDosContratos.data ?? [], [consultaDosContratos.data]);

  const imovelPedido = parametros.get('imovel_id');
  useEffect(() => {
    if (!imovelPedido || formulario.contratoId) return;
    const contratoDoImovel = contratos.find((contrato) => contrato.imovel_id === imovelPedido);
    if (contratoDoImovel) setFormulario((anterior) => ({ ...anterior, contratoId: contratoDoImovel.id }));
  }, [imovelPedido, contratos, formulario.contratoId]);

  if (!podeCriar(usuario, 'vistorias')) return <Navigate to="/vistorias" replace />;

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    if (!formulario.contratoId || !formulario.vistoriadorId) {
      setErro('Selecione o contrato e o vistoriador.');
      return;
    }
    setErro('');
    try {
      const criada = await criarVistoria.mutateAsync({
        contratoId: formulario.contratoId,
        dados: { tipo: formulario.tipo, data_vistoria: formulario.data || null, vistoriador_id: formulario.vistoriadorId },
      });
      definirFlash('sucesso', 'Vistoria criada com sucesso.');
      navegar(`/vistorias/${criada.id}`);
    } catch (falha) {
      setErro((falha as Error).message || 'Erro desconhecido ao criar vistoria.');
    }
  }


  return (
    <>
      <CabecalhoDaPagina
        titulo="Nova vistoria"
        subtitulo="Crie um checklist de vistoria para um contrato"
        acoes={
          <Link to="/vistorias" className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-arrow-left me-1" />
            Voltar
          </Link>
        }
      />

      {erro && (
        <div className="alert alert-danger mb-3">
          <i className="bi bi-exclamation-octagon me-2" />
          {erro}
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <EstadoDaConsulta carregando={consultaDosContratos.isPending} erro={consultaDosContratos.error}>
            {contratos.length === 0 ? (
              <div className="alert alert-warning mb-0">
                <i className="bi bi-exclamation-triangle me-2" />
                Nenhum contrato ativo encontrado. <Link to="/contratos/novo">Crie um contrato primeiro →</Link>
              </div>
            ) : (
              <form onSubmit={aoEnviar} autoComplete="off">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="contrato">
                      Contrato <span className="text-danger">*</span>
                    </label>
                    <select id="contrato" className="form-select" required value={formulario.contratoId} onChange={(evento) => setFormulario({ ...formulario, contratoId: evento.target.value })}>
                      <option value="">Selecione um contrato...</option>
                      {contratos.map((contrato) => (
                        <option key={contrato.id} value={contrato.id}>
                          {nomeDoImovel(contrato.imovel_id)} · Início: {formatarData(contrato.data_inicio)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="vistoriador">
                      Vistoriador responsável <span className="text-danger">*</span>
                    </label>
                    <select id="vistoriador" className="form-select" required value={formulario.vistoriadorId} onChange={(evento) => setFormulario({ ...formulario, vistoriadorId: evento.target.value })}>
                      <option value="">Selecione um vistoriador...</option>
                      {/* o responsável precisa ser um vistoriador ativo: a listagem já traz só eles */}
                      {vistoriadores.map((vistoriador) => (
                        <option key={vistoriador.id} value={vistoriador.id}>
                          {vistoriador.nome || 'Sem nome'} ({vistoriador.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" htmlFor="tipo">
                      Tipo de vistoria <span className="text-danger">*</span>
                    </label>
                    <select id="tipo" className="form-select" required value={formulario.tipo} onChange={(evento) => setFormulario({ ...formulario, tipo: evento.target.value })}>
                      {Object.entries(ROTULO_DO_TIPO_DE_VISTORIA).map(([valor, rotulo]) => (
                        <option key={valor} value={valor}>
                          {rotulo}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" htmlFor="data">
                      Data da vistoria <span className="text-danger">*</span>
                    </label>
                    <input id="data" type="date" className="form-control" required value={formulario.data} onChange={(evento) => setFormulario({ ...formulario, data: evento.target.value })} />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-top d-flex gap-2">
                  <button type="submit" className="btn btn-primary" disabled={criarVistoria.isPending}>
                    <i className="bi bi-check-lg me-1" />
                    {criarVistoria.isPending ? 'Criando…' : 'Criar vistoria'}
                  </button>
                  <Link to="/vistorias" className="btn btn-outline-secondary">
                    Cancelar
                  </Link>
                </div>
              </form>
            )}
          </EstadoDaConsulta>
        </div>
      </div>
    </>
  );
}
