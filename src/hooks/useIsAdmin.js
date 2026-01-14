import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook para verificar si el usuario actual es administrador
 * @param {Object} user - Usuario actual
 * @returns {Object} { isAdmin, isLoading }
 */
export const useIsAdmin = (user) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      console.log('🔍 [useIsAdmin] Verificando estado de admin...');
      console.log('👤 [useIsAdmin] Usuario:', user);

      if (!user || !user.id) {
        console.log('❌ [useIsAdmin] No hay usuario o user.id');
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      console.log('🔑 [useIsAdmin] User ID:', user.id);
      console.log('📧 [useIsAdmin] Email:', user.email);

      try {
        const { data, error } = await supabase
          .from('admin_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        console.log('📦 [useIsAdmin] Respuesta de Supabase:', { data, error });

        if (error) {
          // Tabla no existe (42P01) o registro no encontrado (PGRST116)
          if (error.code === '42P01') {
            console.log('⚠️ [useIsAdmin] Tabla admin_roles no existe');
            setIsAdmin(false);
          } else if (error.code === 'PGRST116') {
            console.log('⚠️ [useIsAdmin] Usuario NO encontrado en admin_roles - NO ES ADMIN');
            setIsAdmin(false);
          } else {
            console.warn('⚠️ [useIsAdmin] Error inesperado:', error);
            setIsAdmin(false);
          }
        } else {
          const isAdminUser = !!data;
          console.log('✅ [useIsAdmin] Rol encontrado:', data?.role);
          console.log(`🎯 [useIsAdmin] ES ADMIN: ${isAdminUser ? 'SÍ ✓' : 'NO ✗'}`);
          setIsAdmin(isAdminUser);
        }
      } catch (error) {
        console.error('❌ [useIsAdmin] Error de red u otro:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
        console.log('🏁 [useIsAdmin] Verificación completa. isAdmin:', isAdmin);
      }
    };

    checkAdminStatus();
  }, [user]);

  return { isAdmin, isLoading };
};
