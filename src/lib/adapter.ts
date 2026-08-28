import type {
  DashboardData,
  KpiMetric,
  ActionQueueItem,
  PipelineStage,
  VideoItem,
  VideoDetail,
  EditorLoadItem,
} from './types';

/**
 * Safely format any value into a display string.
 * Missing/empty/null/undefined values strictly render as "—".
 */
export function safeString(val: unknown): string {
  if (val === null || val === undefined) return '—';
  const str = String(val).trim();
  return str === '' ? '—' : str;
}

export function safeNumber(val: unknown, fallback: number = 0): number {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) return parsed;
  }
  return fallback;
}

export function safeDate(val: unknown): string {
  if (!val) return '—';
  try {
    const d = new Date(String(val));
    if (isNaN(d.getTime())) return safeString(val);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return safeString(val);
  }
}

/**
 * Helper to get property value regardless of casing (camelCase, snake_case, uppercase)
 */
export function getProp(obj: Record<string, unknown>, ...keys: string[]): unknown {
  if (!obj || typeof obj !== 'object') return undefined;

  for (const key of keys) {
    if (key in obj && obj[key] !== undefined && obj[key] !== null) {
      return obj[key];
    }
  }

  // Fallback: case-insensitive check
  const objKeys = Object.keys(obj);
  for (const key of keys) {
    const targetLower = key.toLowerCase().replace(/[_-]/g, '');
    const foundKey = objKeys.find((k) => k.toLowerCase().replace(/[_-]/g, '') === targetLower);
    if (foundKey && obj[foundKey] !== undefined && obj[foundKey] !== null) {
      return obj[foundKey];
    }
  }

  return undefined;
}

/**
 * Returns badge styling category for a status text.
 */
export function getStatusTheme(status: string): 'default' | 'rose' | 'amber' | 'blue' | 'purple' | 'emerald' | 'red' {
  const s = status.toLowerCase();
  if (s.includes('overdue') || s.includes('blocked') || s.includes('failed') || s.includes('error') || s.includes('rejected')) {
    return 'red';
  }
  if (s.includes('approved') || s.includes('uploaded') || s.includes('done') || s.includes('completed') || s.includes('success')) {
    return 'emerald';
  }
  if (s.includes('qc') || s.includes('review') || s.includes('audit')) {
    return 'purple';
  }
  if (s.includes('change') || s.includes('revision') || s.includes('rework')) {
    return 'rose';
  }
  if (s.includes('editing') || s.includes('in progress') || s.includes('draft') || s.includes('wip')) {
    return 'amber';
  }
  if (s.includes('planned') || s.includes('ready') || s.includes('scheduled') || s.includes('assigned')) {
    return 'blue';
  }
  return 'default';
}

/**
 * Normalizes raw dashboard/bootstrap response into structured DashboardData
 */
