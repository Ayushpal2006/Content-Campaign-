// Fallback in-memory mock store for preview and local development
// Used seamlessly when APPS_SCRIPT_API_URL or INFINITY_API_TOKEN is not configured

export interface MockVideoRecord {
  id: string;
  title: string;
  teacher: string;
  editor: string;
  status: string;
  priority: string;
  sla: string;
  rawAvailable: boolean;
  finalAvailable: boolean;
  rawFolder: string;
  finalFolder: string;
  rawFileLink?: string;
  finalFileLink?: string;
  qcNotes: string;
  qcStatus: string;
  account: string;
  postUrl?: string;
  posted?: boolean;
  scriptReady?: boolean;
  updatedAt: string;
  publishDate?: string;
}

let mockVideos: MockVideoRecord[] = [
  {
    id: 'VID-201',
    title: 'Quantum Physics in 60 Seconds — Wave-Particle Duality',
    teacher: 'Dr. Ananya',
    editor: 'Rahul Verma',
    status: 'QC Pending',
    priority: 'P0 - Critical',
    sla: 'Due in 2h',
    rawAvailable: true,
    finalAvailable: true,
    rawFolder: 'https://drive.google.com/drive/folders/mock-raw-201',
    finalFolder: 'https://drive.google.com/drive/folders/mock-final-201',
    rawFileLink: 'https://drive.google.com/file/d/mock-raw-file-201/view',
    finalFileLink: 'https://drive.google.com/file/d/mock-final-file-201/view',
    qcNotes: 'Audio mix on intro hook needs 2dB boost.',
    qcStatus: 'Pending Review',
    account: 'Main Channel',
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    publishDate: new Date().toISOString().split('T')[0],
  },
  {
    id: 'VID-202',
    title: 'Calculus Speedrun: Chain Rule Visualized',
    teacher: 'Prof. Vikram',
    editor: 'Sneha Nair',
    status: 'Editing',
    priority: 'P1 - High',
    sla: 'On Track (due 6 PM)',
    rawAvailable: true,
    finalAvailable: false,
    rawFolder: 'https://drive.google.com/drive/folders/mock-raw-202',
    finalFolder: 'https://drive.google.com/drive/folders/mock-final-202',
    rawFileLink: 'https://drive.google.com/file/d/mock-raw-file-202/view',
    qcNotes: '',
    qcStatus: 'Not Ready',
    account: 'Shorts Lab',
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
    publishDate: new Date().toISOString().split('T')[0],
  },
  {
    id: 'VID-203',
    title: 'Top 5 Coding Interview Traps to Avoid',
    teacher: 'Coach Riya',
    editor: 'Aman Patel',
    status: 'Changes',
    priority: 'P1 - High',
    sla: 'Revision Needed',
    rawAvailable: true,
    finalAvailable: true,
    rawFolder: 'https://drive.google.com/drive/folders/mock-raw-203',
    finalFolder: 'https://drive.google.com/drive/folders/mock-final-203',
    rawFileLink: 'https://drive.google.com/file/d/mock-raw-file-203/view',
    finalFileLink: 'https://drive.google.com/file/d/mock-final-file-203/view',
    qcNotes: 'Replace lower third at 0:14 with official logo animation.',
    qcStatus: 'Changes Required',
    account: 'Course Hub',
    updatedAt: new Date(Date.now() - 14400000).toISOString(),
    publishDate: new Date().toISOString().split('T')[0],
  },
  {
    id: 'VID-204',
    title: 'Organic Chemistry Reactions Masterclass',
    teacher: 'Dr. Ananya',
    editor: 'Pooja Sharma',
    status: 'Approved',
    priority: 'P2 - Normal',
    sla: 'Ready for Upload',
    rawAvailable: true,
    finalAvailable: true,
    rawFolder: 'https://drive.google.com/drive/folders/mock-raw-204',
    finalFolder: 'https://drive.google.com/drive/folders/mock-final-204',
    rawFileLink: 'https://drive.google.com/file/d/mock-raw-file-204/view',
    finalFileLink: 'https://drive.google.com/file/d/mock-final-file-204/view',
    qcNotes: 'Clean cut and animations approved.',
    qcStatus: 'Approved',
    account: 'Main Channel',
    postUrl: 'https://youtube.com/shorts/mock-204',
    posted: true,
    updatedAt: new Date(Date.now() - 28800000).toISOString(),
    publishDate: new Date().toISOString().split('T')[0],
  },
  {
    id: 'VID-205',
    title: 'Thermodynamics Laws Explained in 3 Minutes',
    teacher: 'Master Siddharth',
    editor: 'Kiran Joshi',
    status: 'Script Ready',
    priority: 'P2 - Normal',
    sla: 'Raw Pending',
    rawAvailable: false,
    finalAvailable: false,
    rawFolder: 'https://drive.google.com/drive/folders/mock-raw-205',
    finalFolder: 'https://drive.google.com/drive/folders/mock-final-205',
    qcNotes: '',
    qcStatus: 'Not Ready',
    account: 'Shorts Lab',
    scriptReady: true,
    updatedAt: new Date(Date.now() - 43200000).toISOString(),
    publishDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
  },
];

