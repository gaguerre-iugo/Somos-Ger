# Informe de mantenimiento — Somos ciudadanos digitales

Fecha de auditoría: 2026-08-17

Repositorio: `gaguerre-iugo/Somos-Ger` (privado)
Playbook de referencia: `BOOK-MAINTENANCE-PLAYBOOK.md` del proyecto 1930, leído completo (2329 líneas).

## Línea base y estructura auditada

Se creó y publicó el commit base `afc051b` antes de modificar el libro. La auditoría inicial confirmó:

- Export web ADT de diseño fijo (`fixedLayout: true`) y lienzo editorial de 595 × 595 px.
- SCORM 1.2 con `index.html` como SCO.
- 34 entradas de navegación: 30 secciones editoriales y 4 actividades.
- 138 imágenes, 428 audios MP3 y un tamaño aproximado de 57,62 MB.
- Un único idioma declarado: `es-UY`.
- Mezcla inicial de Merriweather, Atkinson Hyperlegible y fuentes decorativas.
- Preloader offline de aproximadamente 0,4 MB cargado también por HTTP.
- Manifiesto SCORM inicial con solo 34 archivos HTML declarados.
- Barra propia del export con siete controles; no coincide con la barra personalizada del libro 1930.

## Adaptaciones aplicadas

### 1. Tipografía y consistencia visual (`7728032`)

- Se unificó contenido e interfaz en Atkinson Hyperlegible local, con pesos efectivos 400 y 700.
- Se añadieron precargas versionadas y se eliminaron llamadas a Google Fonts.
- Se conservaron explícitamente los glifos de Font Awesome.
- Se eliminaron 17 archivos de fuentes que quedaron sin uso; pueden recuperarse desde Git.
- Se normalizaron los 34 HTML y el menú de navegación.
- Se corrigió un desborde real introducido por el cambio tipográfico en la página 9, ajustando únicamente sus cajas verificadas.
- Se añadieron herramientas reproducibles de normalización, sincronización offline y validación SCORM.

### 2. Carga, servidor y paquete SCORM (`297dc7a`)

- El preloader pesado ahora solo se activa bajo `file:`; por HTTP se carga un detector mínimo.
- Se regeneró el manifiesto con todos los recursos necesarios para ejecutar el libro.
- Se añadió un servidor local específico del proyecto con MIME y caché adecuados.
- Se añadió validación del contrato SCORM 1.2, cobertura del manifiesto y comportamiento del loader offline.

### 3. Interfaz propia del libro (`1fd044c`)

- Se añadieron las traducciones faltantes “Lectura” y “Comportamiento”.
- Los encabezados de interfaz usan sentence case sin alterar las mayúsculas editoriales del libro.
- Los rótulos de los interruptores alcanzan un área efectiva de 44 px.
- Se ocultan el selector y el atajo de idioma cuando la configuración declara un solo idioma.
- La adaptación se implementó fuera del bundle compilado, mediante `assets/project-adaptations.js`, para reducir el costo de futuras actualizaciones del runtime.
- Se incrementó la versión de recursos para evitar que una caché previa mantuviera CSS o traducciones obsoletas.

## Decisiones que no se copiaron del libro 1930

- No se aplicó reflow ni maquetación multicolumna: este proyecto es un libro de composición fija y hacerlo rompería posiciones, ilustraciones y actividades.
- No se sustituyó la barra del runtime por la barra específica de 1930: los selectores y funciones del export actual son distintos.
- No se copiaron anchos, alturas, excepciones editoriales ni rutas del otro libro. El único ajuste de caja se obtuvo midiendo la página 9 de este proyecto.
- No se elevó de forma global todo el texto editorial a 16 px: una regla indiscriminada produciría solapamientos en el lienzo 595 × 595. Los mínimos de interfaz sí se verificaron por separado.

## Validaciones realizadas

### Navegador y servidor local

- Recorrido automatizado de las 34 entradas: contenido visible en todas.
- Cero familias visibles distintas de Atkinson Hyperlegible y cero pesos fuera de 400/700.
- Selector de idioma ausente en las 34 entradas.
- Navegación física comprobada de portada a la página siguiente.
- Panel de configuración: traducciones correctas, sentence case y rótulos de interruptores de 44 px una vez terminada la animación.
- Glosario abierto correctamente.
- Texto a voz activado, con controles “Pausa” y “Desactivar texto a voz”, y detenido al finalizar la prueba.
- Actividad `qz001`: selección de “Todas las personas” y devolución correcta en región viva.
- Inspección visual específica de las páginas 8, 9 y 23 tras el cambio tipográfico.
- Respuestas HTTP 200 y MIME correctos para HTML, CSS, JavaScript, XML, imágenes y fuentes.
- Caché: HTML/manifiesto sin caché; recursos versionados inmutables; medios con caché de una hora.

### SCORM y offline

Salida final de `node tools/validate-scorm.js`:

```text
SCORM: 1.2
Archivos declarados: 652
Archivos declarados inexistentes: 0
Recursos de ejecución no declarados: 0
Preloader bajo HTTP: 0 cargas
Preloader bajo file: 1 carga
Estado inicial: incomplete, puntuación 0
Estado completado: passed, puntuación 100
```

El flujo SCORM se validó con un simulador local de la API SCORM 1.2. La política de seguridad del navegador integrado bloquea la navegación directa a `file://`; por eso el caso offline local se comprobó en el validador aislado, además de verificar el libro completo por HTTP.

## Riesgos y excepciones pendientes

- El diseño fijo contiene texto editorial menor de 16 px. Se conserva para no romper la composición; sigue siendo un riesgo de legibilidad inherente al original.
- La métrica automática marca 15 cajas editoriales en 10 páginas cuyo glifo excede la caja declarada. Todas usan `overflow: visible`, por lo que no hay recorte; las muestras de mayor riesgo se revisaron visualmente. Conviene repetir esta revisión si cambia la fuente o el tamaño base.
- El paquete contiene 428 MP3 y sigue siendo pesado. No se recomprimieron audios para evitar pérdida de calidad o desincronización de texto a voz.
- El simulador cubre el contrato SCORM, pero no sustituye una importación final en el LMS de destino. Antes de producción se recomienda importar el ZIP en ese LMS y verificar persistencia, reanudación y reporte de puntuación.
- Los archivos `base.bundle.local.js` y `base.bundle.min.js` se conservaron sin cambios. Una actualización futura del runtime debe volver a ejecutar las herramientas y la batería del navegador.

## Comandos de mantenimiento

```powershell
node tools/normalize-typography.js
node tools/apply-runtime-loading.js
node tools/apply-project-adaptations.js
node tools/sync-offline-preloader.js
node tools/update-scorm-manifest.js
node tools/validate-scorm.js
node tools/serve-local.js
```

Después de cualquier cambio de recursos se deben ejecutar, en este orden, la sincronización del preloader, la actualización del manifiesto y la validación SCORM.
