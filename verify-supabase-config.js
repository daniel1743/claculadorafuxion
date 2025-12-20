/**
 * Script de Verificación de Configuración de Supabase
 *
 * Este script verifica que:
 * 1. La conexión a Supabase funciona
 * 2. Las tablas existen
 * 3. Las RLS policies están configuradas
 * 4. El perfil del usuario actual existe o se puede crear
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Leer variables de entorno del archivo .env
function loadEnv() {
  try {
    const envPath = join(__dirname, '.env');
    const envFile = readFileSync(envPath, 'utf-8');
    const env = {};

    envFile.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...values] = trimmed.split('=');
        if (key && values.length > 0) {
          env[key.trim()] = values.join('=').trim();
        }
      }
    });

    return env;
  } catch (error) {
    console.error('❌ Error leyendo .env:', error.message);
    return {};
  }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno no encontradas');
  console.log('Asegúrate de tener un archivo .env con:');
  console.log('  VITE_SUPABASE_URL=...');
  console.log('  VITE_SUPABASE_ANON_KEY=...');
  process.exit(1);
}

// Crear cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('\n🔍 Iniciando verificación de Supabase...\n');
console.log('📍 URL:', supabaseUrl);
console.log('🔑 Key:', supabaseKey.substring(0, 20) + '...\n');

async function verifySupabaseConfig() {
  try {
    // 1. Verificar conexión y sesión
    console.log('1️⃣ Verificando conexión y sesión...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('   ❌ Error obteniendo sesión:', sessionError.message);
      return;
    }

    if (!session) {
      console.log('   ⚠️ No hay sesión activa. Por favor, inicia sesión en la aplicación primero.');
      console.log('   💡 Ve a http://localhost:3000 e inicia sesión, luego vuelve a ejecutar este script.');
      return;
    }

    console.log('   ✅ Sesión activa:', session.user.email);
    console.log('   ✅ User ID:', session.user.id);

    // 2. Verificar tabla profiles - con timing
    console.log('\n2️⃣ Verificando tabla profiles...');
    const profileStartTime = Date.now();

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    const profileTime = Date.now() - profileStartTime;
    console.log(`   ⏱️ Tiempo de respuesta: ${profileTime}ms`);

    if (profileError) {
      console.error('   ❌ Error consultando profiles:', profileError);
      console.log('   💡 Esto sugiere que la tabla no existe o las RLS policies bloquean el acceso');
      console.log('   📋 Código de error:', profileError.code);
      console.log('   📋 Mensaje:', profileError.message);
      if (profileError.details) {
        console.log('   📋 Detalles:', profileError.details);
      }
      if (profileError.hint) {
        console.log('   💡 Sugerencia:', profileError.hint);
      }
      return;
    }

    if (profile) {
      console.log('   ✅ Perfil encontrado:', profile.name);
      console.log('   ✅ Email:', profile.email);
      console.log('   ✅ Created:', profile.created_at);
    } else {
      console.log('   ⚠️ No se encontró perfil para este usuario');

      // Intentar crear perfil
      console.log('\n3️⃣ Intentando crear perfil...');
      const createStartTime = Date.now();

      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: session.user.id,
          name: session.user.email.split('@')[0],
          email: session.user.email,
          avatar_url: null,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      const createTime = Date.now() - createStartTime;
      console.log(`   ⏱️ Tiempo de respuesta: ${createTime}ms`);

      if (createError) {
        console.error('   ❌ Error creando perfil:', createError);
        console.log('   💡 Esto sugiere un problema con las RLS policies o permisos');

        // Mostrar detalles del error
        if (createError.code) {
          console.log('   📋 Código de error:', createError.code);
        }
        if (createError.message) {
          console.log('   📋 Mensaje:', createError.message);
        }
        if (createError.details) {
          console.log('   📋 Detalles:', createError.details);
        }
        if (createError.hint) {
          console.log('   💡 Sugerencia:', createError.hint);
        }
      } else {
        console.log('   ✅ Perfil creado exitosamente:', newProfile.name);
      }
    }

    // 4. Verificar tabla transactions
    console.log('\n4️⃣ Verificando tabla transactions...');
    const txStartTime = Date.now();

    const { data: transactions, error: txError, count: txCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: false })
      .eq('user_id', session.user.id)
      .limit(1);

    const txTime = Date.now() - txStartTime;
    console.log(`   ⏱️ Tiempo de respuesta: ${txTime}ms`);

    if (txError) {
      console.error('   ❌ Error consultando transactions:', txError.message);
      if (txError.code) console.log('   📋 Código:', txError.code);
    } else {
      console.log('   ✅ Tabla transactions accesible');
      console.log(`   📊 Tienes ${txCount || 0} transacciones`);
    }

    // 5. Verificar tabla prices
    console.log('\n5️⃣ Verificando tabla prices...');
    const pricesStartTime = Date.now();

    const { data: prices, error: pricesError, count: pricesCount } = await supabase
      .from('prices')
      .select('*', { count: 'exact', head: false })
      .eq('user_id', session.user.id)
      .limit(1);

    const pricesTime = Date.now() - pricesStartTime;
    console.log(`   ⏱️ Tiempo de respuesta: ${pricesTime}ms`);

    if (pricesError) {
      console.error('   ❌ Error consultando prices:', pricesError.message);
      if (pricesError.code) console.log('   📋 Código:', pricesError.code);
    } else {
      console.log('   ✅ Tabla prices accesible');
      console.log(`   📊 Tienes ${pricesCount || 0} precios guardados`);
    }

    // Resumen
    console.log('\n📊 RESUMEN:');
    console.log('─'.repeat(50));

    if (profileTime > 3000) {
      console.log(`⚠️ Las consultas a profiles son LENTAS (${profileTime}ms)`);
      console.log('   💡 Los timeouts en la app ya están en 15s, pero considera:');
      console.log('      - Verificar la ubicación del servidor de Supabase');
      console.log('      - Revisar tu conexión a internet');
      console.log('      - Verificar si Supabase está en mantenimiento');
    } else if (profileTime > 1000) {
      console.log(`⚠️ Las consultas a profiles son lentas (${profileTime}ms)`);
      console.log('   💡 Considera verificar tu conexión o ubicación del servidor');
    } else {
      console.log(`✅ Tiempos de respuesta buenos (${profileTime}ms)`);
    }

    if (!profile && !profileError) {
      console.log('⚠️ El perfil no existe para este usuario');
      console.log('   💡 Ve a FIX-TIMEOUT-PROFILES.md para crear el perfil manualmente');
    }

    console.log('\n✅ Verificación completada\n');

  } catch (error) {
    console.error('\n❌ Error general:', error.message);
    console.error('Stack:', error.stack);
    console.log('\n💡 Verifica que:');
    console.log('   1. Las variables de entorno están configuradas correctamente');
    console.log('   2. El proyecto de Supabase está activo');
    console.log('   3. Las tablas existen en la base de datos');
    console.log('   4. Tienes una sesión activa (inicia sesión en http://localhost:3000)');
  }
}

// Ejecutar verificación
verifySupabaseConfig();
