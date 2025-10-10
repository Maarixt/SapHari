-- Keep profiles.id in sync with auth.users.id
-- This ensures the foreign key relationship works properly

-- Create function to handle new user creation
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Drop existing trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

-- Create trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create function to handle user updates
create or replace function public.handle_user_update()
returns trigger language plpgsql security definer as $$
begin
  update public.profiles 
  set email = new.email,
      display_name = coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  where id = new.id;
  return new;
end;
$$;

-- Drop existing trigger if it exists
drop trigger if exists on_auth_user_updated on auth.users;

-- Create trigger for user updates
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_user_update();

-- Create function to handle user deletion
create or replace function public.handle_user_delete()
returns trigger language plpgsql security definer as $$
begin
  delete from public.profiles where id = old.id;
  return old;
end;
$$;

-- Drop existing trigger if it exists
drop trigger if exists on_auth_user_deleted on auth.users;

-- Create trigger for user deletion
create trigger on_auth_user_deleted
  after delete on auth.users
  for each row execute procedure public.handle_user_delete();
