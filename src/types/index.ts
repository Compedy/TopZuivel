
export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            products: {
                Row: {
                    id: string
                    name: string
                    category: string
                    type_group: string
                    price: number
                    unit_label: string
                    is_price_per_kilo: boolean
                    weight_per_unit: number
                    is_active: boolean
                    sort_order: number | null
                    stock_quantity: number
                    is_deleted: boolean
                }
                Insert: {
                    id?: string
                    name: string
                    category: string
                    type_group?: string | null
                    price: number
                    unit_label: string
                    is_price_per_kilo?: boolean
                    weight_per_unit?: number | null
                    is_active?: boolean
                    sort_order?: number | null
                    stock_quantity?: number
                }
                Update: {
                    id?: string
                    name?: string
                    category?: string
                    type_group?: string
                    price?: number
                    unit_label?: string
                    is_price_per_kilo?: boolean
                    weight_per_unit?: number
                    is_active?: boolean
                    sort_order?: number | null
                    stock_quantity?: number
                }
                Relationships: []
            }
            orders: {
                Row: {
                    id: string
                    company_name: string | null
                    email: string | null
                    created_at: string
                    week_number: number | null
                    status: string
                    notes: string | null
                    order_number: number
                    is_invoiced: boolean
                }
                Insert: {
                    id?: string
                    company_name?: string | null
                    email?: string | null
                    created_at?: string
                    week_number?: number | null
                    status?: string
                    notes?: string | null
                    order_number?: number
                    is_invoiced?: boolean
                }
                Update: {
                    id?: string
                    company_name?: string | null
                    email?: string | null
                    created_at?: string
                    week_number?: number | null
                    status?: string
                    notes?: string | null
                    order_number?: number
                    is_invoiced?: boolean
                }
                Relationships: []
            }
            order_items: {
                Row: {
                    id: string
                    order_id: string
                    product_id: string | null
                    quantity: number
                    price_snapshot: number
                    actual_weight: number | null
                    is_completed: boolean
                }
                Insert: {
                    id?: string
                    order_id: string
                    product_id?: string | null
                    quantity: number
                    price_snapshot: number
                    actual_weight?: number | null
                    is_completed?: boolean
                }
                Update: {
                    id?: string
                    order_id?: string
                    product_id?: string | null
                    quantity?: number
                    price_snapshot?: number
                    actual_weight?: number | null
                    is_completed?: boolean
                }
                Relationships: [
                    {
                        foreignKeyName: "order_items_order_id_fkey"
                        columns: ["order_id"]
                        isOneToOne: false
                        referencedRelation: "orders"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "order_items_product_id_fkey"
                        columns: ["product_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    }
                ]
            }
            recurring_orders: {
                Row: {
                    id: string
                    company_name: string
                    email: string
                    price_modifier: number
                    is_active: boolean
                    created_at: string
                    updated_at: string
                    interval: 'weekly' | 'bi-weekly' | 'monthly' | 'manual'
                }
                Insert: {
                    id?: string
                    company_name: string
                    email: string
                    price_modifier?: number
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                    interval?: 'weekly' | 'bi-weekly' | 'monthly' | 'manual'
                }
                Update: {
                    id?: string
                    company_name?: string
                    email?: string
                    price_modifier?: number
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                    interval?: 'weekly' | 'bi-weekly' | 'monthly' | 'manual'
                }
                Relationships: []
            }
            recurring_order_items: {
                Row: {
                    id: string
                    recurring_order_id: string
                    product_id: string
                    quantity: number
                }
                Insert: {
                    id?: string
                    recurring_order_id: string
                    product_id: string
                    quantity: number
                }
                Update: {
                    id?: string
                    recurring_order_id?: string
                    product_id?: string
                    quantity?: number
                }
                Relationships: [
                    {
                        foreignKeyName: "recurring_order_items_recurring_order_id_fkey"
                        columns: ["recurring_order_id"]
                        isOneToOne: false
                        referencedRelation: "recurring_orders"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "recurring_order_items_product_id_fkey"
                        columns: ["product_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    }
                ]
            }
            store_settings: {
                Row: {
                    id: string
                    key: string
                    value: Json
                    updated_at: string
                }
                Insert: {
                    id?: string
                    key: string
                    value: Json
                    updated_at?: string
                }
                Update: {
                    id?: string
                    key?: string
                    value?: Json
                    updated_at?: string
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

export type Product = Database['public']['Tables']['products']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type RecurringOrder = Database['public']['Tables']['recurring_orders']['Row']
export type RecurringOrderItem = Database['public']['Tables']['recurring_order_items']['Row']
export type OrderWithItems = Order & {
    order_items: (OrderItem & {
        products: {
            name: string
            unit_label: string
            category: string
            is_price_per_kilo: boolean
            weight_per_unit: number
            stock_quantity: number
            sort_order: number | null
            is_deleted: boolean
        } | null
    })[]
}
