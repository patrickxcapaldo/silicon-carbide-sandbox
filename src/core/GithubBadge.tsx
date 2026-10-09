import React from 'react';

export interface GithubBadgeProps {
  label: string;
  value: string;
  color?: string;
  href?: string;
  title?: string;
}

export const GithubBadge: React.FC<GithubBadgeProps> = ({
  label,
  value,
  color = '#0969da',
  href,
  title,
}) => {
  const content = (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: 'var(--mono)',
        fontSize: '0.72rem',
        fontWeight: 500,
        borderRadius: '4px',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        lineHeight: 1,
        userSelect: 'none',
        boxShadow: 'var(--shadow-sm)',
        verticalAlign: 'middle',
      }}
      title={title}
    >
      <span
        style={{
          background: 'var(--bg-surface)',
          color: 'var(--text-muted)',
          padding: '0.24rem 0.45rem',
          borderRight: '1px solid var(--border)',
          letterSpacing: '0.01em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          background: color,
          color: '#ffffff',
          padding: '0.24rem 0.5rem',
          fontWeight: 600,
          letterSpacing: '0.01em',
        }}
      >
        {value}
      </span>
    </span>
  );

  if (href) {
    return (
      <a
        href={href}
        style={{
          textDecoration: 'none',
          display: 'inline-flex',
          cursor: 'pointer',
          transition: 'opacity 0.15s ease, transform 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.85';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.transform = 'none';
        }}
      >
        {content}
      </a>
    );
  }

  return content;
};
