import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconeDoMarcador from 'leaflet/dist/images/marker-icon.png';
import iconeDoMarcador2x from 'leaflet/dist/images/marker-icon-2x.png';
import sombraDoMarcador from 'leaflet/dist/images/marker-shadow.png';

// O bundler não resolve os ícones padrão do Leaflet sozinho
L.Icon.Default.mergeOptions({ iconUrl: iconeDoMarcador, iconRetinaUrl: iconeDoMarcador2x, shadowUrl: sombraDoMarcador });

export const CENTRO_PADRAO: [number, number] = [-23.5505, -46.6333];
export const URL_DOS_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const ATRIBUICAO = '&copy; OpenStreetMap';
