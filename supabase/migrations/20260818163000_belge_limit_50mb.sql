-- Denetim ve KYS belge bucket limiti: 15 MiB -> 50 MiB (ücretsiz plan tavanı)

update storage.buckets
set file_size_limit = 52428800
where id in ('denetim-belgeler', 'kys-belgeler');
