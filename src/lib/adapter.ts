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
    const str = String(val).trim();
    if (!str) return '—';
    const d = new Date(str.replace(' ', 'T'));
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
  if (s.includes('script ready') || s.includes('ready') || s.includes('planned') || s.includes('scheduled') || s.includes('assigned')) {
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
  const data = (root.result || root.data || root) as Record<string, unknown>;

  const kpis: KpiMetric[] = [];

  // 1. Total Active Pipeline KPI
  const totalActiveVal = getProp(data, 'totalActive', 'total_active', 'totalCount');
  if (totalActiveVal !== undefined && totalActiveVal !== null) {
    kpis.push({
      key: 'totalActive',
      label: 'Active Pipeline',
      value: typeof totalActiveVal === 'number' ? totalActiveVal : safeString(totalActiveVal),
      badgeType: 'rose',
    });
  }

  // 2. Planned Today KPI
  const plannedVal = getProp(data, 'plannedToday', 'planned_today');
  if (plannedVal !== undefined && plannedVal !== null) {
    kpis.push({
      key: 'plannedToday',
      label: 'Planned Today',
      value: typeof plannedVal === 'number' ? plannedVal : safeString(plannedVal),
      badgeType: 'blue',
    });
  }

  // 3. Overdue KPI
  const overdueVal = getProp(data, 'overdue', 'overdueCount');
  if (overdueVal !== undefined && overdueVal !== null) {
    kpis.push({
      key: 'overdue',
      label: 'Overdue',
      value: typeof overdueVal === 'number' ? overdueVal : safeString(overdueVal),
      badgeType: 'red',
    });
  }

  // 4. Status breakdowns (from data.byStatus object or direct properties)
  const byStatus = (data.byStatus || data.statusBreakdown || data.stages) as Record<string, unknown> | undefined;
  if (byStatus && typeof byStatus === 'object') {
    const statusMap: Array<{ key: string; label: string; badge: KpiMetric['badgeType'] }> = [
      { key: 'Editing', label: 'In Editing', badge: 'amber' },
      { key: 'QC Pending', label: 'QC Pending', badge: 'purple' },
      { key: 'Script Ready', label: 'Script Ready', badge: 'blue' },
      { key: 'Approved', label: 'Approved', badge: 'emerald' },
      { key: 'Unassigned', label: 'Unassigned', badge: 'rose' },
    ];

    for (const item of statusMap) {
      const val = getProp(byStatus, item.key);
      if (val !== undefined && val !== null) {
        kpis.push({
          key: item.key.toLowerCase().replace(/\s+/g, '_'),
          label: item.label,
          value: typeof val === 'number' ? val : safeString(val),
          badgeType: item.badge,
        });
      }
    }
  }

  // 5. Blocked KPI
  const blockedVal = getProp(data, 'blocked', 'blockedCount');
  if (blockedVal !== undefined && blockedVal !== null) {
    kpis.push({
      key: 'blocked',
      label: 'Blocked',
      value: typeof blockedVal === 'number' ? blockedVal : safeString(blockedVal),
      badgeType: 'red',
    });
  }

  // Extract Action Queue (from data.actionItems or data.actionQueue)
  const actionQueue: ActionQueueItem[] = [];
  const rawQueue = data.actionItems || data.actionQueue || data.action_items || data.urgentTasks || [];

  if (Array.isArray(rawQueue)) {
    for (const q of rawQueue) {
      if (q && typeof q === 'object') {
        const itemObj = q as Record<string, unknown>;
        const id = safeString(getProp(itemObj, 'videoId', 'id', 'video_id'));
        
        // Extract a clean title from scriptPreview or title
        let title = safeString(getProp(itemObj, 'scriptPreview', 'title', 'topic', 'name'));
        if (title.includes('\n')) {
          title = title.split('\n')[0].trim();
        }

        const type = safeString(getProp(itemObj, 'productionStatus', 'status', 'type', 'state'));
        const editor = safeString(getProp(itemObj, 'editor', 'assignedTo'));
        const status = safeString(getProp(itemObj, 'slaStatus', 'status'));
        const due = safeString(getProp(itemObj, 'dueAt', 'due', 'dueDate', 'deadline'));
        const priorityRaw = String(getProp(itemObj, 'priority') || 'normal').toLowerCase();

        const priority: ActionQueueItem['priority'] =
          priorityRaw.includes('p1') || priorityRaw.includes('high') || priorityRaw.includes('urgent')
            ? 'high'
            : priorityRaw.includes('p2') || priorityRaw.includes('med')
            ? 'medium'
            : priorityRaw.includes('p3') || priorityRaw.includes('low')
            ? 'low'
            : 'normal';

        actionQueue.push({
          id,
          title: title !== '—' ? title : 'Untitled Video',
          type: type !== '—' ? type : 'Action Required',
          priority,
          editor: editor !== '—' ? editor : undefined,
          status: status !== '—' ? status : undefined,
          due: due !== '—' ? safeDate(due) : undefined,
        });
      }
    }
  }

  // Extract Pipeline Stages from byStatus object
  const pipeline: PipelineStage[] = [];
  if (byStatus && typeof byStatus === 'object') {
    for (const [stage, count] of Object.entries(byStatus)) {
      pipeline.push({
        stage,
        count: safeNumber(count, 0),
      });
    }
  }

  return {
    kpis,
    actionQueue,
    pipeline,
    rawSummary: typeof data === 'object' ? data : undefined,
    lastUpdated: safeString(getProp(root, 'meta', 'timestamp', 'lastUpdated')),
  };
}

