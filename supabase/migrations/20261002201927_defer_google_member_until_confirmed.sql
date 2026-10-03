create or replace function private.provision_member() returns trigger language plpgsql security definer set search_path='' as $$ begin
 -- GoTrue inserts the OAuth user before confirming email in a subsequent update.
 -- Pending Auth users receive no application membership or data access.
 if new.email_confirmed_at is null then return new;end if;
 if new.email is null or split_part(lower(new.email),'@',2)<>'rivercrane.vn' or (new.raw_app_meta_data->>'provider') is distinct from 'google' then raise exception 'FORBIDDEN: verified company Google identity required'; end if;
 insert into public.members(id,auth_user_id,email,display_name) values(new.id,new.id,lower(new.email),split_part(new.email,'@',1)) on conflict(email) do update set auth_user_id=excluded.auth_user_id where public.members.auth_user_id is null or public.members.auth_user_id=excluded.auth_user_id; if not found then raise exception 'FORBIDDEN: identity collision';end if;
 return new;end $$;
