import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { mfaEstaAtivo, perfilDoUsuario, PERFIS, ROTULO_DO_PERFIL, useAlternarMfaDoUsuario, useAtualizarUsuario, useUsuario } from '../../api/usuarios';
import { BadgeMfa } from '../../components/BadgePerfil';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { useFlash } from '../../components/Flash';

/** usuarios/editar.php */
export function EditarUsuario() {
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const { definirFlash } = useFlash();
  const consulta = useUsuario(id);
  const atualizarUsuario = useAtualizarUsuario(id);
  const alternarMfa = useAlternarMfaDoUsuario(id);
  const [formulario, setFormulario] = useState({ nome: '', perfil: 'vistoriador', senha: '' });

  const alvo = consulta.data;
  useEffect(() => {
    if (alvo) setFormulario({ nome: alvo.nome ?? '', perfil: perfilDoUsuario(alvo) || 'vistoriador', senha: '' });
  }, [alvo]);

  useEffect(() => {
    if (consulta.isError) definirFlash('erro', 'Usuário não encontrado.');
  }, [consulta.isError, definirFlash]);

  if (!id || consulta.isError) return <Navigate to="/usuarios" replace />;

  const mfaHabilitado = alvo ? mfaEstaAtivo(alvo) : false;

  async function aoAlternarMfa() {
    const habilitar = !mfaHabilitado;
    if (!habilitar && !window.confirm('Desabilitar MFA apagará a configuração TOTP. O usuário precisará reconfigurar. Confirmar?')) return;
    try {
      await alternarMfa.mutateAsync(habilitar);
      definirFlash(
        'sucesso',
        habilitar ? 'MFA habilitado. O usuário deverá configurar o autenticador no próximo login.' : 'MFA desabilitado e configuração TOTP apagada.',
      );
    } catch (falha) {
      definirFlash('erro', (falha as Error).message || `Erro ao ${habilitar ? 'habilitar' : 'desabilitar'} MFA.`);
    }
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    const nome = formulario.nome.trim();
    if (!nome) {
      definirFlash('erro', 'Nome é obrigatório.');
      return;
    }
    try {
      await atualizarUsuario.mutateAsync({ nome, role: formulario.perfil, ...(formulario.senha ? { senha: formulario.senha } : {}) });
      definirFlash('sucesso', 'Usuário atualizado.');
      navegar('/usuarios');
    } catch (falha) {
      definirFlash('erro', (falha as Error).message || 'Erro ao atualizar usuário.');
    }
  }

  return (
    <EstadoDaConsulta carregando={consulta.isPending} erro={null}>
      <CabecalhoDaPagina titulo={`Editar ${alvo?.nome ?? ''}`} subtitulo={alvo?.email} />

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="d-flex align-items-center gap-2 mb-4 p-3" style={{ background: '#0f172a', borderRadius: 8, border: '1px solid #1e293b' }}>
            <div className="flex-grow-1">
              <span className="small text-muted">MFA</span>
              <div className="mt-1">
                <BadgeMfa ativo={mfaHabilitado} rotuloAtivo="Habilitado" rotuloInativo="Desabilitado" />
              </div>
            </div>
            <button
              type="button"
              className={`btn btn-sm ${mfaHabilitado ? 'btn-outline-warning' : 'btn-outline-success'}`}
              onClick={aoAlternarMfa}
              disabled={alternarMfa.isPending}
            >
              <i className={`bi ${mfaHabilitado ? 'bi-shield-x' : 'bi-shield-check'} me-1`} />
              {mfaHabilitado ? 'Desabilitar MFA' : 'Habilitar MFA'}
            </button>
          </div>

          <form onSubmit={aoEnviar} className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor="nome">
                Nome
              </label>
              <input id="nome" className="form-control" required value={formulario.nome} onChange={(evento) => setFormulario({ ...formulario, nome: evento.target.value })} />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="email">
                E-mail
              </label>
              <input id="email" className="form-control" value={alvo?.email ?? ''} disabled />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="senha">
                Nova senha (opcional)
              </label>
              <input id="senha" type="password" className="form-control" minLength={6} autoComplete="new-password" value={formulario.senha} onChange={(evento) => setFormulario({ ...formulario, senha: evento.target.value })} />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="perfil">
                Perfil
              </label>
              <select id="perfil" className="form-select" value={formulario.perfil} onChange={(evento) => setFormulario({ ...formulario, perfil: evento.target.value })}>
                {PERFIS.map((perfil) => (
                  <option key={perfil} value={perfil}>
                    {ROTULO_DO_PERFIL[perfil]}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <button className="btn btn-primary" disabled={atualizarUsuario.isPending}>
                Salvar
              </button>
              <Link to="/usuarios" className="btn btn-outline-secondary ms-2">
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </div>
    </EstadoDaConsulta>
  );
}
