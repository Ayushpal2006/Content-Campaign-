// Types for Infinity Operations Frontend & Adapter

export type ActionType = 'bootstrap' | 'dashboard' | 'videos' | 'video' | 'editor_load' | 'detect_raw';

export interface ApiResponse<T = unknown> {
  ok?: boolean;
  status?: string;
  data?: T;
  result?: T;
  error?: string;
  message?: string;
  [key: string]: unknown;
}

export interface KpiMetric {
  key: string;
  label: string;
  value: string | number;
  badgeType?: 'default' | 'rose' | 'amber' | 'blue' | 'purple' | 'emerald' | 'red';
  subtext?: string;
}

export interface ActionQueueItem {
  id: string;
  title: string;
  type: string;
  priority: 'high' | 'medium' | 'low' | 'normal';
  editor?: string;
  status?: string;
  due?: string;
}

export interface PipelineStage {
  stage: string;
  count: number;
  percent?: number;
  color?: string;
}

export interface DashboardData {
  kpis: KpiMetric[];
  actionQueue: ActionQueueItem[];
  pipeline: PipelineStage[];
  rawSummary?: Record<string, unknown>;
  lastUpdated?: string;
}

export interface VideoItem {
  id: string;
  title: string;
  teacher: string;
  editor: string;
  status: string;
  sla: string;
  rawAvailable: boolean | string;
  finalAvailable: boolean | string;
  rawLink?: string;
  finalLink?: string;
  updatedAt?: string;
  rawRecord: Record<string, unknown>;
}

export interface VideoDetail {
  id: string;
  title: string;
  teacher: string;
  editor: string;
  status: string;
  sla: string;
  rawFolder?: string;
  finalFolder?: string;
  rawFileLink?: string;
  finalFileLink?: string;
  qcNotes: string;
  whatsappLink?: string;
  timestamps: Array<{ label: string; value: string }>;
  rawRecord: Record<string, unknown>;
}

export interface EditorLoadItem {
  name: string;
  activeCount: number | string;
  qcCount: number | string;
  completedCount: number | string;
  totalCount: number | string;
  capacityStatus?: string;
  rawRecord: Record<string, unknown>;
}
