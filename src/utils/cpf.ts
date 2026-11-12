import { apenasDigitos } from './formatar';

/** "52998224725" → "529.982.247-25", aceitando o valor parcial enquanto a pessoa digita. */
export function formatarCpf(texto: string): string {
  const digitos = apenasDigitos(texto).slice(0, 11);
  return digitos
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

function digitoVerificador(digitos: string): number {
  const soma = [...digitos].reduce((total, digito, indice) => total + Number(digito) * (digitos.length + 1 - indice), 0);
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

/** Mesma regra da API: 11 dígitos, não todos iguais, e os dois dígitos verificadores corretos. */
export function validarCpf(texto: string): boolean {
  const digitos = apenasDigitos(texto);
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) return false;
  return digitoVerificador(digitos.slice(0, 9)) === Number(digitos[9]) && digitoVerificador(digitos.slice(0, 10)) === Number(digitos[10]);
}
