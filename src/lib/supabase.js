import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[Supabase] Configuración:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  url: supabaseUrl,
  keyPrefix: supabaseAnonKey?.substring(0, 20) + '...'
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ERROR CRÍTICO: Las variables de entorno de Supabase no están configuradas');
  console.error('Verifica que exista un archivo .env con:');
  console.error('VITE_SUPABASE_URL=tu_url_aqui');
  console.error('VITE_SUPABASE_ANON_KEY=tu_key_aqui');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: 'supabase.auth.token',
        flowType: 'pkce'
      },
      global: {
        headers: {
          'X-Client-Info': 'supabase-js-web'
        }
      },
      db: {
        schema: 'public'
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
  : null;

console.log('[Supabase] Cliente creado:', !!supabase);

