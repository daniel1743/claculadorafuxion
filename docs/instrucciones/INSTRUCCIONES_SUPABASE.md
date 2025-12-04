# 🚀 Guía Completa de Configuración de Supabase

## ✅ Lo que ya está configurado

1. ✅ Cliente de Supabase instalado (`@supabase/supabase-js`)
2. ✅ Credenciales configuradas en el proyecto
3. ✅ Servicios de Supabase creados
4. ✅ Componentes actualizados para usar Supabase

## 📋 Pasos para Completar la Configuración

### Paso 1: Ejecutar el Script SQL en Supabase

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard/project/oxoirfrlnpnefuzspldd
2. En el menú lateral, haz clic en **SQL Editor**
3. Haz clic en **New Query**
4. Abre el archivo `supabase-schema.sql` de este proyecto
5. Copia TODO el contenido del archivo
6. Pégalo en el editor de SQL de Supabase
7. Haz clic en **Run** (o presiona Ctrl+Enter / Cmd+Enter)

### Paso 2: Verificar que las Tablas se Crearon

1. En el menú lateral de Supabase, haz clic en **Table Editor**
2. Deberías ver 3 tablas nuevas:
   - ✅ `transactions` - Para almacenar compras, ventas y publicidad
   - ✅ `prices` - Para almacenar precios de productos
   - ✅ `profiles` - Para almacenar información del perfil del usuario

### Paso 3: Configurar Variables de Entorno

Las credenciales ya están configuradas, pero si necesitas verificarlas:

1. Crea un archivo `.env.local` en la raíz del proyecto (si no existe)
2. Agrega estas líneas:

```env
VITE_SUPABASE_URL=https://oxoirfrlnpnefuzspldd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94b2lyZnJsbnBuZWZ1enNwbGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjI1MDAsImV4cCI6MjA4MDQzODUwMH0.OH90hprQlXOpDm6SFiZY-MyXuJLXAg1ixCxNNsvKrCg
```

### Paso 4: Reiniciar el Servidor de Desarrollo

Si el servidor está corriendo, deténlo y vuelve a iniciarlo:

```bash
npm run dev
```

## 🎉 ¡Listo!

Ahora tu aplicación está conectada a Supabase. Puedes:

1. **Registrar nuevos usuarios** - Se crearán automáticamente en Supabase
2. **Iniciar sesión** - La autenticación está completamente funcional
3. **Guardar transacciones** - Todas las compras, ventas y publicidad se guardan en la base de datos
4. **Gestionar precios** - Los precios se sincronizan con Supabase

## 📁 Estructura de Archivos Creados

```
src/
  lib/
    supabase.js              # Configuración del cliente de Supabase
    supabaseService.js       # Servicios para interactuar con la BD

supabase-schema.sql          # Script SQL para crear las tablas
INSTRUCCIONES_SUPABASE.md    # Este archivo
SUPABASE_SETUP.md            # Documentación técnica detallada
```

## 🔒 Seguridad

- ✅ **Row Level Security (RLS)** está activado
- ✅ Cada usuario solo puede ver/modificar sus propios datos
- ✅ Las políticas de seguridad están configuradas
- ✅ Las credenciales están en `.env.local` (no se suben a Git)

## 🐛 Solución de Problemas

### Error: "Las variables de entorno de Supabase no están configuradas"

- Verifica que el archivo `.env.local` existe y tiene las variables correctas
- Reinicia el servidor de desarrollo después de crear/modificar `.env.local`

### Error: "No se pueden cargar las transacciones"

- Verifica que ejecutaste el script SQL completo en Supabase
- Verifica que las tablas existen en Table Editor
- Revisa la consola del navegador para ver errores específicos

### Error al iniciar sesión o registrar

- Verifica que Row Level Security (RLS) está habilitado en las tablas
- Verifica que las políticas de seguridad están creadas (deben crearse automáticamente con el script SQL)

## 📚 Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de Autenticación de Supabase](https://supabase.com/docs/guides/auth)
- [Row Level Security en Supabase](https://supabase.com/docs/guides/auth/row-level-security)

## ✨ Características Implementadas

1. ✅ Autenticación completa (registro e inicio de sesión)
2. ✅ Almacenamiento de transacciones en la nube
3. ✅ Sincronización de precios
4. ✅ Perfiles de usuario
5. ✅ Seguridad a nivel de fila (RLS)
6. ✅ Sesiones persistentes
7. ✅ Sincronización automática de datos

¡Tu aplicación ahora está completamente conectada a Supabase! 🎉

