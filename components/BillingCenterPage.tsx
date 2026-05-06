import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Filter,
  Gift,
  Loader2,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Ticket,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import AuthPanel from './AuthPanel';
import {
  AUTH_SESSION_CHANGE_EVENT,
  AuthSessionPayload,
  fetchCurrentAuthSession,
} from '../src/services/accountIdentity';
import {
  BillingCenterPayload,
  BillingLedgerEntry,
  fetchBillingCenter,
  redeemBillingCode,
} from '../src/services/accountService';
import { formatPoint } from '../src/utils/pointFormat';

type FilterState = {
  startDate: string;
  endDate: string;
  type: string;
  modelId: string;
  routeId: string;
};

const typeLabelMap: Record<string, string> = {
  signup: '注册赠送',
  recharge: '管理员分配',
  charge: '生成扣点',
  refund: '失败退款',
  admin_credit: '管理员加点',
  admin_debit: '管理员减点',
  redeem_code: '兑换码入账',
};

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const createDefaultFilters = (): FilterState => {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 4);
  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(today),
    type: '',
    modelId: '',
    routeId: '',
  };
};

const formatTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : '暂无';

const renderLedgerMeta = (entry: BillingLedgerEntry) => {
  if (!entry.meta || typeof entry.meta !== 'object') return null;
  const parts = [
    String(entry.meta.note || '').trim(),
    String(entry.meta.code || '').trim(),
    String(entry.meta.routeId || '').trim(),
    String(entry.meta.modelId || entry.meta.model || '').trim(),
    String(entry.meta.taskId || '').trim(),
  ].filter(Boolean);
  return parts.length ? parts.join(' / ') : null;
};

const StatCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) => (
  <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
    <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
      {icon}
      {label}
    </div>
    <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
  </div>
);

