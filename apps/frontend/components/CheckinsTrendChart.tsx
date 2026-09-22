'use client';
// 📈 Gráfico de tendência de check-ins emocionais (SVG leve, sem dependências externas)

interface CheckinPoint {
  createdAt: string;
  moodScore: number;
  energyLevel: number;
  anxietyLevel: number;
}

interface TrendChartProps {
  data: CheckinPoint[];
}

const WIDTH = 600;
const HEIGHT = 220;
const PADDING_LEFT = 28;
const PADDING_RIGHT = 16;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 28;
const MAX_POINTS = 14;

type SeriesKey = 'moodScore' | 'energyLevel' | 'anxietyLevel';

const SERIES: { key: SeriesKey; color: string; label: string }[] = [
  { key: 'moodScore', color: '#2563eb', label: 'Humor' },
  { key: 'energyLevel', color: '#16a34a', label: 'Energia' },
  { key: 'anxietyLevel', color: '#d97706', label: 'Ansiedade' },
];

export function CheckinsTrendChart({ data }: TrendChartProps) {
  // Ordena do mais antigo para o mais recente e limita aos últimos registros (a API já ordena desc)
  const points = [...data]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-MAX_POINTS);

  if (points.length < 2) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-500">
        Registre pelo menos 2 check-ins para ver sua tendência ao longo do tempo. 📊
      </div>
    );
  }

  const chartWidth = WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const chartHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const xFor = (index: number) =>
    PADDING_LEFT + (points.length === 1 ? 0 : (index / (points.length - 1)) * chartWidth);

  // Escala fixa 1-10 (mesma escala usada em todo o produto)
  const yFor = (value: number) => PADDING_TOP + chartHeight - ((value - 1) / 9) * chartHeight;

  const buildPath = (key: SeriesKey) =>
    points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(p[key]).toFixed(1)}`)
      .join(' ');

  const formatShortDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  const xLabelIndexes = Array.from(
    new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          📈 Tendência (últimos {points.length} registros)
        </h3>
        <div className="flex items-center gap-4 text-sm">
          {SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-gray-600">
              <span
                className="w-3 h-3 rounded-full inline-block"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        role="img"
        aria-label="Gráfico de tendência de humor, energia e ansiedade ao longo do tempo"
      >
        {/* Linhas de grade horizontais de referência */}
        {[1, 5, 10].map((v) => (
          <g key={v}>
            <line
              x1={PADDING_LEFT}
              x2={WIDTH - PADDING_RIGHT}
              y1={yFor(v)}
              y2={yFor(v)}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
            <text x={2} y={yFor(v) + 4} fontSize={10} fill="#9ca3af">
              {v}
            </text>
          </g>
        ))}

        {/* Linhas de série (humor / energia / ansiedade) */}
        {SERIES.map((s) => (
          <path
            key={s.key}
            d={buildPath(s.key)}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/* Pontos da série de humor para dar referência visual dos registros */}
        {points.map((p, i) => (
          <circle key={i} cx={xFor(i)} cy={yFor(p.moodScore)} r={2.5} fill="#2563eb" />
        ))}

        {/* Labels de data no eixo X */}
        {xLabelIndexes.map((i) => (
          <text
            key={i}
            x={xFor(i)}
            y={HEIGHT - 8}
            fontSize={10}
            fill="#9ca3af"
            textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
          >
            {formatShortDate(points[i].createdAt)}
          </text>
        ))}
      </svg>
    </div>
  );
}

export default CheckinsTrendChart;