/**
 * Normalizes video list response
 */
export function normalizeVideosData(raw: unknown): VideoItem[] {
  if (!raw || typeof raw !== 'object') return [];

  const root = raw as Record<string, unknown>;
  const resultObj = (root.result || root.data || root) as Record<string, unknown>;

  let rawList: unknown[] = [];
  if (Array.isArray(resultObj)) {
    rawList = resultObj;
  } else if (resultObj && typeof resultObj === 'object') {
    if (Array.isArray(resultObj.items)) rawList = resultObj.items;
    else if (Array.isArray(resultObj.videos)) rawList = resultObj.videos;
    else if (Array.isArray(resultObj.data)) rawList = resultObj.data;
    else if (Array.isArray(resultObj.rows)) rawList = resultObj.rows;
  } else if (Array.isArray(root.items)) {
    rawList = root.items;
  } else if (Array.isArray(root.videos)) {
    rawList = root.videos;
  }

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

    const id = safeString(getProp(obj, 'videoId', 'id', 'video_id', 'code'));
    
    let title = safeString(getProp(obj, 'scriptPreview', 'title', 'topic', 'name', 'subject'));
    if (title.includes('\n')) {
      title = title.split('\n')[0].trim();
    }

    const teacher = safeString(getProp(obj, 'talent', 'teacher', 'instructor', 'faculty'));
    const editor = safeString(getProp(obj, 'editor', 'assignedTo', 'editorName'));
    const status = safeString(getProp(obj, 'productionStatus', 'status', 'state', 'currentStatus'));
    const sla = safeString(getProp(obj, 'slaStatus', 'sla', 'slaState'));

    const rawFileUrl = safeString(getProp(obj, 'rawFileUrl', 'rawLink', 'rawUrl'));
    const rawFolderUrl = safeString(getProp(obj, 'rawFolderUrl', 'rawFolder', 'driveFolderUrl'));
    const finalFileUrl = safeString(getProp(obj, 'finalFileUrl', 'finalLink', 'finalUrl'));
    const finalFolderUrl = safeString(getProp(obj, 'finalFolderUrl', 'finalFolder'));

    // A folder is only an upload destination. It must not be shown as a
    // detected asset until an actual file URL is present.
    const rawAvailable = rawFileUrl !== '—';
    const finalAvailable = finalFileUrl !== '—';

    const updatedAt = safeString(getProp(obj, 'stageUpdatedAt', 'assignmentUpdatedAt', 'updatedAt'));

    return {
      id,
      title: title !== '—' ? title : 'Untitled Video',
      teacher,
      editor,
      status,
      sla,
      rawAvailable,
      finalAvailable,
      rawFolderAvailable: rawFolderUrl !== '—',
      finalFolderAvailable: finalFolderUrl !== '—',
      rawLink: rawFileUrl !== '—' ? rawFileUrl : (rawFolderUrl !== '—' ? rawFolderUrl : undefined),
      finalLink: finalFileUrl !== '—' ? finalFileUrl : (finalFolderUrl !== '—' ? finalFolderUrl : undefined),
      updatedAt: updatedAt !== '—' ? safeDate(updatedAt) : undefined,
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
  const obj = (root.result || root.video || root.data || root) as Record<string, unknown>;

  if (typeof obj !== 'object' || obj === null) return emptyResult;

  const id = safeString(getProp(obj, 'videoId', 'id', 'video_id')) || defaultId || '—';
  
  let title = safeString(getProp(obj, 'scriptPreview', 'title', 'topic', 'name', 'script'));
  if (title.includes('\n')) {
    title = title.split('\n')[0].trim();
  }

  const teacher = safeString(getProp(obj, 'talent', 'teacher', 'instructor'));
  const editor = safeString(getProp(obj, 'editor', 'assignedTo'));
  const status = safeString(getProp(obj, 'productionStatus', 'status', 'state'));
  const sla = safeString(getProp(obj, 'slaStatus', 'sla', 'slaState'));
  
  const qcNotes = safeString(getProp(obj, 'qcChangeNotes', 'qcNotes', 'qc_notes', 'notes', 'recordingNotes', 'remarks'));
  const qcStatus = safeString(getProp(obj, 'qcStatus', 'qc_status'));
  const account = safeString(getProp(obj, 'account'));
  const postUrl = safeString(getProp(obj, 'postUrl', 'post_url'));
  const posted = Boolean(getProp(obj, 'posted', 'posted?'));
  const scriptReady = Boolean(getProp(obj, 'scriptReady', 'script_ready'));

  const rawFolder = safeString(getProp(obj, 'rawFolderUrl', 'rawFolder', 'driveFolderUrl'));
  const finalFolder = safeString(getProp(obj, 'finalFolderUrl', 'finalFolder'));
  const rawFileLink = safeString(getProp(obj, 'rawFileUrl', 'rawFileLink', 'rawLink'));
  const finalFileLink = safeString(getProp(obj, 'finalFileUrl', 'finalFileLink', 'finalLink'));
  const whatsappLink = safeString(getProp(obj, 'editorWhatsAppUrl', 'whatsappLink', 'whatsapp'));

  // Timestamps / timeline
  const timestamps: Array<{ label: string; value: string }> = [];
  const candidateTimestamps: Array<{ label: string; keys: string[] }> = [
    { label: 'Publish Date', keys: ['publishDate', 'publish_date'] },
    { label: 'Assigned Updated', keys: ['assignmentUpdatedAt', 'assignment_updated_at'] },
    { label: 'Stage Updated', keys: ['stageUpdatedAt', 'stage_updated_at'] },
    { label: 'Due At', keys: ['dueAt', 'due_at', 'dueDate'] },
  ];

  for (const ts of candidateTimestamps) {
    const val = getProp(obj, ...ts.keys);
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      timestamps.push({ label: ts.label, value: safeDate(val) });
    }
  }

  return {
    id: id !== '—' ? id : defaultId || '—',
    title: title !== '—' ? title : 'Untitled Video',
    teacher,
    editor,
    status,
    sla,
    rawFolder: rawFolder !== '—' ? rawFolder : undefined,
    finalFolder: finalFolder !== '—' ? finalFolder : undefined,
    rawFileLink: rawFileLink !== '—' ? rawFileLink : undefined,
    finalFileLink: finalFileLink !== '—' ? finalFileLink : undefined,
    qcNotes,
    qcStatus: qcStatus !== '—' ? qcStatus : undefined,
    account: account !== '—' ? account : undefined,
    postUrl: postUrl !== '—' ? postUrl : undefined,
    posted,
    scriptReady,
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
  const rawList = root.result || root.editors || root.editorLoad || root.data || (Array.isArray(raw) ? raw : []);

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

    const name = safeString(getProp(obj, 'editor', 'name', 'editorName', 'username'));
    const openLoad = getProp(obj, 'openLoad', 'active', 'activeCount', 'load');
    const dailyCapacity = getProp(obj, 'dailyCapacity', 'capacity');
    const available = getProp(obj, 'available');
    const backup = getProp(obj, 'emergencyBackup');

    let status = 'Available';
    if (typeof available === 'boolean' && !available) {
      status = 'Unavailable';
    } else if (typeof openLoad === 'number' && typeof dailyCapacity === 'number' && openLoad >= dailyCapacity) {
      status = 'At Capacity';
    } else if (backup === true) {
      status = 'Backup Ready';
    }

    return {
      name,
      activeCount: openLoad !== undefined && openLoad !== null ? String(openLoad) : '0',
      qcCount: '—',
      completedCount: '—',
      totalCount: dailyCapacity !== undefined && dailyCapacity !== null ? String(dailyCapacity) : '—',
      capacityStatus: status,
      rawRecord: obj,
    };
  });
}
