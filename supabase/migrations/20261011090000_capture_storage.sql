-- Capture files (D16-20 Part B, plan B3/B5): a private bucket, one folder per user.
-- Path: <user_id>/<capture_id>.<ext>. The browser uploads with the user's session; the server action
-- downloads with the same session. No update policy: a capture file is never replaced.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('captures', 'captures', false, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy captures_files_select on storage.objects for select to authenticated
  using (bucket_id = 'captures' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy captures_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'captures' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy captures_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'captures' and (storage.foldername(name))[1] = (select auth.uid())::text);
