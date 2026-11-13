import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { LeafletEvent, Marker as MarcadorLeaflet } from 'leaflet';
import { ATRIBUICAO, CENTRO_PADRAO, URL_DOS_TILES } from './configurarLeaflet';
import { paraNumero } from '../../utils/endereco';

interface Propriedades {
  latitude: string;
  longitude: string;
  aoEscolher(latitude: number, longitude: number): void;
}

function OuvirCliques({ aoEscolher }: Pick<Propriedades, 'aoEscolher'>) {
  useMapEvents({ click: (evento) => aoEscolher(evento.latlng.lat, evento.latlng.lng) });
  return null;
}

/** Recentraliza quando as coordenadas mudam por fora (digitação, CEP, "minha localização"). */
function SeguirPonto({ latitude, longitude }: { latitude: number | null; longitude: number | null }) {
  const mapa = useMap();
  useEffect(() => {
    if (latitude !== null && longitude !== null) mapa.setView([latitude, longitude], Math.max(mapa.getZoom(), 15));
  }, [mapa, latitude, longitude]);
  return null;
}

/** Mapa do formulário de imóvel: clique ou arraste o marcador para definir latitude/longitude. */
export function SeletorDeLocalizacao({ latitude, longitude, aoEscolher }: Propriedades) {
  const lat = paraNumero(latitude);
  const lng = paraNumero(longitude);
  const ponto: [number, number] | null = lat !== null && lng !== null ? [lat, lng] : null;

  return (
    <MapContainer
      center={ponto ?? CENTRO_PADRAO}
      zoom={ponto ? 15 : 11}
      style={{ height: 240, borderRadius: 8, border: '1px solid var(--oc-border,#dee2e6)' }}
    >
      <TileLayer url={URL_DOS_TILES} attribution={ATRIBUICAO} maxZoom={19} />
      <Marker
        position={ponto ?? CENTRO_PADRAO}
        draggable
        eventHandlers={{
          dragend: (evento: LeafletEvent) => {
            const posicao = (evento.target as MarcadorLeaflet).getLatLng();
            aoEscolher(posicao.lat, posicao.lng);
          },
        }}
      />
      <OuvirCliques aoEscolher={aoEscolher} />
      <SeguirPonto latitude={lat} longitude={lng} />
    </MapContainer>
  );
}
