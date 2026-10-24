import { describe, expect, it } from 'vitest';
import { proximosMeses, ultimosMeses } from '../api/painel';
import { permissoesDaVistoria, type Checklist } from '../api/vistorias';
import { itensDeMenuPara, podeAcessar, podeCriar, rotaInicial } from '../auth/permissoes';
import type { Usuario } from '../auth/tipos';
import { coordenadasDoEndereco, montarPayloadDeEndereco } from '../utils/endereco';

const usuario = (role: string, id = `id-${role}`): Usuario => ({ id, nome: role, email: `${role}@teste`, role });
const checklist = (status: string, vistoriadorId = 'id-vistoriador'): Checklist => ({ id: 'c1', contrato_id: 'k1', status, vistoriador_id: vistoriadorId });

describe('permissoesDaVistoria (regras confirmadas contra a API)', () => {
  it('vistoriador designado edita e submete em preenchimento, mas não envia para aceite', () => {
    expect(permissoesDaVistoria(checklist('em_preenchimento'), usuario('vistoriador'))).toEqual({ editarItens: true, submeter: true, enviarParaAceite: false, aceitarOuRejeitar: false });
  });
  it('outro vistoriador não edita', () => {
    expect(permissoesDaVistoria(checklist('em_preenchimento'), usuario('vistoriador', 'outro')).editarItens).toBe(false);
  });
  it('locatário só aceita/rejeita quando pendente de aceite', () => {
    expect(permissoesDaVistoria(checklist('pendente_aceite'), usuario('locatario')).aceitarOuRejeitar).toBe(true);
    expect(permissoesDaVistoria(checklist('em_preenchimento'), usuario('locatario'))).toEqual({ editarItens: false, submeter: false, enviarParaAceite: false, aceitarOuRejeitar: false });
  });
  it('aceito e rejeitado são finais', () => {
    for (const status of ['aceito', 'rejeitado']) expect(Object.values(permissoesDaVistoria(checklist(status), usuario('admin'))).some(Boolean)).toBe(false);
  });
});

describe('RBAC (espelho de front/includes/rbac.php)', () => {
  it('admin acessa tudo; locatário vai para a própria área', () => {
    expect(podeAcessar(usuario('admin'), 'logs')).toBe(true);
    expect(podeAcessar(usuario('gestor'), 'logs')).toBe(false);
    expect(rotaInicial(usuario('locatario'))).toBe('/locatario');
    expect(rotaInicial(usuario('vistoriador'))).toBe('/dashboard');
  });
  it('quem cria o quê', () => {
    expect(podeCriar(usuario('vistoriador'), 'vistorias')).toBe(true);
    expect(podeCriar(usuario('vistoriador'), 'imoveis')).toBe(false);
    expect(podeCriar(usuario('gestor'), 'usuarios')).toBe(false);
  });
  it('menu omite seções vazias', () => {
    const rotulos = itensDeMenuPara(usuario('locatario')).map((item) => ('secao' in item ? `#${item.secao}` : item.rotulo));
    expect(rotulos).toEqual(['#Principal', 'Vistorias', '#Gestão', 'Problemas']);
  });
});

describe('meses dos painéis', () => {
  const referencia = new Date(2026, 9, 24); // 24/out/2026
  it('últimos 6 meses terminam no mês atual e atravessam o ano', () => {
    expect(ultimosMeses(6, referencia).map((mes) => mes.chave)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(ultimosMeses(12, referencia)[0].chave).toBe('2025-11');
  });
  it('próximos meses começam no mês atual', () => {
    expect(proximosMeses(3, referencia).map((mes) => mes.chave)).toEqual(['2026-10', '2026-11', '2026-12']);
  });
});

describe('endereço (espelho de endereco_payload_from_post / endereco_coords)', () => {
  const campos = { cep: '01001-000', rua: ' Rua A ', numero: '1', complemento: '', bairro: 'Centro', cidade: 'SP', estado: 'sp', latitude: '-23,5', longitude: '200' };
  it('normaliza UF/CEP e descarta coordenada fora da faixa', () => {
    expect(montarPayloadDeEndereco(campos)).toEqual({ rua: 'Rua A', numero: '1', complemento: '', bairro: 'Centro', cidade: 'SP', estado: 'SP', cep: '01001000', latitude: -23.5 });
  });
  it('exige rua, cidade e UF com 2 letras', () => {
    expect(montarPayloadDeEndereco({ ...campos, estado: 'São Paulo' })).toBeNull();
  });
  it('ignora 0,0 e aceita lat/lng com vírgula', () => {
    expect(coordenadasDoEndereco({ latitude: 0, longitude: 0 })).toBeNull();
    expect(coordenadasDoEndereco({ lat: '-23,55', lng: '-46,63' })).toEqual({ latitude: -23.55, longitude: -46.63 });
  });
});
