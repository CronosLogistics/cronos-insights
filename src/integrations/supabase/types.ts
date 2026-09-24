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
      papeis_usuario: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      perfis: {
        Row: {
          ativo: boolean
          created_at: string
          email: string | null
          id: string
          nome: string | null
          produto_codigo: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          id: string
          nome?: string | null
          produto_codigo?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          produto_codigo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfis_produto_codigo_fkey"
            columns: ["produto_codigo"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["codigo"]
          },
        ]
      }
      perfis_produtos: {
        Row: {
          created_at: string
          id: string
          produto_codigo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          produto_codigo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          produto_codigo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfis_produtos_produto_codigo_fkey"
            columns: ["produto_codigo"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["codigo"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          nome?: string
          updated_at?: string
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
          produto: string | null
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
          produto: string | null
          tempo_medio_horas: number | null
        }
        Relationships: []
      }
      v_cliente_lista: {
        Row: {
          cliente: string | null
          ofertas: number | null
        }
        Relationships: []
      }
      v_cliente_media_geral: {
        Row: {
          aprovadas: number | null
          reprovadas: number | null
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
          produto: string | null
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
          produto: string | null
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
          produto: string | null
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
          produto: string | null
          reprovacoes: number | null
          rota_recorrente: string | null
        }
        Relationships: []
      }
      v_ofertas_analitico: {
        Row: {
          agente_analitico: string | null
          analista_pricing: string | null
          cliente_analitico: string | null
          coloader_analitico: string | null
          flag_aprovada: number | null
          flag_em_analise: number | null
          flag_reprovada: number | null
          id: number | null
          motivo_perda_analitico: string | null
          oferta: string | null
          pais_destino: string | null
          pais_origem: string | null
          porto_destino: string | null
          porto_origem: string | null
          rota_analitica: string | null
        }
        Insert: {
          agente_analitico?: never
          analista_pricing?: never
          cliente_analitico?: never
          coloader_analitico?: never
          flag_aprovada?: never
          flag_em_analise?: never
          flag_reprovada?: never
          id?: number | null
          motivo_perda_analitico?: never
          oferta?: string | null
          pais_destino?: never
          pais_origem?: never
          porto_destino?: never
          porto_origem?: never
          rota_analitica?: never
        }
        Update: {
          agente_analitico?: never
          analista_pricing?: never
          cliente_analitico?: never
          coloader_analitico?: never
          flag_aprovada?: never
          flag_em_analise?: never
          flag_reprovada?: never
          id?: number | null
          motivo_perda_analitico?: never
          oferta?: string | null
          pais_destino?: never
          pais_origem?: never
          porto_destino?: never
          porto_origem?: never
          rota_analitica?: never
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
          produto: string | null
          reprovadas: number | null
        }
        Relationships: []
      }
      v_qualidade_dados: {
        Row: {
          campo: string | null
          preenchidos: number | null
          preenchimento_pct: number | null
          produto: string | null
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
          produto: string | null
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
          produto: string | null
          reprovadas: number | null
          rotas: number | null
          vendedor: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      agentes_analise: {
        Args: { p_agente?: string; p_anos?: number[]; p_meses?: number[] }
        Returns: Json
      }
      agentes_analise_frete: {
        Args: {
          p_agente?: string
          p_anos?: number[]
          p_meses?: number[]
          p_modalidade?: string
        }
        Returns: Json
      }
      agentes_analise_padrao: { Args: { p_agente?: string }; Returns: Json }
      agentes_analise_periodo_calc: {
        Args: { p_agente?: string; p_anos?: number[]; p_meses?: number[] }
        Returns: Json
      }
      agentes_opcoes_filtro: { Args: never; Returns: Json }
      analistas_analise: {
        Args: { p_analista?: string; p_anos?: number[]; p_meses?: number[] }
        Returns: Json
      }
      analistas_analise_frete: {
        Args: {
          p_analista?: string
          p_anos?: number[]
          p_meses?: number[]
          p_modalidade?: string
        }
        Returns: Json
      }
      analistas_analise_padrao: { Args: { p_analista?: string }; Returns: Json }
      analistas_analise_periodo_calc: {
        Args: { p_analista?: string; p_anos?: number[]; p_meses?: number[] }
        Returns: Json
      }
      analistas_opcoes_filtro: { Args: never; Returns: Json }
      atualizar_analises: { Args: never; Returns: undefined }
      atualizar_analises_frete: { Args: never; Returns: undefined }
      atualizar_analises_periodo: { Args: never; Returns: undefined }
      coloaders_analise: {
        Args: { p_anos?: number[]; p_coloader?: string; p_meses?: number[] }
        Returns: Json
      }
      coloaders_analise_frete: {
        Args: {
          p_anos?: number[]
          p_coloader?: string
          p_meses?: number[]
          p_modalidade?: string
        }
        Returns: Json
      }
      coloaders_analise_padrao: { Args: { p_coloader?: string }; Returns: Json }
      coloaders_analise_periodo_calc: {
        Args: { p_anos?: number[]; p_coloader?: string; p_meses?: number[] }
        Returns: Json
      }
      coloaders_opcoes_filtro: { Args: never; Returns: Json }
      dashboard_analise: {
        Args: {
          p_analista?: string
          p_cliente?: string
          p_coloader?: string
          p_data_final?: string
          p_data_inicial?: string
          p_destino?: string
          p_min_decisoes?: number
          p_motivo?: string
          p_origem?: string
          p_resultado?: string
          p_rota?: string
          p_vendedor?: string
        }
        Returns: Json
      }
      dashboard_analise_filtrada: {
        Args: {
          p_analista?: string
          p_cliente?: string
          p_coloader?: string
          p_data_final?: string
          p_data_inicial?: string
          p_destino?: string
          p_min_decisoes?: number
          p_motivo?: string
          p_origem?: string
          p_resultado?: string
          p_rota?: string
          p_vendedor?: string
        }
        Returns: Json
      }
      dashboard_analise_frete: {
        Args: {
          p_analista?: string
          p_cliente?: string
          p_coloader?: string
          p_data_final?: string
          p_data_inicial?: string
          p_destino?: string
          p_min_decisoes?: number
          p_modalidade?: string
          p_motivo?: string
          p_origem?: string
          p_resultado?: string
          p_rota?: string
          p_vendedor?: string
        }
        Returns: Json
      }
      dashboard_analise_frete_rapido: {
        Args: {
          p_analista?: string
          p_cliente?: string
          p_coloader?: string
          p_data_final?: string
          p_data_inicial?: string
          p_destino?: string
          p_min_decisoes?: number
          p_modalidade?: string
          p_motivo?: string
          p_origem?: string
          p_resultado?: string
          p_rota?: string
          p_vendedor?: string
        }
        Returns: Json
      }
      dashboard_opcoes_filtro: { Args: never; Returns: Json }
      modalidades_frete_opcoes: { Args: never; Returns: Json }
      motivos_perda_analise: {
        Args: { p_anos?: number[]; p_meses?: number[]; p_motivo?: string }
        Returns: Json
      }
      motivos_perda_analise_frete: {
        Args: {
          p_anos?: number[]
          p_meses?: number[]
          p_modalidade?: string
          p_motivo?: string
        }
        Returns: Json
      }
      motivos_perda_analise_padrao: {
        Args: { p_motivo?: string }
        Returns: Json
      }
      motivos_perda_analise_periodo_calc: {
        Args: { p_anos?: number[]; p_meses?: number[]; p_motivo?: string }
        Returns: Json
      }
      motivos_perda_opcoes_filtro: { Args: never; Returns: Json }
      produto_do_usuario: { Args: never; Returns: string }
      produtos_do_usuario: { Args: never; Returns: string[] }
      qualidade_dados_analise: {
        Args: { p_anos?: number[]; p_meses?: number[] }
        Returns: Json
      }
      qualidade_dados_analise_frete: {
        Args: { p_anos?: number[]; p_meses?: number[]; p_modalidade?: string }
        Returns: Json
      }
      qualidade_dados_analise_padrao: { Args: never; Returns: Json }
      qualidade_dados_analise_periodo_calc: {
        Args: { p_anos?: number[]; p_meses?: number[] }
        Returns: Json
      }
      rotas_analise: {
        Args: {
          p_anos?: number[]
          p_meses?: number[]
          p_pais_destino?: string
          p_pais_origem?: string
          p_porto_destino?: string
          p_porto_origem?: string
          p_rota?: string
        }
        Returns: Json
      }
      rotas_analise_frete: {
        Args: {
          p_anos?: number[]
          p_meses?: number[]
          p_modalidade?: string
          p_pais_destino?: string
          p_pais_origem?: string
          p_porto_destino?: string
          p_porto_origem?: string
          p_rota?: string
        }
        Returns: Json
      }
      rotas_analise_padrao: {
        Args: {
          p_pais_destino?: string
          p_pais_origem?: string
          p_porto_destino?: string
          p_porto_origem?: string
          p_rota?: string
        }
        Returns: Json
      }
      rotas_analise_periodo_calc: {
        Args: {
          p_anos?: number[]
          p_meses?: number[]
          p_pais_destino?: string
          p_pais_origem?: string
          p_porto_destino?: string
          p_porto_origem?: string
          p_rota?: string
        }
        Returns: Json
      }
      rotas_opcoes_filtro: { Args: never; Returns: Json }
      tem_papel: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      usuario_ativo: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "usuario"
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
    Enums: {
      app_role: ["admin", "usuario"],
    },
  },
} as const
