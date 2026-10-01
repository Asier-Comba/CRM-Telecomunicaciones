# Abrir el preview en Windows

Instala **Node24** y Git (o GitHub Desktop). Necesitas acceso al repositorio.
No necesitas claves, Supabase, Docker ni `.env.local` para esta demostración.
`127.0.0.1` apunta al ordenador que ejecuta el servidor: un servidor de ChatGPT
Work no se abre con esa dirección desde tu portátil.

Esta rama `w4/preview-hardening-v1` es una candidata de tooling y seguridad,
pendiente de revisión W2/W3. El preview original PR21@e374cedd tiene aprobación
W4 para pruebas sintéticas: PR21 comentario5917126784. Ninguno es producción.

## A. Git y PowerShell / terminal

Si todavía no tienes el repositorio:

```powershell
git clone https://github.com/Asier-Comba/CRM-Telecomunicaciones.git
cd CRM-Telecomunicaciones
```

Desde esa carpeta:

```powershell
git fetch --all --prune
git switch w4/preview-hardening-v1
node --version
npm run preview:setup -- --install --open
```

Node debe mostrar `v24.x`. `--install` autoriza expresamente `npm ci` local;
`--open` intenta abrir el navegador después de arrancar. También puedes usar:

```powershell
npm ci
npm run preview:doctor
npm run preview:dev
```

## B. GitHub Desktop

File → Clone repository → URL → pega la URL anterior. Selecciona
`w4/preview-hardening-v1` en Current Branch y abre Repository → Open in terminal.
Ejecuta `npm run preview:setup -- --install --open` en esa carpeta.

Cuando salga **CRM Telecom synthetic preview ready**, abre
http://127.0.0.1:3107/login y pulsa **Ver demo telecom**. Mantén la terminal abierta;
Ctrl+C detiene el servidor. Si el navegador no se abre automáticamente, copia la URL.

Si falla: `npm run preview:doctor`. Puerto ocupado: detén el otro servidor o usa
`$env:PREVIEW_PORT="3109"` y vuelve a ejecutar; el launcher imprimirá la URL exacta.
No cambia ramas ni instala software global. No compartas logs con credenciales.

Prueba Dashboard, Clientes, Customer360, Oportunidades, Calendario y Asistente READ.
Solo datos inventados; no IA en vivo, archivos, ZIP, envíos ni escrituras. Staging y
producción siguen bloqueados. Para volver al preview original aprobado, selecciona
`w3/telecom-readonly-integration-v1`, ejecuta `npm ci` y `npm run preview:dev`.
