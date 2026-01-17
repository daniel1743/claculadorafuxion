
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, User, ArrowRight, ShieldCheck, Loader2, Check, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { signUp, signIn } from '@/lib/supabaseService';

const AuthModal = ({ isOpen, onLogin }) => {
  const { toast } = useToast();
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  // Cargar preferencia de "recordar sesión" al montar
  useEffect(() => {
    const savedRemember = localStorage.getItem('fuxionRememberMe');
    if (savedRemember === 'true') {
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password || (isRegistering && !formData.name)) {
      toast({
        title: "Campos incompletos",
        description: "Por favor llena todos los campos requeridos.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isRegistering) {
        // Registro de nuevo usuario - SIMPLIFICADO
        const { data, error } = await signUp(formData.email, formData.password, formData.name);

        if (error) throw error;

        if (data?.user) {
          const user = {
            id: data.user.id,
            email: data.user.email,
            name: formData.name || data.user.email.split('@')[0],
            avatar: null
          };

          // Guardar preferencia de recordar sesión
          if (rememberMe) {
            localStorage.setItem('fuxionRememberMe', 'true');
            localStorage.setItem('fuxionSavedUser', JSON.stringify(user));
          } else {
            localStorage.removeItem('fuxionRememberMe');
            localStorage.removeItem('fuxionSavedUser');
          }

          onLogin(user);
          toast({
            title: "¡Bienvenido!",
            description: `Cuenta creada para ${user.name}`,
            className: "bg-green-900 border-green-600 text-white"
          });
        }
      } else {
        // Inicio de sesión - SIMPLIFICADO
        const { data, error } = await signIn(formData.email, formData.password);

        if (error) throw error;

        if (data?.user) {
          // Cargar nombre personalizado desde localStorage si existe
          const savedProfile = localStorage.getItem('fuxionUserProfile');
          let customName = data.user.email.split('@')[0];
          let avatar = null;

          if (savedProfile) {
            const profile = JSON.parse(savedProfile);
            if (profile.name) customName = profile.name;
            if (profile.avatar) avatar = profile.avatar;
          }

          const user = {
            id: data.user.id,
            email: data.user.email,
            name: customName,
            avatar: avatar
          };

          // Guardar preferencia de recordar sesión
          if (rememberMe) {
            localStorage.setItem('fuxionRememberMe', 'true');
            localStorage.setItem('fuxionSavedUser', JSON.stringify(user));
          } else {
            localStorage.removeItem('fuxionRememberMe');
            localStorage.removeItem('fuxionSavedUser');
          }

          onLogin(user);
          toast({
            title: "Sesión Iniciada",
            description: "Acceso concedido.",
            className: "bg-blue-900 border-blue-600 text-white"
          });
        }
      }
    } catch (error) {
      console.error('Error en autenticación:', error);

      // Mensajes de error más claros y específicos
      let errorMessage = '';

      if (isRegistering) {
        if (error.message?.includes('already registered') || error.code === 'signup_disabled') {
          errorMessage = 'Este correo electrónico ya está registrado. Intenta iniciar sesión en su lugar.';
        } else if (error.message?.includes('password')) {
          errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
        } else {
          errorMessage = 'No se pudo crear la cuenta. Verifica que el correo electrónico sea válido e intenta de nuevo.';
        }
      } else {
        if (error.message?.includes('Invalid login credentials') || error.code === 'invalid_credentials') {
          errorMessage = 'Correo electrónico o contraseña incorrectos. Verifica tus credenciales e intenta de nuevo.';
        } else if (error.message?.includes('Email not confirmed')) {
          errorMessage = 'Por favor, confirma tu correo electrónico antes de iniciar sesión.';
        } else {
          errorMessage = 'No se pudo iniciar sesión. Verifica tus credenciales e intenta de nuevo.';
        }
      }

      toast({
        title: isRegistering ? "Error al registrarse" : "Error al iniciar sesión",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} modal={true}>
      <DialogContent className="sm:max-w-md bg-gray-950 border border-white/10 p-0 overflow-hidden [&>button]:hidden">
         <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-transparent opacity-50" />

         <div className="p-8 relative z-10">
            <div className="flex justify-center mb-6">
                <div className="p-4 rounded-full bg-white/5 border border-white/10 shadow-2xl shadow-yellow-500/20">
                    <ShieldCheck className="w-10 h-10 text-yellow-500" />
                </div>
            </div>

            <DialogHeader className="text-center space-y-2 mb-6">
              <DialogTitle className="text-2xl font-bold text-white tracking-tight">
                 {isRegistering ? 'Crear Cuenta' : 'Bienvenido de Nuevo'}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {isRegistering
                    ? 'Ingresa tus datos para configurar tu dashboard.'
                    : 'Ingresa tus credenciales para acceder.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
               {isRegistering && (
                 <div className="space-y-2">
                    <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-yellow-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Nombre Completo"
                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500/50 outline-none transition-all placeholder-gray-600 text-sm"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                    </div>
                 </div>
               )}

               <div className="space-y-2">
                  <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-yellow-500 transition-colors" />
                      <input
                          type="email"
                          placeholder="Correo Electrónico"
                          className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500/50 outline-none transition-all placeholder-gray-600 text-sm"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                  </div>
               </div>

               <div className="space-y-2">
                  <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-yellow-500 transition-colors" />
                      <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Contraseña"
                          className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-12 py-3 text-white focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500/50 outline-none transition-all placeholder-gray-600 text-sm"
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                      />
                      <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-yellow-500 transition-colors focus:outline-none"
                          tabIndex={-1}
                          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                          {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                          ) : (
                              <Eye className="w-4 h-4" />
                          )}
                      </button>
                  </div>
               </div>

               {/* Checkbox Mantener sesión iniciada */}
               <div className="flex items-center gap-3">
                 <button
                   type="button"
                   onClick={() => setRememberMe(!rememberMe)}
                   className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                     rememberMe
                       ? 'bg-yellow-500 border-yellow-500'
                       : 'border-gray-600 hover:border-yellow-500/50'
                   }`}
                 >
                   {rememberMe && <Check className="w-3 h-3 text-black" />}
                 </button>
                 <span
                   className="text-sm text-gray-400 cursor-pointer select-none"
                   onClick={() => setRememberMe(!rememberMe)}
                 >
                   Mantener sesión iniciada
                 </span>
               </div>

               <Button
                 type="submit"
                 disabled={isLoading}
                 className="w-full h-11 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold rounded-xl shadow-lg shadow-yellow-900/20 transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 <span className="flex items-center justify-center">
                   {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                   <span>
                     {isLoading
                       ? (isRegistering ? 'Creando cuenta...' : 'Iniciando sesión...')
                       : (isRegistering ? 'Registrarse' : 'Iniciar Sesión')
                     }
                   </span>
                   {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
                 </span>
               </Button>
            </form>

            <div className="mt-6 text-center">
                <button
                    onClick={() => setIsRegistering(!isRegistering)}
                    className="text-xs text-gray-500 hover:text-yellow-400 transition-colors underline underline-offset-4"
                >
                    {isRegistering
                        ? '¿Ya tienes cuenta? Inicia sesión'
                        : '¿No tienes cuenta? Regístrate gratis'}
                </button>
            </div>
         </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
