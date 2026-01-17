// Servicio de Suscripciones
import { supabase } from './supabase';

// Planes disponibles
export const SUBSCRIPTION_PLANS = {
  '1_month': { label: '1 Mes', days: 30, color: 'blue' },
  '3_months': { label: '3 Meses', days: 90, color: 'green' },
  '6_months': { label: '6 Meses', days: 180, color: 'yellow' },
  '1_year': { label: '1 Año', days: 365, color: 'purple' },
  'perpetual': { label: 'Perpetuo', days: null, color: 'gold' }
};

// Días de gracia después de expirar
export const GRACE_PERIOD_DAYS = 7;

/**
 * Obtener suscripción de un usuario
 */
export const getUserSubscription = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(); // No lanza error si no encuentra

    if (error) {
      console.error('[SubscriptionService] Supabase error:', error);
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('[SubscriptionService] Error getting subscription:', error);
    return { data: null, error };
  }
};

/**
 * Asignar o actualizar suscripción de un usuario
 */
export const assignSubscription = async (userId, planKey, adminId) => {
  try {
    const plan = SUBSCRIPTION_PLANS[planKey];
    if (!plan) throw new Error('Plan no válido');

    const now = new Date();
    let expiresAt = null;

    if (plan.days !== null) {
      expiresAt = new Date(now.getTime() + plan.days * 24 * 60 * 60 * 1000);
    }

    // Verificar si ya existe una suscripción
    const { data: existing, error: checkError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle(); // maybeSingle no lanza error si no encuentra

    let result;

    if (existing) {
      // Actualizar existente
      result = await supabase
        .from('subscriptions')
        .update({
          plan: planKey,
          starts_at: now.toISOString(),
          expires_at: expiresAt ? expiresAt.toISOString() : null,
          assigned_by: adminId,
          updated_at: now.toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();
    } else {
      // Crear nueva
      result = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan: planKey,
          starts_at: now.toISOString(),
          expires_at: expiresAt ? expiresAt.toISOString() : null,
          assigned_by: adminId
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('[SubscriptionService] Supabase error:', result.error);
      throw new Error(result.error.message || 'Error al guardar suscripción');
    }

    return { data: result.data, error: null };
  } catch (error) {
    console.error('[SubscriptionService] Error assigning subscription:', error);
    return { data: null, error: error.message || 'Error desconocido' };
  }
};

/**
 * Obtener todas las suscripciones (para admin)
 */
export const getAllSubscriptions = async () => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error) {
    console.error('[SubscriptionService] Error getting all subscriptions:', error);
    return { data: [], error };
  }
};

/**
 * Verificar estado de suscripción
 * Retorna: 'active', 'grace_period', 'expired', 'none'
 */
export const checkSubscriptionStatus = (subscription) => {
  if (!subscription) return { status: 'none', daysRemaining: 0, inGracePeriod: false };

  // Plan perpetuo siempre activo
  if (subscription.plan === 'perpetual') {
    return { status: 'active', daysRemaining: Infinity, inGracePeriod: false };
  }

  if (!subscription.expires_at) {
    return { status: 'active', daysRemaining: Infinity, inGracePeriod: false };
  }

  const now = new Date();
  const expiresAt = new Date(subscription.expires_at);
  const diffTime = expiresAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return { status: 'active', daysRemaining: diffDays, inGracePeriod: false };
  }

  // Verificar período de gracia
  const gracePeriodEnd = new Date(expiresAt.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  const graceRemaining = Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (graceRemaining > 0) {
    return { status: 'grace_period', daysRemaining: graceRemaining, inGracePeriod: true };
  }

  return { status: 'expired', daysRemaining: 0, inGracePeriod: false };
};

/**
 * Revocar suscripción
 */
export const revokeSubscription = async (userId) => {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('[SubscriptionService] Supabase error:', error);
      throw new Error(error.message || 'Error al revocar suscripción');
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('[SubscriptionService] Error revoking subscription:', error);
    return { success: false, error: error.message || 'Error desconocido' };
  }
};

/**
 * Extender suscripción existente
 */
export const extendSubscription = async (userId, additionalDays) => {
  try {
    const { data: current } = await getUserSubscription(userId);

    if (!current) throw new Error('No hay suscripción activa');
    if (current.plan === 'perpetual') throw new Error('Plan perpetuo no necesita extensión');

    const currentExpiry = current.expires_at ? new Date(current.expires_at) : new Date();
    const now = new Date();

    // Si ya expiró, extender desde hoy
    const baseDate = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(baseDate.getTime() + additionalDays * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        expires_at: newExpiry.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('[SubscriptionService] Error extending subscription:', error);
    return { data: null, error };
  }
};
