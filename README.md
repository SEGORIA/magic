# Magic All Stars + My Magic

Plataforma web de Magic All Stars: sitio público, portal privado por roles, seguimiento deportivo, galería moderada y Magic TV.

## Funciones incluidas

- Acceso separado para familias/deportistas, entrenadores y administración.
- Siete equipos y asignación flexible de entrenadores.
- Ficha por deportista con foto, habilidades, evaluaciones, progreso e historial.
- Borradores de evaluación y protección contra ediciones simultáneas.
- Fotos familiares sujetas a revisión individual y fotos oficiales administrativas.
- Consentimiento verificable por deportista y retiro inmediato de Magic TV.
- Dispositivos Magic TV activados por enlace, con rotación automática por equipo.
- RLS, MFA obligatorio para administración, auditoría, límites de carga y archivos privados.

## Desarrollo local

```bash
npm install
copy .env.example .env.local
npm run dev
```

Sin credenciales de Supabase, la interfaz completa puede revisarse en `http://127.0.0.1:3000/demo`.

## Verificación

```bash
npm run typecheck
npm test
npm run build
```

La arquitectura y decisiones de seguridad están en [docs/ARQUITECTURA-MAGIC.md](docs/ARQUITECTURA-MAGIC.md). El procedimiento de publicación está en [docs/PUESTA-EN-PRODUCCION.md](docs/PUESTA-EN-PRODUCCION.md).
