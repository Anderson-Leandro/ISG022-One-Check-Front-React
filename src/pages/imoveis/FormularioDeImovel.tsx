import { useState, type FormEvent, type ReactNode } from 'react';
import type { components } from '../../api/schema';
import { codigoCurto, imovelTemGaragem, type Imovel } from '../../api/imoveis';
import { ROTULO_DO_STATUS_DO_IMOVEL, STATUS_EDITAVEIS_DO_IMOVEL, TIPOS_DE_IMOVEL } from '../../config/imoveis';
import { SeletorDeLocalizacao } from '../../components/mapa/SeletorDeLocalizacao';
import { buscarCep, montarPayloadDeEndereco, ruaDoEndereco, type CamposDeEndereco, type Endereco } from '../../utils/endereco';

export interface DadosDoFormularioDeImovel {
  imovel: components['schemas']['ImovelCreate'];
  endereco: components['schemas']['EnderecoCreate'] | null;
}

interface Propriedades {
  modo: 'novo' | 'editar';
  imovel?: Imovel;
  endereco?: Endereco | null;
  enviando: boolean;
  aoEnviar(dados: DadosDoFormularioDeImovel): void;
  /** Botões do rodapé (Salvar/Cancelar), que mudam entre novo e editar. */
  rodape: ReactNode;
  topo?: ReactNode;
}

const estiloDoTituloDaSecao = { color: '#6b7fa3', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '.06em' };

function camposIniciais(imovel?: Imovel, endereco?: Endereco | null) {
  return {
    codigo: imovel?.codigo ?? '',
    titulo: imovel?.titulo ?? '',
    status: imovel?.status ?? 'disponivel',
    tipo: imovel?.tipo ?? '',
    tamanho: String(imovel?.tamanho ?? '').replace(/[^0-9.]/g, ''),
    temGaragem: imovel ? imovelTemGaragem(imovel) : false,
    vagas: String(imovel?.garagem_vagas || 1),
    observacoes: imovel?.observacoes ?? '',
    endereco: {
      cep: endereco?.cep ?? '',
      rua: ruaDoEndereco(endereco),
      numero: endereco?.numero ?? '',
      complemento: endereco?.complemento ?? '',
      bairro: endereco?.bairro ?? '',
      cidade: endereco?.cidade ?? '',
      estado: endereco?.estado ?? '',
      latitude: endereco?.latitude != null ? String(endereco.latitude) : '',
      longitude: endereco?.longitude != null ? String(endereco.longitude) : '',
    } satisfies CamposDeEndereco,
  };
}

