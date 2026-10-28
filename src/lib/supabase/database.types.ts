export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      anforderung: {
        Row: {
          ablehnungsgrund: string | null;
          ausserplanmaessig: boolean;
          begruendung: string | null;
          beschreibung: string | null;
          bestellnummer: string | null;
          bestellt_am: string | null;
          bestellt_von: string | null;
          betrag_cent: number;
          budgetposten_id: string | null;
          created_at: string;
          eingereicht_am: string | null;
          ersteller_id: string;
          gewuenscht_bis: string | null;
          gf_am: string | null;
          gf_von: string | null;
          id: string;
          key_result_id: string | null;
          lieferant: string | null;
          link: string | null;
          nr: number;
          periode_id: string;
          status: Database["public"]["Enums"]["anforderung_status"];
          team_id: string;
          teamleitung_am: string | null;
          teamleitung_von: string | null;
          titel: string;
          braucht_gf: boolean | null;
          darf_freigeben: boolean | null;
          ist_ausserplanmaessig: boolean | null;
        };
        ComputedFields: "braucht_gf" | "darf_freigeben" | "ist_ausserplanmaessig";
        Insert: {
          ablehnungsgrund?: string | null;
          ausserplanmaessig?: boolean;
          begruendung?: string | null;
          beschreibung?: string | null;
          bestellnummer?: string | null;
          bestellt_am?: string | null;
          bestellt_von?: string | null;
          betrag_cent: number;
          budgetposten_id?: string | null;
          created_at?: string;
          eingereicht_am?: string | null;
          ersteller_id: string;
          gewuenscht_bis?: string | null;
          gf_am?: string | null;
          gf_von?: string | null;
          id?: string;
          key_result_id?: string | null;
          lieferant?: string | null;
          link?: string | null;
          nr?: never;
          periode_id: string;
          status?: Database["public"]["Enums"]["anforderung_status"];
          team_id: string;
          teamleitung_am?: string | null;
          teamleitung_von?: string | null;
          titel: string;
        };
        Update: {
          ablehnungsgrund?: string | null;
          ausserplanmaessig?: boolean;
          begruendung?: string | null;
          beschreibung?: string | null;
          bestellnummer?: string | null;
          bestellt_am?: string | null;
          bestellt_von?: string | null;
          betrag_cent?: number;
          budgetposten_id?: string | null;
          created_at?: string;
          eingereicht_am?: string | null;
          ersteller_id?: string;
          gewuenscht_bis?: string | null;
          gf_am?: string | null;
          gf_von?: string | null;
          id?: string;
          key_result_id?: string | null;
          lieferant?: string | null;
          link?: string | null;
          nr?: never;
          periode_id?: string;
          status?: Database["public"]["Enums"]["anforderung_status"];
          team_id?: string;
          teamleitung_am?: string | null;
          teamleitung_von?: string | null;
          titel?: string;
        };
        Relationships: [
          {
            foreignKeyName: "anforderung_bestellt_von_fkey";
            columns: ["bestellt_von"];
            isOneToOne: false;
            referencedRelation: "profile";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "anforderung_budgetposten_id_periode_id_team_id_fkey";
            columns: ["budgetposten_id", "periode_id", "team_id"];
            isOneToOne: false;
            referencedRelation: "budgetposten";
            referencedColumns: ["id", "periode_id", "team_id"];
          },
          {
            foreignKeyName: "anforderung_ersteller_id_fkey";
            columns: ["ersteller_id"];
            isOneToOne: false;
            referencedRelation: "profile";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "anforderung_gf_von_fkey";
            columns: ["gf_von"];
            isOneToOne: false;
            referencedRelation: "profile";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "anforderung_key_result_id_periode_id_fkey";
            columns: ["key_result_id", "periode_id"];
            isOneToOne: false;
            referencedRelation: "key_result";
            referencedColumns: ["id", "periode_id"];
          },
          {
            foreignKeyName: "anforderung_periode_id_fkey";
            columns: ["periode_id"];
            isOneToOne: false;
            referencedRelation: "periode";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "anforderung_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "team";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "anforderung_teamleitung_von_fkey";
            columns: ["teamleitung_von"];
            isOneToOne: false;
            referencedRelation: "profile";
            referencedColumns: ["id"];
          },
        ];
      };
      anforderung_datei: {
        Row: {
          anforderung_id: string;
          content_type: string | null;
          created_at: string;
          groesse: number | null;
          id: string;
          name: string;
          pfad: string;
        };
        ComputedFields: never;
        Insert: {
          anforderung_id: string;
          content_type?: string | null;
          created_at?: string;
          groesse?: number | null;
          id?: string;
          name: string;
          pfad: string;
        };
        Update: {
          anforderung_id?: string;
          content_type?: string | null;
          created_at?: string;
          groesse?: number | null;
          id?: string;
          name?: string;
          pfad?: string;
        };
        Relationships: [
          {
            foreignKeyName: "anforderung_datei_anforderung_id_fkey";
            columns: ["anforderung_id"];
            isOneToOne: false;
            referencedRelation: "anforderung";
            referencedColumns: ["id"];
          },
        ];
      };
      anforderung_ereignis: {
        Row: {
          aktion: string;
          anforderung_id: string;
          id: number;
          kommentar: string | null;
          person_id: string;
          zeit: string;
        };
        ComputedFields: never;
        Insert: {
          aktion: string;
          anforderung_id: string;
          id?: never;
          kommentar?: string | null;
          person_id: string;
          zeit?: string;
        };
        Update: {
          aktion?: string;
          anforderung_id?: string;
          id?: never;
          kommentar?: string | null;
          person_id?: string;
          zeit?: string;
        };
        Relationships: [
          {
            foreignKeyName: "anforderung_ereignis_anforderung_id_fkey";
            columns: ["anforderung_id"];
            isOneToOne: false;
            referencedRelation: "anforderung";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "anforderung_ereignis_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "profile";
            referencedColumns: ["id"];
          },
        ];
      };
      budgetposten: {
        Row: {
          created_at: string;
          geplant_cent: number;
          id: string;
          key_result_id: string | null;
          name: string;
          periode_id: string;
          team_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          geplant_cent?: number;
          id?: string;
          key_result_id?: string | null;
          name: string;
          periode_id: string;
          team_id: string;
        };
        Update: {
          created_at?: string;
          geplant_cent?: number;
          id?: string;
          key_result_id?: string | null;
          name?: string;
          periode_id?: string;
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "budgetposten_key_result_id_periode_id_fkey";
            columns: ["key_result_id", "periode_id"];
            isOneToOne: false;
            referencedRelation: "key_result";
            referencedColumns: ["id", "periode_id"];
          },
          {
            foreignKeyName: "budgetposten_periode_id_fkey";
            columns: ["periode_id"];
            isOneToOne: false;
            referencedRelation: "periode";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "budgetposten_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "team";
            referencedColumns: ["id"];
          },
        ];
      };
      einstellungen: {
        Row: {
          gf_grenze_cent: number;
          id: boolean;
        };
        ComputedFields: never;
        Insert: {
          gf_grenze_cent?: number;
          id?: boolean;
        };
        Update: {
          gf_grenze_cent?: number;
          id?: boolean;
        };
        Relationships: [];
      };
      key_result: {
        Row: {
          id: string;
          kuerzel: string;
          periode_id: string;
          team_id: string | null;
          titel: string;
          okr_budget_vorschlag_cent: number | null;
          okr_entfallen: boolean;
          okr_id: string | null;
          okr_top_kr: string | null;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          kuerzel: string;
          periode_id: string;
          team_id?: string | null;
          titel: string;
          okr_budget_vorschlag_cent?: number | null;
          okr_entfallen?: boolean;
          okr_id?: string | null;
          okr_top_kr?: string | null;
        };
        Update: {
          id?: string;
          kuerzel?: string;
          periode_id?: string;
          team_id?: string | null;
          titel?: string;
          okr_budget_vorschlag_cent?: number | null;
          okr_entfallen?: boolean;
          okr_id?: string | null;
          okr_top_kr?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "key_result_periode_id_fkey";
            columns: ["periode_id"];
            isOneToOne: false;
            referencedRelation: "periode";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "key_result_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "team";
            referencedColumns: ["id"];
          },
        ];
      };
      mail_protokoll: {
        Row: {
          an: string[];
          anforderung_id: string | null;
          anlass: string;
          ausgeloest_von: string | null;
          betreff: string | null;
          fehler: string | null;
          id: number;
          status: string;
          zeit: string;
        };
        ComputedFields: never;
        Insert: {
          an?: string[];
          anforderung_id?: string | null;
          anlass: string;
          ausgeloest_von?: string | null;
          betreff?: string | null;
          fehler?: string | null;
          id?: never;
          status: string;
          zeit?: string;
        };
        Update: {
          an?: string[];
          anforderung_id?: string | null;
          anlass?: string;
          ausgeloest_von?: string | null;
          betreff?: string | null;
          fehler?: string | null;
          id?: never;
          status?: string;
          zeit?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mail_protokoll_anforderung_id_fkey";
            columns: ["anforderung_id"];
            isOneToOne: false;
            referencedRelation: "anforderung";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mail_protokoll_ausgeloest_von_fkey";
            columns: ["ausgeloest_von"];
            isOneToOne: false;
            referencedRelation: "profile";
            referencedColumns: ["id"];
          },
        ];
      };
      periode: {
        Row: {
          beginn: string;
          created_at: string;
          ende: string;
          id: string;
          name: string;
          status: Database["public"]["Enums"]["periode_status"];
          okr_version: number | null;
          okr_zyklus: string | null;
        };
        ComputedFields: never;
        Insert: {
          beginn: string;
          created_at?: string;
          ende: string;
          id?: string;
          name: string;
          status?: Database["public"]["Enums"]["periode_status"];
          okr_version?: number | null;
          okr_zyklus?: string | null;
        };
        Update: {
          beginn?: string;
          created_at?: string;
          ende?: string;
          id?: string;
          name?: string;
          status?: Database["public"]["Enums"]["periode_status"];
          okr_version?: number | null;
          okr_zyklus?: string | null;
        };
        Relationships: [];
      };
      profile: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          ist_admin: boolean;
          ist_einkauf: boolean;
          ist_finanzen: boolean;
          ist_gf: boolean;
          name: string;
          team_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          email: string;
          id: string;
          ist_admin?: boolean;
          ist_einkauf?: boolean;
          ist_finanzen?: boolean;
          ist_gf?: boolean;
          name: string;
          team_id?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          ist_admin?: boolean;
          ist_einkauf?: boolean;
          ist_finanzen?: boolean;
          ist_gf?: boolean;
          name?: string;
          team_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profile_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "team";
            referencedColumns: ["id"];
          },
        ];
      };
      team: {
        Row: {
          created_at: string;
          id: string;
          leitung_id: string | null;
          name: string;
          nur_mitglieder: boolean;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          leitung_id?: string | null;
          name: string;
          nur_mitglieder?: boolean;
        };
        Update: {
          created_at?: string;
          id?: string;
          leitung_id?: string | null;
          name?: string;
          nur_mitglieder?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "team_leitung_id_fkey";
            columns: ["leitung_id"];
            isOneToOne: false;
            referencedRelation: "profile";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      anforderung_ablehnen: { Args: { p_grund: string; p_id: string }; Returns: undefined };
      anforderung_bearbeitbar: { Args: { p_anforderung: string }; Returns: boolean };
      anforderung_bestellen: {
        Args: { p_bestellnummer?: string; p_id: string };
        Returns: undefined;
      };
      anforderung_einreichen: { Args: { p_id: string }; Returns: undefined };
      anforderung_freigeben: {
        Args: { p_id: string; p_kommentar?: string };
        Returns: Database["public"]["Enums"]["anforderung_status"];
      };
      anforderung_holen: {
        Args: { p_id: string };
        Returns: {
          ablehnungsgrund: string | null;
          ausserplanmaessig: boolean;
          begruendung: string | null;
          beschreibung: string | null;
          bestellnummer: string | null;
          bestellt_am: string | null;
          bestellt_von: string | null;
          betrag_cent: number;
          budgetposten_id: string | null;
          created_at: string;
          eingereicht_am: string | null;
          ersteller_id: string;
          gewuenscht_bis: string | null;
          gf_am: string | null;
          gf_von: string | null;
          id: string;
          key_result_id: string | null;
          lieferant: string | null;
          link: string | null;
          nr: number;
          periode_id: string;
          status: Database["public"]["Enums"]["anforderung_status"];
          team_id: string;
          teamleitung_am: string | null;
          teamleitung_von: string | null;
          titel: string;
        };
        SetofOptions: {
          from: "*";
          to: "anforderung";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      anforderung_zurueckziehen: { Args: { p_id: string }; Returns: undefined };
      braucht_gf: {
        Args: {
          a: Omit<
            Database["public"]["Tables"]["anforderung"]["Row"],
            Database["public"]["Tables"]["anforderung"]["ComputedFields"]
          >;
        };
        Returns: boolean;
      };
      budget_stand: {
        Args: { p_periode: string };
        Returns: {
          budgetposten_id: string;
          gebunden_cent: number;
          geplant_cent: number;
          in_freigabe_cent: number;
          key_result_id: string;
          name: string;
          team_id: string;
          verfuegbar_cent: number;
        }[];
      };
      darf_anforderung_sehen: { Args: { p_ersteller: string; p_team: string }; Returns: boolean };
      darf_angebot_sehen: { Args: { p_pfad: string }; Returns: boolean };
      darf_fuer_team_anfordern: { Args: { p_team: string }; Returns: boolean };
      darf_freigeben: {
        Args: {
          a: Omit<
            Database["public"]["Tables"]["anforderung"]["Row"],
            Database["public"]["Tables"]["anforderung"]["ComputedFields"]
          >;
        };
        Returns: boolean;
      };
      darf_team_sehen: { Args: { p_team: string }; Returns: boolean };
      gebunden_cent: { Args: { p_budgetposten: string; p_ohne?: string }; Returns: number };
      ist_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      ist_ausserplanmaessig: {
        Args: {
          a: Omit<
            Database["public"]["Tables"]["anforderung"]["Row"],
            Database["public"]["Tables"]["anforderung"]["ComputedFields"]
          >;
        };
        Returns: boolean;
      };
      ist_einkauf: { Args: Record<PropertyKey, never>; Returns: boolean };
      ist_finanzen: { Args: Record<PropertyKey, never>; Returns: boolean };
      ist_gf: { Args: Record<PropertyKey, never>; Returns: boolean };
      ist_teamleitung: { Args: { p_team: string }; Returns: boolean };
      mail_empfaenger: {
        Args: { p_anforderung: string; p_anlass: string };
        Returns: {
          email: string;
        }[];
      };
      mail_protokollieren: {
        Args: {
          p_an: string[];
          p_anforderung: string;
          p_anlass: string;
          p_betreff: string;
          p_fehler: string;
          p_status: string;
        };
        Returns: undefined;
      };
      name_aus_metadaten: { Args: { email: string; meta: Json }; Returns: string };
      okr_uebernehmen: { Args: { p_set: Json }; Returns: Json };
      periode_kopieren: {
        Args: { p_quelle: string; p_ziel: string };
        Returns: { kopierte_key_results: number; kopierte_posten: number }[];
      };
      sieht_alle_teams: { Args: Record<PropertyKey, never>; Returns: boolean };
    };
    Enums: {
      anforderung_status:
        | "entwurf"
        | "bei_teamleitung"
        | "bei_gf"
        | "freigegeben"
        | "bestellt"
        | "abgelehnt";
      periode_status: "planung" | "aktiv" | "abgeschlossen";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      anforderung_status: [
        "entwurf",
        "bei_teamleitung",
        "bei_gf",
        "freigegeben",
        "bestellt",
        "abgelehnt",
      ],
      periode_status: ["planung", "aktiv", "abgeschlossen"],
    },
  },
} as const;
