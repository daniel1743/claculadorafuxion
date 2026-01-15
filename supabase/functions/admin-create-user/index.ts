// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EDGE FUNCTION: CREAR USUARIO DESDE PANEL DE ADMIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

// ═══════════════════════════════════════════════════════════
// GENERADORES DE CREDENCIALES
// ═══════════════════════════════════════════════════════════

/**
 * Genera una contraseña segura aleatoria
 */
const generateSecurePassword = (length = 12): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const symbols = '!@#$%&*'

  const allChars = uppercase + lowercase + numbers + symbols

  let password = ''

  // Asegurar al menos uno de cada tipo
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]

  // Completar el resto
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  // Mezclar caracteres
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * Genera un email único basado en un nombre
 */
const generateUniqueEmail = (baseName = 'usuario'): string => {
  const sanitized = baseName.toLowerCase().replace(/[^a-z0-9]/g, '')
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  return `${sanitized}${timestamp}${random}@fuxion.internal`
}

// ═══════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════════

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ─────────────────────────────────────────────────────────
    // 1. VALIDAR AUTENTICACIÓN
    // ─────────────────────────────────────────────────────────

    const authHeader = req.headers.get('Authorization')
    console.log('🔑 Auth header recibido:', authHeader ? 'Sí (' + authHeader.substring(0, 50) + '...)' : 'No')

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado - falta header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extraer el token del header
    const token = authHeader.replace('Bearer ', '')
    console.log('🎫 Token extraído:', token.substring(0, 50) + '...')

    // Crear cliente de Supabase con SERVICE_ROLE para verificar el token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log('🌐 Supabase URL:', supabaseUrl)
    console.log('🔐 Service Key existe:', !!supabaseServiceKey)

    const supabaseAdmin = createClient(
      supabaseUrl ?? '',
      supabaseServiceKey ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verificar que el usuario esté autenticado usando el token directamente
    console.log('👤 Verificando usuario con getUser(token)...')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    console.log('👤 Resultado getUser:', { user: user?.email, error: userError?.message })

    if (userError || !user) {
      console.error('❌ Error en getUser:', userError)
      return new Response(
        JSON.stringify({
          error: 'Usuario no autenticado',
          details: userError?.message,
          hint: 'El token puede estar expirado o ser inválido'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('👤 Usuario autenticado:', user.email)

    // ─────────────────────────────────────────────────────────
    // 2. VERIFICAR QUE EL USUARIO ES ADMIN
    // ─────────────────────────────────────────────────────────

    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from('admin_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (adminError || !adminCheck) {
      console.error('❌ Usuario no es admin:', user.email)
      return new Response(
        JSON.stringify({ error: 'No tienes permisos de administrador' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Usuario es admin:', adminCheck.role)

    // ─────────────────────────────────────────────────────────
    // 3. OBTENER DATOS DE LA PETICIÓN
    // ─────────────────────────────────────────────────────────

    const { name, email, password } = await req.json()

    console.log('📋 Datos recibidos:', { name, email: email || 'auto-generado', password: password ? 'proporcionada' : 'auto-generada' })

    // ─────────────────────────────────────────────────────────
    // 4. GENERAR CREDENCIALES SI NO SE PROPORCIONARON
    // ─────────────────────────────────────────────────────────

    const finalEmail = email || generateUniqueEmail(name || 'usuario')
    const finalPassword = password || generateSecurePassword()

    console.log('✅ Credenciales generadas:', { email: finalEmail, password: '***' })

    // ─────────────────────────────────────────────────────────
    // 5. CREAR USUARIO CON SERVICE_ROLE (ADMIN API)
    // ─────────────────────────────────────────────────────────

    // Ya tenemos supabaseAdmin creado arriba con service_role key
    console.log('🔑 Creando usuario con Admin API...')

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: finalEmail,
      password: finalPassword,
      email_confirm: true, // Auto-confirmar email (no enviar correo de confirmación)
      user_metadata: {
        name: name || finalEmail.split('@')[0],
        created_by_admin: true,
        created_by: user.email,
        created_at: new Date().toISOString()
      }
    })

    if (createError) {
      console.error('❌ Error creando usuario:', createError)
      return new Response(
        JSON.stringify({
          error: 'Error al crear usuario',
          details: createError.message
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Usuario creado exitosamente:', newUser.user?.id)

    // ─────────────────────────────────────────────────────────
    // 6. CREAR PERFIL AUTOMÁTICAMENTE
    // ─────────────────────────────────────────────────────────

    // Verificar si ya existe el perfil (por si el trigger lo creó)
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', newUser.user.id)
      .single()

    if (!existingProfile) {
      console.log('📝 Creando perfil...')

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: newUser.user.id,
          name: name || finalEmail.split('@')[0],
          email: finalEmail,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (profileError) {
        console.warn('⚠️ Error creando perfil (puede que ya exista):', profileError.message)
      } else {
        console.log('✅ Perfil creado')
      }
    } else {
      console.log('✅ Perfil ya existe')
    }

    // ─────────────────────────────────────────────────────────
    // 7. DEVOLVER CREDENCIALES
    // ─────────────────────────────────────────────────────────

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          user: newUser.user,
          email: finalEmail,
          password: finalPassword,
          message: 'Usuario creado exitosamente'
        }
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    console.error('💥 Error general:', error)

    return new Response(
      JSON.stringify({
        error: 'Error interno del servidor',
        details: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})