const BillingCenterPage: React.FC = () => {
  const [session, setSession] = useState<AuthSessionPayload | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [data, setData] = useState<BillingCenterPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftFilters, setDraftFilters] = useState<FilterState>(() => createDefaultFilters());
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(() => createDefaultFilters());
  const [page, setPage] = useState(1);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const refreshSession = useCallback(async () => {
    setSessionLoading(true);
    try {
      const next = await fetchCurrentAuthSession();
      setSession(next);
    } finally {
      setSessionLoading(false);
    }
  }, []);

  const loadBillingCenter = useCallback(async () => {
    if (!session?.authenticated) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const next = await fetchBillingCenter({
        page,
        pageSize: 20,
        ...appliedFilters,
      });
      setData(next);
    } catch (loadError) {
      setError((loadError as Error).message);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page, session?.authenticated]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    const handleSessionChange = () => {
      void refreshSession();
    };
    window.addEventListener(AUTH_SESSION_CHANGE_EVENT, handleSessionChange);
    window.addEventListener('storage', handleSessionChange);
    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGE_EVENT, handleSessionChange);
      window.removeEventListener('storage', handleSessionChange);
    };
  }, [refreshSession]);

  useEffect(() => {
    void loadBillingCenter();
  }, [loadBillingCenter]);

  const titleText = useMemo(() => {
    if (!session?.authenticated) return '额度明细';
    return session.user.displayName || session.user.email || '额度明细';
  }, [session]);

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters(draftFilters);
  };

  const resetFilters = () => {
    const next = createDefaultFilters();
    setDraftFilters(next);
    setAppliedFilters(next);
    setPage(1);
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) {
      setError('请输入兑换码');
      return;
    }

    setRedeeming(true);
    setError(null);
    try {
      await redeemBillingCode({ code: redeemCode.trim() });
      setRedeemCode('');
      await loadBillingCenter();
    } catch (redeemError) {
      setError((redeemError as Error).message);
    } finally {
      setRedeeming(false);
    }
  };

  const updateDraft = (key: keyof FilterState, value: string) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#020617_0%,#0b1120_45%,#020617_100%)] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-gray-200">
            <Loader2 size={16} className="animate-spin" />
            正在加载额度明细...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-[linear-gradient(180deg,#020617_0%,#0b1120_45%,#020617_100%)] px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-sky-300">Wuling Credits</div>
            <h1 className="mt-2 text-3xl font-semibold text-white">{titleText}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-400">
              查看当前账号点数、管理员分配、生成扣点、失败退款和兑换码入账记录。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                window.location.href = '/create/canvas';
              }}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white hover:bg-white/10"
            >
              <ArrowLeft size={15} />
              返回画布版
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/create/classic';
              }}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white hover:bg-white/10"
            >
              <ArrowLeft size={15} />
              返回经典版
            </button>
          </div>
        </div>

        {!session?.authenticated ? (
          <div className="space-y-6">
            <div className="rounded-[28px] border border-amber-500/20 bg-amber-500/10 p-6">
              <div className="text-sm font-medium text-amber-100">登录后可查看完整额度明细</div>
              <p className="mt-2 text-sm leading-7 text-amber-100/80">
                额度明细会展示你在所选时间范围内的消耗、管理员分配、退款、兑换码入账以及分页记录。
              </p>
            </div>
            <AuthPanel session={session} onSessionChange={setSession} />
          </div>
        ) : (
          <>
            {error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <StatCard icon={<Wallet size={16} />} label="当前点数" value={formatPoint(data?.account.points || 0)} />
              <StatCard icon={<TrendingDown size={16} />} label="所选时间内消耗" value={formatPoint(data?.summary.spentPoints || 0)} />
              <StatCard icon={<Gift size={16} />} label="管理员分配/兑换" value={formatPoint((data?.summary.rechargedPoints || 0) + (data?.summary.redeemedPoints || 0))} />
              <StatCard icon={<RotateCcw size={16} />} label="失败退款" value={formatPoint(data?.summary.refundedPoints || 0)} />
              <StatCard icon={<ReceiptText size={16} />} label="记录条数" value={Number(data?.summary.totalCount || 0)} />
              <StatCard icon={<Ticket size={16} />} label="账号 ID" value={<span className="text-base">{data?.account.accountId || '-'}</span>} />
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Filter size={16} />
                    明细筛选
                  </div>
                  <p className="mt-1 text-xs leading-6 text-gray-400">
                    支持按日期、类型、模型和线路筛选，并自动刷新统计卡片。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadBillingCenter()}
                  disabled={loading}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs text-gray-200 hover:bg-white/10 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  刷新
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-5">
                <input type="date" value={draftFilters.startDate} onChange={(event) => updateDraft('startDate', event.target.value)} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" />
                <input type="date" value={draftFilters.endDate} onChange={(event) => updateDraft('endDate', event.target.value)} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white" />
                <select value={draftFilters.type} onChange={(event) => updateDraft('type', event.target.value)} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white">
                  <option value="">全部类型</option>
                  {Object.entries(typeLabelMap).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <select value={draftFilters.modelId} onChange={(event) => updateDraft('modelId', event.target.value)} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white">
                  <option value="">全部模型</option>
                  {data?.filters.availableModels.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
                <select value={draftFilters.routeId} onChange={(event) => updateDraft('routeId', event.target.value)} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white">
                  <option value="">全部线路</option>
                  {data?.filters.availableRoutes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={applyFilters} className="h-10 rounded-xl bg-sky-500 px-4 text-sm font-medium text-slate-950 hover:bg-sky-400">应用筛选</button>
                <button type="button" onClick={resetFilters} className="h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white hover:bg-white/10">重置</button>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Ticket size={16} />
                    兑换码兑换
                  </div>
                  <p className="mt-1 text-xs leading-6 text-gray-400">兑换成功后会立即刷新当前点数。</p>
                </div>
                <div className="flex min-w-[280px] flex-1 gap-2 sm:flex-initial">
                  <input value={redeemCode} onChange={(event) => setRedeemCode(event.target.value)} placeholder="输入兑换码" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder-gray-500" />
                  <button type="button" onClick={() => void handleRedeem()} disabled={redeeming} className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-400 px-4 text-sm font-semibold text-black disabled:opacity-60">
                    {redeeming && <Loader2 size={13} className="animate-spin" />}
                    兑换
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                <div>
                  <div className="text-sm font-semibold text-white">流水记录</div>
                  <div className="mt-1 text-xs text-gray-400">
                    第 {data?.ledger.page || 1} / {data?.ledger.totalPages || 1} 页，共 {data?.ledger.total || 0} 条
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={(data?.ledger.page || 1) <= 1} className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white disabled:opacity-40">上一页</button>
                  <button type="button" onClick={() => setPage((prev) => prev + 1)} disabled={(data?.ledger.page || 1) >= (data?.ledger.totalPages || 1)} className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white disabled:opacity-40">下一页</button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                  <thead className="bg-white/[0.03] text-xs text-gray-400">
                    <tr>
                      <th className="px-5 py-3">类型</th>
                      <th className="px-5 py-3">点数</th>
                      <th className="px-5 py-3">余额</th>
                      <th className="px-5 py-3">说明</th>
                      <th className="px-5 py-3">时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data?.ledger.entries.length ? data.ledger.entries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-5 py-3 text-gray-200">{typeLabelMap[entry.type] || entry.type}</td>
                        <td className="px-5 py-3 font-medium text-white">{formatPoint(entry.points)} 点</td>
                        <td className="px-5 py-3 text-gray-300">{formatPoint(entry.balanceAfter)} 点</td>
                        <td className="max-w-[420px] px-5 py-3 text-xs text-gray-400">{renderLedgerMeta(entry) || '-'}</td>
                        <td className="px-5 py-3 text-gray-400">{formatTime(entry.createdAt)}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-500">暂无记录</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BillingCenterPage;
