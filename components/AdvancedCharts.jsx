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
  const primary = colors?.primary || '#3b82f6'; // Blue
  const profitColor = '#10b981'; // Emerald green
  const volumeStroke = '#8b5cf6'; // Purple

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
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: volumeKey ? 20 : 10, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={primary} stopOpacity={0.15} />
            <stop offset="95%" stopColor={primary} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={profitColor} stopOpacity={0.15} />
            <stop offset="95%" stopColor={profitColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 11, fill: '#6b7280' }} 
          tickLine={{ stroke: '#e5e7eb' }}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis 
          yAxisId="left" 
          tickFormatter={moneyTick} 
          width={70} 
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={{ stroke: '#e5e7eb' }}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        {volumeKey ? (
          <YAxis
            yAxisId="right"
            orientation="right"
            allowDecimals={false}
            width={45}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={{ stroke: '#e5e7eb' }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
        ) : null}
        <Tooltip
          contentStyle={{ 
            borderRadius: '8px', 
            border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            fontSize: '12px'
          }}
          formatter={(value, name) => {
            if (name === 'Revenue' || name === 'Profit') {
              return [formatCurrency(Number(value) || 0, currency), name];
            }
            if (name === 'Orders') return [value, name];
            return [value, name];
          }}
        />
        <Legend 
          wrapperStyle={{ fontSize: 12, paddingTop: 10 }} 
          iconType="circle"
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke={primary}
          strokeWidth={3}
          dot={{ r: 4, fill: primary, strokeWidth: 2, stroke: '#fff' }}
          activeDot={{ r: 6, fill: primary, strokeWidth: 2, stroke: '#fff' }}
          fill="url(#colorRevenue)"
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="profit"
          name="Profit"
          stroke={profitColor}
          strokeWidth={3}
          strokeDasharray="6 4"
          dot={{ r: 4, fill: profitColor, strokeWidth: 2, stroke: '#fff' }}
          activeDot={{ r: 6, fill: profitColor, strokeWidth: 2, stroke: '#fff' }}
          fill="url(#colorProfit)"
        />
        {volumeKey ? (
          <Line
            yAxisId="right"
            type="monotone"
            dataKey={volumeKey}
            name="Orders"
            stroke={volumeStroke}
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 3, fill: volumeStroke }}
          />
        ) : null}
      </LineChart>
    </ResponsiveContainer>
  );
}

/**
 * AIC-style revenue area chart — blue-to-purple gradient fill.
 *
 * @param {Object} props
 * @param {any[]} props.data
 * @param {any} [props.colors]
 * @param {string} [props.currency]
 */
export function SalesTrendAreaChart({ data = [], colors, currency = 'PKR' }) {
  const primary = colors?.primary || '#3b82f6';
  const accent = colors?.primaryLight || '#8b5cf6';
  const xKey = data[0] && Object.prototype.hasOwnProperty.call(data[0], 'date') ? 'date' : 'name';
  const moneyTick = (v) => formatCurrency(Number(v) || 0, currency, { maximumFractionDigits: 0 });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id="premiumAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={primary} stopOpacity={0.4} />
            <stop offset="45%" stopColor={accent} stopOpacity={0.2} />
            <stop offset="100%" stopColor={accent} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="premiumAreaStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={primary} />
            <stop offset="100%" stopColor={accent} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={{ stroke: '#e2e8f0' }}
        />
        <YAxis
          tickFormatter={moneyTick}
          width={68}
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 30px rgba(15,23,42,0.12)',
            fontSize: '12px',
          }}
          formatter={(value) => [formatCurrency(Number(value) || 0, currency), 'Revenue']}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke="url(#premiumAreaStroke)"
          strokeWidth={2.5}
          fill="url(#premiumAreaFill)"
          dot={{ r: 3, fill: primary, strokeWidth: 2, stroke: '#fff' }}
          activeDot={{ r: 5, fill: accent, strokeWidth: 2, stroke: '#fff' }}
        />
      </AreaChart>
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
  const primary = colors?.primary || '#3b82f6'; // Blue
  const secondary = '#8b5cf6'; // Purple
  const xKey = data[0] && Object.prototype.hasOwnProperty.call(data[0], 'date') ? 'date' : 'name';

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id="barRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={primary} stopOpacity={0.9} />
            <stop offset="100%" stopColor={primary} stopOpacity={0.7} />
          </linearGradient>
          <linearGradient id="barProfit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={secondary} stopOpacity={0.9} />
            <stop offset="100%" stopColor={secondary} stopOpacity={0.7} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
        <XAxis 
          dataKey={xKey} 
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={{ stroke: '#e5e7eb' }}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis 
          tickFormatter={(v) => formatCurrency(Number(v) || 0, currency, { maximumFractionDigits: 0 })} 
          width={70} 
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={{ stroke: '#e5e7eb' }}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <Tooltip
          contentStyle={{ 
            borderRadius: '8px', 
            border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            fontSize: '12px'
          }}
          formatter={(value, name) => [
            formatCurrency(Number(value) || 0, currency), 
            name === 'revenue' ? 'Revenue' : name === 'profit' ? 'Profit' : name
          ]}
        />
        <Legend 
          formatter={(value) => (value === 'revenue' ? 'Revenue' : value === 'profit' ? 'Profit' : value)}
          wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
          iconType="circle"
        />
        <Bar dataKey="revenue" name="revenue" fill="url(#barRevenue)" radius={[8, 8, 0, 0]} />
        <Bar dataKey="profit" name="profit" fill="url(#barProfit)" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * @param {Object} props
 * @param {any[]} props.data
 */
export function CategoryPieChart({ data }) {
  // Enhanced color palette matching the inspiring dashboards
  const ENHANCED_COLORS = [
    '#3b82f6', // Blue
    '#8b5cf6', // Purple
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#06b6d4', // Cyan
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f97316', // Orange
    '#6366f1', // Indigo
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={{
            stroke: '#9ca3af',
            strokeWidth: 1
          }}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={90}
          innerRadius={50}
          fill="#3b82f6"
          dataKey="value"
          paddingAngle={2}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={ENHANCED_COLORS[index % ENHANCED_COLORS.length]}
              stroke="#fff"
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: '8px',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            fontSize: '12px'
          }}
        />
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
  const primary = colors?.primary || '#3b82f6';

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
        <defs>
          <linearGradient id="barTopProduct" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={primary} stopOpacity={0.7} />
            <stop offset="100%" stopColor={primary} stopOpacity={0.9} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} horizontal={true} vertical={false} />
        <XAxis 
          type="number" 
          tickFormatter={(v) => formatCurrency(Number(v) || 0, currency, { maximumFractionDigits: 0 })} 
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={{ stroke: '#e5e7eb' }}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis 
          dataKey="name" 
          type="category" 
          width={110} 
          tick={{ fontSize: 11, fill: '#374151', fontWeight: 500 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0].payload;
            return (
              <div className="rounded-lg border-0 bg-white px-3 py-2 text-xs shadow-xl">
                <div className="font-bold text-gray-900 mb-1">{row.name}</div>
                <div className="text-blue-600 font-semibold">{formatCurrency(Number(row.value) || 0, currency)}</div>
                {row.volume != null && (
                  <div className="text-gray-600 mt-1">{Number(row.volume).toLocaleString()} units sold</div>
                )}
              </div>
            );
          }}
        />
        <Bar 
          dataKey="value" 
          name="Revenue" 
          fill="url(#barTopProduct)" 
          radius={[0, 8, 8, 0]}
          barSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}








