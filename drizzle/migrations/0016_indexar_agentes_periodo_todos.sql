CREATE INDEX mv_agente_per_ind_periodo_idx ON analitico.mv_agente_per_ind (produto, ano_f, mes_f, agente);
CREATE INDEX mv_agente_per_oferta_periodo_idx ON analitico.mv_agente_per_oferta (produto, ano_f, mes_f, agente, oferta);
CREATE INDEX mv_agente_per_cliente_periodo_idx ON analitico.mv_agente_per_cliente (produto, ano_f, mes_f, agente);
CREATE INDEX mv_agente_per_rota_periodo_idx ON analitico.mv_agente_per_rota (produto, ano_f, mes_f, agente);
CREATE INDEX mv_agente_per_coloader_periodo_idx ON analitico.mv_agente_per_coloader (produto, ano_f, mes_f, agente);
CREATE INDEX mv_agente_per_motivo_periodo_idx ON analitico.mv_agente_per_motivo (produto, ano_f, mes_f, agente);
CREATE INDEX mv_agente_per_rota_coloader_periodo_idx ON analitico.mv_agente_per_rota_coloader (produto, ano_f, mes_f, agente);