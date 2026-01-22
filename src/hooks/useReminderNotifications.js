import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import {
  getDueReminders,
  incrementReminderNotification,
  getUnreadReminderCount
} from '@/lib/reminderService';

/**
 * Hook para manejar notificaciones de recordatorios
 * Verifica cada 30 segundos si hay recordatorios vencidos
 * y muestra hasta 3 notificaciones por recordatorio
 */
const useReminderNotifications = (onUnreadCountChange) => {
  const { toast } = useToast();
  const intervalRef = useRef(null);
  const notifiedRef = useRef(new Set()); // Evitar notificaciones duplicadas en el mismo ciclo

  const checkReminders = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Obtener recordatorios vencidos que no han alcanzado 3 notificaciones
      const { data: dueReminders, error } = await getDueReminders(user.id);
      if (error) throw error;

      if (dueReminders && dueReminders.length > 0) {
        // Filtrar los que ya notificamos en este ciclo
        const toNotify = dueReminders.filter(r => !notifiedRef.current.has(r.id));

        for (const reminder of toNotify) {
          // Incrementar contador de notificaciones
          const { newCount } = await incrementReminderNotification(reminder.id);

          // Determinar el estilo según la notificación número
          let variant = "default";
          let title = "Recordatorio";
          let className = "bg-purple-900 border-purple-600 text-white";

          if (newCount === 2) {
            title = "Recordatorio (2da vez)";
            className = "bg-yellow-900 border-yellow-600 text-white";
          } else if (newCount >= 3) {
            title = "ÚLTIMO AVISO";
            className = "bg-red-900 border-red-600 text-white animate-pulse";
          }

          // Construir descripción
          let description = reminder.description;
          if (reminder.contact_name) {
            description = `${reminder.contact_name}: ${description}`;
          }
          if (reminder.product_name) {
            description += ` (${reminder.product_name})`;
          }

          // Mostrar toast
          toast({
            title: title,
            description: description,
            className: className,
            duration: newCount >= 3 ? 10000 : 5000, // Último aviso dura más
          });

          // Marcar como notificado en este ciclo
          notifiedRef.current.add(reminder.id);

          // Reproducir sonido de notificación (si está disponible)
          try {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(title, {
                body: description,
                icon: '/favicon.ico',
                tag: reminder.id
              });
            }
          } catch (e) {
            // El sonido/notificación del sistema no es crítico
            console.log('Browser notification not available');
          }
        }
      }

      // Actualizar contador de no leídos
      const { count } = await getUnreadReminderCount(user.id);
      if (onUnreadCountChange) {
        onUnreadCountChange(count);
      }

    } catch (error) {
      console.error('Error checking reminders:', error);
    }
  }, [toast, onUnreadCountChange]);

  // Solicitar permisos de notificación del navegador
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Iniciar verificación periódica
  useEffect(() => {
    // Verificar inmediatamente al cargar
    checkReminders();

    // Verificar cada 30 segundos
    intervalRef.current = setInterval(() => {
      // Limpiar el set de notificados cada ciclo para permitir re-notificaciones
      notifiedRef.current.clear();
      checkReminders();
    }, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkReminders]);

  // Función para forzar una verificación
  const forceCheck = useCallback(() => {
    notifiedRef.current.clear();
    checkReminders();
  }, [checkReminders]);

  return { forceCheck };
};

export default useReminderNotifications;
