-- Sample charity data
insert into charities (name, slug, description, image_url, is_featured) values
 ('Hearts for Kids', 'hearts-for-kids', 'Funding paediatric care for under-served families.', 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800', true),
 ('Green Earth Trust', 'green-earth-trust', 'Reforestation projects across three continents.', 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800', false),
 ('Veterans Forward', 'veterans-forward', 'Mental health support for returning service members.', 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800', false),
 ('Ocean Cleanup Initiative', 'ocean-cleanup', 'Removing plastic from coastal waters worldwide.', 'https://images.unsplash.com/photo-1505144808419-1957a94ca61e?w=800', false)
on conflict (slug) do nothing;
