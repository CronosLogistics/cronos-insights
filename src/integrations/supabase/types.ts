export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      importacoes: {
        Row: {
          arquivo_modificado_em: string | null
          concluido_em: string | null
          fonte: string
          id: number
          iniciado_em: string
          linhas: number | null
          mensagem: string | null
          situacao: string
        }
        Insert: {
          arquivo_modificado_em?: string | null
          concluido_em?: string | null
          fonte?: string
          id?: number
          iniciado_em?: string
          linhas?: number | null
          mensagem?: string | null
          situacao?: string
        }
        Update: {
          arquivo_modificado_em?: string | null
          concluido_em?: string | null
          fonte?: string
          id?: number
          iniciado_em?: string
          linhas?: number | null
          mensagem?: string | null
          situacao?: string
        }
        Relationships: []
      }
      ofertas: {
        Row: {
          agente: string | null
          analise: string | null
          ano: number | null
          armador: string | null
          cliente: string | null
          complemento_incoterm: string | null
          container: string | null
          continente: string | null
          data_abertura: string | null
          data_conclusao: string | null
          data_envio_pricing: string | null
          data_fim_sales_support: string | null
          data_retorno_pricing: string | null
          descricao_motivo: string | null
          destino: string | null
          destino_final: string | null
          escritorio: string | null
          id: number
          importado_em: string
          incoterm: string | null
          inside_sales: string | null
          intermediario: string | null
          mc_oferta_pct: number | null
          mes: number | null
          mes_ano: number | null
          modalidade: string | null
          motivo: string | null
          oferta: string
          origem: string | null
          origem_carga: string | null
          pais_destino: string | null
          pais_origem: string | null
          peso_aferido: number | null
          peso_mercadoria: number | null
          pricing: string | null
          produto: string | null
          revisao: number | null
          rota: string | null
          servicos_adicionais: string | null
          solicitacao: string | null
          status: string | null
          tempo_resposta_pricing_horas: number | null
          teus: number | null
          usuario_abertura: string | null
          validade_ate: string | null
          validade_de: string | null
          vendedor: string | null
        }
        Insert: {
          agente?: string | null
          analise?: string | null
          ano?: number | null
          armador?: string | null
          cliente?: string | null
          complemento_incoterm?: string | null
          container?: string | null
          continente?: string | null
          data_abertura?: string | null
          data_conclusao?: string | null
          data_envio_pricing?: string | null
          data_fim_sales_support?: string | null
          data_retorno_pricing?: string | null
          descricao_motivo?: string | null
          destino?: string | null
          destino_final?: string | null
          escritorio?: string | null
          id?: number
          importado_em?: string
          incoterm?: string | null
          inside_sales?: string | null
          intermediario?: string | null
          mc_oferta_pct?: number | null
          mes?: number | null
          mes_ano?: number | null
          modalidade?: string | null
          motivo?: string | null
          oferta: string
          origem?: string | null
          origem_carga?: string | null
          pais_destino?: string | null
          pais_origem?: string | null
          peso_aferido?: number | null
          peso_mercadoria?: number | null
          pricing?: string | null
          produto?: string | null
          revisao?: number | null
          rota?: string | null
          servicos_adicionais?: string | null
          solicitacao?: string | null
          status?: string | null
          tempo_resposta_pricing_horas?: number | null
          teus?: number | null
          usuario_abertura?: string | null
          validade_ate?: string | null
          validade_de?: string | null
          vendedor?: string | null
        }
        Update: {
          agente?: string | null
          analise?: string | null
          ano?: number | null
          armador?: string | null
          cliente?: string | null
          complemento_incoterm?: string | null
          container?: string | null
          continente?: string | null
          data_abertura?: string | null
          data_conclusao?: string | null
          data_envio_pricing?: string | null
          data_fim_sales_support?: string | null
          data_retorno_pricing?: string | null
          descricao_motivo?: string | null
          destino?: string | null
          destino_final?: string | null
          escritorio?: string | null
          id?: number
          importado_em?: string
          incoterm?: string | null
          inside_sales?: string | null
          intermediario?: string | null
          mc_oferta_pct?: number | null
          mes?: number | null
          mes_ano?: number | null
          modalidade?: string | null
          motivo?: string | null
          oferta?: string
          origem?: string | null
          origem_carga?: string | null
          pais_destino?: string | null
          pais_origem?: string | null
          peso_aferido?: number | null
          peso_mercadoria?: number | null
          pricing?: string | null
          produto?: string | null
          revisao?: number | null
          rota?: string | null
          servicos_adicionais?: string | null
          solicitacao?: string | null
          status?: string | null
          tempo_resposta_pricing_horas?: number | null
          teus?: number | null
          usuario_abertura?: string | null
          validade_ate?: string | null
          validade_de?: string | null
          vendedor?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_agentes: {
        Row: {
          agente: string | null
          aprovadas: number | null
          clientes: number | null
          conversao_pct: number | null
          ofertas: number | null
          origens: number | null
          reprovadas: number | null
        }
        Relationships: []
      }
      v_analistas: {
        Row: {
          analista: string | null
          aprovadas: number | null
          conversao_pct: number | null
          decididas: number | null
          em_aberto: number | null
          ofertas: number | null
          tempo_medio_horas: number | null
        }
        Relationships: []
      }
      v_clientes: {
        Row: {
          aprovadas: number | null
          cliente: string | null
          conversao_pct: number | null
          em_aberto: number | null
          ofertas: number | null
          reprovadas: number | null
          rotas: number | null
          ultima_oferta: string | null
        }
        Relationships: []
      }
      v_coloaders: {
        Row: {
          aprovadas: number | null
          coloader: string | null
          conversao_pct: number | null
          ofertas: number | null
          reprovadas: number | null
          rotas: number | null
          teus: number | null
        }
        Relationships: []
      }
      v_cotacoes_em_analise: {
        Row: {
          cliente: string | null
          data_abertura: string | null
          dias_em_aberto: number | null
          faixa_atencao: string | null
          modalidade: string | null
          oferta: string | null
          pricing: string | null
          revisao: number | null
          rota: string | null
          status: string | null
          vendedor: string | null
        }
        Insert: {
          cliente?: string | null
          data_abertura?: string | null
          dias_em_aberto?: never
          faixa_atencao?: never
          modalidade?: string | null
          oferta?: string | null
          pricing?: string | null
          revisao?: number | null
          rota?: never
          status?: string | null
          vendedor?: string | null
        }
        Update: {
          cliente?: string | null
          data_abertura?: string | null
          dias_em_aberto?: never
          faixa_atencao?: never
          modalidade?: string | null
          oferta?: string | null
          pricing?: string | null
          revisao?: number | null
          rota?: never
          status?: string | null
          vendedor?: string | null
        }
        Relationships: []
      }
      v_kpis_geral: {
        Row: {
          agentes: number | null
          analistas: number | null
          aprovadas: number | null
          clientes: number | null
          coloaders: number | null
          conversao_pct: number | null
          em_aberto: number | null
          ofertas: number | null
          primeira_abertura: string | null
          reprovadas: number | null
          rotas: number | null
          tempo_medio_horas: number | null
          teus: number | null
          ultima_abertura: string | null
          vendedores: number | null
        }
        Relationships: []
      }
      v_motivos_perda: {
        Row: {
          cliente_recorrente: string | null
          motivo: string | null
          participacao_pct: number | null
          reprovacoes: number | null
          rota_recorrente: string | null
        }
        Relationships: []
      }
      v_ofertas_mensal: {
        Row: {
          ano: number | null
          aprovadas: number | null
          conversao_pct: number | null
          em_aberto: number | null
          mes: number | null
          mes_ano: number | null
          ofertas: number | null
          reprovadas: number | null
        }
        Relationships: []
      }
      v_qualidade_dados: {
        Row: {
          campo: string | null
          preenchidos: number | null
          preenchimento_pct: number | null
          vazios: number | null
        }
        Relationships: []
      }
      v_rotas: {
        Row: {
          aprovadas: number | null
          clientes: number | null
          conversao_pct: number | null
          destino: string | null
          em_aberto: number | null
          modalidade: string | null
          ofertas: number | null
          origem: string | null
          pais_destino: string | null
          pais_origem: string | null
          reprovadas: number | null
          rota: string | null
          teus: number | null
        }
        Relationships: []
      }
      v_vendedores: {
        Row: {
          aprovadas: number | null
          clientes: number | null
          conversao_pct: number | null
          ofertas: number | null
          reprovadas: number | null
          rotas: number | null
          vendedor: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
