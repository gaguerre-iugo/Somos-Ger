# Informe de mantenimiento — Somos ciudadanos digitales

Fecha de auditoría: 2026-08-18

Repositorio: `gaguerre-iugo/Somos-Ger` (privado)
Playbook de referencia: `BOOK-MAINTENANCE-PLAYBOOK.md` del proyecto 1930, leído completo (2329 líneas).

## Línea base y estructura auditada

Se creó y publicó el commit base `afc051b` antes de modificar el libro. La auditoría inicial confirmó:

- Export web ADT de diseño fijo (`fixedLayout: true`) y lienzo editorial de 595 × 595 px.
- SCORM 1.2 con `index.html` como SCO.
- 34 entradas de navegación: 30 secciones editoriales y 4 actividades.
- 138 imágenes, 422 audios MP3 y un tamaño aproximado de 57,62 MB.
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
- `Índice` reutiliza el panel nativo con búsqueda, pestañas y jerarquía. `Herramientas` reutiliza el panel de configuración real del runtime, con cierre, Escape y retorno del foco; de ese modo los controles conservan su estado y sus eventos originales.
- Se adaptó la excepción responsive de este libro: en móvil el runtime sustituye Glosario, Texto a voz, Idioma y Configuración por `Menú de accesibilidad`. El adaptador abre ese puente y ejecuta la acción compacta correspondiente sin exponer el dock duplicado.
- La lectura en voz alta usa un reproductor persistente separado con exactamente cinco controles y este orden: `Audio anterior`, `Reproducir/Pausar`, `Audio siguiente`, `Voz y velocidad` y `Detener`. El reproductor nativo de seis controles se conserva oculto únicamente como puente con el runtime.
- La activación prepara la sesión en pausa y enfoca `Reproducir`; solo un gesto explícito inicia el audio. Anterior y siguiente conservan el estado de pausa, `Voz y velocidad` abre Herramientas sin terminar la sesión y `Detener` elimina el reproductor y devuelve el foco al libro. Una navegación o recarga con la sesión activa restaura el reproductor en pausa.
- Este proyecto declara una sola narración en `content/i18n/es-UY/audios.json`; por eso Herramientas informa `Predeterminada · única voz disponible` y no fabrica el selector de dos voces del libro 1930. Las cuatro velocidades documentadas sí se exponen con sus nombres y multiplicadores exactos.
- Se reservan 96 px estables para el reproductor. En las actividades, el desplazamiento se limita al contenido para que ni la barra ni el reproductor tapen preguntas o devoluciones. En móvil los rótulos visuales se ocultan, pero los cinco botones conservan nombre accesible completo y un objetivo mínimo de 44 px.
- Herramientas y reproductor quedan adyacentes en escritorio; en móvil el panel reduce su altura para evitar solapamientos. El reproductor usa iconos con nombre accesible en móvil e icono y texto en escritorio. Todos los objetivos interactivos verificados alcanzan al menos 44 × 44 px.
- La observación de cambios se limita a `#nav-container` y al contenedor de interfaz para el único atajo de idioma; no se instaló un observador global del documento.
- Los recursos se versionaron finalmente como `project-adaptations.js?v=somos-ger-57` y `project-interface.css?v=somos-ger-25` para invalidar cachés previas. El runtime estable de 8,75 MB usa `base.bundle.local.js?v=somos-ger-runtime-1`, lo que permite reutilizarlo entre páginas en lugar de volver a transferirlo.
- El aplicador se corrigió para eliminar separaciones residuales y se comprobó idempotente: dos ejecuciones consecutivas producen el mismo SHA-256 de `index.html`.

### 6. Unificación visual de todos los menús (incremento actual)

