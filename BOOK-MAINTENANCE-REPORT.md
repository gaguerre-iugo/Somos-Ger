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

### 4. Invalidación de caché del adaptador (`8baaa81`)

- La comprobación sobre la copia integrada en `main` detectó que un servidor ya abierto conservaba la primera versión del adaptador.
- En ese incremento el adaptador se movió antes del bundle del runtime y se versionó como `somos-ger-4`; la observación global usada entonces fue sustituida en el incremento de menú por observadores acotados.
- El ocultamiento aplica `display: none !important`, además de `hidden` y `aria-hidden`, porque las clases de presentación del runtime podían prevalecer sobre el estilo de agente del atributo `hidden`.
- Se confirmó en navegador tanto en el worktree como en la copia final de Desktop: el marcador `data-project-adaptations="somos-ger-4"` está activo y “Idioma” no forma parte de los controles visibles.

### 5. Arquitectura canónica del menú (incremento actual)

- Se reemplazó la presentación del dock por una barra permanente de cinco posiciones, en este orden: `Índice`, `Anterior`, contador `actual / total`, `Siguiente` y `Herramientas`.
- El dock del runtime se conserva como puente de estado y acciones, pero queda fuera de la presentación y del orden de foco. Los selectores se verificaron en este export: grupo directo de `#nav-container`, botones `data-dock-trigger` y rótulos reales de la interfaz en español.
- `Índice` reutiliza el panel nativo con búsqueda, pestañas y jerarquía. `Herramientas` agrupa Glosario, lectura en voz alta y Configuración de lectura en un diálogo propio con cierre, Escape, trampa de foco y retorno del foco.
- Se adaptó la excepción responsive de este libro: en móvil el runtime sustituye Glosario, Texto a voz, Idioma y Configuración por `Menú de accesibilidad`. El adaptador abre ese puente y ejecuta la acción compacta correspondiente sin exponer el dock duplicado.
- La lectura en voz alta usa un reproductor persistente separado con exactamente cinco controles y este orden: `Audio anterior`, `Reproducir/Pausar`, `Audio siguiente`, `Voz y velocidad` y `Detener`. El reproductor nativo de seis controles se conserva oculto únicamente como puente con el runtime.
- La activación prepara la sesión en pausa y enfoca `Reproducir`; solo un gesto explícito inicia el audio. Anterior y siguiente conservan el estado de pausa, `Voz y velocidad` abre Herramientas sin terminar la sesión y `Detener` elimina el reproductor y devuelve el foco al libro. Una navegación o recarga con la sesión activa restaura el reproductor en pausa.
- Este proyecto declara una sola narración en `content/i18n/es-UY/audios.json`; por eso Herramientas informa `Predeterminada · única voz disponible` y no fabrica el selector de dos voces del libro 1930. Las cuatro velocidades documentadas sí se exponen con sus nombres y multiplicadores exactos. El volumen propio del export se mantiene dentro de Herramientas como excepción comprobada.
- Se reservan 96 px estables para el reproductor. En las actividades, el desplazamiento se limita al contenido para que ni la barra ni el reproductor tapen preguntas o devoluciones. En móvil los rótulos visuales se ocultan, pero los cinco botones conservan nombre accesible completo y un objetivo mínimo de 44 px.
- Herramientas y reproductor quedan adyacentes en escritorio; en móvil el panel reduce su altura para evitar solapamientos. El reproductor usa iconos con nombre accesible en móvil e icono y texto en escritorio. Todos los objetivos interactivos verificados alcanzan al menos 44 × 44 px.
- La observación de cambios se limita a `#nav-container` y al contenedor de interfaz para el único atajo de idioma; no se instaló un observador global del documento.
- Los recursos se versionaron como `project-adaptations.js?v=somos-ger-26` y `project-interface.css?v=somos-ger-12` para invalidar cachés previas.
- El aplicador se corrigió para eliminar separaciones residuales y se comprobó idempotente: dos ejecuciones consecutivas producen el mismo SHA-256 de `index.html`.

### 6. Unificación visual de todos los menús (incremento actual)

