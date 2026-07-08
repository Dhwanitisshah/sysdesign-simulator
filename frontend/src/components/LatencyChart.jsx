import { useCallback, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { sweepGraph } from '../api'

function toChartPoint(point) {
  return {
    lambda: point.lambda,
    latencyMs: point.end_to_end_latency != null ? point.end_to_end_latency * 1000 : null,
  }
}

function LatencyChart({ nodes, edges }) {
  const [sweep, setSweep] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const runSweep = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: sweepError } = await sweepGraph(nodes, edges)
    setLoading(false)
    if (sweepError) {
      setError(sweepError)
      setSweep(null)
      return
    }
    setSweep(data)
  }, [nodes, edges])

  const chartData = sweep ? sweep.points.map(toChartPoint) : []

  return (
    <div className="latency-chart">
      <div className="latency-chart__header">
        <span className="latency-chart__title">Latency vs. load (λ)</span>
        <button
          type="button"
          className="latency-chart__button"
          onClick={runSweep}
          disabled={loading || nodes.length === 0}
        >
          {loading ? 'Running…' : 'Run load sweep'}
        </button>
      </div>

      {error && <div className="latency-chart__error">{error}</div>}

      {sweep && (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="lambda"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(v) => v.toFixed(0)}
              label={{ value: 'λ (req/s)', position: 'insideBottom', offset: -4, fontSize: 11 }}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              label={{ value: 'latency (ms)', angle: -90, position: 'insideLeft', fontSize: 11 }}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(value) => (value == null ? 'Saturated' : `${value.toFixed(1)} ms`)}
              labelFormatter={(v) => `λ = ${v.toFixed(1)} req/s`}
            />
            <ReferenceLine
              x={sweep.saturation_lambda}
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{ value: 'saturation point', position: 'top', fill: '#ef4444', fontSize: 11 }}
            />
            <Line
              type="monotone"
              dataKey="latencyMs"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

export default LatencyChart
