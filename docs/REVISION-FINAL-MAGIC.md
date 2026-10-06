# Revisión consolidada de Magic

Fecha: 5 de octubre de 2026.

**Resultado: listo para iniciar implementación; no listo para publicar la aplicación operativa.** Se revisaron requisitos, arquitectura y estado local del repositorio. La web pública existe; la aplicación privada, su base de datos y sus pruebas aún no existen. Esta es una revisión de diseño, no una certificación de funcionamiento.

## Alcance consolidado de la primera entrega

| Módulo                  | Resultado esperado                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| Acceso                  | Tres roles: padres/deportistas, coach y administrador total; invitación, recuperación y permisos por registro |
| Administración          | Gestión de 7 equipos, 6 coaches iniciales, deportistas, vínculos familiares y asignaciones editables          |
| Ficha deportiva digital | Foto, datos básicos, equipo, coaches, habilidades, evaluaciones, logros, retos y evolución                    |
| Magic Coach             | Evaluar, guardar borradores, publicar avances, corregir con historial y moderar fotos de sus equipos          |
| My Magic                | Consultar fichas vinculadas y resultados publicados; avatar y acceso a galería autorizada                     |
| Fotos familiares        | Subir al equipo vinculado, consultar estado y retirar; aprobación por imagen antes de TV                      |
| Fotos oficiales         | Administración carga, elige equipos y publica directamente en portal, TV o ambos                              |
| Magic TV                | Enlace desde admin, activación única, sesión persistente y rotación automática por equipo                     |
| Operación               | Registro de cambios, control de archivos, respaldo, restauración y monitoreo                                  |

La escala confirmada es 70–140 deportistas. Mantener las asignaciones iniciales del documento de arquitectura: Beautiful con Angela y Laura; Power con Angie; Energy con AH provisional; Infinity con Isabella; Love, Joy y Stronger con Milton. Es una configuración inicial editable.

Asistencia, reportes mensuales automatizados, módulo de preparación para competencias, certificados y notificaciones siguen previstos como ampliaciones. Un álbum de fotos de una competencia sí pertenece a la galería inicial; no implica que el módulo de competencias esté construido. No incluir botones inactivos que aparenten capacidades disponibles.

## Ficha individual: definición explícita

Administración crea una ficha digital por deportista, independiente de si tiene cuenta propia. Contiene identidad básica, nombre de exhibición, foto, membresías activas e históricas, acudientes vinculados y datos deportivos. El coach registra evaluaciones y próximos objetivos dentro de sus equipos; la familia consulta resultados publicados y puede gestionar únicamente los datos o imágenes expresamente permitidos.

No permitir que las familias modifiquen niveles, criterios, badges ni resultados mediante formularios o solicitudes directas. Una deportista puede tener más de un equipo y una familia puede consultar varias fichas. Las vistas distinguen equipo, temporada, currículo y fecha de evaluación. Si no existe evaluación, mostrar «Sin evaluar», nunca un porcentaje inventado.

La tarjeta TV se genera desde esta ficha sin volver a digitar información. Solo incluye nombre de exhibición, foto autorizada, equipo, nivel publicado si está definido, habilidades/logros y próximo reto apto para proyección. No proyecta la ficha privada completa ni un ranking individual.

No se confirmó importación de fichas existentes en Excel/PDF. El alcance actual es creación y actualización digital; si aparece un archivo de origen, habrá que definir mapeo, detección de duplicados y revisión antes de importar. No interpretar la existencia de una ficha PDF como una evaluación validada automáticamente.

## Flujo único de Magic TV

1. Admin elige equipos y genera el enlace de activación del televisor.
2. El televisor guarda una sesión restringida y consulta automáticamente información autorizada.
3. Rota: presentación de equipo → fichas individuales autorizadas → fotos familiares aceptadas y oficiales publicadas → siguiente equipo.
4. Al terminar vuelve al inicio. Las actualizaciones no reinician el cursor ni excluyen indefinidamente a integrantes o imágenes.
5. Retiradas, vencimientos y cambios de autorización eliminan tarjetas elegibles; una desconexión prolongada cambia a pantalla de marca según la caducidad de 60 segundos definida.

El enlace no requiere confirmación de coaches. Solo hace falta volver a activar si se pierde la sesión o se revoca el dispositivo. La apertura automática al encender depende del hardware y debe probarse en el televisor real.

La renovación del feed cada 30 segundos no significa que la foto se exhiba en 30 segundos: entra en la lista y aparece cuando llega su turno. Los nuevos elementos pueden incorporarse en la siguiente vuelta para conservar una rotación estable. La interfaz de revisión debe indicar «aceptada/en cola» y no «mostrada» sin confirmación real del reproductor.

## Hallazgos cerrados en el diseño

| Hallazgo                                                              | Resolución                                                                         |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| La ficha se describía en varias secciones, sin contrato consolidado   | Definición y responsables explícitos arriba                                        |
| Los roles y rutas originales no reflejaban las fotos añadidas después | Matriz y rutas de arquitectura actualizadas                                        |
| Aprobar parcialmente un álbum no estaba representado en el modelo     | Revisión por imagen, versión, equipo y canal; el estado del álbum no autoriza todo |
| Un texto o archivo editado podía reutilizar una aprobación            | Cambio relevante invalida la revisión afectada                                     |
| Una foto aceptada podía confundirse con una foto ya exhibida          | Diferenciar inclusión en cola de reproducción efectiva                             |
| Ficha perteneciente a dos equipos podía ampliar acceso de un coach    | Separar notas internas por equipo y comprobar asignación en cada operación         |
| Baja de coach podía destruir historia o retirar otros roles           | Desactivar solo su capacidad de coach y conservar autoría y demás roles            |
| Un currículo cambiado podía producir una falsa mejora porcentual      | Comparar únicamente bases equivalentes y mostrar cobertura                         |

