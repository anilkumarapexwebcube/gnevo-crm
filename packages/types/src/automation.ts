import { z } from 'zod';
import { IdSchema, TimestampsSchema } from './common.js';

/** Trigger types the automation engine can react to. */
export const TriggerTypeSchema = z.enum([
  'lead.created',
  'lead.status_changed',
  'customer.created',
  'deal.created',
  'deal.stage_changed',
  'task.completed',
  'manual',
]);
export type TriggerType = z.infer<typeof TriggerTypeSchema>;

/** A single action step in an automation. */
export const ActionTypeSchema = z.enum([
  'send_email',
  'send_notification',
  'create_task',
  'assign_owner',
  'webhook',
  'ai_generate',
]);
export type ActionType = z.infer<typeof ActionTypeSchema>;

export const ActionStepSchema = z.object({
  type: ActionTypeSchema,
  config: z.string().max(1000).default(''),
});
export type ActionStep = z.infer<typeof ActionStepSchema>;

/** Optional IF condition evaluated against the trigger event before running. */
export const ConditionOperatorSchema = z.enum([
  'equals',
  'not_equals',
  'contains',
  'exists',
  'not_exists',
]);
export const AutomationConditionSchema = z.object({
  field: z.string().min(1).max(60),
  operator: ConditionOperatorSchema,
  value: z.string().max(200).optional(),
});
export type AutomationCondition = z.infer<typeof AutomationConditionSchema>;

/** Wait-for-event: pause until a second event occurs for the same record. */
export const AutomationWaitForSchema = z.object({
  triggerType: TriggerTypeSchema,
  withinSeconds: z.coerce.number().int().min(60).max(2_592_000).optional(),
});
export type AutomationWaitFor = z.infer<typeof AutomationWaitForSchema>;

export const AutomationDefinitionSchema = z.object({
  actions: z.array(ActionStepSchema).default([]),
  condition: AutomationConditionSchema.optional(),
  // Delay before the actions run, in seconds (0 = immediate).
  delaySeconds: z.coerce.number().int().min(0).max(2_592_000).optional(),
  // Wait until this event fires for the same record before running actions.
  waitFor: AutomationWaitForSchema.optional(),
});
export type AutomationDefinition = z.infer<typeof AutomationDefinitionSchema>;

export const AutomationSchema = z
  .object({
    id: IdSchema,
    organizationId: IdSchema,
    name: z.string().min(1).max(160),
    triggerType: TriggerTypeSchema,
    definition: AutomationDefinitionSchema,
    isActive: z.boolean(),
  })
  .merge(TimestampsSchema);
export type Automation = z.infer<typeof AutomationSchema>;

export const CreateAutomationRequestSchema = z.object({
  name: z.string().min(1).max(160),
  triggerType: TriggerTypeSchema,
  definition: AutomationDefinitionSchema.default({ actions: [] }),
});
export type CreateAutomationRequest = z.infer<typeof CreateAutomationRequestSchema>;

export const UpdateAutomationRequestSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  triggerType: TriggerTypeSchema.optional(),
  definition: AutomationDefinitionSchema.optional(),
  isActive: z.boolean().optional(),
});
export type UpdateAutomationRequest = z.infer<typeof UpdateAutomationRequestSchema>;
