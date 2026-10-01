CREATE INDEX IF NOT EXISTS mv_rota_base_upper_po_idx ON analitico.mv_rota_base (produto, upper(porto_origem));
CREATE INDEX IF NOT EXISTS mv_rota_base_upper_pd_idx ON analitico.mv_rota_base (produto, upper(porto_destino));
CREATE INDEX IF NOT EXISTS mv_rota_base_upper_rota_idx ON analitico.mv_rota_base (produto, upper(rota));