import { supabase } from './supabase';

export interface MetaphorSettings {
  api_key: string | null;
  github_token: string | null;
  notion_token: string | null;
  theme: string;
  user_name: string | null;
  onboarded: boolean;
}

let memorySettings: MetaphorSettings | null = null;

export async function pullSettingsFromCloud(): Promise<MetaphorSettings | null> {
  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth?.user?.id) return null;

    const { data, error } = await supabase
      .from('metaphor_user_settings')
      .select('*')
      .eq('user_id', userAuth.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.warn("Failed to pull settings from cloud:", error);
      return null;
    }

    if (data) {
      memorySettings = {
        api_key: data.api_key || null,
        github_token: data.github_token || null,
        notion_token: data.notion_token || null,
        theme: data.theme || 'dark',
        user_name: data.user_name || null,
        onboarded: data.onboarded || false,
      };

      if (data.theme) {
        document.documentElement.setAttribute('data-theme', data.theme);
        if (data.theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      }
      
      window.dispatchEvent(new Event("metaphor-settings-synced"));
      return memorySettings;
    }
  } catch (err) {
    console.warn("Error pulling settings:", err);
  }
  return null;
}

export function getLocalSettings(): MetaphorSettings | null {
  return memorySettings;
}

export async function pushSettingsToCloud(settings: Partial<MetaphorSettings>): Promise<void> {
  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth?.user?.id) return;

    if (memorySettings) {
      memorySettings = { ...memorySettings, ...settings };
    } else {
      memorySettings = {
        api_key: null,
        github_token: null,
        notion_token: null,
        theme: 'dark',
        user_name: null,
        onboarded: false,
        ...settings,
      };
    }

    const payload = {
      user_id: userAuth.user.id,
      ...memorySettings,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('metaphor_user_settings')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      console.warn("Failed to push settings to cloud:", error);
    }
  } catch (err) {
    console.warn("Error pushing settings:", err);
  }
}
