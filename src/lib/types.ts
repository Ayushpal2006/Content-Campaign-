// Types for Infinity Operations Frontend & Adapter

export type ActionType =
  | 'bootstrap'
  | 'dashboard'
  | 'videos'
  | 'video'
  | 'editor_load'
  | 'detect_raw'
  | 'create_video'
  | 'update_script'
  | 'approve_script'
  | 'assign_editor'
  | 'detect_final'
  | 'qc_approve'
  | 'qc_changes'
  | 'mark_uploaded'
  | 'queue_action'
  | 'job_status'
  | 'web_jobs'
  | 'retry_job';

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
  todayByStatus?: Record<string, number>;
  todayTotal?: number;
  todayUploaded?: number;
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
  rawFolderAvailable?: boolean;
  finalFolderAvailable?: boolean;
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
  qcStatus?: string;
  account?: string;
  postUrl?: string;
  posted?: boolean;
  scriptReady?: boolean;
  whatsappLink?: string;
  rawCoordinatorWhatsAppLink?: string;
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
