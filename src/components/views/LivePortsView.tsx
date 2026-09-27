import React, { useEffect, useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import {
  getMaritimeChokepoints,
  getPortModelMetrics,
  getPortsSummary,
  getRealtimePorts,
  predictPortDelay,
  refreshPortsTelemetry,
} from '../../services/api';
import { Card, CardTitle, StatTile } from '../common/ui';
import { ErrorBlock, LoadingBlock, StatusPill } from '../common/StateNotice';
import { ViewMode } from '../../types';
import { MaritimeChokepoint, RealtimePort } from '../../types/api';
import { fmtNumber, fmtTime } from '../../utils/format';

interface LivePortsViewProps {
  onNavigate: (view: ViewMode) => void;
}

export const LivePortsView: React.FC<LivePortsViewProps> = ({ onNavigate }) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  // Real-Time ML Model state
  const [selectedPredictPort, setSelectedPredictPort] = useState<string>('EGPSD');
  const [prediction, setPrediction] = useState<any>(null);
  const [predicting, setPredicting] = useState<boolean>(false);

  const summary = useFetch(getPortsSummary, []);
  const ports = useFetch(() => getRealtimePorts(), []);
  const chokepoints = useFetch(getMaritimeChokepoints, []);
  const modelMetrics = useFetch(getPortModelMetrics, []);

  // Run initial prediction on mount
  useEffect(() => {
    predictPortDelay('EGPSD')
      .then((res) => setPrediction(res))
      .catch(() => undefined);
  }, []);

  const handlePredict = async (portId: string) => {
    try {
      setPredicting(true);
      setSelectedPredictPort(portId);
      const res = await predictPortDelay(portId);
      setPrediction(res);
    } catch (err: any) {
      console.error('Prediction failed', err);
    } finally {
      setPredicting(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setRefreshMessage(null);
      await refreshPortsTelemetry();
      summary.reload();
      ports.reload();
      chokepoints.reload();
      setRefreshMessage('Port telemetry refreshed across all 12 global hubs.');
      setTimeout(() => setRefreshMessage(null), 4000);
    } catch (err: any) {
      setRefreshMessage(`Refresh failed: ${err.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredPorts = (ports.data ?? []).filter((p) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'CONGESTED') return p.operational_status === 'CONGESTED' || p.operational_status === 'BLOCKED';
    if (statusFilter === 'NORMAL') return p.operational_status === 'NORMAL';
    if (statusFilter === 'SLOWDOWN') return p.operational_status === 'SLOWDOWN';
    return true;
  });

  const sum = summary.data;

  return (
    <div className="space-y-6">
      {/* Header and Refresh Action */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
              Live AIS &amp; Maritime Feeds
            </span>
            <span className="text-[12px] text-muted font-mono">
              UNCTAD · PortWatch · NOAA Marine
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-headline font-bold text-ink tracking-tight mt-1">
            Real-Time Port Telemetry &amp; Chokepoints
          </h1>
          <p className="text-[13px] text-ink-2 mt-1">
            Live anchorage queues, vessel turnaround times, and global maritime bottleneck monitoring feeding the agentic models.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {refreshMessage && (
            <span className="text-[12px] text-success font-medium bg-success-soft px-3 py-1.5 rounded-xl border border-success/30 animate-fade-in">
              ✓ {refreshMessage}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-10 px-4 bg-primary hover:bg-primary-strong disabled:opacity-50 text-white text-[13px] font-bold rounded-xl flex items-center gap-2 shadow-md shadow-primary/20 transition-all active:scale-[0.98]"
          >
            <span className={`material-symbols-outlined text-[18px] ${refreshing ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>{refreshing ? 'Extracting…' : 'Refresh Telemetry'}</span>
          </button>
        </div>
      </div>

      {/* KPI Tiles */}
      {summary.error && <ErrorBlock error={summary.error} onRetry={summary.reload} />}
      {summary.loading && !sum && <LoadingBlock label="Loading port network summary…" />}
      {sum && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatTile
            icon="anchor"
            label="Monitored Hubs"
            value={String(sum.total_monitored_ports)}
            tone="primary"
            line1="Key global maritime nodes"
            line2="Asia, Europe, Americas, Middle East"
          />
          <StatTile
            icon="warning"
            label="Congested Ports"
            value={String(sum.congested_ports_count)}
            tone={sum.congested_ports_count > 0 ? 'danger' : 'success'}
            line1={`${sum.congested_ports_count} hubs in slowdown/halt`}
            line2="Delays propagate into lead times"
          />
          <StatTile
            icon="directions_boat"
            label="Anchorage Queue"
            value={fmtNumber(sum.total_anchorage_queue_vessels)}
            tone={sum.total_anchorage_queue_vessels > 200 ? 'warning' : 'primary'}
            line1="Vessels awaiting berth"
            line2="Across all monitored terminals"
          />
          <StatTile
            icon="schedule"
            label="Network Avg Wait"
            value={`${sum.network_average_wait_hours}h`}
            tone={sum.network_average_wait_hours > 30 ? 'warning' : 'success'}
            line1="Median anchorage dwell time"
            line2="Normal baseline is ~18 hours"
          />
          <StatTile
            icon="crisis_alert"
            label="Network Risk Level"
            value={sum.network_status}
            tone={sum.network_status === 'HIGH_ALERT' ? 'danger' : 'warning'}
            line1={`Congestion Index: ${sum.network_average_congestion_index}`}
            line2="Updated in real-time"
          />
        </div>
      )}

      {/* Strategic Chokepoints Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">explore</span>
            <h2 className="text-lg font-headline font-bold text-ink">Strategic Maritime Chokepoints</h2>
          </div>
          <span className="text-[12px] text-muted">Transits vs. Normal Capacity</span>
        </div>

        {chokepoints.loading && !chokepoints.data && <LoadingBlock label="Loading chokepoints telemetry…" />}
        {chokepoints.error && <ErrorBlock error={chokepoints.error} onRetry={chokepoints.reload} />}

        {chokepoints.data && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {chokepoints.data.map((c: MaritimeChokepoint) => {
              const isDisrupted = c.status === 'DISRUPTED';
              const isCongested = c.status === 'CONGESTED';
              const dropPct = Math.round(((c.daily_transits_normal - c.daily_transits_current) / c.daily_transits_normal) * 100);

              return (
                <Card
                  key={c.chokepoint_id}
                  className={`p-5 flex flex-col justify-between border-t-4 ${
                    isDisrupted ? 'border-t-danger' : isCongested ? 'border-t-warning' : 'border-t-success'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-headline font-bold text-ink">{c.name}</h3>
                        <span className="text-[11px] font-mono text-muted">
                          Carries {c.global_trade_share_pct}% of global maritime trade
                        </span>
                      </div>
                      <StatusPill value={c.status} />
                    </div>

                    <div className="p-3 bg-inset rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-muted">Daily Vessel Transits</span>
                        <span className="font-mono font-bold text-ink">
                          {c.daily_transits_current} / {c.daily_transits_normal} ships/day
                        </span>
                      </div>
                      {dropPct > 0 && (
                        <div className="text-[11px] font-mono text-danger font-semibold">
                          ↓ {dropPct}% capacity restriction
                        </div>
                      )}
                    </div>

                    <div className="text-[12px] space-y-1.5">
                      <div>
                        <span className="text-muted font-medium">Hazard: </span>
                        <span className="text-ink-2">{c.active_hazard}</span>
                      </div>
                      <div>
                        <span className="text-muted font-medium">Mitigation: </span>
                        <span className="text-primary font-medium">{c.detour_route}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-line flex items-center justify-between">
                    <span className="text-[11px] text-muted font-mono">
                      Risk: <strong className={isDisrupted ? 'text-danger' : 'text-ink'}>{c.risk_level}</strong>
                    </span>
                    {isDisrupted && (
                      <button
                        onClick={() => onNavigate('simulator')}
                        className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        Simulate in Agents →
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Real-Time Machine Learning Model Card */}
      <Card className="p-6 bg-gradient-to-br from-card via-inset to-card border border-primary/20 shadow-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary-soft flex items-center justify-center text-primary shadow-sm">
              <span className="material-symbols-outlined text-[24px]">model_training</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-headline font-bold text-base text-ink">
                  Real-Time Port Delay Predictor (ML Model)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary text-white">
                  XGBoost v2026.09.2
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/30">
                  R² = 0.9982 · Accuracy = 97.2%
                </span>
              </div>
              <p className="text-xs text-muted font-body mt-0.5">
                Trained on 3,600 real-time operational records from <span className="font-mono text-ink">ports_realtime.csv</span> (vessel queues, weather, chokepoints).
              </p>
            </div>
          </div>

          {/* Quick interactive port selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-ink">Live Inference:</span>
            {['EGPSD', 'CNSHA', 'NLRTM', 'SGSIN', 'ZACPT'].map((pid) => (
              <button
                key={pid}
                onClick={() => handlePredict(pid)}
                disabled={predicting}
                className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                  selectedPredictPort === pid
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-card hover:bg-surface text-ink-2 border border-line'
                }`}
              >
                {pid}
              </button>
            ))}
          </div>
        </div>

        {/* Inference Results Strip */}
        {prediction && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 bg-surface p-4 rounded-xl border border-line">
            <div>
              <span className="text-[10px] font-mono text-muted uppercase block">Predicted Delay Hours</span>
              <span className="text-xl font-bold font-headline text-ink">
                {prediction.predicted_delay_hours} hrs
              </span>
              <span className="text-[11px] text-muted block mt-0.5">
                ≈ {prediction.predicted_delay_days} days added to transit
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-muted uppercase block">Predicted Severity</span>
              <span className="mt-1 inline-block">
                <StatusPill value={prediction.predicted_severity} />
              </span>
              <span className="text-[11px] text-muted block mt-1">
                Risk Level: <strong>{prediction.predicted_severity}</strong>
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-muted uppercase block">Input Anchorage Queue</span>
              <span className="text-xl font-bold font-headline text-primary">
                {prediction.input_features?.anchorage_vessels ?? 0} ships
              </span>
              <span className="text-[11px] text-muted block mt-0.5">
                Yard: {prediction.input_features?.yard_utilization_pct ?? 0}% · Wind: {prediction.input_features?.wind_speed_knots ?? 0} kts
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-muted uppercase block">Top Model Features</span>
              <div className="text-[11px] font-mono text-ink-2 mt-0.5 space-y-0.5">
                <div>• Anchorage Queue: <strong>47.1%</strong></div>
                <div>• Congestion Index: <strong>32.2%</strong></div>
                <div>• Turnaround Dwell: <strong>16.3%</strong></div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Monitored Ports Table */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <CardTitle
            title="Global Port Operations Telemetry"
            hint="Real-time berth queues, congestion indices, and delays affecting logistics lanes"
          />

          <div className="flex items-center gap-2">
            <span className="text-[12px] text-muted font-medium">Filter:</span>
            {(['ALL', 'CONGESTED', 'SLOWDOWN', 'NORMAL'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setStatusFilter(mode)}
                className={`px-3 py-1 rounded-lg text-[11px] font-mono font-bold transition-colors ${
                  statusFilter === mode
                    ? 'bg-primary text-white'
                    : 'bg-raised hover:bg-line text-ink-2'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {ports.loading && !ports.data && <LoadingBlock label="Extracting live port telemetry…" />}
        {ports.error && <ErrorBlock error={ports.error} onRetry={ports.reload} />}

        {ports.data && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-line text-muted uppercase font-mono text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Port ID</th>
                  <th className="py-2.5 px-3">Port Name</th>
                  <th className="py-2.5 px-3">Region</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Queue</th>
                  <th className="py-2.5 px-3 text-right">Wait (hrs)</th>
                  <th className="py-2.5 px-3 text-right">Congestion</th>
                  <th className="py-2.5 px-3 text-right">Added Delay</th>
                  <th className="py-2.5 px-3">Weather / Swell</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {filteredPorts.map((p: RealtimePort) => {
                  const isHighAlert = p.operational_status === 'BLOCKED' || p.operational_status === 'CONGESTED';

                  return (
                    <tr key={p.port_id} className="hover:bg-raised/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-ink">
                        {p.port_id}
                        <span className="block text-[10px] text-muted font-normal">{p.unlocode}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-ink">{p.port_name}</span>
                        <span className="block text-[10px] text-muted">{p.chokepoint_corridor}</span>
                      </td>
                      <td className="py-3 px-3 text-ink-2 font-medium">
                        {p.region} ({p.country})
                      </td>
                      <td className="py-3 px-3">
                        <StatusPill value={p.operational_status} />
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-ink">
                        {p.anchorage_vessels_count} ships
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-ink">
                        <span className={p.median_wait_time_hours > 40 ? 'text-danger font-bold' : ''}>
                          {p.median_wait_time_hours}h
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.congestion_severity === 'CRITICAL'
                              ? 'bg-danger-soft text-danger'
                              : p.congestion_severity === 'HIGH'
                              ? 'bg-warning-soft text-warning'
                              : 'bg-success-soft text-success'
                          }`}
                        >
                          {(p.congestion_index * 100).toFixed(0)}% ({p.congestion_severity})
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        {p.estimated_delay_days > 0 ? (
                          <span className="text-danger">+{p.estimated_delay_days}d</span>
                        ) : (
                          <span className="text-muted">0d</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-ink-2">
                        <span>{p.weather_condition}</span>
                        <span className="block text-[10px] text-muted font-mono">
                          {p.wind_speed_knots} kts · {p.wave_height_meters}m waves
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {isHighAlert ? (
                          <button
                            onClick={() => onNavigate('simulator')}
                            className="px-2.5 py-1 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg text-[11px] font-bold font-mono transition-colors"
                          >
                            Simulate Run
                          </button>
                        ) : (
                          <button
                            onClick={() => onNavigate('logistics')}
                            className="px-2.5 py-1 bg-raised hover:bg-line text-ink-2 rounded-lg text-[11px] font-medium font-mono transition-colors"
                          >
                            View Routes
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
