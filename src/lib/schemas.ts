import { z } from 'zod';

// Product Schema
export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Naam is verplicht"),
  category: z.string().min(1, "Categorie is verplicht"),
  type_group: z.string().nullable().optional(),
  price: z.number().positive("Prijs moet positief zijn"),
  unit_label: z.string().min(1, "Eenheid is verplicht"),
  is_price_per_kilo: z.boolean().default(false),
  weight_per_unit: z.number().nullable().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().nullable().optional(),
  stock_quantity: z.number().default(0),
});

// Cart Item Schema
export const CartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive("Aantal moet groter dan 0 zijn"),
  product: ProductSchema,
});

// Order Submission Schema
export const OrderSubmissionSchema = z.object({
  companyName: z.string().min(1, "Bedrijfsnaam is verplicht"),
  email: z.string().email("Ongeldig e-mailadres"),
  cartItems: z.array(CartItemSchema).min(1, "Winkelwagen mag niet leeg zijn"),
  notes: z.string().optional(),
});

export type OrderSubmission = z.infer<typeof OrderSubmissionSchema>;
