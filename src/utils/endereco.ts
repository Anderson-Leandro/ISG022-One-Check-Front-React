import { apenasDigitos } from './formatar';

export interface Endereco {
  rua?: string;
  logradouro?: string;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string;
  estado?: string;
  cep?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  lon?: number | string | null;
}

export interface Coordenadas {
  latitude: number;
  longitude: number;
}

export function paraNumero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(String(valor).replace(',', '.'));
  return Number.isFinite(numero) ? numero : null;
}

/** Equivalente a endereco_coords() de includes/functions.php. */
export function coordenadasDoEndereco(endereco: Endereco | null | undefined): Coordenadas | null {
  if (!endereco) return null;
  const latitude = paraNumero(endereco.latitude ?? endereco.lat);
  const longitude = paraNumero(endereco.longitude ?? endereco.lng ?? endereco.lon);
  if (latitude === null || longitude === null) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  if (Math.abs(latitude) < 0.000001 && Math.abs(longitude) < 0.000001) return null;
  return { latitude, longitude };
}

export function ruaDoEndereco(endereco: Endereco | null | undefined): string {
  return endereco?.rua ?? endereco?.logradouro ?? '';
}

export function resumoDoEndereco(endereco: Endereco | null | undefined): string {
  if (!endereco) return '';
  return `${[ruaDoEndereco(endereco), endereco.numero].filter(Boolean).join(', ')} — ${endereco.cidade ?? ''}/${endereco.estado ?? ''}`;
}

export interface CamposDeEndereco {
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  latitude: string;
  longitude: string;
}

/**
 * Equivalente a endereco_payload_from_post(): só envia se rua, cidade e UF estiverem preenchidos;
 * coordenadas fora da faixa são descartadas.
 */
export function montarPayloadDeEndereco(campos: CamposDeEndereco) {
  const rua = campos.rua.trim();
  const cidade = campos.cidade.trim();
  const estado = campos.estado.trim().toUpperCase();
  if (!rua || !cidade || estado.length !== 2) return null;

  const latitude = paraNumero(campos.latitude);
  const longitude = paraNumero(campos.longitude);

  return {
    rua,
    numero: campos.numero.trim(),
    complemento: campos.complemento.trim(),
    bairro: campos.bairro.trim(),
    cidade,
    estado,
    cep: apenasDigitos(campos.cep),
    ...(latitude !== null && latitude >= -90 && latitude <= 90 ? { latitude } : {}),
    ...(longitude !== null && longitude >= -180 && longitude <= 180 ? { longitude } : {}),
  };
}

/** Geocoder::buscarCep — ViaCEP direto do navegador. */
export async function buscarCep(cep: string): Promise<{ logradouro: string; bairro: string; cidade: string; estado: string } | null> {
  const digitos = apenasDigitos(cep);
  if (digitos.length !== 8) return null;
  const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
  const dados = await resposta.json();
  if (!dados || dados.erro) return null;
  return { logradouro: dados.logradouro ?? '', bairro: dados.bairro ?? '', cidade: dados.localidade ?? '', estado: dados.uf ?? '' };
}

/** Geocoder::geocodeEndereco — Nominatim (OpenStreetMap). Respeitar 1 requisição/segundo. */
export async function geocodificarEndereco(endereco: Endereco): Promise<Coordenadas | null> {
  const partes = [
    [ruaDoEndereco(endereco), endereco.numero].filter(Boolean).join(', '),
    endereco.bairro,
    endereco.cidade,
    endereco.estado,
    'Brasil',
    endereco.cep ? `CEP ${endereco.cep}` : '',
  ].filter(Boolean);
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(partes.join(', '))}&format=json&limit=1&countrycodes=br`;
  const resposta = await fetch(url, { headers: { Accept: 'application/json' } });
  const lista = await resposta.json();
  if (!Array.isArray(lista) || lista.length === 0) return null;
  return { latitude: Number(lista[0].lat), longitude: Number(lista[0].lon) };
}
