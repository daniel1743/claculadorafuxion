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
 * Crea un nuevo usuario usando Supabase Admin API
 * @param {Object} userData - Datos del usuario
 * @param {string} [userData.email] - Email del usuario (opcional, se genera si no se proporciona)
 * @param {string} [userData.password] - Contraseña (opcional, se genera si no se proporciona)
 * @param {string} [userData.name] - Nombre del usuario
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const createNewUser = async (userData = {}) => {
  try {
    // Generar credenciales si no se proporcionan
    const email = userData.email || generateUniqueEmail(userData.name);
    const password = userData.password || generateSecurePassword();

    // Crear usuario con Supabase Auth Admin
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirmar email (no enviar confirmación)
      user_metadata: {
        name: userData.name || email.split('@')[0],
        created_by_admin: true,
        created_at: new Date().toISOString()
      }
    });

    if (error) throw error;

    return {
      data: {
        user: data.user,
        email: email,
        password: password // Devolver contraseña para que admin la copie
      },
      error: null
    };
  } catch (error) {
    console.error('[adminService] Error creating user:', error);
    return { data: null, error };
  }
};

/**
 * Resetea la contraseña de un usuario
 * @param {string} userId - ID del usuario
 * @param {string} [newPassword] - Nueva contraseña (opcional, se genera si no se proporciona)
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const resetUserPassword = async (userId, newPassword = null) => {
  try {
    const password = newPassword || generateSecurePassword();

    const { data, error } = await supabase.auth.admin.updateUserById(
      userId,
      { password: password }
    );

    if (error) throw error;

    return {
      data: {
        user: data.user,
        password: password // Devolver contraseña para que admin la copie
      },
      error: null
    };
  } catch (error) {
    console.error('[adminService] Error resetting password:', error);
    return { data: null, error };
  }
};

/**
 * Obtiene todos los usuarios del sistema
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export const getAllUsers = async () => {
  try {
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) throw error;

    return { data: data.users, error: null };
  } catch (error) {
    console.error('[adminService] Error getting users:', error);
    return { data: null, error };
  }
};

/**
 * Obtiene un usuario por email
 * @param {string} email - Email del usuario
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const getUserByEmail = async (email) => {
  try {
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) throw error;

    const user = data.users.find(u => u.email === email);

    if (!user) {
      return { data: null, error: new Error('Usuario no encontrado') };
    }

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
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const getUserStats = async () => {
  try {
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) throw error;

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      total: data.users.length,
      active_today: data.users.filter(u => {
        const lastSignIn = u.last_sign_in_at ? new Date(u.last_sign_in_at) : null;
        return lastSignIn && lastSignIn > oneDayAgo;
      }).length,
      active_week: data.users.filter(u => {
        const lastSignIn = u.last_sign_in_at ? new Date(u.last_sign_in_at) : null;
        return lastSignIn && lastSignIn > sevenDaysAgo;
      }).length,
      never_logged_in: data.users.filter(u => !u.last_sign_in_at).length,
      banned: data.users.filter(u => u.banned_until).length
    };

    return { data: stats, error: null };
  } catch (error) {
    console.error('[adminService] Error getting user stats:', error);
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
