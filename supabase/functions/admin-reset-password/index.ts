// Edge Function: admin-reset-password
// Permite a admins resetear contraseñas de usuarios

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Obtener el token del usuario que hace la petición
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No autorizado - Token requerido')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Cliente con token del usuario
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verificar autenticacion
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      throw new Error('No autorizado - Usuario no valido')
    }

    // Cliente admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verificar que es admin (usa admin_roles para consistencia con frontend)
    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from('admin_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (adminError || !adminCheck) {
      throw new Error('No autorizado - No eres administrador')
    }

    const { userId, newPassword } = await req.json()

    if (!userId || !newPassword) {
      throw new Error('Faltan parametros: userId y newPassword requeridos')
    }

    if (newPassword.length < 6) {
      throw new Error('La contrasena debe tener al menos 6 caracteres')
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (error) {
      throw new Error('Error al actualizar contrasena: ' + error.message)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Contrasena actualizada', userId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
