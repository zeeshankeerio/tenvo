import type { ElementType, ReactNode } from 'react';

export interface MobileHubTileProps {
  icon: ElementType;
  label: string;
  sublabel?: string;
  onClick?: () => void;
  active?: boolean;
  tone?: 'default' | 'primary' | 'accent';
  badge?: number;
  disabled?: boolean;
  compact?: boolean;
}

export interface MobileActionRowProps {
  icon: ElementType;
  label: string;
  sublabel?: string;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  active?: boolean;
}

export interface MobileKpiItem {
  label: string;
  value: string | number;
  hint?: string;
  tone?: string;
  alert?: boolean;
}

export interface MobilePresetOption {
  id: string;
  label: string;
}

export function MobileHubTile(props: MobileHubTileProps): ReactNode;
export function MobileActionRow(props: MobileActionRowProps): ReactNode;
export function MobileKpiStrip(props: { items?: MobileKpiItem[] }): ReactNode;
export function MobilePresetPills(props: {
  options?: MobilePresetOption[];
  activeId?: string;
  onSelect?: (id: string) => void;
  compact?: boolean;
}): ReactNode;
