
import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Camera, X, Check, HelpCircle, Shield, Lock, ImagePlus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useTooltips } from '@/contexts/TooltipContext';
import CloseCycleModal from '@/components/CloseCycleModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const UserProfile = ({ user, onLogout, onUpdateUser, isAdmin = false, onOpenAdminPanel, onCycleClosed }) => {
  const { toast } = useToast();
  const { tooltipsEnabled, toggleTooltips } = useTooltips();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCloseCycleModalOpen, setIsCloseCycleModalOpen] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editDashboardTitle, setEditDashboardTitle] = useState('');
  const [previewImage, setPreviewImage] = useState(user?.avatar || null);
  const [previewCover, setPreviewCover] = useState(null);
  const [editDescription, setEditDescription] = useState('');
  const [socials, setSocials] = useState({
    twitter: '',
    facebook: '',
    instagram: '',
    tiktok: ''
  });
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // Cargar datos de localStorage al montar
  useEffect(() => {
    const savedProfile = localStorage.getItem('fuxionUserProfile');
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      setPreviewImage(profile.avatar || user?.avatar || null);
      setPreviewCover(profile.coverPhoto || null);
      setEditDashboardTitle(profile.dashboardTitle || 'Mi Dashboard FuXion');
      setEditDescription(profile.description || '');
      setSocials({
        twitter: profile.twitter || '',
        facebook: profile.facebook || '',
        instagram: profile.instagram || '',
        tiktok: profile.tiktok || ''
      });
      if (profile.name) {
        setEditName(profile.name);
      }
    } else {
      setEditDashboardTitle('Mi Dashboard FuXion');
    }
  }, [user]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Imagen muy grande",
          description: "La imagen debe ser menor a 2MB",
          variant: "destructive"
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Imagen muy grande",
          description: "La portada debe ser menor a 5MB",
          variant: "destructive"
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewCover(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    const profileData = {
      name: editName,
      avatar: previewImage,
      coverPhoto: previewCover,
      dashboardTitle: editDashboardTitle,
      description: editDescription,
      twitter: socials.twitter,
      facebook: socials.facebook,
      instagram: socials.instagram,
      tiktok: socials.tiktok
    };

    // Guardar en localStorage
    localStorage.setItem('fuxionUserProfile', JSON.stringify(profileData));

    // Actualizar usuario en el estado padre
    const updatedUser = { ...user, name: editName, avatar: previewImage };
    localStorage.setItem('fintechUser', JSON.stringify(updatedUser));
    onUpdateUser(updatedUser);

    // Disparar evento para actualizar el header
    window.dispatchEvent(new CustomEvent('profileUpdated', { detail: profileData }));

    setIsModalOpen(false);
    toast({
        title: "Perfil Actualizado",
        description: "Los cambios se han guardado correctamente.",
        className: "bg-green-900 border-green-600 text-white"
    });
  };

  const handleToggleTooltips = () => {
    toggleTooltips();
    toast({
      title: tooltipsEnabled ? "Ayudas Desactivadas" : "Ayudas Activadas",
      description: tooltipsEnabled
        ? "Los tooltips de ayuda ahora están ocultos"
        : "Los tooltips de ayuda ahora están visibles",
      className: tooltipsEnabled
        ? "bg-gray-800 border-gray-600 text-white"
        : "bg-yellow-900 border-yellow-600 text-white"
    });
  };

  if (!user) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 overflow-hidden border border-white/10 hover:border-yellow-500/50 transition-all ring-2 ring-transparent hover:ring-yellow-500/20">
            {previewImage || user.avatar ? (
                <img src={previewImage || user.avatar} alt={user.name} className="h-full w-full object-cover" />
            ) : (
                <div className="h-full w-full bg-gray-800 flex items-center justify-center text-gray-400 font-bold text-sm">
                    {(editName || user.name || 'U').charAt(0).toUpperCase()}
                </div>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-gray-900 border border-white/10 text-white" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{editName || user.name}</p>
              <p className="text-xs leading-none text-gray-400">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem onClick={() => setIsModalOpen(true)} className="cursor-pointer hover:bg-white/5 focus:bg-white/5 focus:text-white">
            <User className="mr-2 h-4 w-4" />
            <span>Editar Perfil</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleToggleTooltips} className="cursor-pointer hover:bg-white/5 focus:bg-white/5 focus:text-white">
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>{tooltipsEnabled ? "Ocultar Ayudas" : "Mostrar Ayudas"}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem onClick={() => setIsCloseCycleModalOpen(true)} className="cursor-pointer text-yellow-400 hover:bg-yellow-900/20 hover:text-yellow-300 focus:bg-yellow-900/20 focus:text-yellow-300">
            <Lock className="mr-2 h-4 w-4" />
            <span>Cerrar Ciclo</span>
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={onOpenAdminPanel} className="cursor-pointer text-purple-400 hover:bg-purple-900/20 hover:text-purple-300 focus:bg-purple-900/20 focus:text-purple-300">
                <Shield className="mr-2 h-4 w-4" />
                <span>Panel de Admin</span>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-red-400 hover:bg-red-900/20 hover:text-red-300 focus:bg-red-900/20 focus:text-red-300">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar Sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg bg-gray-950 border border-white/10 p-0 overflow-hidden">
            {/* Banner de Portada */}
            <div
              className="relative h-32 bg-gradient-to-r from-yellow-600/20 via-purple-600/20 to-blue-600/20 cursor-pointer group"
              onClick={() => coverInputRef.current.click()}
            >
              {previewCover ? (
                <img src={previewCover} alt="Portada" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <ImagePlus className="w-8 h-8 text-gray-500 mx-auto mb-1" />
                    <span className="text-xs text-gray-500">Click para agregar portada</span>
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <input
                type="file"
                ref={coverInputRef}
                onChange={handleCoverChange}
                className="hidden"
                accept="image/*"
              />
            </div>

            {/* Foto de Perfil superpuesta */}
            <div className="px-6 -mt-12 relative z-10">
              <div className="relative group cursor-pointer w-24 h-24" onClick={() => fileInputRef.current.click()}>
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-950 bg-gray-900 flex items-center justify-center shadow-xl">
                  {previewImage ? (
                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-gray-500" />
                  )}
                </div>
                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*"
                />
              </div>
            </div>

            <div className="px-6 pb-6 pt-2">
              <DialogHeader className="mb-4">
                <DialogTitle className="text-xl text-white">Personalizar Perfil</DialogTitle>
                <DialogDescription>Actualiza tu foto, portada y nombre.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-gray-500">Nombre de Usuario</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-yellow-500/50 outline-none"
                    placeholder="Tu nombre"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-gray-500">Título del Dashboard</label>
                  <input
                    type="text"
                    value={editDashboardTitle}
                    onChange={(e) => setEditDashboardTitle(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-yellow-500/50 outline-none"
                    placeholder="Mi Dashboard FuXion"
                  />
                </div>

                <div className="bg-gray-900/50 rounded-lg p-3 border border-white/5">
                  <p className="text-xs text-gray-400">
                    💡 Las imágenes se guardan localmente en tu navegador. No se suben a ningún servidor.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 text-gray-400 hover:text-white">
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveProfile} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-black font-bold">
                    Guardar Cambios
                  </Button>
                </div>
              </div>
            </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Cierre de Ciclo */}
      <CloseCycleModal
        isOpen={isCloseCycleModalOpen}
        onClose={() => setIsCloseCycleModalOpen(false)}
        userId={user?.id}
        onCycleClosed={(cycle) => {
          setIsCloseCycleModalOpen(false);
          if (onCycleClosed) {
            onCycleClosed(cycle);
          }
        }}
      />
    </>
  );
};

export default UserProfile;
