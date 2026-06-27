'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/currency';
import { BRAND_PRIMARY, CHART_PALETTE } from '@/lib/theme/brandTokens';

const COLORS = CHART_PALETTE;

/**
 * Monthly trend: invoice revenue + GL-based profit on the left axis (currency).
 * Optional invoice volume on the right axis when `orderCount` (or legacy `sales` as count) is present.
 *
 * @param {Object} props
 * @param {any[]} props.data
 * @param {any} [props.colors]
 * @param {string} [props.currency]
 */
export function SalesChart({ data = [], colors, currency = 'PKR' }) {
  const primary = colors?.primary || BRAND_PRIMARY;
  const profitColor = CHART_PALETTE[3] || '#10B981';
  const volumeStroke = '#64748b';

  const volumeKey = (() => {
    if (!data.length) return null;
    if (data.some((d) => d.orderCount != null)) return 'orderCount';
    // SalesManager / legacy: `sales` is invoice count, not currency, only use as volume when values look like counts
    const maxRev = Math.max(...data.map((d) => Number(d.revenue) || 0), 1);
    const maxSales = Math.max(...data.map((d) => Number(d.sales) || 0), 0);
    if (maxSales > 0 && maxSales <= Math.max(500, maxRev / 100)) return 'sales';
    return null;
  })();

  const moneyTick = (v) => formatCurrency(Number(v) || 0, currency, { maximumFractionDigits: 0 });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: volumeKey ? 16 : 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="left" tickFormatter={moneyTick} width={56} tick={{ fontSize: 10 }} />
        {volumeKey ? (
          <YAxis
            yAxisId="right"
            orientation="right"
            allowDecimals={false}
            width={36}
            tick={{ fontSize: 10 }}
            label={{ value: 'Invoices', angle: -90, position: 'insideRight', offset: 10, style: { fontSize: 10, fill: '#94a3b8' } }}
          />
        ) : null}
        <Tooltip
          contentStyle={{ borderRadius: '12px', borderColor: '#f0f0f0' }}
          formatter={(value, name) => {
            if (name === 'Invoice revenue' || name === 'GL profit (net)') {
              return [formatCurrency(Number(value) || 0, currency), name];
            }
            if (name === 'Invoice count') return [value, name];
            return [value, name];
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="revenue"
          name="Invoice revenue"
          stroke={primary}
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 6 }}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="profit"
          name="GL profit (net)"
          stroke={profitColor}
          strokeWidth={2}
          strokeDasharray="6 4"
          dot={{ r: 3 }}
          activeDot={{ r: 6 }}
        />
        {volumeKey ? (
          <Line
            yAxisId="right"
            type="monotone"
            dataKey={volumeKey}
            name="Invoice count"
            stroke={volumeStroke}
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 2 }}
          />
        ) : null}
      </LineChart>
    </ResponsiveContainer>
  );
}

/**
 * @param {Object} props
 * @param {any[]} props.data
 * @param {any} [props.colors]
 * @param {string} [props.currency]
 */
export function RevenueBarChart({ data = [], colors, currency = 'PKR' }) {
  const primary = colors?.primary || BRAND_PRIMARY;
  const secondary = colors?.primaryLight || '#c49c3b';
  const xKey = data[0] && Object.prototype.hasOwnProperty.call(data[0], 'date') ? 'date' : 'name';

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={(v) => formatCurrency(Number(v) || 0, currency, { maximumFractionDigits: 0 })} width={56} tick={{ fontSize: 10 }} />
        <Tooltip
          formatter={(value, name) => [formatCurrency(Number(value) || 0, currency), name === 'revenue' ? 'Invoice revenue' : name === 'profit' ? 'GL profit (net)' : name]}
        />
        <Legend formatter={(value) => (value === 'revenue' ? 'Invoice revenue' : value === 'profit' ? 'GL profit (net)' : value)} />
        <Bar dataKey="revenue" name="revenue" fill={primary} radius={[4, 4, 0, 0]} />
        <Bar dataKey="profit" name="profit" fill={secondary} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * @param {Object} props
 * @param {any[]} props.data
 */
export function CategoryPieChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill={BRAND_PRIMARY}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

/**
 * @param {Object} props
 * @param {any[]} props.data
 * @param {any} [props.colors]
 */
export function RevenueAreaChart({ data, colors }) {
  const primary = colors?.primary || BRAND_PRIMARY;
  const secondary = colors?.primaryLight || '#c49c3b';

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
        <Legend />
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={primary} stopOpacity={0.1} />
            <stop offset="95%" stopColor={primary} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={secondary} stopOpacity={0.1} />
            <stop offset="95%" stopColor={secondary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="revenue" stackId="1" stroke={primary} strokeWidth={3} fill="url(#colorRevenue)" />
        <Area type="monotone" dataKey="expenses" stackId="2" stroke={secondary} strokeWidth={3} fill="url(#colorExpenses)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/**
 * @param {Object} props
 * @param {any[]} props.data
 * @param {any} [props.colors]
 */
export function TopProductsChart({ data, colors, currency = 'PKR' }) {
  const primary = colors?.primary || BRAND_PRIMARY;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" tickFormatter={(v) => formatCurrency(Number(v) || 0, currency, { maximumFractionDigits: 0 })} tick={{ fontSize: 10 }} />
        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0].payload;
            return (
              <div className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs shadow-md">
                <div className="font-semibold text-foreground">{row.name}</div>
                <div className="text-foreground">{formatCurrency(Number(row.value) || 0, currency)}</div>
                {row.volume != null && (
                  <div className="text-muted-foreground mt-0.5">{Number(row.volume).toLocaleString()} units</div>
                )}
              </div>
            );
          }}
        />
        <Bar dataKey="value" name="Revenue" fill={primary} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}








