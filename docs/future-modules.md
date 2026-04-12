# Módulos futuros de Vantage

Lista de módulos pendientes de implementar. No tocar hasta que se pida expresamente.

---

## 1. OCR de tickets y facturas → alta automática de gasto

**Problema que resuelve:** meter gastos a mano es tedioso y se acaba abandonando. Con una foto del ticket debería bastar.

**Flujo deseado:**
1. Botón "Añadir gasto desde foto" en el módulo de gastos (y drag&drop de imagen/PDF).
2. La imagen se procesa y se extrae: comercio, fecha, total, método de pago (si aparece) y líneas de producto.
3. Se pre-rellena el formulario de gasto existente para que el usuario solo confirme.
4. La imagen original se guarda como adjunto del gasto (sirve de respaldo para garantías y devoluciones).
5. Soporte para subir varias imágenes de golpe (batch).

**Opciones técnicas:**
- **OCR local gratuito:** Tesseract.js (sin dependencia de internet, peor precisión en tickets arrugados).
- **LLM multimodal (recomendado):** Claude o GPT-4 vision vía API. Mejor precisión, entiende tickets desestructurados y extrae JSON directamente. Coste por ticket bajo.
- **Híbrido:** Tesseract para texto plano + LLM solo cuando la confianza es baja.

**Proyectos de referencia en GitHub (para copiar ideas, no forkear):**
- https://github.com/1oannis/budget-lens — scanner self-hosted con IA, caso de uso casi idéntico.
- https://github.com/Receipt-Wrangler/Receipt-Wrangler — multi-usuario, subida desde email/web/móvil, reparto de gastos.
- https://github.com/JustCabaret/AIReceiptParser — OCR + GPT-4 minimal, buen esqueleto.
- https://github.com/HelgeSverre/receipt-scanner — parser con LLM para imágenes y PDFs.

**Consideraciones:**
- Guardar las imágenes en el directorio de datos de Electron (`app.getPath('userData')`), no en el bundle.
- Añadir campo `attachmentPath` al modelo de Transaction si no existe.
- Para el LLM, que la API key se configure en Settings y se guarde cifrada.
- Detectar duplicados: si ya existe un gasto con mismo comercio + fecha + total, avisar antes de crear otro.
- Categorización automática: sugerir categoría basándose en el comercio (Mercadona → Alimentación, etc.).

**Ampliación futura:** subida de ticket desde el móvil (app companion o endpoint HTTP local + QR en la app de escritorio para escanear desde el móvil y subir a la misma red).

---

## 2. Comparador de precios de supermercados ("Mi cesta")

**Problema que resuelve:** no sabemos dónde comprar cada cosa más barata, y los precios cambian. Queremos que Vantage nos diga pasivamente dónde ahorrar.

**Flujo deseado:**
1. Nueva pantalla "Mi cesta" con una lista de productos habituales (20-50 productos que compramos siempre).
2. Cada producto está vinculado a su equivalente en Mercadona, Carrefour y Dia.
3. Un job programado (diario o semanal) consulta los precios actuales y los guarda con fecha.
4. Vista resumen:
   - "Esta semana la cesta completa es X € más barata en [súper]."
   - Lista de la compra dividida por súper si comprar en varios sale a cuenta.
   - Alertas si un producto sube >10 % respecto al promedio de los últimos 3 meses.
   - Gráfica histórica de precio por producto (muy útil para ver la inflación real de la cesta propia).
5. Integración con el módulo de gastos: cruzar gastos reales de alimentación con la cesta estimada para ver cuánto se ahorró/perdió.

**Proyectos de referencia en GitHub:**
- https://github.com/DavidRCh56/Scraper_Mercadona_Dia_Carrefour — **el mejor candidato**. Usa las APIs públicas de los tres súpers, ya estructurado con pandas. Base ideal para portar a Node/TS.
- https://github.com/joseluam97/Supermarket-Price-Scraper — Mercadona, Carrefour y Dia a Excel.
- https://github.com/vgvr0/supermarket-mercadona-scraper — solo Mercadona, pero muy limpio.
- https://github.com/vgvr0/dia-supermarket-scraper — solo Dia.
- https://github.com/nicolaspascual/mercadona-scrapper — solo Mercadona.
- https://github.com/GeiserX/awesome-spain — lista curada de proyectos open source españoles (por si aparecen más súpers o APIs oficiales).

**Consideraciones técnicas:**
- Los tres súpers tienen APIs internas documentadas por la comunidad. Mercadona requiere un código postal. Hay que respetar rate limits razonables (no martillear).
- El scraping debe correr en el proceso main de Electron (no en el renderer) para evitar CORS.
- Programar el job con `node-cron` o equivalente, configurable desde Settings (frecuencia, hora).
- Esquema de datos:
  - `CartProduct { id, alias, notes }`
  - `ProductMapping { cartProductId, supermarket, productId, name, unit }`
  - `PriceHistory { productMappingId, price, pricePerUnit, timestamp, available }`
- El mapeo producto→producto entre súpers es el punto frágil: lo hace el usuario manualmente la primera vez (buscador dentro de la app). Se puede sugerir con similitud de texto.
- Cache: no consultar más de una vez al día por producto salvo que el usuario lo fuerce.

**Ampliación futura:**
- Generación automática de la lista de la compra óptima desde un menú semanal (conecta con futuro módulo de planificador de comidas).
- Alertas push/notificación nativa Electron cuando un producto favorito baja de un precio objetivo.
- Estimación del ahorro anual de la familia basado en el histórico.

---

## Notas de implementación general

- Ambos módulos deben encajar en el patrón actual de screens/repositories de Vantage.
- Añadir entradas en el Home como tarjetas del hub central.
- Respetar la regla de trabajar siempre desde el repo principal (no worktrees).
- Cuando se retomen, preguntar antes de empezar cuál de los dos primero.
