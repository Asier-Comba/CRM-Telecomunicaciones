import test from 'node:test'
import assert from 'node:assert/strict'
import { reconcile } from '../../scripts/platform/storage-recovery.mjs'
const item={bucket:'telecom-documents',path:'wa/documents/da/opaque',workspaceId:'wa',documentId:'da',customerId:'ca',status:'active',size:42,sha256:'synthetic-hash',contentType:'application/pdf'}
test('matching object/metadata copies reconcile',()=>assert.deepEqual(reconcile([item],[item],[item]),[]))
for(const [name,objects,metadata]of [['missing',[],[item]],['orphan',[item],[]],['hash',[{...item,sha256:'wrong'}],[item]],['size',[{...item,size:43}],[item]],['mime',[{...item,contentType:'text/plain'}],[item]],['workspace',[item],[{...item,workspaceId:'foreign'}]],['bucket',[{...item,bucket:'public'}],[item]],['path',[{...item,path:'wrong'}],[item]],['duplicate',[item,item],[item]],['metadataDuplicate',[item],[item,item]]])test('reconciliation rejects '+name,()=>assert.ok(reconcile([item],objects,metadata).length))
test('bad manifest path and duplicate manifest rejected',()=>{assert.ok(reconcile([{...item,path:'foreign/documents/da/opaque'}],[],[]).includes('PATH_BINDING'));assert.ok(reconcile([item,item],[item],[item]).includes('DUPLICATE_MANIFEST'))})
