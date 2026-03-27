# Roadmap de Vantage

## Fase 1 - MVP (.exe local) ← ACTUAL
**Objetivo:** App de escritorio portable para registrar gastos e ingresos.

- [ ] Inicializar proyecto Electron + React + Vite + TypeScript
- [ ] Configurar SQLite con better-sqlite3
- [ ] Modelo de datos: transacciones (id, monto, tipo ingreso/gasto, descripción, fecha)
- [ ] Pantalla principal: lista de transacciones + balance total
- [ ] Formulario para añadir gasto o ingreso
- [ ] Eliminar transacciones
- [ ] Build como .exe portable (electron-builder, modo portable/directory)
- [ ] Verificar que al copiar la carpeta a otro PC funciona

## Fase 2 - Categorías y filtros
**Objetivo:** Organizar los gastos por categoría y ver por períodos.

- [ ] Tabla de categorías en SQLite
- [ ] Asignar categoría al crear transacción
- [ ] Categorías por defecto (comida, transporte, ocio, etc.)
- [ ] Categorías personalizables (crear, editar, eliminar)
- [ ] Filtro por período: mensual, trimestral, anual
- [ ] Filtro por categoría
- [ ] Búsqueda por descripción

## Fase 3 - Analíticas
**Objetivo:** Visualizar los datos con gráficos.

- [ ] Gráfico de gastos por categoría (circular/barras)
- [ ] Tendencia mensual de ingresos vs gastos (líneas)
- [ ] Resumen de balance por período
- [ ] Dashboard con métricas clave

## Fase 4 - Servidor + acceso web/móvil
**Objetivo:** Acceder a los datos desde cualquier dispositivo vía navegador.

- [ ] Backend API (Express o Fastify) + PostgreSQL
- [ ] Autenticación de usuario
- [ ] Servir el frontend React como web app
- [ ] Implementar RemoteTransactionRepository (API HTTP)
- [ ] Sincronización o migración de datos locales al servidor
- [ ] Acceso desde móvil vía navegador

## Fase 5 - OCR de facturas
**Objetivo:** Fotografiar una factura y crear el gasto automáticamente.

- [ ] Captura/subida de foto de factura
- [ ] Integración OCR (Tesseract u otro)
- [ ] Extracción automática: monto, fecha, concepto
- [ ] Revisión y confirmación antes de guardar

---

## Estado actual
**Fase activa:** Fase 1 - MVP
**Último cambio:** 2026-03-27
