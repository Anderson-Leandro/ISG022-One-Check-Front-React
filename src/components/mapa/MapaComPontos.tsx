import { useEffect, type ReactNode } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ATRIBUICAO, CENTRO_PADRAO, URL_DOS_TILES } from './configurarLeaflet';

export interface PontoNoMapa {
  id: string;
  latitude: number;
  longitude: number;
  popup?: ReactNode;
}

function EnquadrarPontos({ pontos }: { pontos: PontoNoMapa[] }) {
  const mapa = useMap();
  const assinatura = pontos.map((ponto) => `${ponto.latitude},${ponto.longitude}`).join('|');
  useEffect(() => {
    if (pontos.length > 1) mapa.fitBounds(L.latLngBounds(pontos.map((ponto) => [ponto.latitude, ponto.longitude])).pad(0.25));
    else if (pontos.length === 1) mapa.setView([pontos[0].latitude, pontos[0].longitude], 16);
  }, [mapa, assinatura]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Mapa somente leitura com um ou vários marcadores (detalhes e mapa de imóveis). */
export function MapaComPontos({ pontos, altura }: { pontos: PontoNoMapa[]; altura: number }) {
  return (
    <MapContainer center={pontos[0] ? [pontos[0].latitude, pontos[0].longitude] : CENTRO_PADRAO} zoom={pontos.length === 1 ? 16 : 11} style={{ height: altura, width: '100%' }}>
      <TileLayer url={URL_DOS_TILES} attribution={ATRIBUICAO} maxZoom={19} />
      {pontos.map((ponto) => (
        <Marker key={ponto.id} position={[ponto.latitude, ponto.longitude]}>
          {ponto.popup && <Popup>{ponto.popup}</Popup>}
        </Marker>
      ))}
      <EnquadrarPontos pontos={pontos} />
    </MapContainer>
  );
}
