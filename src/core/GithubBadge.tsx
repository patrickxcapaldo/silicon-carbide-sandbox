import React from 'react';
import './ui/ui.css';

export interface GithubBadgeProps {
  label: string;
  value: string;
  /**
   * neutral: plain metadata. link: navigates somewhere (Orchid edge, the
   * single accent). Colour never encodes anything else on a badge.
   */
  tone?: 'neutral' | 'link';
  href?: string;
  title?: string;
}

/** Two-segment flat badge: quiet label, plain value. No gradients, no motion. */
export const GithubBadge: React.FC<GithubBadgeProps> = ({ label, value, tone, href, title }) => {
  const resolved = tone ?? (href ? 'link' : 'neutral');
  const content = (
    <span className={`sci-badge sci-badge--${resolved}`} title={title}>
      <span className="sci-badge__label">{label}</span>
      <span className="sci-badge__value">{value}</span>
    </span>
  );
  return href ? (
    <a className="sci-badge-link" href={href}>
      {content}
    </a>
  ) : (
    content
  );
};
