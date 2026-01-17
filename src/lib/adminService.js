import { supabase } from './supabase';

/**
 * Servicio de Administración
 * Maneja creación de usuarios, reseteo de contraseñas y gestión de cuentas
 *
 * IMPORTANTE: Estas funciones requieren privilegios de administrador
 * Usar solo desde el panel de administración con autenticación verificada
 */

/**
 * Genera una contraseña segura aleatoria
 * @param {number} length - Longitud de la contraseña (default: 12)
 * @returns {string} Contraseña generada
 */
export const generateSecurePassword = (length = 12) => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%&*';

  const allChars = uppercase + lowercase + numbers + symbols;

  let password = '';

  // Asegurar al menos uno de cada tipo
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Completar el resto
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Mezclar caracteres
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Genera un email único basado en un nombre
 * @param {string} baseName - Nombre base para el email
 * @returns {string} Email generado
 */
export const generateUniqueEmail = (baseName = 'usuario') => {
  const sanitized = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${sanitized}${timestamp}${random}@fuxion.internal`;
};

/**
 * Crea un nuevo usuario usando Edge Function
 * @param {Object} userData - Datos del usuario
 * @param {string} [userData.email] - Email del usuario (opcional, se genera si no se proporciona)
 * @param {string} [userData.password] - Contraseña (opcional, se genera si no se proporciona)
 * @param {string} [userData.name] - Nombre del usuario
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const createNewUser = async (userData = {}) => {
  try {
    console.log('[adminService] 🚀 Creando usuario vía Edge Function...');

    // Obtener el token del usuario actual
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    console.log('[adminService] 📋 Session debug:', {
      hasSession: !!session,
      sessionError: sessionError,
      hasAccessToken: !!session?.access_token,
      tokenPreview: session?.access_token?.substring(0, 50) + '...',
      userEmail: session?.user?.email
    });

    if (!session) {
      throw new Error('No hay sesión activa');
    }

    // Llamar a la Edge Function usando fetch directo para control total de headers
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const functionUrl = `${supabaseUrl}/functions/v1/admin-create-user`;

    console.log('[adminService] 🌐 Llamando a:', functionUrl);
    console.log('[adminService] 🔑 Token:', session.access_token.substring(0, 50) + '...');

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        name: userData.name || undefined,
        email: userData.email || undefined,
        password: userData.password || undefined
      })
    });

    console.log('[adminService] 📋 Response status:', response.status);

    const data = await response.json();

    console.log('[adminService] 📋 Response data:', data);

    if (!response.ok) {
      console.error('[adminService] ❌ Error de Edge Function:', {
        status: response.status,
        data: data
      });
      throw new Error(data.error || `Error ${response.status}`);
    }

    if (data.error) {
      console.error('[adminService] ❌ Error en respuesta:', data.error);
      throw new Error(data.error);
    }

    console.log('[adminService] ✅ Usuario creado:', data.data.email);

    return {
      data: {
        user: data.data.user,
        email: data.data.email,
        password: data.data.password
      },
      error: null
    };
  } catch (error) {
    console.error('[adminService] ❌ Error creating user:', {
      message: error.message,
      details: error
    });
    return { data: null, error };
  }
};

/**
 * Resetea la contraseña de un usuario usando Edge Function
 * @param {string} userId - ID del usuario
 * @param {string} [newPassword] - Nueva contraseña (opcional, se genera si no se proporciona)
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const resetUserPassword = async (userId, newPassword = null) => {
  try {
    console.log('[adminService] 🔑 Reseteando contraseña vía Edge Function...');

    // Obtener el token del usuario actual
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('No hay sesión activa');
    }

    // Generar contraseña si no se proporciona
    const passwordToSet = newPassword || generateSecurePassword();

    // Llamar a la Edge Function con el token explícito
    const { data, error } = await supabase.functions.invoke('admin-reset-password', {
      body: {
        userId: userId,
        newPassword: passwordToSet
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (error) {
      console.error('[adminService] ❌ Error de Edge Function:', error);
      throw error;
    }

    if (data.error) {
      console.error('[adminService] ❌ Error en respuesta:', data.error);
      throw new Error(data.error);
    }

    console.log('[adminService] ✅ Contraseña reseteada exitosamente');

    return {
      data: {
        userId: data.userId || userId,
        password: passwordToSet
      },
      error: null
    };
  } catch (error) {
    console.error('[adminService] ❌ Error resetting password:', {
      message: error.message,
      details: error
    });
    return { data: null, error };
  }
};

/**
 * Obtiene todos los usuarios del sistema
 * MODIFICADO: Usa queries regulares en lugar de Admin API
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export const getAllUsers = async () => {
  try {
    console.log('[adminService] 🔍 Obteniendo usuarios desde profiles...');

    // PASO 1: Obtener todos los profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('[adminService] ❌ ERROR en profiles:', {
        code: profilesError.code,
        message: profilesError.message,
        details: profilesError.details,
        hint: profilesError.hint
      });
      throw profilesError;
    }

    console.log('[adminService] ✅ Profiles obtenidos:', profiles?.length);

    // PASO 2: Obtener todos los admin_roles
    const { data: adminRoles, error: rolesError } = await supabase
      .from('admin_roles')
      .select('user_id, role, notes');

    if (rolesError) {
      console.warn('[adminService] ⚠️ Error obteniendo admin_roles:', {
        code: rolesError.code,
        message: rolesError.message
      });
      // No fallar si no podemos obtener roles, solo continuar sin ellos
    }

    console.log('[adminService] ✅ Admin roles obtenidos:', adminRoles?.length || 0);

    // PASO 3: Crear un mapa de roles por user_id para lookup rápido
    const rolesMap = new Map();
    if (adminRoles) {
      adminRoles.forEach(role => {
        rolesMap.set(role.user_id, role);
      });
    }

    // PASO 4: Combinar profiles con roles
    const users = profiles.map(profile => {
      const roleData = rolesMap.get(profile.id);

      return {
        id: profile.id,
        email: profile.email || `${profile.name}@fuxion.internal`,
        created_at: profile.created_at,
        last_sign_in_at: profile.updated_at, // Aproximación: usar updated_at
        user_metadata: {
          name: profile.name,
          avatar_url: profile.avatar_url
        },
        banned_until: null, // No tenemos esta info sin Admin API
        role: roleData?.role || null,
        role_notes: roleData?.notes || null
      };
    });

    console.log('[adminService] ✅ Usuarios combinados:', users.length);

    return { data: users, error: null };
  } catch (error) {
    console.error('[adminService] ❌ Error getting users:', {
      message: error.message,
      code: error.code,
      details: error.details,
      stack: error.stack
    });
    return { data: null, error };
  }
};

/**
 * Obtiene un usuario por email
 * MODIFICADO: Usa queries regulares en lugar de Admin API
 * @param {string} email - Email del usuario
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const getUserByEmail = async (email) => {
  try {
    console.log('[adminService] 🔍 Buscando usuario por email:', email);

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, name, email, created_at')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: new Error('Usuario no encontrado') };
      }
      throw error;
    }

    console.log('[adminService] ✅ Usuario encontrado:', profile.id);

    // Transformar al formato esperado
    const user = {
      id: profile.id,
      email: profile.email,
      created_at: profile.created_at,
      user_metadata: {
        name: profile.name
      }
    };

    return { data: user, error: null };
  } catch (error) {
    console.error('[adminService] Error getting user by email:', error);
    return { data: null, error };
  }
};

/**
 * Desactiva un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const disableUser = async (userId) => {
  try {
    const { data, error } = await supabase.auth.admin.updateUserById(
      userId,
      { ban_duration: '876000h' } // Baneado por 100 años (efectivamente permanente)
    );

    if (error) throw error;

    return { data: data.user, error: null };
  } catch (error) {
    console.error('[adminService] Error disabling user:', error);
    return { data: null, error };
  }
};

/**
 * Reactiva un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const enableUser = async (userId) => {
  try {
    const { data, error } = await supabase.auth.admin.updateUserById(
      userId,
      { ban_duration: 'none' }
    );

    if (error) throw error;

    return { data: data.user, error: null };
  } catch (error) {
    console.error('[adminService] Error enabling user:', error);
    return { data: null, error };
  }
};

/**
 * Elimina un usuario permanentemente
 * @param {string} userId - ID del usuario
 * @returns {Promise<{error: Error|null}>}
 */
export const deleteUser = async (userId) => {
  try {
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('[adminService] Error deleting user:', error);
    return { error };
  }
};

/**
 * Obtiene estadísticas de usuarios
 * MODIFICADO: Usa queries regulares en lugar de Admin API
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const getUserStats = async () => {
  try {
    console.log('[adminService] 📊 Calculando estadísticas de usuarios...');

    // Obtener todos los profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, created_at, updated_at');

    if (profilesError) {
      console.error('[adminService] ❌ ERROR en profiles:', {
        code: profilesError.code,
        message: profilesError.message,
        details: profilesError.details,
        hint: profilesError.hint
      });
      throw profilesError;
    }

    console.log('[adminService] ✅ Profiles obtenidos:', profiles?.length);

    // Obtener transacciones recientes para calcular actividad
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const { data: recentTransactions, error: transError } = await supabase
      .from('transactions')
      .select('user_id, created_at')
      .gte('created_at', sevenDaysAgo.toISOString());

    if (transError) {
      console.warn('[adminService] ⚠️ Error obteniendo transacciones:', {
        code: transError.code,
        message: transError.message,
        details: transError.details
      });
    }

    // Calcular usuarios activos basado en transacciones
    const activeToday = new Set();
    const activeWeek = new Set();

    if (recentTransactions) {
      recentTransactions.forEach(t => {
        const transDate = new Date(t.created_at);
        if (transDate > oneDayAgo) {
          activeToday.add(t.user_id);
        }
        if (transDate > sevenDaysAgo) {
          activeWeek.add(t.user_id);
        }
      });
    }

    const stats = {
      total: profiles?.length || 0,
      active_today: activeToday.size,
      active_week: activeWeek.size,
      never_logged_in: 0, // No podemos saber esto sin Admin API
      banned: 0 // No podemos saber esto sin Admin API
    };

    console.log('[adminService] ✅ Estadísticas:', stats);

    return { data: stats, error: null };
  } catch (error) {
    console.error('[adminService] ❌ Error getting user stats:', {
      message: error.message,
      code: error.code,
      details: error.details,
      stack: error.stack
    });
    return { data: null, error };
  }
};

/**
 * Obtiene actividad reciente de transacciones
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const getSystemActivity = async () => {
  try {
    // Obtener transacciones de los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('transactions')
      .select('type, created_at, user_id')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (error) throw error;

    // Agrupar por tipo
    const activityByType = {
      purchases: data.filter(t => t.type === 'purchase').length,
      sales: data.filter(t => t.type === 'sale').length,
      ads: data.filter(t => t.type === 'marketing_sample').length,
      other: data.filter(t => !['purchase', 'sale', 'marketing_sample'].includes(t.type)).length
    };

    // Agrupar por día (últimos 7 días)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentTransactions = data.filter(t => new Date(t.created_at) > sevenDaysAgo);

    const activityByDay = {};
    recentTransactions.forEach(t => {
      const date = new Date(t.created_at).toLocaleDateString('es-CL');
      if (!activityByDay[date]) {
        activityByDay[date] = 0;
      }
      activityByDay[date]++;
    });

    // Usuarios activos únicos en los últimos 7 días
    const activeUsers = new Set(recentTransactions.map(t => t.user_id));

    return {
      data: {
        byType: activityByType,
        byDay: activityByDay,
        activeUsers: activeUsers.size,
        totalLast7Days: recentTransactions.length,
        totalLast30Days: data.length
      },
      error: null
    };
  } catch (error) {
    console.error('[adminService] Error getting system activity:', error);
    return { data: null, error };
  }
};