export function normalizeDashboardData(raw: unknown): DashboardData {
  if (!raw || typeof raw !== 'object') {
    return { kpis: [], actionQueue: [], pipeline: [] };
  }

  const root = raw as Record<string, unknown>;
  const data = (root.data || root.result || root) as Record<string, unknown>;

  // Extract KPIs
  const kpis: KpiMetric[] = [];

  // Candidate KPI definitions with their possible matching keys
  const candidateMetrics: Array<{
    key: string;
    label: string;
    badgeType: KpiMetric['badgeType'];
    keys: string[];
  }> = [
    { key: 'plannedToday', label: 'Planned Today', badgeType: 'blue', keys: ['plannedToday', 'planned_today', 'planned', 'today'] },
    { key: 'editing', label: 'Editing', badgeType: 'amber', keys: ['editing', 'in_editing', 'inEditing', 'editingCount'] },
    { key: 'qcPending', label: 'QC Pending', badgeType: 'purple', keys: ['qcPending', 'qc_pending', 'inQc', 'in_qc', 'qc'] },
    { key: 'changes', label: 'Changes Requested', badgeType: 'rose', keys: ['changes', 'changesRequested', 'changes_requested', 'revisions'] },
    { key: 'approved', label: 'Approved', badgeType: 'emerald', keys: ['approved', 'approvedCount', 'ready_upload'] },
    { key: 'uploaded', label: 'Uploaded', badgeType: 'emerald', keys: ['uploaded', 'uploadedCount', 'published', 'completed'] },
    { key: 'overdue', label: 'Overdue', badgeType: 'red', keys: ['overdue', 'overdueCount', 'delayed'] },
    { key: 'blocked', label: 'Blocked', badgeType: 'red', keys: ['blocked', 'blockedCount', 'stuck'] },
  ];

  // Check metrics in data.kpis, data.metrics, data.summary, or top-level data
  const metricsSource = (data.kpis || data.metrics || data.summary || data) as Record<string, unknown>;

  if (typeof metricsSource === 'object' && metricsSource !== null) {
    for (const item of candidateMetrics) {
      const val = getProp(metricsSource, ...item.keys);
      if (val !== undefined && val !== null && val !== '') {
        kpis.push({
          key: item.key,
          label: item.label,
          value: typeof val === 'number' ? val : safeString(val),
          badgeType: item.badgeType,
        });
      }
    }

    // If API returned a custom kpi list (e.g. array of { label, value })
    if (Array.isArray(data.kpis)) {
      for (const kpi of data.kpis) {
        if (kpi && typeof kpi === 'object') {
          const l = getProp(kpi, 'label', 'name', 'title');
          const v = getProp(kpi, 'value', 'count');
          if (l && v !== undefined && !kpis.some((existing) => existing.label === String(l))) {
            kpis.push({
              key: String(l).toLowerCase().replace(/\s+/g, '_'),
              label: String(l),
              value: typeof v === 'number' ? v : safeString(v),
              badgeType: 'default',
            });
          }
        }
      }
    }
  }

  // Extract Action Queue
  const actionQueue: ActionQueueItem[] = [];
  const rawQueue = data.actionQueue || data.action_queue || data.queue || data.urgentTasks || data.urgent;

  if (Array.isArray(rawQueue)) {
    for (const q of rawQueue) {
      if (q && typeof q === 'object') {
        const itemObj = q as Record<string, unknown>;
        const id = safeString(getProp(itemObj, 'id', 'videoId', 'video_id', 'taskId'));
        const title = safeString(getProp(itemObj, 'title', 'topic', 'name', 'task'));
        const type = safeString(getProp(itemObj, 'type', 'reason', 'action', 'status'));
        const editor = safeString(getProp(itemObj, 'editor', 'assignedTo'));
        const status = safeString(getProp(itemObj, 'status', 'state'));
        const due = safeString(getProp(itemObj, 'due', 'dueDate', 'deadline', 'sla'));
        const priorityRaw = String(getProp(itemObj, 'priority') || 'normal').toLowerCase();

        const priority: ActionQueueItem['priority'] =
          priorityRaw.includes('high') || priorityRaw.includes('urgent')
            ? 'high'
            : priorityRaw.includes('med')
            ? 'medium'
            : priorityRaw.includes('low')
            ? 'low'
            : 'normal';

        actionQueue.push({
          id,
          title,
          type,
          priority,
          editor: editor !== '—' ? editor : undefined,
          status: status !== '—' ? status : undefined,
          due: due !== '—' ? due : undefined,
        });
      }
    }
  }

  // Extract Pipeline / Stages
  const pipeline: PipelineStage[] = [];
  const rawPipeline = data.pipeline || data.statusBreakdown || data.status_breakdown || data.stages;

  if (Array.isArray(rawPipeline)) {
    for (const st of rawPipeline) {
      if (st && typeof st === 'object') {
        const stObj = st as Record<string, unknown>;
        const stage = safeString(getProp(stObj, 'stage', 'status', 'name', 'label'));
        const count = safeNumber(getProp(stObj, 'count', 'total', 'value'), 0);
        if (stage !== '—') {
          pipeline.push({ stage, count });
        }
      }
    }
  } else if (typeof rawPipeline === 'object' && rawPipeline !== null) {
    for (const [key, val] of Object.entries(rawPipeline)) {
      pipeline.push({
        stage: key,
        count: safeNumber(val, 0),
      });
    }
  }

  return {
    kpis,
    actionQueue,
    pipeline,
    rawSummary: typeof data === 'object' ? data : undefined,
    lastUpdated: safeString(getProp(root, 'lastUpdated', 'updatedAt', 'timestamp', 'time')),
  };
}

/**
 * Normalizes video list response
 */
