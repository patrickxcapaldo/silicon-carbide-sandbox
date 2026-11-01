import React from 'react';
import type { Manifest } from './types';
import { GithubBadge } from './GithubBadge';
import { getAllModules } from './registry';
import './ui/ui.css';

interface ModuleBadgeRowProps {
  manifest: Manifest;
}

/**
 * Three-row badge block rendered below a module's heading/summary:
 *   Row 1 – module identity badge (+ contract badge, + realism label)
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
        />
        {contractVersion && <GithubBadge label="contract" value={`v${contractVersion}`} />}
        {manifest.realism && (
          <GithubBadge
            label="realism"
            value={manifest.realism}
            title="North Star realism label: Sketch, Estimate or Detailed"
          />
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
            <span key={tag} className="sci-tag">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
