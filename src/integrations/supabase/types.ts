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
      [_ in never]: never
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
