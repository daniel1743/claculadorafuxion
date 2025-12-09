# Reparación: Error de Prop `dismiss` en Toast

**Fecha**: 2025-01-28
**Estado**: ✅ Resuelto

## 🔍 Problema Identificado

### Error 1: Prop `dismiss` inválido en elemento `<li>`

```
Invalid value for prop `dismiss` on <li> tag. Either remove it from the element, or pass a string or number value to keep it in the DOM.
```

**Causa**: El componente `Toaster` estaba pasando todas las propiedades del objeto toast (incluyendo `dismiss` y `update`) directamente al componente `Toast`, que internamente renderiza un elemento `<li>`. React no permite pasar funciones como props a elementos HTML nativos.

### Error 2: Error 500 en PriceManagement.jsx

**Causa**: El método `.single()` en Supabase lanza un error cuando no se encuentran resultados. Al verificar si existe un precio, si no existe, `.single()` fallaba.

## ✅ Soluciones Implementadas

### 1. Filtrado de Props en Toaster

**Archivo**: `src/components/ui/toaster.jsx`

Ahora se filtran explícitamente los props `dismiss` y `update` antes de pasarlos al componente `Toast`:

```javascript
{toasts.map(({ id, title, description, action, dismiss, update, ...props }) => {
  // dismiss y update se filtran aquí, no se pasan al Toast
  return (
    <Toast key={id} {...props}>
      {/* contenido */}
    </Toast>
  );
})}
```

### 2. Manejo Mejorado de Errores en upsertPrice

**Archivo**: `src/lib/supabaseService.js`

Cambios:
- Se usa `maybeSingle()` en lugar de `single()` para evitar errores cuando no existe un precio
- Se maneja correctamente el error `PGRST116` (no rows returned)

```javascript
const { data: existing, error: checkError } = await supabase
  .from('prices')
  .select('id')
  .eq('user_id', user.id)
  .eq('product_name', productName.trim())
  .maybeSingle(); // ✅ Usar maybeSingle() en lugar de single()
```

## 📝 Notas Técnicas

- `maybeSingle()` devuelve `null` si no se encuentra ningún resultado, en lugar de lanzar un error
- El código de error `PGRST116` es el que Supabase devuelve cuando no se encuentran filas
- Los props `dismiss` y `update` son funciones internas del sistema de toasts y no deben pasarse a componentes HTML

## ✅ Resultado

- ✅ El error del prop `dismiss` está resuelto
- ✅ El error 500 en PriceManagement.jsx está resuelto
- ✅ La verificación de precios existentes funciona correctamente
- ✅ No hay errores de sintaxis



