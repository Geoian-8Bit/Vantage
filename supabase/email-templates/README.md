# Email templates de Supabase (español)

Plantillas HTML traducidas al español con el branding de Vantage (granate `#7A1B2D` + dorado `#C9A84C`). Los templates no se cargan automáticamente: hay que pegarlos en el dashboard de Supabase.

## Por qué están aquí y no en código

Supabase Auth envía los emails de confirmación, reset de contraseña y cambio de email **desde sus servidores**, no desde la app. Por eso los templates se configuran en su dashboard y no en este repo. Lo que sí va en el repo es la **fuente de la verdad** del HTML, para que cualquier cambio se versione y se pueda volver a pegar si se pierde.

## Cómo aplicarlos

Hazlo **dos veces**: una en `vantage-dev` y otra en `vantage` (prod) cuando todo esté validado.

1. Entra al dashboard del proyecto → **Authentication** → **Emails** → **Email Templates**.
2. Para cada template de la tabla de abajo:
   - Selecciona el template en el desplegable.
   - Cambia el **Subject heading** por el de la tabla.
   - Borra el HTML por defecto del editor y pega el contenido del `.html` correspondiente.
   - Pulsa **Save changes**.
3. Verifica que la variable usada en cada `.html` coincide con la que Supabase ofrece a la derecha del editor (las variantes con `{{ .ConfirmationURL }}` son las recomendadas frente a `{{ .Token }}`/`{{ .TokenHash }}`).

| Template en Supabase | Subject (asunto) | Archivo HTML |
| --- | --- | --- |
| Confirm signup | Confirma tu cuenta de Vantage | `confirm-signup.html` |
| Reset Password | Restablece tu contraseña de Vantage | `reset-password.html` |
| Change Email Address | Confirma el cambio de email de tu cuenta | `change-email.html` |

Los otros templates (Magic Link, Invite, Reauthentication) no los usamos en la app, así que puedes dejarlos en el default por ahora.

## Cómo probar

Tras pegar y guardar:

1. **Confirm signup**: ve a `/signup` y crea una cuenta con un email real (gmail temporal vale). Revisa la bandeja.
2. **Reset password**: ve a `/forgot-password`, mete tu email y revisa la bandeja.
3. **Change email**: dentro de la app → Settings → cambiar email. Llegan **dos** correos: uno al email viejo y otro al nuevo.

Revisa también la versión móvil del email (Gmail iOS/Android) — el HTML está pensado con tablas y CSS inline para que renderice igual en clientes viejos (Outlook incluido).

## Cuando modifiques un template

1. Edita el `.html` aquí en el repo (es la fuente de la verdad).
2. Repite el paso 2 de "Cómo aplicarlos" para ese template, en `vantage-dev` y luego en `vantage`.
3. Commit del cambio del `.html` para que quede registrado.

## Variables disponibles

Las que usamos en estos templates:

- `{{ .ConfirmationURL }}` — URL completa de acción (botón principal y enlace de respaldo).
- `{{ .Email }}` — email actual del usuario (solo en *Change Email*).
- `{{ .NewEmail }}` — email nuevo al que se quiere cambiar (solo en *Change Email*).

Otras que ofrece Supabase pero no usamos: `{{ .Token }}`, `{{ .TokenHash }}`, `{{ .SiteURL }}`, `{{ .RedirectTo }}`.
