-- Branche le contrôle de fuseau sur public.profiles (rejouable).
drop trigger if exists profiles_timezone_update on public.profiles;
create trigger profiles_timezone_update
  before update on public.profiles
  for each row
  execute function public._profiles_timezone_update();