## Casos adicionales que deben quedar cubiertos al implementar

- **Fotos de perfil:** reemplazar foto deportiva no la autoriza silenciosamente para TV; validar la nueva imagen y su permiso. Un coach puede ver la información necesaria de su equipo sin acceder a contactos de otras familias.
- **Retirada de una foto grupal:** si pierde permiso una persona identificable, retirar la imagen de la audiencia afectada. No basta quitar una etiqueta. Una versión recortada es un nuevo recurso que se revisa de nuevo.
- **Traslado de equipo:** la ficha cambia sus membresías; las fotos no se trasladan automáticamente. Conservan el equipo de publicación y requieren nueva decisión para otro destino.
- **Revocación simultánea a aprobación:** aceptar una foto y publicar una evaluación deben revalidar permisos dentro de la operación transaccional. Un formulario abierto antes de la baja de un coach no puede seguir publicando.
- **Autorizaciones contradictorias:** si hay una retirada o conflicto vigente entre responsables, suspender la proyección afectada y remitir la resolución a administración; no aceptar simplemente el permiso más reciente de cualquier cuenta.
- **Recuperación de datos:** tras restaurar una copia, mantener TV y publicaciones privadas deshabilitadas hasta reconciliar las retiradas, bajas y revocaciones posteriores al punto restaurado. La copia no debe reactivar contenido retirado por defecto.
- **Carga desde móviles:** comprimir y mostrar avance, errores y reintento sin duplicados. HEIC no está incluido en los formatos iniciales; el selector debe explicarlo. Evaluar conversión si las pruebas con teléfonos reales muestran que es necesaria.
- **Archivos grandes:** cargar directamente al almacenamiento privado con permiso temporal y validar después; no asumir que una petición de imagen de 10 MB atravesará sin límites el servidor de aplicación. Elegir el proceso de transformación al verificar límites del proveedor en implementación.
- **Coste de TV:** no volver a descargar todas las imágenes cada 30 segundos. Consultar metadatos, precargar solo las próximas tarjetas y reutilizar memoria mientras su autorización siga vigente. Descartar recursos retirados o vencidos.

## Pruebas de aceptación integrales

Todas están pendientes de ejecución. Cada una necesita resultado registrado en staging antes de habilitar su funcionalidad con datos reales.

| ID  | Recorrido                                                              | Resultado exigido                                                           |
| --- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| A1  | Admin crea coach, asigna dos equipos y luego retira uno                | Acceso solo a asignaciones vigentes; historia intacta                       |
| A2  | Familia con dos deportistas abre una ficha de otra familia por URL/API | Acceso denegado, incluidos archivos                                         |
| A3  | Coach publica y corrige evaluación; familia y TV consultan             | Resultado coherente, trazable; solo campos autorizados en TV                |
| A4  | Dos coaches editan a la vez o reenvían una publicación                 | Conflicto controlado; sin badges ni evaluaciones duplicadas                 |
| A5  | Familia sube tres fotos y coach acepta solo una                        | Solo la aceptada entra al equipo correcto en TV                             |
| A6  | Familia intenta marcar foto como oficial o cambiar equipo ajeno        | Operación denegada por servidor y permisos de datos                         |
| A7  | Admin publica fotos oficiales para dos equipos                         | Aparecen en ambos destinos seleccionados, sin exposición pública            |
| A8  | Cambia imagen/texto aprobado o se retira autorización                  | Revisión invalidada o recurso retirado, incluyendo derivados                |
| A9  | TV completa ciclo con 140 deportistas y fotos por encima del cupo      | Sin reinicios por actualización ni tarjetas permanentemente omitidas        |
| A10 | TV se reinicia, pierde red, recibe revocación y se reconecta           | Reanudación autorizada; marca al caducar; ningún acceso revocado recuperado |
| A11 | Invitación caduca, recuperación de acceso y cuenta multirol            | Recuperación funcional y roles preservados correctamente                    |
| A12 | Restauración de base y medios en entorno aislado                       | Integridad verificada y revocaciones reconciliadas antes de reactivar       |

Además: comprobar navegación móvil y por teclado, mensajes vacíos, errores de subida, contraste, variables separadas por entorno y conservación de enlaces/SEO de la landing.

## Pendientes y decisión de lanzamiento

**Se puede comenzar a construir con datos ficticios.** No hacen falta más decisiones para crear la estructura, los paneles y las pruebas.

Para operar con datos reales deben resolverse:

1. Catálogo deportivo, criterios de dominio y quién aprueba la metodología. Se puede configurar; no inventar niveles o pesos como definitivos.
2. Responsable y correo del primer administrador; identidades y correos de invitación, incluido nombre real de AH.
3. Proveedores de base de datos/archivos y correo, acceso de despliegue, dominio o URL final y presupuesto operativo.
4. Vinculación familiar, autorizaciones de proyección y política de retención; duración por defecto de fotos de la semana. Propuesta técnica: vigencia de exhibición configurable, distinta de retención del archivo.
5. Modelo/navegador del televisor, cantidad de pantallas y prueba real del ciclo.
6. Implementación terminada del alcance inicial, pruebas anteriores aprobadas, respaldo/restauración ensayados y responsable operativo asignado.

No se ha publicado ningún cambio de aplicación como resultado de esta revisión. Los artefactos producidos son documentos técnicos. El siguiente trabajo es implementar el alcance consolidado en un entorno de prueba y reunir la evidencia de aceptación antes del despliegue operativo.
