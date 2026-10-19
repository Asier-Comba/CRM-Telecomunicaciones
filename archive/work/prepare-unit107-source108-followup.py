from pathlib import Path
w=Path('work');s='''$ErrorActionPreference='Stop'
. ./work/CrmGitHub.ps1
$c=Invoke-CrmApi '/issues/comments/6256878070'
if(-not $c.body.Contains('FOLLOWUP108_PAGE_ERROR_RECOVERY')){
 $c.body|Set-Content work/w2x-unit107-handoff-before-source108-followup.md -Encoding utf8
 $extra="`n`nFOLLOWUP108_PAGE_ERROR_RECOVERY: posteriormente se reprodujo sobreproducto e8b45e225760b372d4e2600e06abd0284befcd19 el bloqueo de Anterior tras403de página2 enServicios/Comunicaciones (2FAIL4PASS46,2s390). Corrección en fuente SEPARADA108 ee157165f1cd4e9fd3d5ad4c72d5f2b9025ef467,45PASS1,1min/build66/18capturas/publicada,handoff6256971299. Se conservancontroles originales107metadataNOT_RUN yfuente10621sinatribuirfix108. Los dos blobs de producto106 y107 son idénticos:es inferencia de identidad estática,no nuevaejecución física106;2214source106noincluye18casos nuevos nieste arreglo. PAR056continúaPARTIAL/seguridadNOT_RECONCILED,releaseNOT_ACCEPTED."
 $null=Invoke-CrmApi '/issues/comments/6256878070' Patch @{body=($c.body+$extra)}
}
''';(w/'amend-unit107-source108-followup.ps1').write_text(s,encoding='utf-8-sig')
