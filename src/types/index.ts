
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
            }
            orders: {
                Row: {
                    id: string
                    company_name: string | null
                    email: string | null
                    created_at: string
                    week_number: number | null
                    status: string
                }
                Insert: {
                    id?: string
                    company_name: string | null
                    email?: string | null
                    created_at?: string
                    week_number?: number | null
                    status?: string
                }
                Update: {
                    id?: string
                    company_name: string | null
                    email?: string | null
                    created_at?: string
                    week_number?: number | null
                    status?: string
                }
            }
            order_items: {
                Row: {
                    id: string
                    order_id: string
                    product_id: string | null
                    quantity: number
                    price_snapshot: number
                    actual_weight: number | null
                }
                Insert: {
                    id?: string
                    order_id: string
                    product_id?: string | null
                    quantity: number
                    price_snapshot: number
                    actual_weight?: number | null
                }
                Update: {
                    id?: string
                    order_id?: string
                    product_id?: string | null
                    quantity?: number
                    price_snapshot?: number
                    actual_weight?: number | null
                }
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
                }
                Insert: {
                    id?: string
                    company_name: string
                    email: string
                    price_modifier?: number
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    company_name?: string
                    email?: string
                    price_modifier?: number
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
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
            }
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
        } | null
    })[]
}
