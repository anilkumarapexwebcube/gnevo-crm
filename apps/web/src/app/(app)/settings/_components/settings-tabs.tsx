'use client';

import { useState } from 'react';
import { Palette, ShieldCheck, User, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SettingsView } from './settings-view';
import { PasskeysCard } from './passkeys-card';
import { SessionsManager } from './sessions-manager';
import { BrandingCard } from './branding-card';
import { CustomFieldsCard } from './custom-fields-card';
import { AiPreferencesCard } from './ai-preferences-card';
import { ScheduledReportsCard } from './scheduled-reports-card';
import { ApiKeysCard } from './api-keys-card';
import { WebhooksManager } from './webhooks-manager';
import { MacrosManager } from './macros-manager';
import { IntegrationsManager } from './integrations-manager';
import { SessionTimeoutCard } from './session-timeout-card';
import { LoginHistoryCard } from './login-history-card';
import type { CustomFieldDef } from '../actions';

interface Props {
  user: { fullName: string; email: string; mfaEnabled: boolean };
  isAdmin: boolean;
  branding: import('./branding-types').BrandingData | null;
  customFields: CustomFieldDef[];
  aiPreference: { provider: string | null; model: string | null } | null;
  scheduledReports: boolean;
}

type TabKey = 'account' | 'security' | 'workspace';

const TABS: { key: TabKey; label: string; icon: LucideIcon; desc: string; adminOnly?: boolean }[] = [
  { key: 'account', label: 'Account', icon: User, desc: 'Your name and email' },
  { key: 'security', label: 'Security', icon: ShieldCheck, desc: 'Password, 2FA, sessions' },
  { key: 'workspace', label: 'Workspace', icon: Palette, desc: 'Branding & custom fields', adminOnly: true },
];

export function SettingsTabs({
  user,
  isAdmin,
  branding,
  customFields,
  aiPreference,
  scheduledReports,
}: Props) {
  const [tab, setTab] = useState<TabKey>('account');
  const visible = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      {/* Category nav */}
      <nav className="flex gap-2 lg:flex-col lg:sticky lg:top-4 lg:self-start overflow-x-auto pb-1">
        {visible.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'group flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all lg:w-full',
                active
                  ? 'bg-primary/10 ring-1 ring-primary/20'
                  : 'hover:bg-secondary/50',
              )}
            >
              <span
                className={cn(
                  'grid size-8 place-items-center rounded-lg transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
                )}
              >
                <t.icon className="size-4" />
              </span>
              <span className="hidden flex-col sm:flex">
                <span
                  className={cn(
                    'text-sm font-semibold',
                    active ? 'text-primary' : 'text-foreground',
                  )}
                >
                  {t.label}
                </span>
                <span className="text-xs text-muted-foreground">{t.desc}</span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* Panels */}
      <div className="min-w-0 animate-in fade-in duration-300">
        {tab === 'account' && (
          <SettingsView
            section="account"
            fullName={user.fullName}
            email={user.email}
            mfaEnabled={user.mfaEnabled}
          />
        )}

        {tab === 'security' && (
          <div className="flex flex-col gap-5">
            <SettingsView
              section="security"
              fullName={user.fullName}
              email={user.email}
              mfaEnabled={user.mfaEnabled}
            />
            <PasskeysCard />
            <SessionsManager />
            <LoginHistoryCard />
            {isAdmin && <SessionTimeoutCard />}
          </div>
        )}

        {tab === 'workspace' && isAdmin && (
          <div className="flex flex-col gap-5">
            {branding && (
              <BrandingCard displayName={branding.displayName} brandColor={branding.brandColor} theme={branding.theme} colors={branding.colors} />
            )}
            <AiPreferencesCard
              provider={aiPreference?.provider ?? null}
              model={aiPreference?.model ?? null}
            />
            <ScheduledReportsCard enabled={scheduledReports} />
            <ApiKeysCard />
            <WebhooksManager />
            <IntegrationsManager />
            <MacrosManager />
            <CustomFieldsCard initial={customFields} />
          </div>
        )}
      </div>
    </div>
  );
}
