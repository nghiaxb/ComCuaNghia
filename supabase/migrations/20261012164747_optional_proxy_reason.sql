-- Proxy order reasons are optional; actor/subject and before/after audit remain mandatory.
-- Change only this guard in the deployed function, retaining reconciliation, billing,
-- security settings and existing grants. Fail if the expected source has drifted.
do $migration$
declare
  definition text := pg_get_functiondef('private.run(text,jsonb,integer,uuid)'::regprocedure);
  required_guard text := $old$if subject<>m.id and coalesce(length(trim(p->>'reason')),0) not between 1 and 500 then raise exception 'VALIDATION: reason required';end if;$old$;
  optional_guard text := $new$if subject<>m.id and (coalesce(length(trim(p->>'reason')),0)>500 or coalesce(jsonb_typeof(p->'reason'),'null') not in('string','null')) then raise exception 'VALIDATION: reason';end if;$new$;
begin
  if (length(definition)-length(replace(definition,required_guard,'')))/length(required_guard) <> 1 then
    raise exception 'Unexpected private.run proxy reason guard; review before migrating';
  end if;
  execute replace(definition,required_guard,optional_guard);
end
$migration$;
