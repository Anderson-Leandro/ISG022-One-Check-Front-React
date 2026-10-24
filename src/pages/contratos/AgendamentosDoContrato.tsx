import { useState, type FormEvent } from 'react';
import {
  ROTULO_DO_TIPO_DE_AGENDAMENTO,
  useAgendamentosDoContrato,
  useAtualizarAgendamento,
  useCriarAgendamento,
  useRemoverAgendamento,
  type Agendamento,
} from '../../api/contratos';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { useFlash } from '../../components/Flash';
import { formatarDataHora } from '../../utils/formatar';

const FORMULARIO_VAZIO = { tipo: 'inicial', dataAgendada: '', observacao: '' };

/** "2026-05-28T09:00:00" → "2026-05-28T09:00" (valor aceito pelo input datetime-local). */
function paraCampoDataHora(valor: string): string {
  return valor ? valor.replace(' ', 'T').slice(0, 16) : '';
}

/** Agendamentos de vistoria do contrato — não existia no PHP (lá era só mock no dashboard). */
export function AgendamentosDoContrato({ contratoId, podeEditar }: { contratoId: string; podeEditar: boolean }) {
  const { definirFlash } = useFlash();
  const consulta = useAgendamentosDoContrato(contratoId);
  const criarAgendamento = useCriarAgendamento(contratoId);
  const atualizarAgendamento = useAtualizarAgendamento();
  const removerAgendamento = useRemoverAgendamento();
  const [formulario, setFormulario] = useState(FORMULARIO_VAZIO);
  const [idEmEdicao, setIdEmEdicao] = useState<string | null>(null);
  const salvando = criarAgendamento.isPending || atualizarAgendamento.isPending;

  const agendamentos = [...(consulta.data ?? [])].sort((primeiro, segundo) => primeiro.data_agendada.localeCompare(segundo.data_agendada));

  function iniciarEdicao(agendamento: Agendamento) {
    setIdEmEdicao(agendamento.id);
    setFormulario({ tipo: agendamento.tipo, dataAgendada: paraCampoDataHora(agendamento.data_agendada), observacao: agendamento.observacao ?? '' });
  }

  function cancelarEdicao() {
    setIdEmEdicao(null);
    setFormulario(FORMULARIO_VAZIO);
  }

  async function aoSalvar(evento: FormEvent) {
    evento.preventDefault();
    if (!formulario.dataAgendada) {
      definirFlash('erro', 'Informe a data e hora do agendamento.');
      return;
    }
    const dados = { tipo: formulario.tipo, data_agendada: `${formulario.dataAgendada}:00`, observacao: formulario.observacao.trim() || null };
    try {
      if (idEmEdicao) await atualizarAgendamento.mutateAsync({ id: idEmEdicao, dados });
      else await criarAgendamento.mutateAsync(dados);
      definirFlash('sucesso', idEmEdicao ? 'Agendamento atualizado.' : 'Agendamento criado.');
      cancelarEdicao();
    } catch (falha) {
      definirFlash('erro', (falha as Error).message || 'Erro ao salvar agendamento.');
    }
  }

  async function aoRemover(id: string) {
    if (!window.confirm('Remover este agendamento?')) return;
    try {
      await removerAgendamento.mutateAsync(id);
      if (idEmEdicao === id) cancelarEdicao();
      definirFlash('sucesso', 'Agendamento removido.');
    } catch (falha) {
      definirFlash('erro', (falha as Error).message || 'Erro ao remover agendamento.');
    }
  }

  return (
    <div className="card border-0 shadow-sm mb-3">
      <div className="card-header fw-semibold">Agendamentos</div>
      <EstadoDaConsulta carregando={consulta.isPending} erro={consulta.error}>
        <ul className="list-group list-group-flush">
          {agendamentos.length === 0 ? (
            <li className="list-group-item text-muted small">Nenhum agendamento.</li>
          ) : (
            agendamentos.map((agendamento) => (
              <li key={agendamento.id} className="list-group-item d-flex justify-content-between align-items-center small">
                <div>
                  <strong>{formatarDataHora(agendamento.data_agendada)}</strong> · {ROTULO_DO_TIPO_DE_AGENDAMENTO[agendamento.tipo] ?? agendamento.tipo}
                  {agendamento.observacao && <div className="text-muted">{agendamento.observacao}</div>}
                </div>
                {podeEditar && (
                  <div className="d-flex gap-1">
                    <button type="button" className="btn btn-outline-secondary btn-sm py-0 px-2" title="Editar" onClick={() => iniciarEdicao(agendamento)}>
                      <i className="bi bi-pencil" />
                    </button>
                    <button type="button" className="btn btn-outline-danger btn-sm py-0 px-2" title="Remover" onClick={() => aoRemover(agendamento.id)} disabled={removerAgendamento.isPending}>
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                )}
              </li>
            ))
          )}
        </ul>
      </EstadoDaConsulta>

      {podeEditar && (
        <div className="card-body border-top">
          <form className="row g-2 align-items-end" onSubmit={aoSalvar}>
            <div className="col-md-4">
              <label className="form-label small" htmlFor="agendamento-tipo">
                Tipo
              </label>
              <select id="agendamento-tipo" className="form-select form-select-sm" value={formulario.tipo} onChange={(evento) => setFormulario({ ...formulario, tipo: evento.target.value })}>
                {Object.entries(ROTULO_DO_TIPO_DE_AGENDAMENTO).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small" htmlFor="agendamento-data">
                Data e hora
              </label>
              <input id="agendamento-data" type="datetime-local" className="form-control form-control-sm" required value={formulario.dataAgendada} onChange={(evento) => setFormulario({ ...formulario, dataAgendada: evento.target.value })} />
            </div>
            <div className="col-md-4">
              <label className="form-label small" htmlFor="agendamento-observacao">
                Observação
              </label>
              <input id="agendamento-observacao" className="form-control form-control-sm" value={formulario.observacao} onChange={(evento) => setFormulario({ ...formulario, observacao: evento.target.value })} />
            </div>
            <div className="col-12 d-flex gap-2">
              <button className="btn btn-primary btn-sm" disabled={salvando}>
                {idEmEdicao ? 'Salvar agendamento' : 'Agendar'}
              </button>
              {idEmEdicao && (
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={cancelarEdicao}>
                  Cancelar edição
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