- Se compararon en navegador los estilos calculados de 1930 y Somos. La interfaz adopta los tokens Ceibal verificados del libro de referencia: superficie carbón `#242424`, superficie profunda `#1b1b1b`, activo institucional `#008078`, borde activo `#66c6c0` y texto claro accesible.
- Barra principal, reproductor, Herramientas, Índice, Glosario y Configuración comparten ahora radios, bordes, sombras, foco, estados activos y estados deshabilitados. Los paneles laterales miden 18 rem y se anclan al borde correspondiente; el reproductor conserva el ancho máximo de 44 rem y no se superpone con ellos.
- Los paneles del runtime se clasifican al aparecer y reciben un encabezado consistente con título y cierre de 44 px. Se conserva el runtime como fuente de estado; no se reemplazaron sus controles internos ni se copiaron selectores específicos de contenido de 1930.
- En móvil se mantiene la presentación documentada: Índice y Herramientas conservan rótulo cuando hay espacio, el reproductor usa cinco controles de 44 px y Herramientas reduce su altura para no cubrir el reproductor.
- Se mantuvieron las excepciones comprobadas de Somos: una única voz informativa y el volumen dentro de Herramientas. Ambos se tematizaron sin inventar datos o funciones del otro libro.

## Decisiones que no se copiaron del libro 1930

- No se aplicó reflow ni maquetación multicolumna: este proyecto es un libro de composición fija y hacerlo rompería posiciones, ilustraciones y actividades.
- No se copió la barra específica de 1930. Se implementó el mismo contrato editorial de cinco posiciones sobre los selectores, estados, paneles y comportamiento responsive comprobados en este export.
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
- Texto a voz activado y desactivado desde Herramientas, y detenido al finalizar la prueba.
- Barra canónica comprobada en las 34 entradas: orden correcto, un único ejemplar, contador normalizado, dock base oculto y sin desborde horizontal.
- Índice, Glosario y Configuración verificados tanto en escritorio como en la variante móvil compacta del runtime.
- Texto a voz verificado desde estado limpio: aparece preparado en `Reproducir`, enfoca ese control y Herramientas cambia a `Desactivar lectura en voz alta`.
- Reproductor verificado con cinco controles en el orden documentado: reproducir/pausar, anterior/siguiente conservando la pausa, apertura de Voz y velocidad con retorno del foco, y Detener eliminando la sesión.
- Recarga y navegación con una sesión activa verificadas: el reproductor se restaura pausado y no reproduce automáticamente en el nuevo documento.
- Comparación visual y de estilos calculados contra 1930: panel Herramientas de 288 × 640 px, barra de 992 × 64 px y reproductor de 704 px, con las mismas superficies oscuras y estados turquesa.
- Índice, Glosario y Configuración verificados con el mismo tema, anclaje lateral, encabezado de cierre y retorno de foco; solo la entrada actual del Índice usa la superficie activa.
- Revalidación móvil a 390 × 844 px tras el tema unificado: sin desborde horizontal, sin solapamiento entre panel, reproductor y barra, y objetivos de audio de 72 × 44 px.
- Actividad `qz001` con reproductor activo: contenido desplazable dentro de su región, devolución visible y cero desplazamiento de la ventana.
- Navegación por teclado: flechas entre controles de la barra, ciclo de Tab dentro de Herramientas y Escape con retorno del foco al disparador.
- Prueba de estabilidad de 30 segundos después de ciclos repetidos de paneles y voz: el reproductor permanece eliminado después de Detener y no reaparecen capas residuales.
- Actividad `qz001`: selección de “Todas las personas” y devolución correcta en región viva.
- Inspección visual específica de las páginas 8, 9 y 23 tras el cambio tipográfico.
- Respuestas HTTP 200 y MIME correctos para HTML, CSS, JavaScript, XML, imágenes y fuentes.
- Caché: HTML/manifiesto sin caché; recursos versionados inmutables; medios con caché de una hora.

### SCORM y offline

Salida final de `node tools/validate-scorm.js`:

```text
SCORM: 1.2
Archivos declarados: 653
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
node tools/validate-interface.js
node tools/validate-scorm.js
node tools/serve-local.js
```

Después de cualquier cambio de recursos se deben ejecutar, en este orden, la sincronización del preloader, la actualización del manifiesto y la validación SCORM.
