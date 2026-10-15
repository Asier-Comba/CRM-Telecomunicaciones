# Asignación SIM/eSIM: comprobar de nuevo la línea seleccionada

CLAIM6203419872. Base ddcffe793b46c3024c1a762d094c8359d1ab9b82;global1155 de esa fuente sigue separado y no cubre este nuevo defecto.

Reproducción original:6FAIL físicas/eSIM en390/768/1440. Primera líneaA apta;seleccionarB cuya comprobación queda pendiente;volverA con una nueva consulta pendiente. La validaciónA anterior permanecía y habilitaba Revisar asignación. Esperado deshabilitado,observado habilitado;antes de comando. El fixture modela snapshot de línea actual versión2 frente opción antigua1, sin atribuir un escritor ni efecto SQL. Los parsers/identidades/relaciones reales validan los DTO.

Al seleccionar o actualizar líneas se retira la validación anterior y su error antes de cambiar la selección. Durante la nueva comprobación se muestra estado explícito. Si la lectura actual no es apta se explica cómo actualizar las opciones. La guarda ya existente de versión y elegibilidad se conserva. No cambia helper, repositorio, CAS ni backend;el servidor mantiene su autoridad.

El flujo final requiere A→B→A pendiente bloqueado, versión incompatible bloqueada con aviso, actualizar opciones y seleccionarA versión2 apta, propuesta exacta con expected_line_version2,una denegación403 cancelable y ningún comando previo. Se incluyen regresiones SIM de carga/refresco/sustitución/contexto. Tres estados visuales por tipo y ancho. HTTP controlado, no Auth/JWT/RLS/DB ni asignación persistida o provisión externa.

No se heredan1155/114/120 entre fuentes. CincoHIGH/W4/ACKprincipal pendientes,IA writesOFF,modeloNOT_RUN/API0,issue10OPEN,releaseNOT_ACCEPTED. Se conservan originales de producto y refinamientos de fixture anteriores por intento.
