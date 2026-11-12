import { describe, expect, it } from 'vitest';
import { agendamentosAPartirDeHoje } from '../api/contratos';
import { camposAlteradosNoLog, proximosMeses, ultimosMeses } from '../api/painel';
import { problemaEstaEncerrado } from '../api/problemas';
import { permissoesDaVistoria, validarFoto, type Checklist } from '../api/vistorias';
import { itensDeMenuPara, perfisAtribuiveisPor, podeAcessar, podeCriar, podeGerenciarUsuario, podeListarUsuarios, rotaInicial } from '../auth/permissoes';
import { formatarCpf, validarCpf } from '../utils/cpf';
import { validarSenhaNova } from '../utils/senha';
import type { Usuario } from '../auth/tipos';
import { coordenadasDoEndereco, montarPayloadDeEndereco } from '../utils/endereco';

const usuario = (role: string, id = `id-${role}`): Usuario => ({ id, nome: role, email: `${role}@teste`, role });
const checklist = (status: string, vistoriadorId = 'id-vistoriador'): Checklist => ({ id: 'c1', contrato_id: 'k1', status, vistoriador_id: vistoriadorId });

describe('permissoesDaVistoria (regras confirmadas contra a API)', () => {
  it('vistoriador designado edita e submete em preenchimento, mas não envia para aceite', () => {
    expect(permissoesDaVistoria(checklist('em_preenchimento'), usuario('vistoriador'))).toEqual({ excluir: false, editarItens: true, submeter: true, enviarParaAceite: false, aceitarOuRejeitar: false });
  });
  it('outro vistoriador não edita', () => {
    expect(permissoesDaVistoria(checklist('em_preenchimento'), usuario('vistoriador', 'outro')).editarItens).toBe(false);
  });
  it('locatário só aceita/rejeita quando pendente de aceite', () => {
    expect(permissoesDaVistoria(checklist('pendente_aceite'), usuario('locatario')).aceitarOuRejeitar).toBe(true);
    expect(permissoesDaVistoria(checklist('em_preenchimento'), usuario('locatario'))).toEqual({ excluir: false, editarItens: false, submeter: false, enviarParaAceite: false, aceitarOuRejeitar: false });
  });
  it('quem fez a vistoria não aceita nem rejeita a própria vistoria, mesmo sendo gestor', () => {
    expect(permissoesDaVistoria(checklist('pendente_aceite', 'id-gestor'), usuario('gestor')).aceitarOuRejeitar).toBe(false);
    expect(permissoesDaVistoria(checklist('pendente_aceite'), usuario('gestor')).aceitarOuRejeitar).toBe(true);
  });
  it('o status pendente_revisao deixou de existir: não libera edição', () => {
    expect(Object.values(permissoesDaVistoria(checklist('pendente_revisao'), usuario('admin'))).some(Boolean)).toBe(false);
  });
  it('fotos: só JPEG, PNG e WebP, até 10 MB', () => {
    expect(validarFoto({ type: 'image/webp', size: 1024 })).toBeNull();
    expect(validarFoto({ type: '', size: 1024 })).toBeNull();
    expect(validarFoto({ type: 'image/jpg', size: 1024 })).toBeNull();
    expect(validarFoto({ type: 'image/heic', size: 1024 })).toMatch(/JPEG, PNG ou WebP/);
    expect(validarFoto({ type: 'image/jpeg', size: 10 * 1024 * 1024 + 1 })).toMatch(/10 MB/);
  });
  it('resolvido e fechado encerram o problema', () => {
    expect(['aberto', 'em_analise', 'em_andamento', 'resolvido', 'fechado'].map(problemaEstaEncerrado)).toEqual([false, false, false, true, true]);
  });
  it('só admin e gestor excluem, e só em preenchimento', () => {
    expect(permissoesDaVistoria(checklist('em_preenchimento'), usuario('gestor')).excluir).toBe(true);
    expect(permissoesDaVistoria(checklist('pendente_aceite'), usuario('admin')).excluir).toBe(false);
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
    expect(podeCriar(usuario('vistoriador'), 'vistorias')).toBe(false);
    expect(podeCriar(usuario('gestor'), 'vistorias')).toBe(true);
    expect(podeAcessar(usuario('vistoriador'), 'problemas')).toBe(false);
    expect(podeCriar(usuario('locatario'), 'problemas')).toBe(true);
    expect(podeCriar(usuario('vistoriador'), 'imoveis')).toBe(false);
    expect(podeCriar(usuario('gestor'), 'usuarios')).toBe(true);
    expect(podeCriar(usuario('vistoriador'), 'usuarios')).toBe(false);
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

describe('gestão de usuários (regras da API)', () => {
  it('sem usuário ou com perfil removido, nada é acessível', () => {
    expect(podeAcessar(null, 'dashboard')).toBe(false);
    expect(podeAcessar(usuario('visualizador'), 'imoveis')).toBe(false);
    expect(itensDeMenuPara(usuario('visualizador'))).toEqual([]);
  });
  it('só admin e gestor listam usuários', () => {
    expect(['admin', 'gestor', 'vistoriador', 'locatario'].map((perfil) => podeListarUsuarios(usuario(perfil)))).toEqual([true, true, false, false]);
  });
  it('o gestor só atribui e gerencia vistoriador e locatário', () => {
    expect(perfisAtribuiveisPor(usuario('admin'))).toEqual(['admin', 'gestor', 'vistoriador', 'locatario']);
    expect(perfisAtribuiveisPor(usuario('gestor'))).toEqual(['vistoriador', 'locatario']);
    expect(perfisAtribuiveisPor(usuario('locatario'))).toEqual([]);
    expect(podeGerenciarUsuario(usuario('gestor'), usuario('locatario'))).toBe(true);
    expect(podeGerenciarUsuario(usuario('gestor'), usuario('admin'))).toBe(false);
    expect(podeGerenciarUsuario(usuario('gestor'), usuario('gestor', 'outro-gestor'))).toBe(false);
  });
  it('perfil fora da lista vai para o próprio perfil, sem laço de redirecionamento', () => {
    expect(rotaInicial(usuario('visualizador'))).toBe('/usuarios/perfil');
    expect(rotaInicial(null)).toBe('/usuarios/perfil');
  });
  it('o admin alcança contas com perfil fora da lista, e o gestor não', () => {
    expect(podeGerenciarUsuario(usuario('admin'), usuario('visualizador'))).toBe(true);
    expect(podeGerenciarUsuario(usuario('gestor'), usuario('visualizador'))).toBe(false);
  });
  it('aceita o perfil vindo em "perfil" no lugar de "role"', () => {
    expect(podeAcessar({ id: 'x', nome: 'X', email: 'x@x', role: undefined as unknown as string, perfil: 'gestor' }, 'contratos')).toBe(true);
  });
  it('ninguém gerencia a própria conta pela gestão de usuários', () => {
    expect(podeGerenciarUsuario(usuario('admin'), usuario('admin'))).toBe(false);
    expect(podeGerenciarUsuario(usuario('admin'), usuario('admin', 'outro-admin'))).toBe(true);
  });
});

describe('CPF', () => {
  it('aceita com ou sem pontuação e confere os dígitos verificadores', () => {
    expect(validarCpf('529.982.247-25')).toBe(true);
    expect(validarCpf('52998224725')).toBe(true);
    expect(validarCpf('529.982.247-26')).toBe(false);
  });
  it('recusa dígitos repetidos, tamanho errado e o valor mascarado da API', () => {
    expect(validarCpf('111.111.111-11')).toBe(false);
    expect(validarCpf('000.000.000-00')).toBe(false);
    expect(validarCpf('5299822472')).toBe(false);
    expect(validarCpf('***.982.247-**')).toBe(false);
  });
  it('formata enquanto a pessoa digita', () => {
    expect(formatarCpf('5299')).toBe('529.9');
    expect(formatarCpf('5299822')).toBe('529.982.2');
    expect(formatarCpf('52998224725')).toBe('529.982.247-25');
    expect(formatarCpf('529982247259999')).toBe('529.982.247-25');
  });
});

describe('política de senha conferida no navegador', () => {
  it('exige 10 caracteres', () => {
    expect(validarSenhaNova('Abc12345')).toMatch(/10 caracteres/);
    expect(validarSenhaNova('Casa-Verde-71')).toBeNull();
  });
  it('recusa só números e símbolos, e poucos caracteres distintos', () => {
    expect(validarSenhaNova('1234567890!@')).toMatch(/números e símbolos/);
    expect(validarSenhaNova('aaaaabbbbb')).toMatch(/caracteres diferentes/);
    expect(validarSenhaNova('AaBbAaBbAa1')).toMatch(/caracteres diferentes/);
  });
  it('conta o limite em bytes: letra acentuada vale dois', () => {
    expect(validarSenhaNova(`Xyz12${'a'.repeat(67)}`)).toBeNull();
    expect(validarSenhaNova(`Xyz12${'á'.repeat(34)}`)).toMatch(/72 bytes/);
  });
});

describe('logs de auditoria', () => {
  const log = (payload: unknown) => ({ id: 'l1', acao: 'update', created_at: '2026-11-12T10:00:00', payload: payload as never });
  it('lista os campos alterados e trata eventos antigos sem payload', () => {
    expect(camposAlteradosNoLog(log({ campos: ['nome', 'role'] }))).toEqual(['nome', 'role']);
    expect(camposAlteradosNoLog(log(null))).toEqual([]);
    expect(camposAlteradosNoLog(log({ campos: 'nome' }))).toEqual([]);
  });
});

describe('agendamentos de hoje em diante', () => {
  const referencia = new Date(2026, 10, 12, 15, 0); // 12/nov/2026 15h
  const agendamento = (data_agendada: string | null) => ({ data_agendada });
  it('inclui o dia de hoje mesmo em data sem hora, descarta o passado e ordena', () => {
    const lista = [agendamento('2026-11-20T09:00:00'), agendamento('2026-11-11T09:00:00'), agendamento('2026-11-12'), agendamento(null)];
    expect(agendamentosAPartirDeHoje(lista, undefined, referencia).map((item) => item.data_agendada)).toEqual(['2026-11-12', '2026-11-20T09:00:00']);
  });
  it('respeita o limite', () => {
    const lista = [agendamento('2026-11-13T09:00:00'), agendamento('2026-12-30T09:00:00')];
    expect(agendamentosAPartirDeHoje(lista, new Date(2026, 11, 12), referencia)).toHaveLength(1);
  });
});
