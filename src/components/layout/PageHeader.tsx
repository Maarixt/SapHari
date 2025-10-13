import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-ink-900">{title}</h2>
        <div className="flex gap-2">{actions}</div>
      </div>
      {subtitle && <p className="text-sm text-ink-600 mt-1">{subtitle}</p>}
    </div>
  );
}
