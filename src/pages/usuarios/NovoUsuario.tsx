import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ErroApi, type ErrosPorCampo } from '../../api/client';
import { ROTULO_DO_PERFIL, useCriarUsuario } from '../../api/usuarios';
import { useAuth } from '../../auth/AuthContext';
import { perfisAtribuiveisPor } from '../../auth/permissoes';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { CampoDeSenhaNova } from '../../components/CampoDeSenhaNova';
import { useFlash } from '../../components/Flash';
import { formatarCpf, validarCpf } from '../../utils/cpf';
import { validarSenhaNova } from '../../utils/senha';

const Obrigatorio = () => <span style={{ color: '#f87171' }}>*</span>;

/** usuarios/novo.php */
export function NovoUsuario() {
  const navegar = useNavigate();
  const { definirFlash } = useFlash();
  const criarUsuario = useCriarUsuario();
  const [formulario, setFormulario] = useState({ nome: '', email: '', senha: '', role: '', cpf: '' });
  const [erro, setErro] = useState('');
  const [errosPorCampo, setErrosPorCampo] = useState<ErrosPorCampo>({});
  const { usuario } = useAuth();
  const perfisDisponiveis = perfisAtribuiveisPor(usuario);

  function alterarCampo(campo: keyof typeof formulario, valor: string) {
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    const nome = formulario.nome.trim();
    const email = formulario.email.trim();
    const cpf = formulario.cpf.trim();

    if (!nome || !email || !formulario.senha || !formulario.role) {
      setErrosPorCampo({});
      setErro('Nome, e-mail, senha e perfil são obrigatórios.');
      return;
    }
    const errosLocais: ErrosPorCampo = {};
    const senhaInvalida = validarSenhaNova(formulario.senha);
    if (senhaInvalida) errosLocais.senha = senhaInvalida;
    if (cpf && !validarCpf(cpf)) errosLocais.cpf = 'CPF inválido.';
    setErrosPorCampo(errosLocais);
    setErro('');
    if (Object.keys(errosLocais).length > 0) return;

    try {
      await criarUsuario.mutateAsync({ nome, email, senha: formulario.senha, role: formulario.role, ...(cpf ? { cpf } : {}) });
      definirFlash('sucesso', 'Usuário cadastrado.');
      navegar('/usuarios');
    } catch (falha) {
      const errosDaApi = falha instanceof ErroApi ? falha.erros : {};
      setErrosPorCampo(errosDaApi);
      // a mensagem geral repete a do primeiro campo; some só quando todos os erros já aparecem nos campos desta tela
      const camposDaTela = ['nome', 'email', 'senha', 'role', 'cpf'];
      const camposComErro = Object.keys(errosDaApi);
      const tudoNosCampos = camposComErro.length > 0 && camposComErro.every((campo) => camposDaTela.includes(campo));
      setErro(tudoNosCampos ? '' : (falha as Error).message || 'Erro ao cadastrar usuário.');
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
          <form onSubmit={aoEnviar} autoComplete="off" noValidate>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label" htmlFor="nome">
                  Nome completo <Obrigatorio />
                </label>
                <input id="nome" type="text" className={`form-control ${errosPorCampo.nome ? 'is-invalid' : ''}`} required placeholder="João da Silva" value={formulario.nome} onChange={(evento) => alterarCampo('nome', evento.target.value)} />
                {errosPorCampo.nome && <div className="invalid-feedback">{errosPorCampo.nome}</div>}
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="email">
                  E-mail <Obrigatorio />
                </label>
                <input id="email" type="email" className={`form-control ${errosPorCampo.email ? 'is-invalid' : ''}`} required placeholder="joao@email.com" value={formulario.email} onChange={(evento) => alterarCampo('email', evento.target.value)} />
                {errosPorCampo.email && <div className="invalid-feedback">{errosPorCampo.email}</div>}
              </div>
              <div className="col-md-4">
                <CampoDeSenhaNova
                  id="senha"
                  rotulo={
                    <>
                      Senha <Obrigatorio />
                    </>
                  }
                  obrigatorio
                  valor={formulario.senha}
                  aoMudar={(senha) => alterarCampo('senha', senha)}
                  erro={errosPorCampo.senha}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="perfil">
                  Perfil <Obrigatorio />
                </label>
                <select id="perfil" className={`form-select ${errosPorCampo.role ? 'is-invalid' : ''}`} required value={formulario.role} onChange={(evento) => alterarCampo('role', evento.target.value)}>
                  <option value="">Selecione...</option>
                  {perfisDisponiveis.map((perfil) => (
                    <option key={perfil} value={perfil}>
                      {ROTULO_DO_PERFIL[perfil]}
                    </option>
                  ))}
                </select>
                {errosPorCampo.role && <div className="invalid-feedback">{errosPorCampo.role}</div>}
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="cpf">
                  CPF
                </label>
                <input id="cpf" type="text" inputMode="numeric" className={`form-control ${errosPorCampo.cpf ? 'is-invalid' : ''}`} placeholder="000.000.000-00" maxLength={14} value={formulario.cpf} onChange={(evento) => alterarCampo('cpf', formatarCpf(evento.target.value))} />
                {errosPorCampo.cpf && <div className="invalid-feedback">{errosPorCampo.cpf}</div>}
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
