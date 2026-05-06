import React, { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  Boxes,
  CircleCheckBig,
  Clock3,
  Loader2,
  Network,
  RefreshCw,
  Users,
  Wallet,
} from 'lucide-react';
import {
  AdminDashboardModelStat,
  AdminDashboardPayload,
  AdminDashboardRouteStat,
} from '../src/services/adminDashboardService';
import { formatPoint } from '../src/utils/pointFormat';

interface AdminOverviewPanelProps {
  data: AdminDashboardPayload | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const formatTime = (value?: string | null) => (value ? new Date(value).toLocaleString() : '暂无');
const formatRate = (value?: number | null) => `${Number(value || 0).toFixed(1)}%`;

const typeLabel = (value?: string) => {
  if (value === 'video') return '视频';
  if (value === 'image') return '图片';
  return '未知';
};

const healthTone = (failed30m = 0, pending = 0, successRate30m = 0) => {
  if (failed30m >= 3 || pending >= 10 || successRate30m < 60) return 'danger';
  if (failed30m > 0 || pending > 0 || successRate30m < 85) return 'warn';
  return 'ok';
};

const MetricCard = ({
  title,
  value,
  hint,
  icon,
  tone = 'default',
}: {
  title: string;
  value: React.ReactNode;
  hint: string;
  icon: React.ReactNode;
  tone?: 'default' | 'ok' | 'warn' | 'danger';
}) => {
  const toneClass =
    tone === 'danger'
      ? 'border-red-400/25 bg-red-500/10 text-red-100'
      : tone === 'warn'
        ? 'border-amber-300/25 bg-amber-500/10 text-amber-100'
        : tone === 'ok'
          ? 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100'
          : 'border-white/10 bg-white/[0.04] text-cyan-100';

  return (
    <div className={`rounded-2xl border p-4 shadow-[0_12px_40px_rgba(0,0,0,0.18)] ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.18em] text-current/60">{title}</div>
          <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
          <div className="mt-2 text-xs leading-5 text-current/72">{hint}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-current">{icon}</div>
      </div>
    </div>
  );
};

const Section = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
    <div className="mb-4">
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-1 text-xs leading-5 text-gray-400">{description}</div>
    </div>
    {children}
  </div>
);

const RouteRow = ({ route }: { route: AdminDashboardRouteStat }) => {
  const tone = healthTone(route.failedLast30m, route.pendingTasks, route.successRateLast30m);
  return (
    <tr className="align-top">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Network size={14} className="text-sky-300" />
          <div>
            <div className="font-medium text-white">{route.label}</div>
            <div className="mt-1 text-xs text-gray-400">
              {typeLabel(route.mediaType)} / {route.modelFamily} / {route.line || 'default'} / {route.mode}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-gray-300">
        <span
          className={
            tone === 'danger'
              ? 'rounded-full bg-red-500/15 px-2 py-1 text-red-200'
              : tone === 'warn'
                ? 'rounded-full bg-amber-500/15 px-2 py-1 text-amber-200'
                : 'rounded-full bg-emerald-500/15 px-2 py-1 text-emerald-200'
          }
        >
          {formatRate(route.successRateLast30m)}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-300">{route.requestsLast30m}</td>
      <td className="px-4 py-3 text-gray-300">{route.failedLast30m}</td>
      <td className="px-4 py-3 text-gray-300">{route.pendingTasks}</td>
      <td className="px-4 py-3 text-gray-300">{formatRate(route.successRateLast24h)}</td>
      <td className="px-4 py-3 text-gray-400">{formatTime(route.lastChargeAt)}</td>
    </tr>
  );
};

const ModelRow = ({ model }: { model: AdminDashboardModelStat }) => (
  <tr className="align-top">
    <td className="px-4 py-3">
      <div className="flex items-center gap-2">
        <Boxes size={14} className="text-cyan-300" />
        <div>
          <div className="font-medium text-white">{model.label}</div>
          <div className="mt-1 text-xs text-gray-400">
            {typeLabel(model.mediaType)} / {model.modelId || model.modelKey}
          </div>
        </div>
      </div>
    </td>
    <td className="px-4 py-3 text-gray-300">{model.requestsLast30m}</td>
    <td className="px-4 py-3 text-gray-300">{model.failedLast30m}</td>
    <td className="px-4 py-3 text-gray-300">{formatRate(model.successRateLast30m)}</td>
    <td className="px-4 py-3 text-gray-300">{formatPoint(model.netSpentPointsLast30m)} 点</td>
    <td className="px-4 py-3 text-gray-400">{formatTime(model.lastChargeAt)}</td>
  </tr>
);

const AdminOverviewPanel: React.FC<AdminOverviewPanelProps> = ({
  data,
  loading,
  error,
  onRefresh,
}) => {
  const routeWatchList = useMemo(() => {
    const routes = data?.routeStats || [];
    return routes
      .filter((route) => healthTone(route.failedLast30m, route.pendingTasks, route.successRateLast30m) !== 'ok')
      .sort((a, b) => b.failedLast30m + b.pendingTasks - (a.failedLast30m + a.pendingTasks))
      .slice(0, 6);
  }, [data?.routeStats]);

  const modelWatchList = useMemo(() => {
    const models = data?.modelStats || [];
    return models
      .filter((model) => model.failedLast30m > 0 || model.successRateLast30m < 85)
      .sort((a, b) => b.failedLast30m - a.failedLast30m)
      .slice(0, 6);
  }, [data?.modelStats]);

  const failed30m = data?.billing?.failedLast30m ?? 0;
  const pendingTasks = data?.billing?.pendingTasks ?? 0;
  const dashboardTone = healthTone(failed30m, pendingTasks, data?.billing?.successRateLast30m ?? 0);

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-sky-500/20 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_40%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.98))] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.32)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-sky-200">
              <Activity size={12} />
              武陵商厦运营总览
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">企业创作平台管理后台</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-300">
              重点观察最近 30 分钟请求、失败、待处理任务和线路成功率。异常模式会自动进入关注列表，便于快速停用或切换线路。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-gray-300">
              <div className="text-[11px] uppercase tracking-[0.18em] text-gray-500">最近刷新</div>
              <div className="mt-1 font-medium text-white">
                {data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : '等待载入'}
              </div>
            </div>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-60"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              刷新看板
            </button>
          </div>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <MetricCard
          title="在线用户"
          value={data?.auth?.onlineUsers ?? 0}
          hint={`过去 ${data?.windows?.onlineWindowMinutes ?? 5} 分钟活跃，当前有效会话 ${data?.auth?.activeSessions ?? 0}`}
          icon={<Users size={20} />}
          tone="ok"
        />
        <MetricCard
          title="30 分钟请求"
          value={data?.billing?.requestsLast30m ?? 0}
          hint={`成功 ${data?.billing?.successfulLast30m ?? 0}，失败 ${failed30m}，成功率 ${formatRate(data?.billing?.successRateLast30m)}`}
          icon={<Activity size={20} />}
          tone={dashboardTone}
        />
        <MetricCard
          title="待处理任务"
          value={pendingTasks}
          hint="长时间不收敛时，优先查看上游线路状态和服务器负载。"
          icon={<Clock3 size={20} />}
          tone={pendingTasks > 0 ? 'warn' : 'ok'}
        />
        <MetricCard
          title="24 小时成功率"
          value={formatRate(data?.billing?.successRateLast24h)}
          hint={`24 小时请求 ${data?.billing?.requestsLast24h ?? 0}，失败 ${data?.billing?.failedLast24h ?? 0}`}
          icon={<CircleCheckBig size={20} />}
        />
        <MetricCard
          title="总用户数"
          value={data?.auth?.totalUsers ?? 0}
          hint={`活跃 ${data?.auth?.activeUsers ?? 0}，停用 ${data?.auth?.disabledUsers ?? 0}，管理员 ${data?.auth?.adminUsers ?? 0}`}
          icon={<Users size={20} />}
        />
        <MetricCard
          title="点数余额"
          value={formatPoint(data?.billing?.totalBalancePoints ?? 0)}
          hint={`管理员分配 ${formatPoint(data?.billing?.totalRechargedPoints ?? 0)} 点，累计净消耗 ${formatPoint(data?.billing?.netSpentPoints ?? 0)} 点`}
          icon={<Wallet size={20} />}
        />
      </div>

      <Section title="需要关注" description="出现失败、积压或短时成功率偏低的线路和模型会显示在这里。">
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <AlertTriangle size={16} className="text-amber-300" />
              线路关注
            </div>
            {routeWatchList.length ? (
              <div className="space-y-2">
                {routeWatchList.map((route) => (
                  <div key={route.routeId} className="rounded-xl border border-amber-300/15 bg-amber-500/10 px-3 py-2 text-xs text-amber-50/90">
                    <div className="font-semibold text-white">{route.label}</div>
                    <div className="mt-1 text-amber-100/75">
                      30 分钟失败 {route.failedLast30m}，积压 {route.pendingTasks}，成功率 {formatRate(route.successRateLast30m)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-300/15 bg-emerald-500/10 px-3 py-5 text-center text-sm text-emerald-100/80">暂无需要关注的线路</div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <AlertTriangle size={16} className="text-amber-300" />
              模型关注
            </div>
            {modelWatchList.length ? (
              <div className="space-y-2">
                {modelWatchList.map((model) => (
                  <div key={model.modelKey} className="rounded-xl border border-amber-300/15 bg-amber-500/10 px-3 py-2 text-xs text-amber-50/90">
                    <div className="font-semibold text-white">{model.label}</div>
                    <div className="mt-1 text-amber-100/75">
                      30 分钟请求 {model.requestsLast30m}，失败 {model.failedLast30m}，成功率 {formatRate(model.successRateLast30m)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-300/15 bg-emerald-500/10 px-3 py-5 text-center text-sm text-emerald-100/80">暂无需要关注的模型</div>
            )}
          </div>
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
        <Section title="线路运行情况" description="按线路查看最近 30 分钟、24 小时和累计表现。">
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                <thead className="bg-white/[0.03] text-[11px] uppercase tracking-[0.16em] text-gray-400">
                  <tr>
                    <th className="px-4 py-3">线路</th>
                    <th className="px-4 py-3">30 分钟成功率</th>
                    <th className="px-4 py-3">30 分钟请求</th>
                    <th className="px-4 py-3">30 分钟失败</th>
                    <th className="px-4 py-3">积压</th>
                    <th className="px-4 py-3">24 小时成功率</th>
                    <th className="px-4 py-3">最近请求</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-black/10">
                  {data?.routeStats?.length ? (
                    data.routeStats.map((route) => <RouteRow key={route.routeId} route={route} />)
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">暂无线路统计数据</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Section>

        <Section title="模型运行情况" description="按模型查看最近 30 分钟请求、失败和净消耗。">
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                <thead className="bg-white/[0.03] text-[11px] uppercase tracking-[0.16em] text-gray-400">
                  <tr>
                    <th className="px-4 py-3">模型</th>
                    <th className="px-4 py-3">30 分钟请求</th>
                    <th className="px-4 py-3">30 分钟失败</th>
                    <th className="px-4 py-3">30 分钟成功率</th>
                    <th className="px-4 py-3">30 分钟净消耗</th>
                    <th className="px-4 py-3">最近请求</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-black/10">
                  {data?.modelStats?.length ? (
                    data.modelStats.map((model) => <ModelRow key={model.modelKey} model={model} />)
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">暂无模型统计数据</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
};

export default AdminOverviewPanel;
