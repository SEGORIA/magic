# Puesta en producción de My Magic

## 1. Crear el proyecto de datos

1. Crear un proyecto en Supabase en una región cercana a Colombia.
2. Ejecutar, en orden, `supabase/migrations/001_magic.sql` y `supabase/migrations/002_services.sql` desde el editor SQL.
3. En Authentication, habilitar correo y configurar la URL pública de la aplicación como Site URL.
4. Agregar `/acceso` a las URL de redirección permitidas.
5. Mantener deshabilitado el acceso anónimo y exigir verificación de correo.

Las migraciones crean el bucket privado `magic-media`, las políticas RLS, el registro de auditoría y los siete equipos. No deben hacerse públicos los objetos del bucket.

## 2. Configurar secretos localmente

Copiar `.env.example` como `.env.local` y completar:

- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: clave pública del proyecto.
- `SUPABASE_SERVICE_ROLE_KEY`: clave exclusiva del servidor; nunca debe exponerse al navegador.
- `NEXT_PUBLIC_APP_URL`: URL HTTPS definitiva, sin barra final.

## 3. Crear el primer administrador

Después de aplicar las migraciones:

```bash
npm run bootstrap:admin -- "correo@dominio.com" "Nombre completo"
```

El comando solo funciona cuando no existe otro administrador, envía una invitación y elimina el usuario si no puede completar el perfil y el rol. Al ingresar, el administrador debe activar MFA antes de acceder a operaciones administrativas.

## 4. Desplegar en Vercel

1. Importar el repositorio como proyecto Next.js.
2. Registrar las cuatro variables anteriores en Production y Preview; usar una base separada para Preview si se compartirán enlaces externos.
3. Ejecutar `npm run build` como Build Command.
4. Publicar y actualizar `NEXT_PUBLIC_APP_URL` y las redirecciones de Supabase con el dominio definitivo.
5. Proteger `main` y exigir que typecheck, pruebas y build pasen antes del despliegue.

## 5. Configuración operativa inicial

1. Entrar como administrador con MFA.
2. Invitar a los seis entrenadores y asignarlos a sus equipos.
3. Crear o importar las fichas de deportistas y vincular a cada familia.
4. Registrar el consentimiento de perfil y Magic TV con la evidencia correspondiente.
5. Crear un dispositivo Magic TV, elegir sus equipos y abrir una sola vez el enlace de activación en la pantalla.

Asignación confirmada:

- Angela y Laura: Magic Beautiful.
- Angie: Magic Power.
- AH (nombre provisional): Magic Energy.
- Isabella: Magic Infinity.
- Milton: Magic Love, Magic Joy y Magic Stronger.

## 6. Verificación antes de abrir a familias

- Confirmar que una familia solo ve deportistas vinculados a su cuenta.
- Confirmar que cada entrenador solo modifica deportistas de sus equipos.
- Probar aprobación y rechazo de cada foto por separado.
- Retirar un consentimiento y comprobar que la foto deja de aparecer en Magic TV.
- Revocar un dispositivo de TV y verificar que pierde acceso.
- Descargar una copia de seguridad y realizar una restauración de prueba.
- Revisar auditoría, alertas de autenticación y límites de uso durante la primera semana.

## Datos aún requeridos para el despliegue real

- Proyecto y claves de Supabase.
- Correo y nombre del primer administrador.
- Acceso a la cuenta o proyecto de Vercel y dominio definitivo.
- Nombre real de la entrenadora registrada provisionalmente como AH.
