/** Equivalentes a format_money/format_date/format_datetime de includes/partials.php. */

export function formatarMoeda(valor: number | string | null | undefined): string {
  const numero = Number(valor ?? 0);
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Interpreta a data da API; "AAAA-MM-DD" sozinho vale como data local. */
export function paraData(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  // "YYYY-MM-DD" puro é tratado como data local, não UTC (evita voltar um dia)
  const data = /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(`${valor}T00:00:00`) : new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

export function formatarData(valor: string | null | undefined): string {
  return paraData(valor)?.toLocaleDateString('pt-BR') ?? '—';
}

export function formatarDataHora(valor: string | null | undefined): string {
  const data = paraData(valor);
  if (!data) return '—';
  return `${data.toLocaleDateString('pt-BR')} ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

export function capitalizar(texto: string): string {
  const legivel = texto.replace(/_/g, ' ');
  return legivel.charAt(0).toUpperCase() + legivel.slice(1);
}

export function apenasDigitos(texto: string): string {
  return texto.replace(/\D/g, '');
}
