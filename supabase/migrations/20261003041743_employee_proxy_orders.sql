create or replace function private.run(k text,p jsonb,v integer,rid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.members;old jsonb;res jsonb;req private.requests;d public.days;o public.orders;f public.foods;item jsonb;items jsonb='[]';x jsonb;dayid uuid;entity uuid;subject uuid;eid uuid;cfg jsonb;ver uuid;late boolean=false;notify boolean=true;amount bigint;weights jsonb;shares jsonb;covered jsonb;sponsors jsonb;extra bigint;sp jsonb;pair record;wk date;sett public.settlements;pay public.payments;dest uuid;
begin
 m=private.actor(); if rid is null or v is null or v<0 then raise exception 'VALIDATION: command';end if;
 -- One transaction-wide advisory lock serializes this small internal team's commands, including finance and configuration.
 perform pg_advisory_xact_lock(724191);
 select * into req from private.requests where actor_id=m.id and request_id=rid;
 if found then if req.kind<>k or req.payload<>p then raise exception 'CONFLICT: request reused';end if;return req.response;end if;
 select data into cfg from public.settings;
 perform private.need(jsonb_typeof(p)='object','payload');
 if k in('order.save','order.cancel') then
 if k='order.cancel' then select * into o from public.orders where id=(p->>'orderId')::uuid;select * into d from public.days where id=o.day_id;subject=o.member_id;
 else select * into d from public.days where id=(p->>'dayId')::uuid;subject=(p->>'memberId')::uuid;select * into o from public.orders where day_id=d.id and member_id=subject;end if;
 if d.id is null or not exists(select 1 from public.members where id=subject and active) then raise exception 'VALIDATION: day/member';end if;
 if subject<>m.id and coalesce(length(trim(p->>'reason')),0) not between 1 and 500 then raise exception 'VALIDATION: reason required';end if;
 if d.locked then raise exception 'LOCKED';end if;
 wk=date_trunc('week',d.date)::date;
 if exists(select 1 from public.settlements where week_start=wk and state='settled') then raise exception 'LOCKED: reopen settlement';end if;
 if coalesce(o.version,0)<>v then raise exception 'CONFLICT';end if;old=to_jsonb(o);
 late=(now() at time zone 'Asia/Ho_Chi_Minh') >= (d.date-1)+(cfg->>'cutoffTime')::time;
 if k='order.save' then
 perform private.need(jsonb_typeof(p->'items')='array' and jsonb_array_length(p->'items') between 1 and 30,'items');
 for item in select value from jsonb_array_elements(p->'items') loop
 select * into f from public.foods where id=(item->>'menuItemId')::uuid and day_id=d.id and (active or exists(select 1 from jsonb_array_elements(coalesce(o.items,'[]')) j where j->>'menuItemId'=public.foods.id::text));
 perform private.need(private.integer_value(item->'quantity',1,100),'quantity');
 if f.id is null or (item->>'quantity')::numeric<>trunc((item->>'quantity')::numeric) or (item->>'quantity')::integer not between 1 and 100 or length(coalesce(item->>'note',''))>500 then raise exception 'VALIDATION: item';end if;
 select (value->>'unitPrice')::bigint into amount from jsonb_array_elements(coalesce(o.items,'[]')) where value->>'menuItemId'=f.id::text limit 1;
 items=items||jsonb_build_array(jsonb_build_object('menuItemId',f.id,'name',f.name,'unitPrice',coalesce(amount,f.unit_price),'quantity',(item->>'quantity')::integer,'note',trim(coalesce(item->>'note',''))));end loop;
 insert into public.orders(day_id,member_id,items) values(d.id,subject,items) on conflict(day_id,member_id) do update set items=excluded.items,status='active',version=public.orders.version+1,updated_at=now() returning to_jsonb(public.orders.*),id into res,entity;
 else if o.id is null then raise exception 'VALIDATION: order';end if;update public.orders set status='cancelled',version=version+1,updated_at=now() where id=o.id returning to_jsonb(public.orders.*),id into res,entity;end if;
 elsif k='day.lock' then
 if m.role='employee' then raise exception 'FORBIDDEN';end if;select * into d from public.days where id=(p->>'dayId')::uuid;
 if d.id is null or d.version<>v then raise exception 'CONFLICT';end if;if coalesce(length(trim(p->>'reason')),0) not between 1 and 500 then raise exception 'VALIDATION: reason';end if;old=to_jsonb(d);
 update public.days set locked=(p->>'locked')::boolean,version=version+1 where id=d.id returning to_jsonb(public.days.*),id into res,entity;
 elsif k in('menu.draft.save','menu.ocr') then
 if m.role='employee' then raise exception 'FORBIDDEN';end if;
 perform private.need(jsonb_typeof(p->'days')='array' and jsonb_array_length(p->'days') between 1 and 5,'draft days');
 perform private.need(extract(isodow from (p->>'weekStart')::date)=1,'draft week');
 entity=coalesce((p->>'id')::uuid,gen_random_uuid());
 if p->>'id' is not null then select to_jsonb(md) into old from public.menu_drafts md where id=entity and version=v;if old is null then raise exception 'CONFLICT';end if;end if;
 insert into public.menu_drafts(id,actor_id,week_start,days) values(entity,m.id,(p->>'weekStart')::date,p->'days') on conflict(id) do update set days=excluded.days,version=public.menu_drafts.version+1,updated_at=now() returning to_jsonb(public.menu_drafts.*) into res;notify=false;
 elsif k='menu.publish' then
 if m.role='employee' then raise exception 'FORBIDDEN';end if;
 perform private.need(jsonb_typeof(p->'days')='array' and jsonb_array_length(p->'days') between 1 and 5,'menu days');
 if (select count(distinct value->>'date') from jsonb_array_elements(p->'days'))<>jsonb_array_length(p->'days') then raise exception 'VALIDATION: duplicate date';end if;
 insert into public.menu_versions(actor_id,content) values(m.id,p->'days') returning id into ver;
 for x in select value from jsonb_array_elements(p->'days') loop
 if extract(isodow from (x->>'date')::date)>5 then raise exception 'VALIDATION: weekday';end if;
 insert into public.days(date) values((x->>'date')::date) on conflict(date) do nothing;
 select * into d from public.days where date=(x->>'date')::date;
 if d.locked then raise exception 'LOCKED: menu day';end if;
 perform private.need(date_trunc('week',(x->>'date')::date)=date_trunc('week',(p->'days'->0->>'date')::date),'same menu week');
 if exists(select 1 from public.settlements where week_start=date_trunc('week',d.date)::date and state='settled') then raise exception 'LOCKED: settled week';end if;
 -- Preserve old food IDs for ordered dishes. Retire only items without an active order reference.
 update public.foods set active=false where day_id=d.id;
 if jsonb_array_length(x->'foods') not between 1 and 100 then raise exception 'VALIDATION: foods';end if;
 for item in select value from jsonb_array_elements(x->'foods') loop
 perform private.need(private.integer_value(item->'unitPrice'),'menu price');
 insert into public.foods(day_id,name,unit_price,menu_version_id) values(d.id,trim(item->>'name'),(item->>'unitPrice')::bigint,ver);end loop;end loop;
 entity=ver;res=jsonb_build_object('versionId',ver);notify=coalesce((p->>'notifyChat')::boolean,false);
 elsif k='settings.save' then
 if m.role<>'admin' then raise exception 'FORBIDDEN';end if;
 select to_jsonb(s) into old from public.settings s where version=v;if old is null then raise exception 'CONFLICT';end if;
 perform private.need(p ?& array['cutoffTime','reminderTime','holidays','defaultPrice','collectorId','bankCode','accountNumber','accountName','chatEnabled'],'settings fields');perform private.need(private.integer_value(p->'defaultPrice') and jsonb_typeof(p->'chatEnabled')='boolean','settings values');
 if p->>'cutoffTime'!~'^([01][0-9]|2[0-3]):[0-5][0-9]$' or p->>'reminderTime'!~'^([01][0-9]|2[0-3]):[0-5][0-9]$' or (p->>'defaultPrice')::bigint<0 or jsonb_typeof(p->'holidays')<>'array' then raise exception 'VALIDATION: settings';end if;
 if p->>'collectorId' is not null and not exists(select 1 from public.members where id=(p->>'collectorId')::uuid and active) then raise exception 'VALIDATION: collector';end if;
 update public.settings set version=version+1,data=jsonb_build_object('cutoffTime',p->>'cutoffTime','reminderTime',p->>'reminderTime','holidays',p->'holidays','defaultPrice',(p->>'defaultPrice')::bigint,'collectorId',p->'collectorId','bankCode',p->>'bankCode','accountNumber',p->>'accountNumber','accountName',p->>'accountName','chatEnabled',coalesce((p->>'chatEnabled')::boolean,true)) returning to_jsonb(public.settings.*) into res;
 elsif k='member.legacy' then
 if m.role<>'admin' then raise exception 'FORBIDDEN';end if;
 perform private.need(length(trim(p->>'displayName')) between 1 and 100,'display name');
 perform private.need(nullif(trim(p->>'email'),'') is null or lower(p->>'email') ~ '^[^@[:space:]]+@rivercrane[.]vn$','company email');
 insert into public.members(email,display_name) values(nullif(lower(trim(p->>'email')),''),trim(p->>'displayName')) returning to_jsonb(public.members.*),id into res,entity;
 elsif k='member.update' then
 if m.role<>'admin' then raise exception 'FORBIDDEN';end if;select to_jsonb(mm) into old from public.members mm where id=(p->>'id')::uuid and version=v;if old is null then raise exception 'CONFLICT';end if;
 if old->>'role'='admin' and ((p->>'active')::boolean=false or p->>'role'<>'admin') and (select count(*) from public.members where active and role='admin')<=1 then raise exception 'VALIDATION: last administrator';end if;
 update public.members set role=p->>'role',active=(p->>'active')::boolean,can_manage_finance=(p->>'canManageFinance')::boolean,version=version+1 where id=(p->>'id')::uuid returning to_jsonb(public.members.*),id into res,entity;
 elsif k='profile.save' then
 if length(trim(p->>'displayName')) not between 1 and 100 then raise exception 'VALIDATION: name';end if;
 update public.members set display_name=trim(p->>'displayName'),version=version+1 where id=m.id and version=v returning to_jsonb(public.members.*) into res;if res is null then raise exception 'CONFLICT';end if;subject=m.id;
 elsif k='destination.save' then
 if m.role<>'admin' then raise exception 'FORBIDDEN';end if;entity=coalesce((p->>'id')::uuid,gen_random_uuid());
 if length(p->>'name') not between 1 and 100 then raise exception 'VALIDATION: destination name';end if;
 insert into public.destinations(id,name,active) values(entity,p->>'name',(p->>'active')::boolean) on conflict(id) do update set name=excluded.name,active=excluded.active;
 if p->>'ciphertext' is not null then insert into private.destination_secrets values(entity,p->>'ciphertext') on conflict(id) do update set ciphertext=excluded.ciphertext;end if;
 if not (p->>'active')::boolean then update private.deliveries set status='failed',last_error='Destination revoked' where destination_id=entity and status in('pending','sending');end if;
 res=jsonb_build_object('id',entity,'configured',true);
 elsif k='payment.report' then
 perform private.need(private.integer_value(p->'amount',1),'payment amount');subject=m.id;insert into public.payments(member_id,amount,reference) values(m.id,(p->>'amount')::bigint,trim(p->>'reference')) returning to_jsonb(public.payments.*),id into res,entity;
 elsif k='payment.confirm' then
 if not(m.role='admin' or m.can_manage_finance) then raise exception 'FORBIDDEN';end if;
 select * into pay from public.payments where id=(p->>'paymentId')::uuid;if pay.id is null or pay.version<>v or pay.status<>'reported' then raise exception 'CONFLICT';end if;old=to_jsonb(pay);subject=pay.member_id;
 insert into public.ledger_entries(member_id,amount,kind,note) values(pay.member_id,-pay.amount,'payment',pay.reference);
 update public.payments set status='confirmed',version=version+1 where id=pay.id returning to_jsonb(public.payments.*),id into res,entity;
 elsif k='finance.adjust' then
 if not(m.role='admin' or m.can_manage_finance) then raise exception 'FORBIDDEN';end if;if length(trim(p->>'note')) not between 1 and 500 then raise exception 'VALIDATION: note';end if;
 perform private.need(private.integer_value(p->'amount',-9007199254740991),'adjustment amount');subject=(p->>'memberId')::uuid;insert into public.ledger_entries(member_id,amount,kind,note) values(subject,(p->>'amount')::bigint,'adjustment',p->>'note') returning to_jsonb(public.ledger_entries.*),id into res,entity;
 elsif k='finance.settle' then
 if not(m.role='admin' or m.can_manage_finance) then raise exception 'FORBIDDEN';end if;
 wk=(p->>'weekStart')::date;if extract(isodow from wk)<>1 then raise exception 'VALIDATION: week';end if;
 if exists(select 1 from public.settlements where week_start=wk and state='settled') then raise exception 'CONFLICT: settled';end if;
 if cfg->>'collectorId' is null then raise exception 'VALIDATION: collector required';end if;
 if exists(select 1 from public.days where date between wk and wk+4 and not locked) then raise exception 'LOCKED: lock days before settlement';end if;
 insert into public.settlements(week_start,version,state,snapshot) select wk,coalesce(max(version),0)+1,'settled',p from public.settlements where week_start=wk returning * into sett;
 for d in select * from public.days where date between wk and wk+4 order by date loop
 select jsonb_agg(jsonb_build_object('id',member_id,'weight',cost)) into weights from (select oo.member_id,sum((ii->>'unitPrice')::numeric*(ii->>'quantity')::numeric) cost from public.orders oo,jsonb_array_elements(oo.items) ii where oo.day_id=d.id and oo.status='active' group by oo.member_id) costs;
 if weights is null then continue;end if;
 select coalesce((p->'totals'->>d.id::text)::bigint,sum((value->>'weight')::bigint)) into amount from jsonb_array_elements(weights);
 perform private.need(amount>=0,'total');shares=private.allocate(amount,weights);covered=coalesce(p->'covered'->d.id::text,'[]');sponsors=coalesce(p->'sponsors'->d.id::text,'[]');extra=0;
 perform private.need(jsonb_typeof(covered)='array' and jsonb_typeof(sponsors)='array','sponsor lists');
 perform private.need((select count(distinct value) from jsonb_array_elements(covered))=jsonb_array_length(covered) and (select count(distinct value) from jsonb_array_elements(sponsors))=jsonb_array_length(sponsors),'duplicate sponsor');
 if jsonb_array_length(covered)>0 and jsonb_array_length(sponsors)=0 then raise exception 'VALIDATION: sponsor missing';end if;
 for x in select value from jsonb_array_elements(covered) loop if not shares ? (x#>>'{}') or sponsors @> jsonb_build_array(x) then raise exception 'VALIDATION: covered';end if;extra=extra+(shares->>(x#>>'{}'))::bigint;shares=jsonb_set(shares,array[x#>>'{}'],'0');end loop;
 select coalesce(jsonb_agg(jsonb_build_object('id',value#>>'{}','weight',1)),'[]') into sp from jsonb_array_elements(sponsors);
 sp=private.allocate(extra,sp);for pair in select * from jsonb_each_text(sp) loop if not shares ? pair.key then raise exception 'VALIDATION: sponsor';end if;shares=jsonb_set(shares,array[pair.key],to_jsonb((shares->>pair.key)::bigint+pair.value::bigint));end loop;
 for pair in select * from jsonb_each_text(shares) loop
 insert into public.ledger_entries(member_id,amount,kind,note,week_start,settlement_id) values(pair.key::uuid,case when pair.key=cfg->>'collectorId' then 0 else pair.value::bigint end,'meal',d.date::text||' · phần ăn '||pair.value||' VND',wk,sett.id);end loop;end loop;
 entity=sett.id;res=to_jsonb(sett);
 elsif k='finance.reopen' then
 if not(m.role='admin' or m.can_manage_finance) then raise exception 'FORBIDDEN';end if;if length(trim(p->>'reason'))<1 then raise exception 'VALIDATION: reason';end if;
 select * into sett from public.settlements where week_start=(p->>'weekStart')::date and state='settled';if sett.id is null then raise exception 'CONFLICT';end if;if sett.snapshot ? 'importBatch' then raise exception 'CONFLICT: use adjustment for imported history';end if;
 insert into public.ledger_entries(member_id,amount,kind,note,week_start,settlement_id) select le.member_id,-le.amount,'reversal',p->>'reason',le.week_start,le.settlement_id from public.ledger_entries le where le.settlement_id=sett.id and le.kind='meal';
 update public.settlements set state='reopened' where id=sett.id returning to_jsonb(public.settlements.*),id into res,entity;
 elsif k='import.apply' then
 if m.role<>'admin' then raise exception 'FORBIDDEN';end if;
 perform private.need((p->>'reconciled')::boolean and jsonb_typeof(p->'balances')='array' and length(p->>'fingerprint')>0,'review import');
 entity=(p->>'batchId')::uuid;
 if exists(select 1 from private.import_batches where id=entity or (fingerprint=p->>'fingerprint' and not rolled_back)) then raise exception 'CONFLICT: imported';end if;
 perform private.need((select count(distinct value->>'memberId') from jsonb_array_elements(p->'balances'))=jsonb_array_length(p->'balances'),'duplicate member');
 insert into private.import_batches(id,content,applied,fingerprint) values(entity,p,true,p->>'fingerprint');
 if p ? 'days' then
 for x in select value from jsonb_array_elements(p->'days') loop
 perform private.need((x->>'date')::date between (p->>'weekStart')::date and (p->>'weekStart')::date+4,'import date');
 if exists(select 1 from public.days where date=(x->>'date')::date) then raise exception 'CONFLICT: imported day already exists';end if;
 insert into public.days(date,locked) values((x->>'date')::date,true) returning id into dayid;
 for item in select value from jsonb_array_elements(x->'orders') loop
 perform private.need(exists(select 1 from public.members where id=(item->>'memberId')::uuid),'order mapping');items='[]';
 for sp in select value from jsonb_array_elements(item->'items') loop
 perform private.need(private.integer_value(sp->'unitPrice') and private.integer_value(sp->'quantity',1,100),'import item');
 insert into public.foods(day_id,name,unit_price,active) values(dayid,sp->>'name',(sp->>'unitPrice')::bigint,false) returning id into ver;
 items=items||jsonb_build_array(sp||jsonb_build_object('menuItemId',ver));end loop;
 insert into public.orders(day_id,member_id,items) values(dayid,(item->>'memberId')::uuid,items);end loop;end loop;
 insert into public.settlements(week_start,version,state,snapshot) values((p->>'weekStart')::date,(select coalesce(max(version),0)+1 from public.settlements where week_start=(p->>'weekStart')::date),'settled',jsonb_build_object('importBatch',entity,'days',p->'days'));
 end if;
 for x in select value from jsonb_array_elements(p->'balances') loop
 perform private.need(private.integer_value(x->'amount',-9007199254740991),'opening balance');
 perform private.need(exists(select 1 from public.members where id=(x->>'memberId')::uuid),'member mapping');
 perform private.need(not exists(select 1 from public.ledger_entries where member_id=(x->>'memberId')::uuid and kind not in('opening','import_reversal')) and coalesce((select sum(e.amount) from public.ledger_entries e where e.member_id=(x->>'memberId')::uuid),0)=0,'opening balance needs empty ledger');
 insert into public.ledger_entries(member_id,amount,kind,note,week_start,import_batch_id) values((x->>'memberId')::uuid,(x->>'amount')::bigint,'opening','Import '||entity,(p->>'weekStart')::date,entity);
 end loop;res=jsonb_build_object('batchId',entity,'applied',true);
 elsif k='import.rollback' then
 if m.role<>'admin' then raise exception 'FORBIDDEN';end if;entity=(p->>'batchId')::uuid;
 select content into old from private.import_batches where id=entity and applied and not rolled_back;if old is null then raise exception 'CONFLICT: batch';end if;
 perform private.need(length(trim(p->>'reason'))>0,'rollback reason');
 if exists(select 1 from public.ledger_entries e where e.member_id in(select (value->>'memberId')::uuid from jsonb_array_elements(old->'balances')) and e.created_at>(select created_at from private.import_batches where id=entity) and e.import_batch_id is distinct from entity) then raise exception 'CONFLICT: later activity';end if;
 insert into public.ledger_entries(member_id,amount,kind,note,week_start,import_batch_id) select le.member_id,-le.amount,'import_reversal',p->>'reason',le.week_start,entity from public.ledger_entries le where le.import_batch_id=entity and le.kind='opening';
 for x in select value from jsonb_array_elements(coalesce(old->'days','[]')) loop
 select * into d from public.days where date=(x->>'date')::date;
 if d.version<>1 or not d.locked or exists(select 1 from public.orders where day_id=d.id and version<>1) or exists(select 1 from public.foods where day_id=d.id and active) then raise exception 'CONFLICT: imported history changed';end if;
 delete from public.orders where day_id=d.id;delete from public.foods where day_id=d.id;delete from public.days where id=d.id;
 end loop;
 update public.settlements set state='reopened',snapshot=snapshot||'{"rolledBack":true}'::jsonb where snapshot->>'importBatch'=entity::text;
 update private.import_batches set rolled_back=true where id=entity;res=jsonb_build_object('batchId',entity,'reverted',true);
 elsif k='destination.test' then
 if m.role<>'admin' then raise exception 'FORBIDDEN';end if;entity=(p->>'id')::uuid;res=jsonb_build_object('queued',true);
 elsif k='delivery.retry' then
 if m.role<>'admin' then raise exception 'FORBIDDEN';end if;entity=(p->>'id')::uuid;update private.deliveries set status='pending',attempts=0,next_attempt_at=now(),lease_until=null where id=entity and status='failed' and exists(select 1 from public.destinations where id=destination_id and active);if not found then raise exception 'CONFLICT: delivery unavailable';end if;res=jsonb_build_object('queued',true);notify=false;
 elsif k='menu.upload' then if m.role='employee' then raise exception 'FORBIDDEN';end if;res=p;notify=false;
 elsif k='audit.export' then res=jsonb_build_object('recorded',true);notify=false;
 else raise exception 'VALIDATION: unknown command';end if;
 insert into public.audit_events(actor_id,subject_id,kind,entity_id,before,after,after_cutoff,request_id) values(m.id,subject,k,entity,old,case when k='destination.save' then res else coalesce(res,p)||case when p ? 'reason' then jsonb_build_object('reason',p->>'reason') else '{}'::jsonb end end,late,rid) returning id into eid;
 if notify and coalesce((cfg->>'chatEnabled')::boolean,true) then
 insert into private.deliveries(event_id,destination_id,kind,ciphertext,payload) select eid,dd.id,k,ss.ciphertext,jsonb_build_object('eventId',eid,'actor',m.display_name,'kind',k,'afterCutoff',late,'entityId',entity,'subject',(select display_name from public.members where id=subject),'reason',p->>'reason','menu',case when k='menu.publish' then p->'days' else null end,'before',case when k like 'order.%' then old else null end,'after',case when k like 'order.%' then res else null end) from public.destinations dd join private.destination_secrets ss on ss.id=dd.id where dd.active and (k<>'destination.test' or dd.id=entity);end if;
 -- Secret command cache never retains plaintext/ciphertext supplied by callers.
 insert into private.requests values(m.id,rid,k,p,res);return res;
end $$;

drop policy audit_read on public.audit_events;
create policy audit_read on public.audit_events for select to authenticated using((private.allowed(coalesce(subject_id,actor_id),kind like 'finance.%' or kind like 'payment.%') or private.allowed(actor_id,kind like 'finance.%' or kind like 'payment.%')) and (kind not like 'settings.%' and kind not like 'member.%' or private.is_admin()));

-- Only minimal active recipient names are shared; no member profiles or financial data.
create function private.proxy_recipients() returns jsonb language plpgsql security definer set search_path='' as $$begin
 perform private.actor();
 return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'display_name',display_name) order by display_name,id),'[]') from public.members where active);
end $$;
create function private.proxy_order(day_id uuid,recipient_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$begin
 perform private.actor();
 if not exists(select 1 from public.members m where m.id=recipient_id and m.active) or not exists(select 1 from public.days d where d.id=day_id) then raise exception 'VALIDATION: day/member';end if;
 return (select to_jsonb(o) from public.orders o where o.day_id=proxy_order.day_id and o.member_id=recipient_id);
end $$;
create function public.proxy_recipients() returns jsonb language sql security invoker set search_path='' as $$select private.proxy_recipients()$$;
create function public.proxy_order(day_id uuid,recipient_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.proxy_order(day_id,recipient_id)$$;
revoke execute on function private.proxy_recipients(),private.proxy_order(uuid,uuid),public.proxy_recipients(),public.proxy_order(uuid,uuid) from public,anon,authenticated;
grant execute on function private.proxy_recipients(),private.proxy_order(uuid,uuid),public.proxy_recipients(),public.proxy_order(uuid,uuid) to authenticated;
