import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PERFIS, ROTULO_DO_PERFIL, useCriarUsuario } from '../../api/usuarios';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { useFlash } from '../../components/Flash';
import { apenasDigitos } from '../../utils/formatar';

const Obrigatorio = () => <span style={{ color: '#f87171' }}>*</span>;

/** usuarios/novo.php */
export function NovoUsuario() {
  const navegar = useNavigate();
  const { definirFlash } = useFlash();
  const criarUsuario = useCriarUsuario();
  const [formulario, setFormulario] = useState({ nome: '', email: '', senha: '', role: '', cpf: '' });
  const [erro, setErro] = useState('');

  function alterarCampo(campo: keyof typeof formulario, valor: string) {
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    const nome = formulario.nome.trim();
    const email = formulario.email.trim();
    const cpf = apenasDigitos(formulario.cpf);

    if (!nome || !email || !formulario.senha || !formulario.role) {
      setErro('Nome, e-mail, senha e perfil são obrigatórios.');
      return;
    }
    if (formulario.senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setErro('');
    try {
      await criarUsuario.mutateAsync({ nome, email, senha: formulario.senha, role: formulario.role, ...(cpf ? { cpf } : {}) });
      definirFlash('sucesso', 'Usuário cadastrado.');
      navegar('/usuarios');
    } catch (falha) {
      setErro((falha as Error).message || 'Erro ao cadastrar usuário.');
    }
  }

  return (
    <>
      <CabecalhoDaPagina
        titulo="Novo usuário"
        subtitulo="Cadastre um novo acesso ao sistema"
        acoes={
          <Link to="/usuarios" className="btn btn-outline-secondary btn-sm">
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
                <label className="form-label" htmlFor="nome">
                  Nome completo <Obrigatorio />
                </label>
                <input id="nome" type="text" className="form-control" required placeholder="João da Silva" value={formulario.nome} onChange={(evento) => alterarCampo('nome', evento.target.value)} />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="email">
                  E-mail <Obrigatorio />
                </label>
                <input id="email" type="email" className="form-control" required placeholder="joao@email.com" value={formulario.email} onChange={(evento) => alterarCampo('email', evento.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="senha">
                  Senha <Obrigatorio />
                </label>
                <input id="senha" type="password" className="form-control" required minLength={6} autoComplete="new-password" placeholder="Mínimo 6 caracteres" value={formulario.senha} onChange={(evento) => alterarCampo('senha', evento.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="perfil">
                  Perfil <Obrigatorio />
                </label>
                <select id="perfil" className="form-select" required value={formulario.role} onChange={(evento) => alterarCampo('role', evento.target.value)}>
                  <option value="">Selecione...</option>
                  {PERFIS.map((perfil) => (
                    <option key={perfil} value={perfil}>
                      {ROTULO_DO_PERFIL[perfil]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="cpf">
                  CPF
                </label>
                <input id="cpf" type="text" className="form-control" placeholder="000.000.000-00" maxLength={14} value={formulario.cpf} onChange={(evento) => alterarCampo('cpf', evento.target.value)} />
              </div>
            </div>
            <div className="mt-4 d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={criarUsuario.isPending}>
                <i className="bi bi-check-lg me-1" />
                Cadastrar usuário
              </button>
              <Link to="/usuarios" className="btn btn-outline-secondary">
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
