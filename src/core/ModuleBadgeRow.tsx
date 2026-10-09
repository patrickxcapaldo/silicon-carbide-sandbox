import React from 'react';
import type { Manifest } from './types';
import { GithubBadge } from './GithubBadge';
import { getAllModules } from './registry';

interface ModuleBadgeRowProps {
  manifest: Manifest;
}

const tagChip: React.CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 500,
  fontFamily: 'var(--mono)',
  background: 'var(--tag-bg)',
  color: 'var(--tag-text)',
  padding: '0.2rem 0.45rem',
  borderRadius: '4px',
  border: '1px solid var(--border)',
  lineHeight: 1.4,
};

/**
 * Three-row badge block rendered below a module's heading/summary:
 *   Row 1 – module identity badge (+ optional contract badge)
 *   Row 2 – one clickable "interfaces" badge per interfaced module (with version)
 *   Row 3 – topic tag chips
 *
 * Interface versions are resolved by looking up the live registry, so they
 * stay correct automatically as companion modules are versioned independently.
 */
export const ModuleBadgeRow: React.FC<ModuleBadgeRowProps> = ({ manifest }) => {
  const { contractVersion } = manifest;
  // Build a version lookup map from the registry once per render.
  // getAllModules() is cheap (eager-imported, already in memory).
  const versionMap = React.useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const mod of getAllModules()) {
      map[mod.manifest.id] = mod.manifest.releaseVersion;
    }
    return map;
  }, []);

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '0.45rem',
    flexWrap: 'wrap',
    alignItems: 'center',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
      {/* Row 1 – module identity */}
      <div style={rowStyle}>
        <GithubBadge
          label="module"
          value={`${manifest.id} v${manifest.releaseVersion}`}
          color="#0969da"
        />
        {contractVersion && (
          <GithubBadge label="contract" value={`v${contractVersion}`} color="#8250df" />
        )}
      </div>

      {/* Row 2 – interfaced companion modules (only rendered when there are any) */}
      {manifest.interfaces && manifest.interfaces.length > 0 && (
        <div style={rowStyle}>
          {manifest.interfaces.map((modId) => {
            const version = versionMap[modId];
            const value = version ? `${modId} v${version}` : modId;
            return (
              <GithubBadge
                key={modId}
                label="interfaces"
                value={value}
                color="#2da44e"
                href={`/?module=${modId}`}
                title={`Open interfaced companion module: ${modId}`}
              />
            );
          })}
        </div>
      )}

      {/* Row 3 – topic tags */}
      {manifest.tags.length > 0 && (
        <div style={rowStyle}>
          {manifest.tags.map((tag) => (
            <span key={tag} style={tagChip}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
