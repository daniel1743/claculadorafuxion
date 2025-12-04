
import React, { useState, useRef } from 'react';
import { User, LogOut, Camera, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
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

const UserProfile = ({ user, onLogout, onUpdateUser }) => {
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [previewImage, setPreviewImage] = useState(user?.avatar || null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    const updatedUser = { ...user, name: editName, avatar: previewImage };
    localStorage.setItem('fintechUser', JSON.stringify(updatedUser));
    onUpdateUser(updatedUser);
    setIsModalOpen(false);
    toast({
        title: "Perfil Actualizado",
        description: "Los cambios se han guardado correctamente.",
        className: "bg-green-900 border-green-600 text-white"
    });
  };

  if (!user) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 overflow-hidden border border-white/10 hover:border-yellow-500/50 transition-all ring-2 ring-transparent hover:ring-yellow-500/20">
            {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
            ) : (
                <div className="h-full w-full bg-gray-800 flex items-center justify-center text-gray-400 font-bold text-sm">
                    {user.name.charAt(0).toUpperCase()}
                </div>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-gray-900 border border-white/10 text-white" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs leading-none text-gray-400">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem onClick={() => setIsModalOpen(true)} className="cursor-pointer hover:bg-white/5 focus:bg-white/5 focus:text-white">
            <User className="mr-2 h-4 w-4" />
            <span>Editar Perfil</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-red-400 hover:bg-red-900/20 hover:text-red-300 focus:bg-red-900/20 focus:text-red-300">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar Sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-sm bg-gray-950 border border-white/10">
            <DialogHeader>
                <DialogTitle className="text-xl text-white">Editar Perfil</DialogTitle>
                <DialogDescription>Actualiza tu foto y nombre personal.</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current.click()}>
                         <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-gray-700 group-hover:border-yellow-500 transition-colors bg-gray-900 flex items-center justify-center">
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
                    <p className="text-xs text-gray-500">Click para subir imagen</p>
                </div>

                <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-gray-500">Nombre de Usuario</label>
                    <input 
                        type="text" 
                        value={editName} 
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-yellow-500/50 outline-none"
                    />
                </div>

                <div className="flex gap-3">
                    <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 text-gray-400 hover:text-white">
                        Cancelar
                    </Button>
                    <Button onClick={handleSaveProfile} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-black font-bold">
                        Guardar Cambios
                    </Button>
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserProfile;
