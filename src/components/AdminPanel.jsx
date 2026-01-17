import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  UserPlus,
  Key,
  Users,
  Activity,
  Copy,
  CheckCircle,
  XCircle,
  Ban,
  Power,
  Trash2,
  RefreshCw,
  TrendingUp,
  BarChart3,
  X,
  Crown,
  Calendar,
  Clock,
  AlertTriangle,
  Infinity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  createNewUser,
  resetUserPassword,
  getAllUsers,
  getUserByEmail,
  disableUser,
  enableUser,
  deleteUser,
  getUserStats,
  getSystemActivity,
  generateSecurePassword,
  generateUniqueEmail
} from '@/lib/adminService';
import {
  SUBSCRIPTION_PLANS,
  getUserSubscription,
  assignSubscription,
  getAllSubscriptions,
  checkSubscriptionStatus,
  revokeSubscription,
  extendSubscription
} from '@/lib/subscriptionService';

const AdminPanel = ({ currentUser, onClose }) => {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [systemActivity, setSystemActivity] = useState(null);
  const [subscriptions, setSubscriptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [assigningPlan, setAssigningPlan] = useState(null); // userId being assigned

  // Estados para crear usuario
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [generatedCredentials, setGeneratedCredentials] = useState(null);

  // Estados para reset de contraseña
  const [resetEmail, setResetEmail] = useState('');
  const [resetCredentials, setResetCredentials] = useState(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  // ESC key handler
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [usersResult, statsResult, activityResult, subscriptionsResult] = await Promise.allSettled([
        getAllUsers(),
        getUserStats(),
        getSystemActivity(),
        getAllSubscriptions()
      ]);

      if (usersResult.status === 'fulfilled' && usersResult.value.data) {
        setUsers(usersResult.value.data);
      }

      if (statsResult.status === 'fulfilled' && statsResult.value.data) {
        setUserStats(statsResult.value.data);
      }

      if (activityResult.status === 'fulfilled' && activityResult.value.data) {
        setSystemActivity(activityResult.value.data);
      }

      // Mapear suscripciones por user_id
      if (subscriptionsResult.status === 'fulfilled' && subscriptionsResult.value.data) {
        const subsMap = {};
        subscriptionsResult.value.data.forEach(sub => {
          subsMap[sub.user_id] = sub;
        });
        setSubscriptions(subsMap);
      }
    } catch (error) {
      console.error('[AdminPanel] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Asignar plan a usuario
  const handleAssignPlan = async (userId, planKey) => {
    setAssigningPlan(userId);
    try {
      const result = await assignSubscription(userId, planKey, currentUser.id);

      if (result.error) throw result.error;

      toast({
        title: "Plan Asignado",
        description: `Se asignó el plan ${SUBSCRIPTION_PLANS[planKey].label} correctamente.`,
        className: "bg-green-900 border-green-600 text-white"
      });

      // Recargar datos
      await loadAdminData();
    } catch (error) {
      console.error('[AdminPanel] Error assigning plan:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo asignar el plan.",
        variant: "destructive"
      });
    } finally {
      setAssigningPlan(null);
    }
  };

  // Revocar suscripción
  const handleRevokePlan = async (userId, userEmail) => {
    if (!confirm(`¿Revocar suscripción de ${userEmail}? El usuario perderá acceso.`)) return;

    try {
      const result = await revokeSubscription(userId);

      if (result.error) throw result.error;

      toast({
        title: "Suscripción Revocada",
        description: `Se eliminó la suscripción de ${userEmail}.`,
        className: "bg-red-900 border-red-600 text-white"
      });

      await loadAdminData();
    } catch (error) {
      console.error('[AdminPanel] Error revoking subscription:', error);
      toast({
        title: "Error",
        description: "No se pudo revocar la suscripción.",
        variant: "destructive"
      });
    }
  };

  // Obtener info de suscripción para mostrar
  const getSubscriptionInfo = (userId) => {
    const sub = subscriptions[userId];
    if (!sub) return { status: 'none', label: 'Sin plan', color: 'gray' };

    const statusInfo = checkSubscriptionStatus(sub);
    const plan = SUBSCRIPTION_PLANS[sub.plan];

    return {
      ...statusInfo,
      plan: sub.plan,
      planLabel: plan?.label || sub.plan,
      color: plan?.color || 'gray',
      expiresAt: sub.expires_at
    };
  };

  const handleCreateUser = async () => {
    try {
      const result = await createNewUser({
        email: newUserEmail || undefined,
        name: newUserName || undefined
      });

      if (result.error) throw result.error;

      setGeneratedCredentials(result.data);

      toast({
        title: "Usuario Creado",
        description: `Usuario ${result.data.email} creado exitosamente.`,
        className: "bg-green-900 border-green-600 text-white"
      });

      // Recargar usuarios
      await loadAdminData();

      // Limpiar form
      setNewUserEmail('');
      setNewUserName('');
    } catch (error) {
      console.error('[AdminPanel] Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el usuario.",
        variant: "destructive"
      });
    }
  };

  const handleResetPassword = async () => {
    try {
      // Buscar usuario por email
      const userResult = await getUserByEmail(resetEmail);

      if (userResult.error) throw userResult.error;

      // Resetear contraseña
      const result = await resetUserPassword(userResult.data.id);

      if (result.error) throw result.error;

      setResetCredentials({
        email: resetEmail,
        password: result.data.password
      });

      toast({
        title: "Contraseña Reseteada",
        description: `Nueva contraseña generada para ${resetEmail}.`,
        className: "bg-green-900 border-green-600 text-white"
      });

      setResetEmail('');
    } catch (error) {
      console.error('[AdminPanel] Error resetting password:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo resetear la contraseña.",
        variant: "destructive"
      });
    }
  };

  const handleDisableUser = async (userId, userEmail) => {
    if (!confirm(`¿Desactivar usuario ${userEmail}?`)) return;

    try {
      const result = await disableUser(userId);
      if (result.error) throw result.error;

      toast({
        title: "Usuario Desactivado",
        description: `${userEmail} ha sido desactivado.`,
        className: "bg-gray-800 border-gray-600 text-white"
      });

      await loadAdminData();
    } catch (error) {
      console.error('[AdminPanel] Error disabling user:', error);
      toast({
        title: "Error",
        description: "No se pudo desactivar el usuario.",
        variant: "destructive"
      });
    }
  };

  const handleEnableUser = async (userId, userEmail) => {
    try {
      const result = await enableUser(userId);
      if (result.error) throw result.error;

      toast({
        title: "Usuario Activado",
        description: `${userEmail} ha sido reactivado.`,
        className: "bg-green-900 border-green-600 text-white"
      });

      await loadAdminData();
    } catch (error) {
      console.error('[AdminPanel] Error enabling user:', error);
      toast({
        title: "Error",
        description: "No se pudo activar el usuario.",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: "Texto copiado al portapapeles.",
      duration: 2000
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('es-CL');
  };

  const getUserStatus = (user) => {
    if (user.banned_until) return 'banned';
    if (!user.last_sign_in_at) return 'never_logged_in';

    const lastSignIn = new Date(user.last_sign_in_at);
    const now = new Date();
    const daysDiff = (now - lastSignIn) / (1000 * 60 * 60 * 24);

    if (daysDiff < 1) return 'active_today';
    if (daysDiff < 7) return 'active_week';
    return 'inactive';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active_today': return 'text-green-400';
      case 'active_week': return 'text-yellow-400';
      case 'inactive': return 'text-gray-400';
      case 'never_logged_in': return 'text-blue-400';
      case 'banned': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active_today': return 'Activo Hoy';
      case 'active_week': return 'Activo esta semana';
      case 'inactive': return 'Inactivo';
      case 'never_logged_in': return 'Nunca ingresó';
      case 'banned': return 'Desactivado';
      default: return 'Desconocido';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <Shield className="w-8 h-8 text-purple-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Panel de Administración</h1>
                <p className="text-sm text-gray-400">Sistema Interno Fuxion</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={loadAdminData}
                variant="ghost"
                className="text-gray-400 hover:text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualizar
              </Button>
              {onClose && (
                <Button
                  onClick={onClose}
                  variant="ghost"
                  className="text-gray-400 hover:text-white h-10 w-10 p-0"
                >
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-1 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Activity className="w-4 h-4 inline mr-2" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('create-user')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                activeTab === 'create-user'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <UserPlus className="w-4 h-4 inline mr-2" />
              Crear Usuario
            </button>
            <button
              onClick={() => setActiveTab('reset-password')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                activeTab === 'reset-password'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Key className="w-4 h-4 inline mr-2" />
              Reset Contraseña
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                activeTab === 'users'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Usuarios ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                activeTab === 'subscriptions'
                  ? 'bg-yellow-600 text-black'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Crown className="w-4 h-4 inline mr-2" />
              Suscripciones
            </button>
          </div>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Total Usuarios</span>
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-3xl font-bold text-white">{userStats?.total || 0}</div>
              </div>

              <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Activos Hoy</span>
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <div className="text-3xl font-bold text-green-400">{userStats?.active_today || 0}</div>
              </div>

              <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Activos Semana</span>
                  <Activity className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="text-3xl font-bold text-yellow-400">{userStats?.active_week || 0}</div>
              </div>

              <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Nunca Ingresaron</span>
                  <XCircle className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-3xl font-bold text-blue-400">{userStats?.never_logged_in || 0}</div>
              </div>
            </div>

            {/* System Activity */}
            {systemActivity && (
              <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  Actividad del Sistema (Últimos 7 días)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-white/5 rounded-xl">
                    <div className="text-sm text-gray-400 mb-1">Compras</div>
                    <div className="text-2xl font-bold text-red-400">{systemActivity.byType.purchases}</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl">
                    <div className="text-sm text-gray-400 mb-1">Ventas</div>
                    <div className="text-2xl font-bold text-green-400">{systemActivity.byType.sales}</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl">
                    <div className="text-sm text-gray-400 mb-1">Publicidad</div>
                    <div className="text-2xl font-bold text-blue-400">{systemActivity.byType.ads}</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl">
                    <div className="text-sm text-gray-400 mb-1">Usuarios Activos</div>
                    <div className="text-2xl font-bold text-purple-400">{systemActivity.activeUsers}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create User Tab */}
        {activeTab === 'create-user' && (
          <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-500" />
              Crear Nuevo Usuario
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs uppercase text-gray-500 font-bold mb-2 block">
                  Nombre (Opcional)
                </label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/20 outline-none"
                  placeholder="Juan Pérez"
                />
              </div>

              <div>
                <label className="text-xs uppercase text-gray-500 font-bold mb-2 block">
                  Email (Opcional - se genera automáticamente)
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/20 outline-none"
                  placeholder="usuario@fuxion.internal"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Si dejas vacío, se generará automáticamente: {generateUniqueEmail(newUserName || 'usuario')}
                </p>
              </div>

              <Button
                onClick={handleCreateUser}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Crear Usuario
              </Button>
            </div>

            {/* Generated Credentials */}
            {generatedCredentials && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-green-900/20 border border-green-500/20 rounded-xl"
              >
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <h4 className="text-lg font-bold text-green-400">Usuario Creado Exitosamente</h4>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                    <div>
                      <div className="text-xs text-gray-400">Email</div>
                      <div className="text-white font-mono">{generatedCredentials.email}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(generatedCredentials.email)}
                      className="text-green-400 hover:text-green-300"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                    <div>
                      <div className="text-xs text-gray-400">Contraseña</div>
                      <div className="text-white font-mono">{generatedCredentials.password}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(generatedCredentials.password)}
                      className="text-green-400 hover:text-green-300"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => copyToClipboard(`Email: ${generatedCredentials.email}\nContraseña: ${generatedCredentials.password}`)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Ambas
                    </Button>
                    <Button
                      onClick={() => setGeneratedCredentials(null)}
                      variant="ghost"
                      className="text-gray-400"
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-yellow-400 mt-4">
                  ⚠️ Guarda estas credenciales. No se enviarán por email.
                </p>
              </motion.div>
            )}
          </div>
        )}

        {/* Reset Password Tab */}
        {activeTab === 'reset-password' && (
          <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-purple-500" />
              Resetear Contraseña de Usuario
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs uppercase text-gray-500 font-bold mb-2 block">
                  Email del Usuario
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/20 outline-none"
                  placeholder="usuario@fuxion.internal"
                />
              </div>

              <Button
                onClick={handleResetPassword}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12"
              >
                <Key className="w-5 h-5 mr-2" />
                Generar Nueva Contraseña
              </Button>
            </div>

            {/* Reset Credentials */}
            {resetCredentials && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-green-900/20 border border-green-500/20 rounded-xl"
              >
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <h4 className="text-lg font-bold text-green-400">Contraseña Reseteada</h4>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                    <div>
                      <div className="text-xs text-gray-400">Usuario</div>
                      <div className="text-white font-mono">{resetCredentials.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                    <div>
                      <div className="text-xs text-gray-400">Nueva Contraseña</div>
                      <div className="text-white font-mono">{resetCredentials.password}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(resetCredentials.password)}
                      className="text-green-400 hover:text-green-300"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>

                  <Button
                    onClick={() => setResetCredentials(null)}
                    variant="ghost"
                    className="w-full text-gray-400"
                  >
                    Cerrar
                  </Button>
                </div>

                <p className="text-xs text-yellow-400 mt-4">
                  ⚠️ Envía esta contraseña al usuario de forma segura.
                </p>
              </motion.div>
            )}
          </div>
        )}

        {/* Users List Tab */}
        {activeTab === 'users' && (
          <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              Lista de Usuarios
            </h3>

            <div className="space-y-3">
              {users.map((user) => {
                const status = getUserStatus(user);
                return (
                  <div
                    key={user.id}
                    className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-white font-semibold">{user.email}</h4>
                          <span className={`text-xs font-semibold ${getStatusColor(status)}`}>
                            {getStatusText(status)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
                          <div>
                            <span className="text-gray-500">Creado:</span> {formatDate(user.created_at)}
                          </div>
                          <div>
                            <span className="text-gray-500">Último ingreso:</span> {formatDate(user.last_sign_in_at)}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {user.banned_until ? (
                          <Button
                            size="sm"
                            onClick={() => handleEnableUser(user.id, user.email)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Power className="w-4 h-4 mr-1" />
                            Activar
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleDisableUser(user.id, user.email)}
                            variant="ghost"
                            className="text-red-400 hover:text-red-300"
                          >
                            <Ban className="w-4 h-4 mr-1" />
                            Desactivar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Gestión de Suscripciones
            </h3>

            {/* Leyenda de planes */}
            <div className="mb-6 p-4 bg-white/5 rounded-xl">
              <h4 className="text-sm font-semibold text-gray-400 mb-3">Planes Disponibles:</h4>
              <div className="flex flex-wrap gap-3">
                {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
                  <div key={key} className={`px-3 py-1.5 rounded-lg text-xs font-semibold bg-${plan.color}-500/20 text-${plan.color}-400 border border-${plan.color}-500/30`}>
                    {plan.label} {plan.days ? `(${plan.days} días)` : ''}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {users.map((user) => {
                const subInfo = getSubscriptionInfo(user.id);
                const isAssigning = assigningPlan === user.id;

                return (
                  <div
                    key={user.id}
                    className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Info del usuario */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-white font-semibold">{user.email}</h4>
                          {subInfo.status === 'active' && subInfo.plan === 'perpetual' && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-xs font-bold">
                              <Infinity className="w-3 h-3" /> PERPETUO
                            </span>
                          )}
                          {subInfo.status === 'active' && subInfo.plan !== 'perpetual' && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-xs font-bold">
                              <CheckCircle className="w-3 h-3" /> {subInfo.planLabel}
                            </span>
                          )}
                          {subInfo.status === 'grace_period' && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 text-xs font-bold animate-pulse">
                              <AlertTriangle className="w-3 h-3" /> EN GRACIA ({subInfo.daysRemaining}d)
                            </span>
                          )}
                          {subInfo.status === 'expired' && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs font-bold">
                              <XCircle className="w-3 h-3" /> EXPIRADO
                            </span>
                          )}
                          {subInfo.status === 'none' && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-gray-500/20 text-gray-400 text-xs">
                              Sin plan
                            </span>
                          )}
                        </div>

                        {subInfo.status !== 'none' && subInfo.expiresAt && (
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Calendar className="w-4 h-4" />
                            <span>Expira: {formatDate(subInfo.expiresAt)}</span>
                            {subInfo.daysRemaining !== Infinity && subInfo.daysRemaining > 0 && (
                              <span className="text-yellow-400">({subInfo.daysRemaining} días restantes)</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Acciones */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Selector de plan */}
                        <select
                          className="bg-black/40 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-yellow-500/30 focus:border-yellow-500/50 outline-none cursor-pointer"
                          defaultValue=""
                          disabled={isAssigning}
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAssignPlan(user.id, e.target.value);
                              e.target.value = '';
                            }
                          }}
                        >
                          <option value="" disabled>Asignar plan...</option>
                          {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
                            <option key={key} value={key}>
                              {plan.label} {plan.days ? `(${plan.days}d)` : ''}
                            </option>
                          ))}
                        </select>

                        {/* Botón revocar */}
                        {subInfo.status !== 'none' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRevokePlan(user.id, user.email)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            disabled={isAssigning}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Revocar
                          </Button>
                        )}

                        {isAssigning && (
                          <div className="flex items-center gap-2 text-yellow-400 text-sm">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Asignando...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stats de suscripciones */}
            <div className="mt-6 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
              <h4 className="text-sm font-bold text-yellow-400 mb-3">Resumen de Suscripciones</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {users.filter(u => getSubscriptionInfo(u.id).status === 'active').length}
                  </div>
                  <div className="text-xs text-gray-400">Activas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">
                    {users.filter(u => getSubscriptionInfo(u.id).status === 'grace_period').length}
                  </div>
                  <div className="text-xs text-gray-400">En Gracia</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">
                    {users.filter(u => getSubscriptionInfo(u.id).status === 'expired').length}
                  </div>
                  <div className="text-xs text-gray-400">Expiradas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-400">
                    {users.filter(u => getSubscriptionInfo(u.id).status === 'none').length}
                  </div>
                  <div className="text-xs text-gray-400">Sin Plan</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    {users.filter(u => getSubscriptionInfo(u.id).plan === 'perpetual').length}
                  </div>
                  <div className="text-xs text-gray-400">Perpetuos</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AdminPanel;
