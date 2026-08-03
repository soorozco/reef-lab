# Reef Lab

App de una sola página para gestionar la química de un acuario marino de arrecife
con **Balling de dos partes y sales a granel**, más el seguimiento de los corales.
Sin dependencias ni backend: los datos viven en tu navegador.

Interfaz según la dirección **Modernist** del proyecto de diseño
(`Reef Lab - Panel.dc.html`): plano, todo en Archivo, retícula visible con reglas
de 2 px, esquinas sin radio, tinta `#201e1d` sobre `#f3f2f2` y un único acento rojo
`#ec3013` para la acción principal y para lo que está fuera de rango.

## Cómo abrirlo

Doble clic en `index.html`, o mejor con un servidor local (habilita IndexedDB para
las fotos, sin el límite de 5 MB de localStorage):

```bash
cd ~/Reef && python3 -m http.server 8123
```

Luego abre http://localhost:8123

## Pantallas

- **Panel** — consumo actual, avisos y los parámetros normalizados a 35 ppt.
- **Plan** — la salida principal: dosis diaria de mantenimiento de cada parte, correcciones
  puntuales repartidas en días, horario que separa A de B, y la justificación de cada número.
- **Parámetros** — registro de mediciones (parciales permitidas), historial y gráficas.
  Incluye la superposición **KH + Ca** con doble eje escalado a 7.15:1 para ver el desacoplamiento.
- **Soluciones** — soluciones madre con concentración, efecto por ml y autonomía;
  catálogo de sales con hidrato, grado y CoA; instrucciones de preparación paso a paso.
- **Corales** — ficha con fotos y bitácora de progreso.
- **Mantenimiento** — cambios de agua y renovación semanal/mensual.
- **Calculadoras** — corrección en seco, salinidad ↔ densidad, preparar agua salada,
  hornear bicarbonato y dilución por cambio de agua.
- **Ajustes** — volúmenes, objetivos, horarios, rangos, respaldo y autoverificación.

## Estructura

```
index.html          shell + CSS Modernist
js/core.js          estado, catálogo de sales, fotos, utilidades
js/quimica.js       conversiones, consumo, plan, reglas de seguridad, autotests
js/graficas.js      SVG a mano: sparklines, series y doble eje KH/Ca
js/v-plan.js        Panel y Plan
js/v-parametros.js  mediciones e historial
js/v-soluciones.js  soluciones, sales y preparación
js/v-otros.js       corales, mantenimiento, calculadoras, ajustes
js/app.js           modal, navegación, eventos
```

## Química

Constantes: `1 dKH = 0.357 meq/L = 17.848 ppm CaCO₃`, `1 meq/L = 2.80 dKH`,
acoplamiento `1 dKH ↔ 7.15 ppm Ca`. Todos los cálculos usan el **volumen neto**.

Las lecturas iónicas (KH, Ca, Mg) se **normalizan a 35 ppt** antes de compararlas
con los objetivos; la app muestra siempre el valor medido junto al normalizado.

Cuando el hidrato de una sal no está confirmado, la app calcula con la **forma anhidra**,
la más concentrada, para que te quedes corto en vez de pasarte.

Los ocho casos de referencia del encargo se recalculan en **Ajustes → Autoverificación**
cada vez que se abre la pantalla.

## Datos

`localStorage` para los registros e IndexedDB para las fotos (con respaldo a
`localStorage`). Son locales a este navegador: **exporta un respaldo** desde Ajustes.

Las fotos de corales se muestran **en color**, apartándose del sistema de diseño
—que pide `.grayscale` en toda fotografía— porque la coloración es justo el dato
que se está siguiendo. El marcador de posición sí conserva el tramado gris.