let mockMisConfig = {
  recipientEmails: 'ops-leads@infinitycampaigns.internal',
  ccEmails: 'director@infinitycampaigns.internal',
  sendHour: 22,
  note: 'Daily evening campaign sprint summary.',
  triggerEnabled: true,
  dailyQuotaRemaining: 98,
};

export function handleMockAction(action: string, body: Record<string, unknown>): Record<string, unknown> {
  switch (action) {
    case 'bootstrap': {
      return {
        ok: true,
        version: 'v2.1',
        systemStatus: 'Operational',
        teachers: ['Dr. Ananya', 'Prof. Vikram', 'Coach Riya', 'Master Siddharth'],
        editors: ['Rahul Verma', 'Sneha Nair', 'Aman Patel', 'Pooja Sharma', 'Kiran Joshi'],
        statuses: ['Script Pending', 'Script Ready', 'Recording', 'Raw Ready', 'Editing', 'QC Pending', 'Changes', 'Approved', 'Uploaded', 'Blocked'],
        priorities: ['P0 - Critical', 'P1 - High', 'P2 - Normal', 'P3 - Low'],
        accounts: ['Main Channel', 'Shorts Lab', 'Course Hub'],
      };
    }

    case 'dashboard': {
      const activeVideos = mockVideos.filter((v) => v.status !== 'Uploaded');
      const plannedToday = mockVideos.filter((v) => v.publishDate === new Date().toISOString().split('T')[0]).length;
      const overdue = mockVideos.filter((v) => v.sla.toLowerCase().includes('overdue') || v.status === 'Blocked').length;
      const blocked = mockVideos.filter((v) => v.status === 'Blocked').length;

      const byStatus: Record<string, number> = {};
      for (const v of mockVideos) {
        byStatus[v.status] = (byStatus[v.status] || 0) + 1;
      }

      const dashPayload = {
        totalActive: activeVideos.length,
        plannedToday: plannedToday || 4,
        overdue: overdue,
        blocked: blocked,
        todayTotal: plannedToday || 4,
        todayUploaded: mockVideos.filter((v) => v.posted).length,
        byStatus,
        actionItems: mockVideos
          .filter((v) => ['QC Pending', 'Changes', 'Editing'].includes(v.status))
          .map((v) => ({
            videoId: v.id,
            title: v.title,
            productionStatus: v.status,
            priority: v.priority,
            editor: v.editor,
            slaStatus: v.sla,
            dueAt: v.publishDate || 'Today',
          })),
        pipeline: [
          { stage: 'Script Pending', count: byStatus['Script Pending'] || 0 },
          { stage: 'Script Ready', count: byStatus['Script Ready'] || 1 },
          { stage: 'Raw Ready', count: byStatus['Raw Ready'] || 0 },
          { stage: 'Editing', count: byStatus['Editing'] || 1 },
          { stage: 'QC Pending', count: byStatus['QC Pending'] || 1 },
          { stage: 'Changes', count: byStatus['Changes'] || 1 },
          { stage: 'Approved', count: byStatus['Approved'] || 1 },
        ],
      };

      return {
        ok: true,
        result: dashPayload,
        ...dashPayload,
      };
    }

    case 'videos': {
      const videoItems = mockVideos.map((v) => ({
        ...v,
        videoId: v.id,
        rawRecord: { ...v },
      }));
      return {
        ok: true,
        result: videoItems,
        items: videoItems,
        videos: videoItems,
      };
    }

    case 'video': {
      const videoId = String(body.videoId || '').trim();
      const matched = mockVideos.find((v) => v.id.toLowerCase() === videoId.toLowerCase());
      const video = matched || { ...mockVideos[0], id: videoId || mockVideos[0].id };
      const videoDetail = {
        ...video,
        videoId: video.id,
        timestamps: [
          { label: 'Created', value: new Date(Date.now() - 86400000 * 2).toLocaleDateString() },
          { label: 'Script Approved', value: new Date(Date.now() - 86400000).toLocaleDateString() },
          { label: 'Last Stage Transition', value: new Date().toLocaleTimeString() },
        ],
        rawRecord: { ...video },
      };
      return {
        ok: true,
        result: videoDetail,
        video: videoDetail,
      };
    }

    case 'editor_load': {
      const editors = ['Rahul Verma', 'Sneha Nair', 'Aman Patel', 'Pooja Sharma', 'Kiran Joshi'];
      const editorData = editors.map((name) => {
        const assigned = mockVideos.filter((v) => v.editor === name);
        const activeCount = assigned.filter((v) => v.status === 'Editing' || v.status === 'Changes').length;
        const qcCount = assigned.filter((v) => v.status === 'QC Pending').length;
        const completedCount = assigned.filter((v) => v.status === 'Approved' || v.status === 'Uploaded').length;
        const totalCount = assigned.length;
        const capacityStatus = activeCount >= 2 ? 'High Load' : activeCount === 1 ? 'Optimal' : 'Available';

        return {
          name,
          activeCount,
          qcCount,
          completedCount,
          totalCount,
          capacityStatus,
          rawRecord: { name, activeCount, qcCount, completedCount, totalCount },
        };
      });

      return {
        ok: true,
        result: editorData,
        editors: editorData,
      };
    }

    case 'mis_config': {
      return {
        ok: true,
        config: mockMisConfig,
      };
    }

    case 'save_mis_config': {
      const config = (body.config || body) as Partial<typeof mockMisConfig>;
      mockMisConfig = { ...mockMisConfig, ...config };
      return {
        ok: true,
        message: 'MIS configuration saved successfully.',
        config: mockMisConfig,
      };
    }

    case 'send_mis_test': {
      return {
        ok: true,
        message: 'Test MIS report dispatched to configured recipients.',
      };
    }

    case 'setup_mis_trigger': {
      mockMisConfig.triggerEnabled = true;
      return {
        ok: true,
        message: `Daily MIS trigger scheduled for hour ${mockMisConfig.sendHour}:00.`,
      };
    }

    case 'qc_approve': {
      const videoId = String(body.videoId || '').trim();
      const video = mockVideos.find((v) => v.id.toLowerCase() === videoId.toLowerCase());
      if (video) {
        video.status = 'Approved';
        video.qcStatus = 'Approved';
        video.sla = 'Ready for Upload';
        video.updatedAt = new Date().toISOString();
      }
      return { ok: true, message: `Video ${videoId} approved successfully.` };
    }

    case 'qc_changes': {
      const videoId = String(body.videoId || '').trim();
      const notes = String(body.notes || body.qcNotes || 'Changes required').trim();
      const video = mockVideos.find((v) => v.id.toLowerCase() === videoId.toLowerCase());
      if (video) {
        video.status = 'Changes';
        video.qcStatus = 'Changes Required';
        video.qcNotes = notes;
        video.sla = 'Revision Needed';
        video.updatedAt = new Date().toISOString();
      }
      return { ok: true, message: `QC changes requested for ${videoId}.` };
    }

    case 'assign_editor': {
      const videoId = String(body.videoId || '').trim();
      const editor = String(body.editor || '').trim();
      const video = mockVideos.find((v) => v.id.toLowerCase() === videoId.toLowerCase());
      if (video && editor) {
        video.editor = editor;
        video.status = 'Editing';
        video.updatedAt = new Date().toISOString();
      }
      return { ok: true, message: `Editor ${editor} assigned to ${videoId}.` };
    }

    case 'detect_raw':
    case 'detect_final': {
      const videoId = String(body.videoId || '').trim();
      return {
        ok: true,
        message: `File detection completed for ${videoId}. Files verified in Google Drive.`,
      };
    }

    case 'create_video': {
      const newId = `VID-${200 + mockVideos.length + 1}`;
      const title = String(body.title || 'New Content Campaign Video').trim();
      const teacher = String(body.teacher || 'Dr. Ananya').trim();
      const priority = String(body.priority || 'P2 - Normal').trim();
      const newVideo: MockVideoRecord = {
        id: newId,
        title,
        teacher,
        editor: 'Unassigned',
        status: 'Script Pending',
        priority,
        sla: 'Awaiting Script',
        rawAvailable: false,
        finalAvailable: false,
        rawFolder: `https://drive.google.com/drive/folders/mock-raw-${newId}`,
        finalFolder: `https://drive.google.com/drive/folders/mock-final-${newId}`,
        qcNotes: '',
        qcStatus: 'Not Ready',
        account: 'Main Channel',
        updatedAt: new Date().toISOString(),
      };
      mockVideos.unshift(newVideo);
      return { ok: true, message: `Video ${newId} created.`, video: newVideo };
    }

    case 'update_script': {
      const videoId = String(body.videoId || '').trim();
      return { ok: true, message: `Script for ${videoId} updated successfully.` };
    }

    case 'approve_script': {
      const videoId = String(body.videoId || '').trim();
      const video = mockVideos.find((v) => v.id.toLowerCase() === videoId.toLowerCase());
      if (video) {
        video.status = 'Script Ready';
        video.scriptReady = true;
        video.updatedAt = new Date().toISOString();
      }
      return { ok: true, message: `Script for ${videoId} approved.` };
    }

    case 'mark_uploaded': {
      const videoId = String(body.videoId || '').trim();
      const postUrl = String(body.postUrl || '').trim();
      const account = String(body.account || '').trim();
      const video = mockVideos.find((v) => v.id.toLowerCase() === videoId.toLowerCase());
      if (video) {
        video.status = 'Uploaded';
        video.posted = true;
        if (postUrl) video.postUrl = postUrl;
        if (account) video.account = account;
        video.updatedAt = new Date().toISOString();
      }
      return { ok: true, message: `Video ${videoId} marked as uploaded.` };
    }

    default:
      return { ok: true, result: {} };
  }
}
