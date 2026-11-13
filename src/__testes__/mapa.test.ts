// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import L from 'leaflet';
import iconeDoMarcador from 'leaflet/dist/images/marker-icon.png';
import sombraDoMarcador from 'leaflet/dist/images/marker-shadow.png';
import { ICONE_DO_MARCADOR } from '../components/mapa/configurarLeaflet';

describe('pino do mapa', () => {
  it('todo marcador usa o pino configurado', () => {
    expect(L.marker([0, 0]).options.icon).toBe(ICONE_DO_MARCADOR);
  });

  it('a imagem do pino e a sombra usam a URL do bundler sem nada colado na frente', () => {
    const icone = L.marker([0, 0]).options.icon!;
    expect(icone.createIcon().getAttribute('src')).toBe(iconeDoMarcador);
    expect(icone.createShadow()?.getAttribute('src')).toBe(sombraDoMarcador);
  });
});
