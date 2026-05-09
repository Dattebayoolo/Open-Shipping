// ============================================================
// SHARED SHIP UTILITY HELPERS
// ============================================================

export interface ShipTypeInfo {
    label: string;
    color: string;
}

/**
 * Returns label + color for a given AIS ship type code.
 */
export function getShipTypeInfo(type: number): ShipTypeInfo {
    if (!type) return { label: 'Unknown', color: '#888' };
    if (type >= 70 && type <= 79) return { label: 'Cargo', color: '#10b981' };
    if (type >= 80 && type <= 89) return { label: 'Tanker', color: '#ef4444' };
    if (type >= 60 && type <= 69) return { label: 'Passenger', color: '#3b82f6' };
    if (type >= 30 && type <= 39) return { label: 'Fishing', color: '#f59e0b' };
    if (type >= 40 && type <= 49) return { label: 'High Speed', color: '#8b5cf6' };
    if (type >= 50 && type <= 59) return { label: 'Special Craft', color: '#06b6d4' };
    return { label: 'Other', color: '#94a3b8' };
}

/**
 * Returns a human-readable label for navigational status codes (0-15).
 */
export function getNavStatus(status: number): string {
    const map: Record<number, string> = {
        0: 'Under way',
        1: 'At anchor',
        2: 'Not under command',
        3: 'Restricted',
        4: 'Constrained',
        5: 'Moored',
        6: 'Aground',
        7: 'Fishing',
        8: 'Sailing',
    };
    return map[status] || 'Unknown';
}

/**
 * Returns a descriptive nav status string (used in table views).
 */
export function getNavStatusLong(status: number): string {
    const map: Record<number, string> = {
        0: 'Under way using engine',
        1: 'At anchor',
        2: 'Not under command',
        3: 'Restricted maneuverability',
        4: 'Constrained by draught',
        5: 'Moored',
        6: 'Aground',
        7: 'Engaged in fishing',
        8: 'Under way sailing',
    };
    return map[status] || 'Unknown status';
}

/**
 * Returns a human-readable label for dashboard's getShipTypeLabel.
 */
export function getShipTypeLabel(type: number): string {
    if (type >= 70 && type <= 79) return 'Cargo';
    if (type >= 80 && type <= 89) return 'Tanker';
    if (type >= 60 && type <= 69) return 'Passenger';
    if (type >= 30 && type <= 39) return 'Fishing';
    if (type >= 40 && type <= 49) return 'High Speed';
    if (type >= 50 && type <= 59) return 'Special Craft';
    return 'Other';
}

export const TYPE_EMOJI: Record<string, string> = {
    Cargo: '\u{1F6A2}',
    Tanker: '\u26FD',
    Passenger: '\u{1F6F3}\uFE0F',
    Fishing: '\u{1F3A3}',
    'High Speed': '\u{1F6A4}',
    'Special Craft': '\u{1F6E5}\uFE0F',
    Other: '\u2693',
};

/**
 * Format vessel dimensions from AIS dim object.
 */
export function formatDimensions(dim: { A?: number; B?: number; C?: number; D?: number } | undefined): string {
    if (!dim) return '\u2014\u2014';
    if (!dim.A && !dim.B) return '\u2014\u2014';
    const len = (dim.A || 0) + (dim.B || 0);
    const wid = (dim.C || 0) + (dim.D || 0);
    return `${len}m \u00d7 ${wid}m`;
}

/**
 * Relative time string from a Date.
 */
export function relativeTime(date: Date): string {
    const diff = Date.now() - date.getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return 'Just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    return `${Math.floor(min / 60)}h ago`;
}