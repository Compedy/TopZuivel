
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
            profiles: {
                Row: {
                    id: string
                    business_name: string | null
                    email: string | null
                    role: 'admin' | 'customer'
                    created_at: string
                }
                Insert: {
                    id: string
                    business_name?: string | null
                    email?: string | null
                    role?: 'admin' | 'customer'
                    created_at?: string
                }
                Update: {
                    id?: string
                    business_name?: string | null
                    email?: string | null
                    role?: 'admin' | 'customer'
                    created_at?: string
                }
            }
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
                }
                Insert: {
                    id?: string
                    name: string
                    category: string
                    type_group: string
                    price: number
                    unit_label: string
                    is_price_per_kilo?: boolean
                    weight_per_unit: number
                    is_active?: boolean
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
                }
            }
            orders: {
                Row: {
                    id: string
                    user_id: string
                    created_at: string
                    week_number: number | null
                    status: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    created_at?: string
                    week_number?: number | null
                    status?: string
                }
                Update: {
                    id?: string
                    user_id?: string
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
                }
                Insert: {
                    id?: string
                    order_id: string
                    product_id?: string | null
                    quantity: number
                    price_snapshot: number
                }
                Update: {
                    id?: string
                    order_id?: string
                    product_id?: string | null
                    quantity?: number
                    price_snapshot?: number
                }
            }
        }
    }
}

export type Product = Database['public']['Tables']['products']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
