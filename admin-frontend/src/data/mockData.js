export const activityData = [
  {
    id: 1,
    action: "Updated system instructions",
    timestamp: "2025-11-17T08:30:00Z",
    actor: "Admin"
  },
  {
    id: 2,
    action: "Added 3 new documents to KB",
    timestamp: "2025-11-16T15:45:00Z",
    actor: "Admin"
  },
  {
    id: 3,
    action: "Modified bot tone settings",
    timestamp: "2025-11-16T12:20:00Z",
    actor: "Admin"
  },
  {
    id: 4,
    action: "Enabled code modality",
    timestamp: "2025-11-15T09:10:00Z",
    actor: "Admin"
  },
  {
    id: 5,
    action: "Synced repository content",
    timestamp: "2025-11-14T14:05:00Z",
    actor: "System"
  }
];

export const systemInstructionHistory = [
  {
    id: 1,
    timestamp: "2025-11-17T08:30:00Z",
    author: "Admin",
    diff: "+ Added context about new product features\n- Removed outdated pricing information"
  },
  {
    id: 2,
    timestamp: "2025-11-10T14:20:00Z",
    author: "Admin",
    diff: "+ Updated tone to be more formal\n+ Added escalation guidelines"
  },
  {
    id: 3,
    timestamp: "2025-11-03T09:15:00Z",
    author: "Admin",
    diff: "Initial system instructions created"
  }
];

export const systemInstructionTemplates = [
  {
    id: "default",
    name: "Default Assistant",
    content: "You are a helpful AI assistant. Provide accurate, concise responses to user queries. Always maintain a professional and friendly tone."
  },
  {
    id: "helpdesk",
    name: "Helpdesk",
    content: "You are a customer support assistant. Help users troubleshoot issues, answer questions about products and services, and escalate complex problems when necessary. Be patient and empathetic."
  },
  {
    id: "escalation",
    name: "Escalation Flow",
    content: "You are a support triage assistant. Assess user issues and determine if they can be resolved immediately or need escalation. For complex technical issues or billing matters, escalate to a human agent."
  }
];
