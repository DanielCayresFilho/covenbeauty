-- Comanda de venda (balcão): sem agendamento + vendedor + preço na linha de produto.

-- appointment_id passa a ser nulável (comanda de venda não tem agendamento).
ALTER TABLE "comandas" ALTER COLUMN "appointment_id" DROP NOT NULL;

-- Vendedor da comanda de venda.
ALTER TABLE "comandas" ADD COLUMN "seller_id" UUID;

-- Preço unitário na linha de produto (venda).
ALTER TABLE "comanda_products" ADD COLUMN "price_snapshot" DECIMAL(10,2);