- Se compararon en navegador los estilos calculados de 1930 y Somos. La interfaz adopta los tokens Ceibal verificados del libro de referencia: superficie carbón `#242424`, superficie profunda `#1b1b1b`, activo institucional `#008078`, borde activo `#66c6c0` y texto claro accesible.
- Barra principal, reproductor, Herramientas, Índice y Glosario comparten ahora radios, bordes, sombras, foco, estados activos y estados deshabilitados. Los paneles laterales miden 18 rem y se anclan al borde correspondiente; el reproductor conserva el ancho máximo de 44 rem y no se superpone con ellos.
- Los paneles del runtime se clasifican al aparecer y reciben un encabezado consistente con título y cierre de 44 px. Se conserva el runtime como fuente de estado; no se reemplazaron sus controles internos ni se copiaron selectores específicos de contenido de 1930.
- En móvil se mantiene la presentación documentada: Índice y Herramientas conservan rótulo cuando hay espacio, el reproductor usa cinco controles de 44 px y Herramientas reduce su altura para no cubrir el reproductor.
- Se mantuvo la excepción comprobada de Somos: una única voz informativa. No se añadió el selector de dos voces de 1930 ni se conservaron controles ajenos a su contrato de Herramientas.
- El interruptor conserva un objetivo táctil de 44 × 44 px, pero su foco visible se dibuja sobre el carril de 40 × 24 px. Así se evita el aro circular sobredimensionado del control nativo sin perder accesibilidad ni área de pulsación.
- Los interruptores adaptados anulan el `translate` compuesto que aporta el runtime y usan un único desplazamiento de 16 px para el pulsador. Esto mantiene dentro del carril los estados encendidos de Lectura en voz alta, Reproducción automática, Descripción de imágenes y Preferencias.
- Las cuatro páginas `qz` conservan el inicio vertical y el desplazamiento interno de las actividades, pero centran horizontalmente su sección `activity_quiz` en el área útil. La excepción evita heredar el alineado izquierdo general aplicado a otras actividades.
- El encabezado del Glosario reserva tres columnas estables de 44 px, espacio flexible y 44 px. El regreso a Herramientas conserva su nombre accesible, pero muestra solo la flecha para impedir que el texto compita con el título y el cierre dentro del panel de 288 px.
- `assets/config.json` usa `bundleVersion: somos-ger-4` para invalidar tanto solicitudes antiguas de los mapas localizados como los 404 que Chrome pudo almacenar para la versión 3. Se verificó que `content/i18n/es-UY/audios.json` existe, está declarado en SCORM y responde por servidor; esto descartó el mapa principal como origen del 404. La primera auditoría automatizada cubría mensajes JavaScript, pero no los errores de red de recursos opcionales que Chrome muestra directamente.
- Se añadieron los dos recursos opcionales que el runtime solicita al inicializar voz: `audio_voices.json` declara solo la voz primaria Predeterminada y `timecode_voices.json` declara mapas primario y secundario vacíos, coherentes con el `timecode_output.json` vacío de este libro. Ambos quedan incluidos en servidor, SCORM y preloader offline para eliminar los 404 sin inventar una segunda narración.
- Para reducir el intervalo en blanco entre páginas, cada documento inicia desde el `head` la precarga versionada del runtime de 8,75 MB. La precarga de las páginas anterior y siguiente que ya genera el runtime se conserva sin duplicarla. El revelado estable existente también se mantiene: recalcula la reserva inferior y espera dos cuadros de animación antes de mostrar el contenido, evitando recuperar el salto de escala que motivó la corrección anterior.

### 7. Arquitectura funcional de Herramientas (incremento actual)

- Se eliminó el segundo panel incompleto que mostraba `Consulta`, Glosario al comienzo y un acceso indirecto a `Configuración de lectura`. Herramientas es ahora el panel real del runtime reorganizado según el playbook.
- El orden visible es: `Apoyos para la lectura`, `Audio y voz`, `Preferencias`, `Atajos de teclado` y `Herramientas`. Glosario queda al final, no dentro de Consulta.
- Se conservaron únicamente funciones verificadas en `assets/config.json`, el playbook y la comparación visual: lectura en voz alta, reproducción automática, descripción de imágenes, resaltado, voz disponible, velocidad, ocultamiento automático de menús y Glosario. Volumen se retiró porque no forma parte de Herramientas en 1930 ni está documentado en el playbook.
- Reproducción automática y descripción de imágenes permanecen disponibles aunque la voz esté desactivada. Resaltado permanece visible, pero deshabilitado y con una explicación hasta activar Lectura en voz alta, tal como exige el playbook. Los controles sustitutos conservan la selección pendiente y la transfieren a los controles nativos cuando se activa la lectura; no reemplazan el estado real cuando el runtime ya lo expone.
- Los atajos visibles y operativos son `X` para Índice, `A` para Herramientas, `G` para Glosario y `Esc` para cerrar. `G` se ignora en campos, formularios, contenido editable e interacciones marcadas como actividad, y no cierra el Glosario si se pulsa nuevamente.
- Glosario sustituye temporalmente a Herramientas. Su cabecera ofrece `Volver a Herramientas` y `Cerrar`; el regreso se verificó tanto en el popover de escritorio como en el sheet móvil del runtime.
- Se adaptaron explícitamente las dos estructuras que genera el runtime: `data-slot="popover-content"` en escritorio y `data-slot="sheet-content"` en móvil. La cabecera nativa duplicada queda oculta visual y semánticamente en ambas.
- No se añadieron tamaño de letra ni reducción de movimiento: el proyecto es de diseño fijo y su configuración declara esas preferencias bloqueadas. Tampoco se fabricó Lectura fácil (`easyRead: false`) ni una segunda voz.

