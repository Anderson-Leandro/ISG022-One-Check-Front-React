import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { buscarEnderecoDoImovel, codigoCurto, useImoveisDoMapa, type Imovel } from '../../api/imoveis';
import { CabecalhoDaPagina } from '../../components/CabecalhoDaPagina';
import { EstadoDaConsulta } from '../../components/EstadoDaConsulta';
import { MapaComPontos, type PontoNoMapa } from '../../components/mapa/MapaComPontos';
import { coordenadasDoEndereco, geocodificarEndereco, resumoDoEndereco, type Coordenadas, type Endereco } from '../../utils/endereco';

const INTERVALO_ENTRE_GEOCODIFICACOES_MS = 1100; // limite de uso do Nominatim: 1 req/s

interface ImovelComEndereco {
  imovel: Imovel;
  endereco: Endereco;
}

interface PontoDeImovel extends ImovelComEndereco {
  coordenadas: Coordenadas;
  fonte: 'cadastro' | 'geocode';
}

const esperar = (milissegundos: number) => new Promise((resolver) => setTimeout(resolver, milissegundos));

/** Usa o endereço embutido (com_endereco=true) e só consulta /endereco quando ele não vier. */
async function resolverEnderecos(imoveis: Imovel[]) {
  const resultados = await Promise.all(
    imoveis.map(async (imovel): Promise<ImovelComEndereco | null> => {
      const embutido = imovel.endereco;
      const endereco = embutido && typeof embutido === 'object' ? embutido : await buscarEnderecoDoImovel(imovel.id).catch(() => null);
      return endereco ? { imovel, endereco } : null;
    }),
  );
  const comEndereco = resultados.filter((resultado): resultado is ImovelComEndereco => resultado !== null);
  return { comEndereco, semEndereco: imoveis.length - comEndereco.length };
}

/** Geocodifica em sequência, respeitando o limite do Nominatim. */
async function geocodificarFaltantes(pendentes: ImovelComEndereco[]): Promise<{ pontos: PontoDeImovel[]; falhas: number }> {
  const pontos: PontoDeImovel[] = [];
  for (const [indice, item] of pendentes.entries()) {
    if (indice > 0) await esperar(INTERVALO_ENTRE_GEOCODIFICACOES_MS);
    const coordenadas = await geocodificarEndereco(item.endereco).catch(() => null);
    if (coordenadas) pontos.push({ ...item, coordenadas, fonte: 'geocode' });
  }
  return { pontos, falhas: pendentes.length - pontos.length };
}

function paraPontoNoMapa({ imovel, endereco, coordenadas, fonte }: PontoDeImovel): PontoNoMapa {
  return {
    id: imovel.id,
    ...coordenadas,
    popup: (
      <>
        <strong>
          {imovel.codigo || codigoCurto(imovel)} · {imovel.titulo || imovel.tipo || 'Imóvel'}
        </strong>
        <br />
        <small>{resumoDoEndereco(endereco)}</small>
        <br />
        <small className="text-muted">{fonte === 'cadastro' ? 'Coordenadas cadastradas' : 'Geocodificado'}</small>
        <br />
        <Link to={`/imoveis/${imovel.id}`}>Ver imóvel →</Link>
      </>
    ),
  };
}

/** imoveis/mapa.php — a geocodificação que o PHP fazia no servidor agora roda no navegador. */
export function MapaDeImoveis() {
  const consultaDosImoveis = useImoveisDoMapa();

  const consultaDosEnderecos = useQuery({
    queryKey: ['imoveis', 'mapa', 'enderecos', consultaDosImoveis.data?.map((imovel) => imovel.id)],
    queryFn: () => resolverEnderecos(consultaDosImoveis.data ?? []),
    enabled: consultaDosImoveis.isSuccess,
  });

  const comEndereco = consultaDosEnderecos.data?.comEndereco ?? [];
  const pontosCadastrados: PontoDeImovel[] = [];
  const pendentes: ImovelComEndereco[] = [];
  for (const item of comEndereco) {
    const coordenadas = coordenadasDoEndereco(item.endereco);
    if (coordenadas) pontosCadastrados.push({ ...item, coordenadas, fonte: 'cadastro' });
    else pendentes.push(item);
  }

  const consultaDaGeocodificacao = useQuery({
    queryKey: ['imoveis', 'mapa', 'geocode', pendentes.map((item) => item.imovel.id)],
    queryFn: () => geocodificarFaltantes(pendentes),
    enabled: consultaDosEnderecos.isSuccess && pendentes.length > 0,
    staleTime: 10 * 60_000,
  });

  const pontos = [...pontosCadastrados, ...(consultaDaGeocodificacao.data?.pontos ?? [])];
  const semCoordenadas = consultaDaGeocodificacao.data?.falhas ?? 0;
  const semEndereco = consultaDosEnderecos.data?.semEndereco ?? 0;
  const geocodificando = consultaDaGeocodificacao.isFetching;
  const carregando = consultaDosImoveis.isPending || consultaDosEnderecos.isPending;

  return (
    <>
      <CabecalhoDaPagina
        titulo="Mapa de imóveis"
        subtitulo={
          <>
            {pontos.length} imóvel(is) no mapa
            {semCoordenadas > 0 && ` · ${semCoordenadas} sem coordenadas`}
            {semEndereco > 0 && ` · ${semEndereco} sem endereço`}
            {geocodificando && ` · localizando ${pendentes.length} endereço(s)…`}
          </>
        }
        acoes={
          <Link to="/imoveis" className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-list me-1" />
            Lista
          </Link>
        }
      />

      <div className="card">
        <div className="card-body p-0" style={{ borderRadius: 12, overflow: 'hidden' }}>
          <EstadoDaConsulta carregando={carregando} erro={consultaDosImoveis.error}>
            <MapaComPontos altura={520} pontos={pontos.map(paraPontoNoMapa)} />
          </EstadoDaConsulta>
        </div>
      </div>

      {!carregando && !geocodificando && pontos.length === 0 && (
        <div className="alert alert-info mt-3">
          <i className="bi bi-info-circle me-2" />
          Nenhum ponto no mapa. Edite os imóveis e preencha <strong>latitude</strong> e <strong>longitude</strong> no formulário (seção “Localização no mapa”).
        </div>
      )}
      {pontos.length > 0 && semCoordenadas > 0 && (
        <div className="alert alert-warning mt-3 mb-0">
          <i className="bi bi-exclamation-triangle me-2" />
          {semCoordenadas} imóvel(is) sem coordenadas cadastradas — a geocodificação automática falhou.
        </div>
      )}
    </>
  );
}
