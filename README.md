# Orientación Proyecto IoT · 6to año 2026

Mini web de orientación para el Proyecto Institucional Smart Campus IoT.

- **Ruta A · Dashboard:** demo en vivo en tema oscuro para cada nodo (aire, luz, ruido, presencia, consumo, suelo, red), anatomía del tablero, umbrales del semáforo, reglas de tema oscuro, paleta, íconos SVG, ejemplos MQTT y un prompt para pedirle a Claude la primera versión.
- **Ruta B · Documentación:** cómo armar la carpeta del proyecto con la [plantilla de la profe](https://lpedaci.github.io/sexto-proyecto2026/). Si el equipo ya tiene documentos, un prompt para que Claude arme la web de documentación a partir de ellos; si no, el paso a paso manual. Incluye el mapa de los 17 apartados.
- **Tablero general (`tablero-general.html`):** maqueta de referencia de la landing del tablero central, con los 7 nodos en tiempo real (simulado), mapa del campus, semáforo por sector, mapa de calor, alertas en vivo y equipos con acceso a cada dashboard. Se abre desde el menú y desde la sección "Tablero central" de la guía.
- **Control final:** listas de control de calidad para el dashboard y la documentación.

Son dos páginas estáticas (`index.html` y `tablero-general.html`), sin dependencias. Para publicarlo: **Settings → Pages → Branch `main` → `/ (root)`**.
