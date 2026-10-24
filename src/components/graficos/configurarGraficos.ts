import { ArcElement, BarElement, CategoryScale, Chart, Legend, LinearScale, Tooltip } from 'chart.js';

Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

/**
 * Paleta categórica (passos escuros da paleta de referência), em ordem fixa — nunca reciclar.
 * Validada contra a superfície dos cards (#151D2E): faixa de luminosidade, croma,
 * separação para daltonismo (ΔE ≥ 8 entre vizinhas) e contraste ≥ 3:1.
 */
export const CORES_DAS_SERIES = ['#3987e5', '#d95926', '#199e70', '#c98500'] as const;

export const COR_DA_SUPERFICIE = '#151D2E';
export const COR_DO_TEXTO_SECUNDARIO = '#94A3B8';
export const COR_DA_GRADE = '#243044';

Chart.defaults.color = COR_DO_TEXTO_SECUNDARIO;
Chart.defaults.font.size = 11;
Chart.defaults.plugins.legend.display = false; // a legenda é HTML (.chart-legend), com contagens
Chart.defaults.plugins.tooltip.backgroundColor = '#0B1220';
Chart.defaults.plugins.tooltip.borderColor = COR_DA_GRADE;
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.maintainAspectRatio = false;
