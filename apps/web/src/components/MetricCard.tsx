import type { ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';

export default function MetricCard({ icon, label, value, unit, detail, accent, loading }: { icon: ReactNode; label: string; value: string; unit?: string; detail: ReactNode; accent: string; loading: boolean }) {
  return <article className={`metric-card metric-${accent}`}><div className="metric-top"><div className="metric-icon">{icon}</div><MoreHorizontal size={18} className="metric-more" /></div><div className="metric-label">{label}</div>{loading ? <div className="metric-skeleton" /> : <div className="metric-value">{value}<span>{unit}</span></div>}<div className="metric-detail">{detail}</div></article>;
}
