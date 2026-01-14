# 🛡️ PANEL DE ADMINISTRACIÓN - DOCUMENTACIÓN COMPLETA

## 📋 Descripción General

Este es un **Sistema de Administración Privado** diseñado para uso interno de Fuxion.

**NO es un SaaS público:**
- Sin auto-registro de usuarios
- Sin confirmaciones por email
- Sin recuperación de contraseña por email
- Sin magic links
- Control total por el administrador

---

## 🚀 INSTALACIÓN Y CONFIGURACIÓN

### Paso 1: Ejecutar el SQL en Supabase

```sql
-- En Supabase SQL Editor, ejecuta:
sql/create_admin_system.sql
```

Este SQL crea:
- Tabla `admin_roles` - Define quién es administrador
- Tabla `user_activity_log` - Registro de actividad
- Vista `admin_users_view` - Información completa de usuarios
- Funciones `is_admin()` y `is_super_admin()`

### Paso 2: Crear el Primer Super Admin

1. Crea un usuario normal en la aplicación (usando email/password)
2. En Supabase SQL Editor, ejecuta:

```sql
-- Reemplaza 'admin@fuxion.internal' con tu email
INSERT INTO admin_roles (user_id, role, notes)
SELECT id, 'super_admin', 'Primer administrador del sistema'
FROM auth.users
WHERE email = 'admin@fuxion.internal'
ON CONFLICT (user_id) DO NOTHING;
```

3. Cierra sesión y vuelve a iniciar sesión
4. Verás el Panel de Administración en lugar del dashboard normal

### Paso 3: Configurar Supabase Admin API

**IMPORTANTE**: Para que funcionen las funciones de creación de usuarios y reset de contraseñas, necesitas:

1. Ir a Supabase Dashboard → Settings → API
2. Copiar el `service_role` key (NO la `anon` key)
3. **NUNCA expongas este key en el frontend**

**Opción A: Backend Proxy (RECOMENDADO)**
Crea un backend que maneje las operaciones de admin:

```javascript
// backend/routes/admin.js
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Service role key
)

// Endpoint para crear usuario
app.post('/admin/create-user', async (req, res) => {
  // Verificar que quien llama es admin
  const { email, password } = req.body

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })

  res.json({ data, error })
})
```

**Opción B: Supabase Edge Functions (ALTERNATIVA)**
Crear funciones edge que manejen las operaciones de admin.

**⚠️ NUNCA uses service_role key directamente en el frontend**

---

## 🎯 CARACTERÍSTICAS PRINCIPALES

### 1️⃣ Dashboard de Actividad

**Vista Principal del Admin**

Muestra:
- Total de usuarios
- Usuarios activos hoy
- Usuarios activos esta semana
- Usuarios que nunca han ingresado
- Actividad del sistema (compras, ventas, publicidad)
- Usuarios activos por día

### 2️⃣ Crear Nuevo Usuario

**Generador de Credenciales**

El admin puede:
1. Ingresar nombre (opcional)
2. Ingresar email (opcional - se genera automáticamente)
3. Presionar "Crear Usuario"

El sistema:
- Genera email único si no se proporciona
- Genera contraseña segura (12 caracteres: mayúsculas, minúsculas, números, símbolos)
- Crea el usuario en Supabase Auth
- Auto-confirma el email (sin envío de correo)
- Muestra las credenciales para que el admin las copie

**Ejemplo de credenciales generadas:**
```
Email: usuario1736812345678@fuxion.internal
Contraseña: K7@mX9pQ2wA!
```

### 3️⃣ Resetear Contraseña

**Sistema de Recuperación Sin Email**

El admin puede:
1. Ingresar el email del usuario
2. Presionar "Generar Nueva Contraseña"

El sistema:
- Busca al usuario por email
- Genera nueva contraseña segura
- Actualiza la contraseña usando Admin API
- Muestra la nueva contraseña para que el admin la copie

**NO se envía ningún email al usuario.**
El admin debe enviar la contraseña de forma segura al usuario.

### 4️⃣ Lista de Usuarios

**Gestión Completa de Cuentas**

Para cada usuario se muestra:
- Email
- Estado (Activo Hoy / Activo Semana / Inactivo / Nunca ingresó / Desactivado)
- Fecha de creación
- Último inicio de sesión

Acciones disponibles:
- **Desactivar**: Banea al usuario (no puede iniciar sesión)
- **Activar**: Reactiva un usuario desactivado

**Estados de Usuario:**
- 🟢 **Activo Hoy**: Ingresó en las últimas 24 horas
- 🟡 **Activo Semana**: Ingresó en los últimos 7 días
- ⚪ **Inactivo**: No ha ingresado en más de 7 días
- 🔵 **Nunca Ingresó**: Usuario creado pero nunca usó la cuenta
- 🔴 **Desactivado**: Usuario baneado por el admin

### 5️⃣ Estadísticas del Sistema

**Monitoreo de Actividad**

El admin puede ver:
- Total de compras (últimos 7 días)
- Total de ventas (últimos 7 días)
- Total de publicidad (últimos 7 días)
- Usuarios activos únicos
- Operaciones totales (últimos 30 días)

---

## 🔐 MODELO DE SEGURIDAD

### Roles de Administrador

**Hay 2 tipos de admin:**

1. **super_admin**
   - Puede crear usuarios
   - Puede resetear contraseñas
   - Puede desactivar/activar usuarios
   - Puede ver todas las estadísticas
   - Puede otorgar rol de admin a otros usuarios

