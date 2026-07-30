export const TRIGGER_LABELS: Record<string, string> = {
  'lead.created': 'Lead created',
  'lead.status_changed': 'Lead status changed',
  'customer.created': 'Customer created',
  'deal.created': 'Deal created',
  'deal.stage_changed': 'Deal stage changed',
  'task.completed': 'Task completed',
  manual: 'Manual',
};

export const TRIGGER_DESCRIPTIONS: Record<string, string> = {
  'lead.created': 'Runs whenever a new lead is added.',
  'lead.status_changed': 'Runs when a lead moves to a new status.',
  'customer.created': 'Runs whenever a new customer is created.',
  'deal.created': 'Runs whenever a new deal is added to a pipeline.',
  'deal.stage_changed': 'Runs when a deal is moved to a different stage.',
  'task.completed': 'Runs when a task is marked done.',
  manual: 'Only runs when triggered manually.',
};

export const ACTION_LABELS: Record<string, string> = {
  send_email: 'Send email',
  send_notification: 'Send notification',
  create_task: 'Create task',
  assign_owner: 'Assign owner',
  webhook: 'Call webhook',
  ai_generate: 'AI generate',
};

export const ACTION_DESCRIPTIONS: Record<string, string> = {
  send_email: 'Sends an email (email provider integration).',
  send_notification: 'Sends an in-app notification.',
  create_task: 'Creates a task in a project.',
  assign_owner: 'Assigns an owner to the record.',
  webhook: 'Sends a signed HTTP POST to a URL.',
  ai_generate: 'Uses AI to generate text (note, email draft, summary).',
};

export function triggerLabel(v: string): string {
  return TRIGGER_LABELS[v] ?? v;
}
export function actionLabel(v: string): string {
  return ACTION_LABELS[v] ?? v;
}
