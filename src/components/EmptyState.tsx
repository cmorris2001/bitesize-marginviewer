import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, text, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty-icon">
        {icon ?? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        )}
      </div>
      <div className="empty-title">{title}</div>
      <div className="empty-text">{text}</div>
      {action}
    </div>
  );
}
