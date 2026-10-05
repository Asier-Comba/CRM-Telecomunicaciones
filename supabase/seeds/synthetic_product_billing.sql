-- Atomic billing extension for the installed disposable operational seed.
-- Inputs/command keys are deterministic. Entity IDs and timestamps come from
-- real billing commands; issuance snapshots, numbers and audits are never forged.
do $$
declare w uuid; actor uuid; cust uuid; profile jsonb; draft jsonb; issued jsonb;
begin
 if current_setting('app.environment',true) is distinct from 'test' then
  raise exception using errcode='42501',message='synthetic billing seed requires disposable test database';
 end if;
 for tenant in 1..2 loop
  w:=md5('density.workspace.'||tenant)::uuid;
  actor:=md5('density.actor.'||tenant||'.1')::uuid;
  perform set_config('request.jwt.claim.sub',actor::text,true);
  profile:=jsonb_build_object('legal_name','Synthetic Density Issuer '||tenant,'tax_id','SYNTHETIC-NOT-VALID-'||tenant,
   'address','Synthetic Street 1','postal_code','00000','city','Synthetic','region','Synthetic','country','ES');
  perform public.billing_v1_issuer_set(w,jsonb_build_object('command_id',md5('density.billing.issuer.'||tenant)::uuid,
   'expected_version',0,'profile',profile,'currency','EUR','default_series','D'));
  for company in 1..case when tenant=1 then 24 else 1 end loop
   cust:=md5('density.customer.'||tenant||'.'||company)::uuid;
   profile:=profile||jsonb_build_object('legal_name','Synthetic Company '||tenant||'-'||lpad(company::text,2,'0'),
    'tax_id','SYNTHETIC-NOT-VALID-'||tenant||'-'||company);
   perform public.billing_v1_customer_fiscal_set(w,jsonb_build_object('command_id',md5('density.billing.fiscal.'||tenant||'.'||company)::uuid,
    'customer_id',cust,'expected_version',0,'profile',profile));
   for category in 1..4 loop
    draft:=public.billing_v1_invoice_create_draft(w,jsonb_build_object(
     'command_id',md5('density.billing.draft.'||tenant||'.'||company||'.'||category)::uuid,
     'customer_id',cust,'issue_on','2026-09-01','due_on',case when category=4 then '2026-09-10' end,
     'series','D','currency','EUR','notes','Synthetic billing density',
     'contract_id',md5('density.contract.'||tenant||'.'||company||'.1')::uuid,
     'service_id',md5('density.service.'||tenant||'.'||company||'.1')::uuid,
     'opportunity_id',md5('density.opportunity.'||tenant||'.'||company||'.1')::uuid,
     'lines',jsonb_build_array(jsonb_build_object('description','Synthetic fractional telecom charge','quantity_milli',1500,
      'unit_price_minor',101,'discount_bps',500,'tax_bps',2100,'withholding_bps',1500))));
    if category>1 then
     issued:=public.billing_v1_invoice_issue(w,jsonb_build_object('command_id',md5('density.billing.issue.'||tenant||'.'||company||'.'||category)::uuid,
      'id',draft->>'id','expected_version',1));
     if category=3 then
      perform public.billing_v1_invoice_mark_paid(w,jsonb_build_object('command_id',md5('density.billing.paid.'||tenant||'.'||company)::uuid,
       'id',issued->>'id','expected_version',2));
     end if;
    end if;
   end loop;
  end loop;
 end loop;
end $$;