export function normalizeVideosData(raw: unknown): VideoItem[] {
  if (!raw || typeof raw !== 'object') return [];

  const root = raw as Record<string, unknown>;
  const rawList = root.videos || root.data || root.result || root.items || (Array.isArray(raw) ? raw : []);

  if (!Array.isArray(rawList)) return [];

  return rawList.map((item: unknown): VideoItem => {
    if (!item || typeof item !== 'object') {
      return {
        id: '—',
        title: '—',
        teacher: '—',
        editor: '—',
        status: '—',
        sla: '—',
        rawAvailable: '—',
        finalAvailable: '—',
        rawRecord: {},
      };
    }

    const obj = item as Record<string, unknown>;

    const id = safeString(getProp(obj, 'id', 'videoId', 'video_id', 'code'));
    const title = safeString(getProp(obj, 'title', 'topic', 'name', 'subject'));
    const teacher = safeString(getProp(obj, 'teacher', 'talent', 'instructor', 'faculty'));
    const editor = safeString(getProp(obj, 'editor', 'assignedTo', 'editorName', 'lead'));
    const status = safeString(getProp(obj, 'status', 'state', 'currentStatus'));
    const sla = safeString(getProp(obj, 'sla', 'slaState', 'dueDate', 'deadline', 'due'));

    const rawLink = safeString(getProp(obj, 'rawFolder', 'rawLink', 'rawUrl', 'rawFolderUrl', 'raw_url', 'raw_folder'));
    const finalLink = safeString(getProp(obj, 'finalFolder', 'finalLink', 'finalUrl', 'finalFolderUrl', 'final_url', 'final_folder'));

    const rawAvailableVal = getProp(obj, 'rawAvailable', 'hasRaw', 'rawStatus', 'raw');
    const finalAvailableVal = getProp(obj, 'finalAvailable', 'hasFinal', 'finalStatus', 'final');

    let rawAvailable: boolean | string = '—';
    if (typeof rawAvailableVal === 'boolean') rawAvailable = rawAvailableVal;
    else if (typeof rawAvailableVal === 'string' && rawAvailableVal.trim() !== '') rawAvailable = rawAvailableVal;
    else if (rawLink !== '—') rawAvailable = true;

    let finalAvailable: boolean | string = '—';
    if (typeof finalAvailableVal === 'boolean') finalAvailable = finalAvailableVal;
    else if (typeof finalAvailableVal === 'string' && finalAvailableVal.trim() !== '') finalAvailable = finalAvailableVal;
    else if (finalLink !== '—') finalAvailable = true;

    const updatedAt = safeString(getProp(obj, 'updatedAt', 'lastUpdated', 'timestamp', 'date'));

    return {
      id,
      title,
      teacher,
      editor,
      status,
      sla,
      rawAvailable,
      finalAvailable,
      rawLink: rawLink !== '—' ? rawLink : undefined,
      finalLink: finalLink !== '—' ? finalLink : undefined,
      updatedAt: updatedAt !== '—' ? updatedAt : undefined,
      rawRecord: obj,
    };
  });
}

/**
 * Normalizes single video detail response
 */