2. **admin**
   - Puede ver usuarios
   - Puede ver estadísticas
   - NO puede crear usuarios
   - NO puede otorgar roles

### Row Level Security (RLS)

**Todas las tablas están protegidas:**

```sql
-- Solo admins pueden ver roles
CREATE POLICY "Only admins can view admin roles"
ON admin_roles FOR SELECT TO authenticated
USING (auth.uid() IN (SELECT user_id FROM admin_roles));

-- Solo super_admins pueden modificar roles
CREATE POLICY "Only super admins can modify roles"
ON admin_roles FOR ALL TO authenticated
USING (
  auth.uid() IN (SELECT user_id FROM admin_roles WHERE role = 'super_admin')
);
```

### Verificación de Admin

**En el código:**

```javascript
// Hook personalizado
const { isAdmin, isLoading } = useIsAdmin(user);

// En App.jsx
{!loading && user && isAdmin && !isLoadingAdmin && (
  <AdminPanel currentUser={user} />
)}
```

**Si el usuario no es admin, ve el dashboard normal.**

---

## 📂 ARCHIVOS CREADOS

### Backend / Services
```
src/lib/adminService.js          - Servicio de administración
src/hooks/useIsAdmin.js           - Hook para verificar admin
```

### Componentes
```
src/components/AdminPanel.jsx     - Panel completo de administración
```

### Base de Datos
```
sql/create_admin_system.sql       - Esquema de admin y roles
```

### Documentación
```
ADMIN_PANEL_DOCUMENTATION.md      - Este archivo
```

---

## 🎨 UI/UX DEL PANEL

### Diseño
- **Tema oscuro** (purple-900 gradient)
- **4 tabs principales**: Dashboard, Crear Usuario, Reset Contraseña, Usuarios
- **Animaciones smooth** con Framer Motion
- **Iconografía clara** con Lucide React
- **Responsive** para desktop y tablet

### Flujo de Trabajo del Admin

**1. Ver Dashboard**
- Ver estadísticas generales
- Monitorear actividad del sistema

**2. Crear Usuario**
- Ingresar nombre (opcional)
- Sistema genera email y contraseña
- Copiar credenciales
- Enviar al usuario de forma segura

**3. Resetear Contraseña**
- Ingresar email del usuario
- Sistema genera nueva contraseña
- Copiar y enviar al usuario

**4. Gestionar Usuarios**
- Ver lista completa
- Desactivar usuarios problemáticos
- Reactivar usuarios desactivados

---

## ⚠️ CONSIDERACIONES IMPORTANTES

### Seguridad

1. **Service Role Key**
   - NUNCA exponer en el frontend
   - Usar backend proxy o Edge Functions
   - Guardar en variables de entorno

2. **Contraseñas Generadas**
   - No se envían por email
   - Admin debe enviarlas de forma segura
   - Usuario puede cambiarla después (implementar función de cambio de contraseña)

3. **Validación de Admin**
   - Verificar en cada operación crítica
   - No confiar solo en el frontend
   - Usar RLS en Supabase

### Escalabilidad

Para más de 100 usuarios:
- Agregar paginación en lista de usuarios
- Implementar búsqueda de usuarios
- Agregar filtros por estado/fecha

### Funcionalidades Futuras (Opcionales)

- [ ] **Cambio de Contraseña por Usuario** - Permitir que usuarios cambien su propia contraseña
- [ ] **Logs de Actividad Detallados** - Ver qué acciones realizó cada usuario
- [ ] **Eliminación de Usuarios** - Agregar botón para eliminar (actualmente no está)
- [ ] **Exportación de Datos** - Exportar lista de usuarios a CSV/Excel
- [ ] **Búsqueda Avanzada** - Filtrar usuarios por múltiples criterios
- [ ] **Notificaciones** - Alertas cuando hay usuarios inactivos
- [ ] **Roles Personalizados** - Más allá de admin/super_admin

---

## 🐛 TROUBLESHOOTING

### "No se puede crear usuario"

**Causa**: Service role key no configurada o incorrecta

**Solución**:
1. Verificar que usas `service_role` key, NO `anon` key
2. Implementar backend proxy
3. Verificar políticas RLS

### "Usuario creado pero no aparece en lista"

**Causa**: No se recargaron los usuarios después de crear

**Solución**: Presionar botón "Actualizar" en el header del panel

### "No veo el panel de admin"

**Causa**: Usuario no tiene rol de admin en la tabla `admin_roles`

**Solución**:
```sql
-- Verificar si usuario es admin
SELECT * FROM admin_roles WHERE user_id = 'USER_ID_AQUI';

-- Si no existe, agregarlo
INSERT INTO admin_roles (user_id, role)
VALUES ('USER_ID_AQUI', 'super_admin');
```

### "Error: admin_roles does not exist"

**Causa**: No ejecutaste el SQL de creación

**Solución**: Ejecutar `sql/create_admin_system.sql` en Supabase

---

## 📞 SOPORTE

Para problemas o dudas:
1. Verificar esta documentación
2. Revisar logs en consola del navegador
3. Verificar Supabase logs
4. Contactar al desarrollador

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [x] Crear tabla `admin_roles` en Supabase
- [x] Crear primer super_admin
- [x] Configurar service role key (backend)
- [x] Verificar que admin ve el panel
- [x] Probar creación de usuario
- [x] Probar reset de contraseña
- [x] Probar desactivar/activar usuario
- [x] Documentar proceso para equipo

---

**Sistema desarrollado para uso interno de Fuxion**
**Última actualización:** Enero 2025
