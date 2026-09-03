import { supabase } from './supabase';

/**
 * Pulls the user's settings from Supabase and populates localStorage.
 * This allows all existing synchronous Next.js UI code to continue functioning
 * without major refactors, while gaining the benefits of cloud sync.
 */
export async function pullSettingsFromCloud(): Promise<void> {
  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth?.user?.id) return;

    const { data, error } = await supabase
      .from('metaphor_user_settings')
      .select('*')
      .eq('user_id', userAuth.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.warn("Failed to pull settings from cloud:", error);
      return;
    }

    if (data) {
      if (data.api_key) localStorage.setItem("metaphor_api_key", data.api_key);
      if (data.github_token) localStorage.setItem("metaphor_github_token", data.github_token);
      if (data.notion_token) localStorage.setItem("metaphor_notion_token", data.notion_token);
      if (data.theme) {
        localStorage.setItem("metaphor_theme", data.theme);
        document.documentElement.setAttribute('data-theme', data.theme);
        if (data.theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      }
      if (data.user_name) localStorage.setItem("metaphor_user_name", data.user_name);
      if (data.onboarded) localStorage.setItem("metaphor_onboarded", "true");
      
      // Dispatch an event so React components can re-render if needed
      window.dispatchEvent(new Event("metaphor-settings-synced"));
    }
  } catch (err) {
    console.warn("Error pulling settings:", err);
  }
}

/**
 * Pushes the current localStorage settings to Supabase.
 * Call this whenever a setting is updated in the UI.
 */
export async function pushSettingsToCloud(): Promise<void> {
  try {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth?.user?.id) return;

    const payload = {
      user_id: userAuth.user.id,
      api_key: localStorage.getItem("metaphor_api_key") || null,
      github_token: localStorage.getItem("metaphor_github_token") || null,
      notion_token: localStorage.getItem("metaphor_notion_token") || null,
      theme: localStorage.getItem("metaphor_theme") || 'dark',
      user_name: localStorage.getItem("metaphor_user_name") || null,
      onboarded: localStorage.getItem("metaphor_onboarded") === "true",
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