export function normalizeVideoDetailData(raw: unknown, defaultId = ''): VideoDetail {
  const emptyResult: VideoDetail = {
    id: defaultId || '—',
    title: '—',
    teacher: '—',
    editor: '—',
    status: '—',
    sla: '—',
    qcNotes: '—',
    timestamps: [],
    rawRecord: {},
  };

  if (!raw || typeof raw !== 'object') return emptyResult;

  const root = raw as Record<string, unknown>;
  const obj = (root.video || root.data || root.result || root) as Record<string, unknown>;

  if (typeof obj !== 'object' || obj === null) return emptyResult;

  const id = safeString(getProp(obj, 'id', 'videoId', 'video_id')) || defaultId || '—';
  const title = safeString(getProp(obj, 'title', 'topic', 'name', 'subject'));
  const teacher = safeString(getProp(obj, 'teacher', 'talent', 'instructor', 'faculty'));
  const editor = safeString(getProp(obj, 'editor', 'assignedTo', 'editorName'));
  const status = safeString(getProp(obj, 'status', 'state', 'currentStatus'));
  const sla = safeString(getProp(obj, 'sla', 'slaState', 'dueDate', 'deadline'));
  const qcNotes = safeString(getProp(obj, 'qcNotes', 'qc_notes', 'notes', 'remarks', 'feedback'));

  const rawFolder = safeString(getProp(obj, 'rawFolder', 'rawFolderUrl', 'raw_folder', 'rawDriveFolder'));
  const finalFolder = safeString(getProp(obj, 'finalFolder', 'finalFolderUrl', 'final_folder', 'finalDriveFolder'));
  const rawFileLink = safeString(getProp(obj, 'rawFileLink', 'rawLink', 'rawUrl', 'raw_url', 'rawFile'));
  const finalFileLink = safeString(getProp(obj, 'finalFileLink', 'finalLink', 'finalUrl', 'final_url', 'finalFile'));
  const whatsappLink = safeString(getProp(obj, 'whatsappLink', 'whatsapp', 'chatLink', 'chatUrl'));

  // Timestamps / timeline
  const timestamps: Array<{ label: string; value: string }> = [];
  const candidateTimestamps: Array<{ label: string; keys: string[] }> = [
    { label: 'Created', keys: ['createdAt', 'created_at', 'shootDate', 'shoot_date'] },
    { label: 'RAW Detected', keys: ['rawDetectedAt', 'raw_detected_at', 'rawDate'] },
    { label: 'Editing Started', keys: ['editingStartedAt', 'editing_started_at', 'editDate'] },
    { label: 'QC Submitted', keys: ['qcSubmittedAt', 'qc_submitted_at', 'qcDate'] },
    { label: 'Approved At', keys: ['approvedAt', 'approved_at'] },
    { label: 'Uploaded At', keys: ['uploadedAt', 'uploaded_at', 'publishedAt'] },
    { label: 'Last Modified', keys: ['updatedAt', 'lastUpdated', 'modifiedAt'] },
  ];

  for (const ts of candidateTimestamps) {
    const val = getProp(obj, ...ts.keys);
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      timestamps.push({ label: ts.label, value: safeDate(val) });
    }
  }

  return {
    id: id !== '—' ? id : defaultId || '—',
    title,
    teacher,
    editor,
    status,
    sla,
    rawFolder: rawFolder !== '—' ? rawFolder : undefined,
    finalFolder: finalFolder !== '—' ? finalFolder : undefined,
    rawFileLink: rawFileLink !== '—' ? rawFileLink : undefined,
    finalFileLink: finalFileLink !== '—' ? finalFileLink : undefined,
    qcNotes,
    whatsappLink: whatsappLink !== '—' ? whatsappLink : undefined,
    timestamps,
    rawRecord: obj,
  };
}

/**
 * Normalizes editor load response
 */
export function normalizeEditorLoadData(raw: unknown): EditorLoadItem[] {
  if (!raw || typeof raw !== 'object') return [];

  const root = raw as Record<string, unknown>;
  const rawList = root.editors || root.editorLoad || root.data || root.result || (Array.isArray(raw) ? raw : []);

  if (!Array.isArray(rawList)) return [];

  return rawList.map((item: unknown): EditorLoadItem => {
    if (!item || typeof item !== 'object') {
      return {
        name: '—',
        activeCount: '—',
        qcCount: '—',
        completedCount: '—',
        totalCount: '—',
        rawRecord: {},
      };
    }

    const obj = item as Record<string, unknown>;

    const name = safeString(getProp(obj, 'name', 'editor', 'editorName', 'username'));
    const active = getProp(obj, 'active', 'activeCount', 'editing', 'inProgress', 'in_progress');
    const qc = getProp(obj, 'qc', 'qcCount', 'inQc', 'qcPending', 'qc_pending');
    const completed = getProp(obj, 'completed', 'completedCount', 'done', 'uploaded');
    const total = getProp(obj, 'total', 'totalAssigned', 'totalCount', 'load');
    const status = safeString(getProp(obj, 'capacityStatus', 'status', 'availability'));

    return {
      name,
      activeCount: active !== undefined && active !== null ? (typeof active === 'number' ? active : safeString(active)) : '—',
      qcCount: qc !== undefined && qc !== null ? (typeof qc === 'number' ? qc : safeString(qc)) : '—',
      completedCount: completed !== undefined && completed !== null ? (typeof completed === 'number' ? completed : safeString(completed)) : '—',
      totalCount: total !== undefined && total !== null ? (typeof total === 'number' ? total : safeString(total)) : '—',
      capacityStatus: status !== '—' ? status : undefined,
      rawRecord: obj,
    };
  });
}
