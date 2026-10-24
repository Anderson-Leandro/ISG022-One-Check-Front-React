import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useCriarImovel } from '../../api/imoveis';
import { useAuth } from '../../auth/AuthContext';
import { podeCriar } from '../../auth/permissoes';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { useFlash } from '../../components/Flash';
import { FormularioDeImovel, type DadosDoFormularioDeImovel } from './FormularioDeImovel';

/** imoveis/novo.php */
export function NovoImovel() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const { definirFlash } = useFlash();
  const criarImovel = useCriarImovel();
  const [erro, setErro] = useState('');
  const temPermissao = podeCriar(usuario, 'imoveis');

  if (!temPermissao) return <Navigate to="/imoveis" replace />;

  async function aoEnviar(dados: DadosDoFormularioDeImovel) {
    setErro('');
    try {
      const criado = await criarImovel.mutateAsync(dados);
      definirFlash('sucesso', 'Imóvel cadastrado.');
      navegar(`/imoveis/${criado.id}`);
    } catch (falha) {
      setErro((falha as Error).message || 'Erro ao cadastrar imóvel.');
    }
  }

  return (
    <>
      <CabecalhoDaPagina
        titulo="Novo imóvel"
        subtitulo="Preencha os dados para cadastrar um novo imóvel"
        acoes={
          <Link to="/imoveis" className="btn btn-outline-secondary btn-sm">
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
          <FormularioDeImovel
            modo="novo"
            enviando={criarImovel.isPending}
            aoEnviar={aoEnviar}
            rodape={
              <div className="mt-4 d-flex gap-2">
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-check-lg me-1" />
                  {criarImovel.isPending ? 'Salvando…' : 'Salvar imóvel'}
                </button>
                <Link to="/imoveis" className="btn btn-outline-secondary">
                  Cancelar
                </Link>
              </div>
            }
          />
        </div>
      </div>
    </>
  );
}
