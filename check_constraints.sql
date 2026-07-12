-- Check all constraints on products table
SELECT
    con.conname AS constraint_name,
    con.contype AS constraint_type,
    CASE 
        WHEN con.contype = 'u' THEN 'UNIQUE'
        WHEN con.contype = 'p' THEN 'PRIMARY KEY'
        WHEN con.contype = 'f' THEN 'FOREIGN KEY'
        WHEN con.contype = 'c' THEN 'CHECK'
        WHEN con.contype = 'x' THEN 'EXCLUSION'
    END AS constraint_type_desc,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
INNER JOIN pg_class rel ON rel.oid = con.conrelid
INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'products'
ORDER BY con.contype, con.conname;

-- Check unique indexes on products table
SELECT
    i.relname AS index_name,
    idx.indisunique AS is_unique,
    idx.indisprimary AS is_primary,
    idx.indisexclusion AS is_exclusion,
    am.amname AS index_type,
    pg_get_indexdef(idx.indexrelid) AS index_definition
FROM pg_index idx
INNER JOIN pg_class i ON i.oid = idx.indexrelid
INNER JOIN pg_class t ON t.oid = idx.indrelid
INNER JOIN pg_am am ON am.oid = i.relam
WHERE t.relname = 'products'
  AND (idx.indisunique = true OR idx.indisexclusion = true)
ORDER BY i.relname;