/** imoveis/_form_campos.php — compartilhado entre novo e editar. */
export function FormularioDeImovel({ modo, imovel, endereco, enviando, aoEnviar, rodape, topo }: Propriedades) {
  const [campos, setCampos] = useState(() => camposIniciais(imovel, endereco));
  const [erro, setErro] = useState('');
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [buscandoLocalizacao, setBuscandoLocalizacao] = useState(false);

  function alterar<Campo extends keyof typeof campos>(campo: Campo, valor: (typeof campos)[Campo]) {
    setCampos((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function alterarEndereco(alteracoes: Partial<CamposDeEndereco>) {
    setCampos((anterior) => ({ ...anterior, endereco: { ...anterior.endereco, ...alteracoes } }));
  }

  function definirCoordenadas(latitude: number, longitude: number) {
    alterarEndereco({ latitude: latitude.toFixed(6), longitude: longitude.toFixed(6) });
  }

  async function aoBuscarCep() {
    setBuscandoCep(true);
    try {
      const resultado = await buscarCep(campos.endereco.cep);
      if (!resultado) {
        window.alert('CEP inválido ou não encontrado.');
        return;
      }
      alterarEndereco({ rua: resultado.logradouro, bairro: resultado.bairro, cidade: resultado.cidade, estado: resultado.estado });
    } catch {
      window.alert('Erro ao buscar CEP.');
    } finally {
      setBuscandoCep(false);
    }
  }

  function aoUsarMinhaLocalizacao() {
    setBuscandoLocalizacao(true);
    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        definirCoordenadas(posicao.coords.latitude, posicao.coords.longitude);
        setBuscandoLocalizacao(false);
      },
      () => {
        window.alert('Não foi possível obter sua localização.');
        setBuscandoLocalizacao(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function aoSubmeter(evento: FormEvent) {
    evento.preventDefault();
    const titulo = campos.titulo.trim();
    if (!titulo || !campos.tipo || !campos.tamanho.trim()) {
      setErro('Título, tipo e tamanho são obrigatórios.');
      return;
    }
    setErro('');
    aoEnviar({
      imovel: {
        codigo: campos.codigo.trim() || null,
        titulo,
        tipo: campos.tipo,
        tamanho: `${campos.tamanho.trim()}m²`,
        garagem: campos.temGaragem,
        garagem_vagas: Number(campos.vagas) || 1,
        status: campos.status,
        observacoes: campos.observacoes.trim(),
      },
      endereco: montarPayloadDeEndereco(campos.endereco),
    });
  }

  return (
    <form onSubmit={aoSubmeter} autoComplete="off">
      {topo}
      {erro && (
        <div className="alert alert-danger mb-3">
          <i className="bi bi-exclamation-triangle me-2" />
          {erro}
        </div>
      )}

      <h6 className="mb-3" style={estiloDoTituloDaSecao}>
        Dados do imóvel
      </h6>
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <label className="form-label" htmlFor="codigo">
            Código
          </label>
          {modo === 'editar' && imovel ? (
            <input id="codigo" className="form-control" value={codigoCurto(imovel)} disabled title="ID do sistema" />
          ) : (
            <input id="codigo" className="form-control" placeholder="Opcional" value={campos.codigo} onChange={(evento) => alterar('codigo', evento.target.value)} />
          )}
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="titulo">
            Título <span className="text-danger">*</span>
          </label>
          <input id="titulo" className="form-control" required placeholder="Ex: Casa com Jardim" value={campos.titulo} onChange={(evento) => alterar('titulo', evento.target.value)} />
        </div>
        <div className="col-md-3">
          <label className="form-label" htmlFor="status">
            Status
          </label>
          <select id="status" className="form-select" value={campos.status} onChange={(evento) => alterar('status', evento.target.value)}>
            {STATUS_EDITAVEIS_DO_IMOVEL.map((status) => (
              <option key={status} value={status}>
                {ROTULO_DO_STATUS_DO_IMOVEL[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <label className="form-label" htmlFor="tipo">
            Tipo <span className="text-danger">*</span>
          </label>
          <select id="tipo" className="form-select" required value={campos.tipo} onChange={(evento) => alterar('tipo', evento.target.value)}>
            <option value="">Selecione...</option>
            {/* mantém um tipo legado que não esteja na lista atual */}
            {campos.tipo && !(TIPOS_DE_IMOVEL as readonly string[]).includes(campos.tipo) && <option value={campos.tipo}>{campos.tipo}</option>}
            {TIPOS_DE_IMOVEL.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label" htmlFor="tamanho">
            Tamanho <span className="text-danger">*</span>
          </label>
          <div className="input-group">
            <input id="tamanho" type="number" step="0.01" min="1" className="form-control" placeholder="80" required value={campos.tamanho} onChange={(evento) => alterar('tamanho', evento.target.value)} />
            <span className="input-group-text">m²</span>
          </div>
        </div>
        <div className="col-md-4">
          <label className="form-label" htmlFor="garagem">
            Garagem
          </label>
          <div className="d-flex gap-2">
            <select id="garagem" className="form-select" value={campos.temGaragem ? 'sim' : 'nenhuma'} onChange={(evento) => alterar('temGaragem', evento.target.value === 'sim')}>
              <option value="nenhuma">Sem garagem</option>
              <option value="sim">Com garagem</option>
            </select>
            {campos.temGaragem && (
              <input type="number" min={1} max={10} className="form-control" style={{ width: 80 }} placeholder="Vagas" aria-label="Vagas" value={campos.vagas} onChange={(evento) => alterar('vagas', evento.target.value)} />
            )}
          </div>
        </div>
      </div>

      <h6 className="mb-3" style={estiloDoTituloDaSecao}>
        Endereço
      </h6>
      <div className="row g-3">
        <div className="col-md-3">
          <label className="form-label" htmlFor="cep">
            CEP
          </label>
          <div className="input-group">
            <input id="cep" className="form-control" placeholder="00000-000" maxLength={9} value={campos.endereco.cep} onChange={(evento) => alterarEndereco({ cep: evento.target.value })} />
            <button type="button" className="btn btn-outline-secondary" onClick={aoBuscarCep} disabled={buscandoCep}>
              {buscandoCep ? <span className="spinner-border spinner-border-sm" /> : 'Buscar'}
            </button>
          </div>
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="rua">
            Logradouro
          </label>
          <input id="rua" className="form-control" placeholder="Rua das Flores" value={campos.endereco.rua} onChange={(evento) => alterarEndereco({ rua: evento.target.value })} />
        </div>
        <div className="col-md-3">
          <label className="form-label" htmlFor="numero">
            Número
          </label>
          <input id="numero" className="form-control" placeholder="123" value={campos.endereco.numero} onChange={(evento) => alterarEndereco({ numero: evento.target.value })} />
        </div>
        <div className="col-md-4">
          <label className="form-label" htmlFor="complemento">
            Complemento
          </label>
          <input id="complemento" className="form-control" placeholder="Apto 42" value={campos.endereco.complemento} onChange={(evento) => alterarEndereco({ complemento: evento.target.value })} />
        </div>
        <div className="col-md-4">
          <label className="form-label" htmlFor="bairro">
            Bairro
          </label>
          <input id="bairro" className="form-control" placeholder="Bairro" value={campos.endereco.bairro} onChange={(evento) => alterarEndereco({ bairro: evento.target.value })} />
        </div>
        <div className="col-md-3">
          <label className="form-label" htmlFor="cidade">
            Cidade
          </label>
          <input id="cidade" className="form-control" placeholder="São Paulo" value={campos.endereco.cidade} onChange={(evento) => alterarEndereco({ cidade: evento.target.value })} />
        </div>
        <div className="col-md-1">
          <label className="form-label" htmlFor="estado">
            UF
          </label>
          <input id="estado" className="form-control" maxLength={2} placeholder="SP" value={campos.endereco.estado} onChange={(evento) => alterarEndereco({ estado: evento.target.value.toUpperCase() })} />
        </div>
      </div>

      <h6 className="mb-3 mt-4" style={estiloDoTituloDaSecao}>
        Localização no mapa
      </h6>
      <div className="row g-3">
        <div className="col-md-3">
          <label className="form-label" htmlFor="latitude">
            Latitude
          </label>
          <input id="latitude" className="form-control" inputMode="decimal" placeholder="-23.550520" value={campos.endereco.latitude} onChange={(evento) => alterarEndereco({ latitude: evento.target.value })} />
        </div>
        <div className="col-md-3">
          <label className="form-label" htmlFor="longitude">
            Longitude
          </label>
          <input id="longitude" className="form-control" inputMode="decimal" placeholder="-46.633308" value={campos.endereco.longitude} onChange={(evento) => alterarEndereco({ longitude: evento.target.value })} />
        </div>
        <div className="col-md-6 d-flex align-items-end gap-2 flex-wrap">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={aoUsarMinhaLocalizacao} disabled={buscandoLocalizacao || !('geolocation' in navigator)}>
            <i className="bi bi-geo-alt me-1" />
            Usar minha localização
          </button>
          <span className="form-text mb-0">Clique no mapa abaixo para definir o ponto.</span>
        </div>
        <div className="col-12">
          <SeletorDeLocalizacao latitude={campos.endereco.latitude} longitude={campos.endereco.longitude} aoEscolher={definirCoordenadas} />
        </div>
      </div>

      <div className="row g-3 mt-3">
        <div className="col-12">
          <label className="form-label" htmlFor="observacoes">
            Observações
          </label>
          <textarea id="observacoes" className="form-control" rows={3} value={campos.observacoes} onChange={(evento) => alterar('observacoes', evento.target.value)} />
        </div>
      </div>

      <fieldset disabled={enviando}>{rodape}</fieldset>
    </form>
  );
}
