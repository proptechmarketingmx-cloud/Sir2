# Sistema de Inteligencia de Redes (SIR)

¡Bienvenido al **Sistema de Inteligencia de Redes (SIR)**! Esta es una plataforma analítica basada en grafos diseñada para visualizar, interactuar y evaluar ecosistemas complejos de relaciones profesionales, alianzas de negocios y dinámicas comunitarias.

A diferencia de un CRM tradicional que registra historiales de ventas, el SIR calcula en tiempo real la influencia de las entidades, descubre comunidades aisladas e integradas, mapea rutas estratégicas de introducción de contactos y alerta sobre puntos críticos de dependencia o cuellos de botella en la red.

---

## 🚀 Características Principales

1. **Visualización Interactiva en Tiempo Real**:
   - Representación en lienzo con simulación de físicas impulsada por **Vis-Network**.
   - Los nodos varían de tamaño proporcionalmente a su **Índice de Influencia (0-1000)**.
   - El color de los nodos indica su rango (de *Nodo Nuevo* gris a *Supernodo* rojo).
   - Los halos brillantes demuestran la actividad e interacciones recientes en los últimos meses.
   - El grosor de las líneas representa el peso activo de la relación, y su opacidad indica el decaimiento temporal.

2. **Cálculo Avanzado de Influencia**:
   - Ponderación de 7 factores: Conexiones totales (25%), Diversidad de tipos (20%), Calidad de relaciones (15%), Influencia de vecinos (15%), Antigüedad (10%), Actividad reciente (10%), y Centralidad (5%).

3. **Inteligencia de Red Incorporada**:
   - **Buscador de Intermediarios (Pathfinder)**: Algoritmo Dijkstra adaptado para buscar el camino más corto de mayor confianza y fuerza entre dos entidades distantes, permitiendo resolver preguntas como: *¿Quién puede presentarme con X?*
   - **Detección Automática de Comunidades**: Algoritmo de Propagación de Etiquetas (LPA) para segmentar el ecosistema en clusters de interés con un solo clic.
   - **Recomendación de Alianzas**: Escaneo de vecinos de segundo grado para proponer colaboraciones de alto potencial.
   - **Detección de Riesgos**: Advertencias de cuellos de botella para entidades que acumulan centralidad excesiva.

4. **Operabilidad Completa (CRUD & Datos)**:
   - Panel de edición para crear, actualizar y eliminar nodos y relaciones en vivo.
   - Persistencia local automática en el navegador (**LocalStorage**).
   - Utilidades de **Importación / Exportación** en formato JSON para transferir redes de grafos de manera consistente.
   - La red arranca vac�a para que puedas cargar o crear tus propios datos desde cero.

---

## 📂 Estructura del Código

El proyecto es una aplicación web SPA estática organizada de la siguiente manera:
- **`index.html`**: Diseño estructural de la interfaz de usuario, paneles laterales divididos por pestañas, y controles del lienzo.
- **`style.css`**: Estilo estético premium con soporte de modo oscuro, glassmorphism, badges personalizados, formularios reactivos y banners informativos.
- **`database.js`**: Gesti�n del almacenamiento local y del estado vac�o inicial del grafo.
- **`algorithms.js`**: Motor matemático y algorítmico (cálculo de influencia multifactorial, Brandes para centralidades, LPA para comunidades y Dijkstra para pathfinding).
- **`app.js`**: Controlador de eventos de interfaz, inicializador de Vis.js, sincronización de formularios, búsquedas y animaciones en el grafo.

---

## 🛠️ Instrucciones de Ejecución

Al ser una SPA estática, no requiere instalación de dependencias externas en el servidor. Puedes ejecutarla de las siguientes maneras:

### Opción 1: Apertura Directa
Simplemente haz doble clic en `index.html` o ábrelo en cualquier navegador web moderno (Chrome, Edge, Firefox, Safari).

### Opción 2: Servidor Local Rápido
Si deseas servirlo mediante HTTP para evitar restricciones estrictas de archivos locales en ciertos navegadores:

**Usando Python 3:**
```bash
python -m http.server 8000
```
Luego navega a [http://localhost:8000](http://localhost:8000).

**Usando Node.js (con http-server):**
```bash
npx http-server -p 8000
```
Luego navega a [http://localhost:8000](http://localhost:8000).



---

## Demo y Capturas

- Demo en vivo: pendiente de publicaci�n en GitHub Pages u otro host est�tico.
- Captura o GIF: pendiente de agregar para mostrar el grafo interactivo desde la portada.
