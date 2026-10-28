import {test,expect} from '@playwright/test'
import {startDocumentsFixture} from '../../tools/asier_documents_pro/fixture.cjs'
import type {FolderNavigationView} from '../../src/features/documents/FolderNavigation'
let server:{url:string;close:()=>Promise<void>}
test.beforeAll(async()=>{server=await startDocumentsFixture({folderNavigation:true,strict:true})})
test.afterAll(async()=>{await server?.close()})
const ready=(scope='synthetic-A'):FolderNavigationView=>({scope,status:'ready',nodes:[{id:'first',label:'Carpeta actual',hasChildren:false,expanded:false,childrenState:'ready',children:[]}],breadcrumbs:[],selected:{kind:'all'},partial:false,hasMore:false})

for(const width of [390,768,1440])test(`controlled folder disclosure navigation at${width}, callbacks and native keyboard without API`,async({page},info)=>{
 await page.setViewportSize({width,height:960});let api=0;page.on('request',request=>{if(request.url().includes('/api/'))api++})
 await page.goto(server.url+'/documents');if(width<1024)await page.getByRole('button',{name:'Mostrar carpetas',exact:true}).click()
 await page.getByRole('button',{name:'Sin clasificar',exact:true}).click();await expect(page.getByRole('button',{name:'Sin clasificar',exact:true})).toHaveAttribute('aria-pressed','true')
 await page.getByRole('button',{name:'Desplegar Comercial',exact:true}).focus();await page.keyboard.press('Space');await expect(page.getByRole('button',{name:'Contratos',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Comercial',exact:true}).focus();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Contratos',exact:true})).toBeFocused();await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'Contratos',exact:true})).toHaveAttribute('aria-current','page')
 await page.keyboard.press('Shift+Tab');await expect(page.getByRole('button',{name:'Comercial',exact:true})).toBeFocused()
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:info.outputPath(`folder-presentation-${width}.png`)})
 if(width<1024){await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Mostrar carpetas',exact:true})).toBeFocused();await expect(page.getByRole('navigation',{name:'Carpetas',exact:true})).toBeHidden()}
 expect(api).toBe(0)
})
test('current role withdraws old folder labels and controls',async({page})=>{
 await page.goto(server.url+'/documents')
 for(const role of ['member','viewer','unknown']){await page.evaluate(value=>window.folderFixtureSetState({role:value}),role);await expect(page.getByText('Carpetas disponibles para administradores del espacio.',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Todos los documentos',exact:true})).toHaveCount(0);await expect(page.getByText('Comercial',{exact:true})).toHaveCount(0)}
})
test('scope change and a later old view never render the previous hierarchy',async({page})=>{
 await page.goto(server.url+'/documents');await page.evaluate(()=>window.folderFixtureSetState({scope:'synthetic-B'}));await expect(page.getByRole('status',{name:'Estado de carpetas',exact:true})).toHaveCount(1);await expect(page.getByRole('status',{name:'Estado de carpetas',exact:true})).toHaveText('Cargando carpetas…');await expect(page.getByText('Comercial',{exact:true})).toHaveCount(0)
 await page.evaluate(view=>window.folderFixtureSetState({view}),ready('synthetic-B'));await expect(page.getByRole('button',{name:'Carpeta actual',exact:true})).toBeVisible()
 await page.evaluate(view=>window.folderFixtureSetState({view}),ready('synthetic-A'));await expect(page.getByRole('status',{name:'Estado de carpetas',exact:true})).toHaveText('Cargando carpetas…');await expect(page.getByRole('button',{name:'Carpeta actual',exact:true})).toHaveCount(0)
})
test('loading, unavailable and denied cannot masquerade as a complete empty folder set',async({page})=>{
 await page.goto(server.url+'/documents')
 for(const status of ['loading','unavailable','denied']as const){await page.evaluate(value=>window.folderFixtureSetState({view:{scope:'synthetic-A',status:value}}),status);await expect(page.getByText('Sin carpetas en esta consulta.',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Comercial',exact:true})).toHaveCount(0)}
 await expect(page.getByRole('alert')).toHaveText('No tienes permiso para consultar estas carpetas.')
 const view=ready();if(view.status==='ready')view.nodes=[];await page.evaluate(value=>window.folderFixtureSetState({view:value}),view);await expect(page.getByText('Sin carpetas en esta consulta.',{exact:true})).toBeVisible()
})
test('uncertain parent lock disables selection, expansion and paging callbacks',async({page})=>{
 await page.goto(server.url+'/documents');const view=ready();if(view.status==='ready'){view.nodes=[{id:'branch',label:'Rama',hasChildren:true,expanded:false,children:[],childrenState:'ready'}];view.partial=true;view.hasMore=true}
 await page.evaluate(value=>window.folderFixtureSetState({locked:true,view:value}),view)
 for(const name of ['Todos los documentos','Sin clasificar','Rama','Desplegar Rama','Más carpetas'])await expect(page.getByRole('button',{name,exact:true})).toBeDisabled()
 await expect(page.getByLabel('Última acción',{exact:true})).toHaveText('')
})
test('breadcrumbs and long labels remain bounded text, not HTML, at390',async({page},info)=>{
 await page.setViewportSize({width:390,height:960});await page.goto(server.url+'/documents');const view=ready();if(view.status==='ready'){view.nodes=[{...view.nodes[0],label:'Nombre'.repeat(12)}];view.breadcrumbs=[{id:'parent',label:'<img src=x onerror=alert(1)>'},{id:'first',label:'Nombre'.repeat(12)}];view.selected={kind:'folder',id:'first'}}
 await page.evaluate(value=>window.folderFixtureSetState({view:value}),view);await page.getByRole('button',{name:'Mostrar carpetas',exact:true}).click()
 await expect(page.locator('img')).toHaveCount(0);await expect(page.getByRole('navigation',{name:'Carpeta actual'}).getByRole('button',{name:'<img src=x onerror=alert(1)>',exact:true})).toBeVisible()
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('folder-breadcrumbs-390.png')})
 await page.getByRole('navigation',{name:'Carpeta actual'}).getByRole('button',{name:'<img src=x onerror=alert(1)>',exact:true}).click();await expect(page.getByLabel('Última acción',{exact:true})).toContainText('parent')
})
test('invalid duplicate or cyclic model fails closed without a false empty or hierarchy',async({page})=>{
 await page.goto(server.url+'/documents');await page.evaluate(()=>{const node={id:'cycle',label:'Nunca mostrar',hasChildren:true,expanded:true,children:[]as never[],childrenState:'ready' as const};node.children.push(node as never);window.folderFixtureSetState({view:{scope:'synthetic-A',status:'ready',nodes:[node],breadcrumbs:[],selected:{kind:'all'},partial:false,hasMore:false}})})
 await expect(page.getByRole('alert')).toHaveText('No se ha podido mostrar la organización de carpetas.');await expect(page.getByText('Nunca mostrar',{exact:true})).toHaveCount(0);await expect(page.getByText('Sin carpetas en esta consulta.',{exact:true})).toHaveCount(0)
})
test('branch failure and loading do not display stale children or pretend empty',async({page})=>{
 await page.goto(server.url+'/documents')
 for(const childrenState of ['loading','unavailable']as const){const view=ready();if(view.status==='ready')view.nodes=[{id:'branch',label:'Rama',hasChildren:true,expanded:true,childrenState,children:[{id:'stale',label:'Subcarpeta obsoleta',hasChildren:false,expanded:false,children:[],childrenState:'ready'}]}];await page.evaluate(value=>window.folderFixtureSetState({view:value}),view);await expect(page.getByText('Subcarpeta obsoleta',{exact:true})).toHaveCount(0)}
 await page.getByRole('button',{name:'Reintentar subcarpetas de Rama',exact:true}).click();await expect(page.getByLabel('Última acción',{exact:true})).toHaveText('retry-children:branch')
})
test('partial paging is explicit and unavailable retry only emits the supplied callback',async({page})=>{
 await page.goto(server.url+'/documents');const view=ready();if(view.status==='ready'){view.partial=true;view.hasMore=true}await page.evaluate(value=>window.folderFixtureSetState({view:value}),view)
 await expect(page.getByRole('status',{name:'Consulta parcial de carpetas',exact:true})).toHaveCount(1);await expect(page.getByRole('status',{name:'Consulta parcial de carpetas',exact:true})).toHaveText('La consulta de carpetas es parcial. Puede faltar organización por cargar.');await page.getByRole('button',{name:'Más carpetas',exact:true}).click();await expect(page.getByLabel('Última acción',{exact:true})).toHaveText('more')
 await page.evaluate(()=>window.folderFixtureSetState({view:{scope:'synthetic-A',status:'unavailable'}}));await page.getByRole('button',{name:'Reintentar carpetas',exact:true}).click();await expect(page.getByLabel('Última acción',{exact:true})).toHaveText('retry')
})
