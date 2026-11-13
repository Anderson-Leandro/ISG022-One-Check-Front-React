import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconeDoMarcador from 'leaflet/dist/images/marker-icon.png';
import iconeDoMarcador2x from 'leaflet/dist/images/marker-icon-2x.png';
import sombraDoMarcador from 'leaflet/dist/images/marker-shadow.png';

/**
 * Pino de todos os marcadores. Não dá para só trocar as URLs do L.Icon.Default: ele cola na frente delas a pasta
 * que descobre lendo o leaflet.css, e com o Vite (que já entrega a URL completa) a pasta sai duplicada e a imagem
 * não carrega. Um L.icon comum usa a URL como recebe. Tamanhos e âncoras são os do ícone padrão do Leaflet.
 */
export const ICONE_DO_MARCADOR = L.icon({
  iconUrl: iconeDoMarcador,
  iconRetinaUrl: iconeDoMarcador2x,
  shadowUrl: sombraDoMarcador,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = ICONE_DO_MARCADOR;

export const CENTRO_PADRAO: [number, number] = [-23.5505, -46.6333];
export const URL_DOS_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const ATRIBUICAO = '&copy; OpenStreetMap';
