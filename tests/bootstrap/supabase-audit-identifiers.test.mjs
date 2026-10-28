import test from 'node:test'
import assert from 'node:assert/strict'
import {collectPublicSqlNames} from '../../scripts/audit-supabase-identifiers.mjs'
const created='create\\s+(?:or\\s+replace\\s+)?(?:table|view|materialized\\s+view)\\s+(?:if\\s+not\\s+exists\\s+)?'
test('DDL namespace recognition consumes private names without inventing public schema relations',()=>{
 const sql='create table documents_library_private.settings(singleton boolean); create table public.customers(id uuid); create table contacts(id uuid);'
 assert.deepEqual([...collectPublicSqlNames(sql,created)].sort(),['contacts','customers'])
})
test('quoted schema and object names respect PostgreSQL case and escaped quotes',()=>{
 const sql='CREATE TABLE "public"."safe Name"(id uuid); create view "Public"."hidden" as select 1; create table "private.schema"."object"(id uuid); create table "quo""ted"(id uuid);'
 assert.deepEqual([...collectPublicSqlNames(sql,created)].sort(),['quo"ted','safe Name'])
})
test('functions and relation references admit qualified public and unqualified names only',()=>{
 const sql='create or replace function documents_library_private.list(uuid,jsonb)returns jsonb; create function PUBLIC.document_library_v2_list(uuid,jsonb)returns jsonb; create function "public"."ordinary"()returns int; alter table documents_library_private.settings enable row level security; alter table public.documents add column x int;'
 assert.deepEqual([...collectPublicSqlNames(sql,'create\\s+(?:or\\s+replace\\s+)?function\\s+')].sort(),['document_library_v2_list','ordinary'])
 assert.deepEqual([...collectPublicSqlNames(sql,'alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:only\\s+)?')],['documents'])
})
test('spaces around qualification cannot trigger a partial schema-name fallback',()=>{
 assert.deepEqual([...collectPublicSqlNames('create table private_schema . settings(id uuid); create table public . visible(id uuid);',created)],['visible'])
})
