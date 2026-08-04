import { redirect } from 'next/navigation';
import { Settings as SettingsIcon } from 'lucide-react';
import { getCurrentUser, apiServer } from '@/lib/session';
import { SettingsTabs } from './_components/settings-tabs';
import type { BrandingData } from './_components/branding-types';
import type { CustomFieldDef } from './actions';

export const metadata = {
  title: 'Settings | Gnevo CRM',
  description: 'Manage your account, security and preferences.',
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const isAdmin = user.roles.some((r) => r === 'owner' || r === 'admin');
  let branding: BrandingData | null = null;
  let customFields: CustomFieldDef[] = [];
  let aiPreference: { provider: string | null; model: string | null } | null = null;
  let scheduledReports = false;
  if (isAdmin) {
    try {
      const [b, cf, ai, sr] = await Promise.all([
        apiServer<BrandingData>('/v1/org/branding'),
        apiServer<CustomFieldDef[]>('/v1/org/custom-fields?entity=customer'),
        apiServer<{ provider: string | null; model: string | null }>('/v1/org/ai-preferences'),
        apiServer<{ enabled: boolean }>('/v1/org/scheduled-reports'),
      ]);
      branding = b;
      customFields = cf;
      aiPreference = ai;
      scheduledReports = sr.enabled;
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/20">
          <SettingsIcon className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account, security & workspace</p>
        </div>
      </div>

      <SettingsTabs
        user={{ fullName: user.fullName, email: user.email, mfaEnabled: user.mfaEnabled }}
        isAdmin={isAdmin}
        branding={branding}
        customFields={customFields}
        aiPreference={aiPreference}
        scheduledReports={scheduledReports}
      />
    </div>
  );
}