## Decisiones que no se copiaron del libro 1930

- No se aplicó reflow ni maquetación multicolumna: este proyecto es un libro de composición fija y hacerlo rompería posiciones, ilustraciones y actividades.
- No se copió la barra específica de 1930. Se implementó el mismo contrato editorial de cinco posiciones sobre los selectores, estados, paneles y comportamiento responsive comprobados en este export.
- No se copiaron anchos, alturas, excepciones editoriales ni rutas del otro libro. El único ajuste de caja se obtuvo midiendo la página 9 de este proyecto.
- No se elevó de forma global todo el texto editorial a 16 px: una regla indiscriminada produciría solapamientos en el lienzo 595 × 595. Los mínimos de interfaz sí se verificaron por separado.

## Validaciones realizadas

### Revisión funcional final del 18 de agosto de 2026

- Se volvió a leer el playbook completo y se contrastó cada contrato aplicable con la implementación y con el libro 1930 en servidores locales separados (`5501` y `5503`). No se copiaron rutas, contenido, voces ni excepciones editoriales del libro de referencia.
- Se corrigió el foco inicial: Índice abre en `Cerrar Índice`, Herramientas en `Cerrar Herramientas` y Glosario en `Volver a Herramientas`. Escape devuelve el foco al disparador; volver desde Glosario lo devuelve a su botón dentro de Herramientas.
- Índice, Herramientas y Glosario son mutuamente excluyentes. Cinco ciclos completos de abrir, sustituir, volver y cerrar terminaron con cero diálogos residuales, una sola barra y cero errores de consola.
- La barra personalizada y el reproductor se montan como hijos directos de `body`. Esto impide que el runtime les herede accidentalmente `aria-hidden` al ocultar sus puentes nativos y garantiza que el primer clic tenga el mismo significado visual y accesible.
- Activar Lectura en voz alta cierra Herramientas, prepara la sesión sin reproducción automática y enfoca `Reproducir`. Reproducir cambia a `Pausar`; anterior y siguiente preservan la pausa; `Voz y velocidad` retorna el foco correctamente; `Detener` oculta el reproductor y enfoca el contenido.
- Una recarga con la sesión activa reconstruye los cinco controles en pausa y no genera `NotAllowedError`. La prueba de audio terminó sin errores de consola.
- El reproductor expone exactamente, y en ese orden: `Audio anterior`, `Reproducir/Pausar`, `Audio siguiente`, `Voz y velocidad` y `Detener`. En móvil los cinco objetivos midieron al menos 44 px de alto.
- El resaltado está visible pero deshabilitado con `aria-disabled="true"` mientras la voz está apagada, muestra el motivo y se habilita al activar la lectura.
- El atajo `G` abre Glosario una sola vez, una segunda pulsación no lo cierra, Escape regresa a Herramientas y escribir `g` en la búsqueda del Índice no dispara el atajo.
- A 320, 375, 480 y 566 px no hubo desborde horizontal. A 320 px se conservan iconos y nombres accesibles; a 375 px aparecen `Índice` y `Herramientas`; desde 480 px se muestran los rótulos completos. En 320 × 800, el panel móvil midió 288 × 720 px y todos los interruptores 44 × 44 px.
- La comparación de estilos calculados contra 1930 confirmó paneles de 288 × 640 px en escritorio, radio de 12 px, cierre de 44 × 44 px, superficie `#242424`, borde blanco al 10 % y selección `#008078` con borde `#66c6c0`. Las secciones adicionales de 1930 corresponden a funciones deshabilitadas en Somos y no se reprodujeron artificialmente.
- Una comprobación posterior directa del panel de 1930 confirmó que no contiene Volumen y que el playbook tampoco lo documenta. Se retiraron de Somos el deslizador, el porcentaje y toda su lógica/CSS específica; una regla del validador impide que ese control vuelva a introducirse accidentalmente.
- Se eliminó el salto de escala entre páginas siguiendo el principio de estabilización de 1930, adaptado al diseño fijo de Somos: el contenido permanece oculto durante el cálculo provisional, espera la altura real del dock, fuerza el ajuste definitivo y se revela dos frames después. La medición pasó de mostrar 528 px y luego 564 px a mantener ocultos los 528 px y mostrar únicamente los 564 px finales; cinco transiciones consecutivas confirmaron un único ancho visible. Un fallback de 1,5 segundos evita que un fallo del runtime pueda dejar el contenido oculto.
- Después de versionar y precargar el runtime, una secuencia local en navegador redujo la fase de apertura de documentos de 177–217 ms a 85–113 ms tras la primera carga. El montaje y ajuste posterior del runtime todavía requirió 95–169 ms; un clic real en `Siguiente` quedó listo y estable en 341 ms. En seis páginas consecutivas, incluida una de quiz, el rectángulo del contenido no cambió durante los 250 ms posteriores al revelado y la consola no registró errores. Estas cifras son diagnósticas del equipo local, no un presupuesto garantizado para todos los LMS.
- En `pg032033_sec001.html`, el fondo panorámico extraído conserva su rotación de 90° para formar la página vertical. Los recortes `pg032033_im001.jpg` y `pg032033_im002.jpg`, que ya estaban orientados verticalmente, dejaron de recibir una segunda rotación; así rostro, torso y piernas vuelven a coincidir con la figura de fondo. El validador cubre esta excepción editorial para evitar regresiones.
- La pestaña de páginas del Índice ya no muestra los rótulos redundantes `Imprimir página X` generados por el runtime a partir de `content/pages.json`. El adaptador elimina también ese fragmento de `aria-label` y `title`, conserva nombres accesibles como `Página 1 (Portada)` y no modifica la numeración ni los destinos.
- En `pg026027_sec001.html` se conservan la lámina vertical original, la ilustración central y todas sus líneas punteadas. La única adaptación visual es un aumento acotado de los veinte textos superpuestos, de 13/16 px a 16/19 px en las coordenadas originales.
- Se corrigió la composición del control `Activar lectura en voz alta`: rótulo e interruptor comparten una fila superior de 44 px y la descripción ocupa todo el ancho debajo. Esto evita que el interruptor se perciba asociado a una línea de la ayuda y conserva `aria-labelledby`, `aria-describedby` y el objetivo táctil completo.
- Rendimiento de cinco aperturas en caliente: Herramientas tuvo mediana de 315 ms e Índice de 319 ms en Somos, frente a 1040 ms y 1033 ms respectivamente en 1930, en el mismo navegador y equipo.
- El recorrido final de las 34 rutas encontró contenido visible en todas, una sola barra, tipografía Atkinson efectiva, cero controles personalizados bajo `aria-hidden` y cero desbordes horizontales.
- Una prueba de estabilidad de 30 segundos terminó sin diálogos, reproductor o capas residuales y sin errores de consola.
- La actividad `qz001` aceptó `Todas las personas` y anunció la devolución correcta en su región viva.
- La auditoría estática encontró 422 archivos MP3, 422 asociaciones de audio, cero archivos faltantes entre esas asociaciones, cero MP3 sin asociar y cero MP3 de tamaño cero. Hay 423 entradas de texto/narración: la pregunta `qz003_que` no tiene audio asociado ni archivo MP3 en este proyecto o en la fuente de Desktop.

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
- Herramientas verificado con las cinco secciones documentadas, Glosario al final y los atajos visibles `X`, `A`, `G`, `Esc`.
- Atajo `G` y botón Glosario verificados; `Volver a Herramientas` elimina el Glosario antes de reconstruir Herramientas. El atajo `X` desde Herramientas deja un único Índice abierto.
- Preferencias condicionadas verificadas con lectura en voz alta activa e inactiva; resaltado permanece visible pero deshabilitado hasta activar la voz, y los controles transferibles conservan su selección.
- Recorrido HTTP automatizado de los 34 HTML con `data-project-adaptations="somos-ger-54"`, barra disponible y cero desborde horizontal.
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
- El paquete contiene 422 MP3 y sigue siendo pesado. No se recomprimieron audios para evitar pérdida de calidad o desincronización de texto a voz.
- La entrada de narración `qz003_que` carece de asociación y archivo de audio. No se fabricó una pista: para una cobertura de audio íntegra debe grabarse, aprobarse editorialmente y añadirse al mapa de audio.
- El simulador cubre el contrato SCORM, pero no sustituye una importación final en el LMS de destino. Antes de producción se recomienda importar el ZIP en ese LMS y verificar persistencia, reanudación y reporte de puntuación.
- Los archivos `base.bundle.local.js` y `base.bundle.min.js` se conservaron sin cambios. Una actualización futura del runtime debe volver a ejecutar las herramientas y la batería del navegador.
- Los sustitutos de preferencias dependientes de voz mantienen cambios pendientes durante el documento actual. El runtime sigue siendo la fuente definitiva al activar la voz; una actualización de su montaje condicional debe revalidar esta transferencia.

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
