// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EDGE FUNCTION: RESETEAR CONTRASEÑA DESDE PANEL DE ADMIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

// ═══════════════════════════════════════════════════════════
// GENERADOR DE CONTRASEÑA
// ═══════════════════════════════════════════════════════════

const generateSecurePassword = (length = 12): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const symbols = '!@#$%&*'

  const allChars = uppercase + lowercase + numbers + symbols

  let password = ''

  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]

  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  return password.split('').sort(() => Math.random() - 0.5).join('')
}

// ═══════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════════

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ─────────────────────────────────────────────────────────
    // 1. VALIDAR AUTENTICACIÓN
    // ─────────────────────────────────────────────────────────

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: authHeader } },
      }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuario no autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('👤 Usuario autenticado:', user.email)

    // ─────────────────────────────────────────────────────────
    // 2. VERIFICAR QUE EL USUARIO ES ADMIN
    // ─────────────────────────────────────────────────────────

    const { data: adminCheck, error: adminError } = await supabaseClient
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

    const { userId, newPassword } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('📋 Reseteando contraseña para userId:', userId)

    // ─────────────────────────────────────────────────────────
    // 4. GENERAR CONTRASEÑA SI NO SE PROPORCIONÓ
    // ─────────────────────────────────────────────────────────

    const finalPassword = newPassword || generateSecurePassword()

    console.log('✅ Nueva contraseña generada')

    // ─────────────────────────────────────────────────────────
    // 5. ACTUALIZAR CONTRASEÑA CON ADMIN API
    // ─────────────────────────────────────────────────────────

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    )

    console.log('🔑 Actualizando contraseña con Admin API...')

    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: finalPassword }
    )

    if (updateError) {
      console.error('❌ Error actualizando contraseña:', updateError)
      return new Response(
        JSON.stringify({
          error: 'Error al actualizar contraseña',
          details: updateError.message
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Contraseña actualizada exitosamente')

    // ─────────────────────────────────────────────────────────
    // 6. DEVOLVER CREDENCIALES
    // ─────────────────────────────────────────────────────────

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          user: updatedUser.user,
          password: finalPassword,
          message: 'Contraseña reseteada exitosamente'
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
