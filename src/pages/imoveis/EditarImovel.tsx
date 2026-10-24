import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAtualizarImovel, useEnderecoDoImovel, useImovel } from '../../api/imoveis';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { useFlash } from '../../components/Flash';
import type { Endereco } from '../../utils/endereco';
import { FormularioDeImovel, type DadosDoFormularioDeImovel } from './FormularioDeImovel';

/** imoveis/editar.php */
export function EditarImovel() {
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const { definirFlash } = useFlash();
  const consultaDoImovel = useImovel(id);
  const consultaDoEndereco = useEnderecoDoImovel(id);
  const atualizarImovel = useAtualizarImovel(id);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (consultaDoImovel.isError) definirFlash('erro', 'Imóvel não encontrado.');
  }, [consultaDoImovel.isError, definirFlash]);

  if (!id || consultaDoImovel.isError) return <Navigate to="/imoveis" replace />;

  const imovel = consultaDoImovel.data;
  // sem /endereco, usa o endereço embutido no imóvel (pode vir como objeto ou texto)
  const enderecoEmbutido = imovel?.endereco;
  const endereco: Endereco | null =
    consultaDoEndereco.data ?? (typeof enderecoEmbutido === 'string' ? { rua: enderecoEmbutido } : (enderecoEmbutido ?? null));

  async function aoEnviar(dados: DadosDoFormularioDeImovel) {
    setErro('');
    try {
      await atualizarImovel.mutateAsync(dados);
      definirFlash('sucesso', 'Imóvel atualizado.');
      navegar(`/imoveis/${id}`);
    } catch (falha) {
      setErro((falha as Error).message || 'Erro ao atualizar.');
    }
  }

  const botaoSalvar = (
    <button type="submit" className="btn btn-primary">
      <i className="bi bi-check-lg me-1" />
      {atualizarImovel.isPending ? 'Salvando…' : 'Salvar Alterações'}
    </button>
  );

  return (
    <>
      <CabecalhoDaPagina
        titulo="Editar Imóvel"
        subtitulo="Atualize os dados do imóvel selecionado"
        acoes={
          <Link to={`/imoveis/${id}`} className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-arrow-left me-1" />
            Voltar
          </Link>
        }
      />

      {erro && <div className="alert alert-danger mb-3">{erro}</div>}

      <div className="card mb-4">
        <div className="card-body">
          <EstadoDaConsulta carregando={consultaDoImovel.isPending || consultaDoEndereco.isPending} erro={consultaDoEndereco.error}>
            {imovel && (
              <FormularioDeImovel
                modo="editar"
                imovel={imovel}
                endereco={endereco}
                enviando={atualizarImovel.isPending}
                aoEnviar={aoEnviar}
                rodape={
                  <div className="mt-4 pt-3 border-top d-flex gap-2">
                    {botaoSalvar}
                    <Link to={`/imoveis/${id}`} className="btn btn-outline-secondary">
                      Cancelar
                    </Link>
                  </div>
                }
              />
            )}
          </EstadoDaConsulta>
        </div>
      </div>
    </>
  );
}
