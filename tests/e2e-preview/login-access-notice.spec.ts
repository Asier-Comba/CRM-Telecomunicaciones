import {test,expect} from '@playwright/test'

test('restricted staging access has a persistent visible notice after the login query is consumed',async({page},info)=>{
 const submissions:string[]=[]
 page.on('request',r=>{if(r.method()==='POST')submissions.push(new URL(r.url()).pathname)})
 await page.goto('/login?error=staging_access_denied')
 const notice=page.getByRole('alert',{name:'Acceso restringido al entorno',exact:true})
 await expect(notice).toBeVisible()
 await expect(notice).toContainText('Esta cuenta no tiene acceso a este entorno de prueba')
 await expect(notice).toContainText('Inicia sesión con una cuenta autorizada o consulta con el responsable.')
 await expect(page).toHaveURL(/\/login$/)
 await expect(page.getByLabel('Contraseña',{exact:true})).toBeEnabled()
 await expect(page.getByRole('button',{name:'¿La has olvidado?',exact:true})).toBeEnabled()
 expect(submissions).toEqual([])
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
 await page.screenshot({path:info.outputPath('restricted-access-visible.png'),fullPage:true})
})

test('ordinary login has no false restricted-access alert',async({page})=>{
 await page.goto('/login')
 await expect(page.getByLabel('Contraseña',{exact:true})).toBeEnabled()
 await expect(page.getByRole('alert',{name:'Acceso restringido al entorno',exact:true})).toHaveCount(0)
})

test('unknown access-query text is not reflected as an access notice',async({page})=>{
 const marker='UNRECOGNIZED_SYNTHETIC_ERROR_MARKER'
 await page.goto('/login?error='+marker)
 await expect(page.getByLabel('Contraseña',{exact:true})).toBeEnabled()
 await expect(page.getByRole('alert',{name:'Acceso restringido al entorno',exact:true})).toHaveCount(0)
 await expect(page.getByText(marker,{exact:false})).toHaveCount(0)
})
