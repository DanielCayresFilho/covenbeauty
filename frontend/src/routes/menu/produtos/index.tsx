import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search, Trash2, Tag, PackagePlus } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/menu/produtos/")({
  component: ProdutosPage,
});

interface Category {
  id: string;
  name: string;
  description: string | null;
  _count?: { products: number };
}
interface Product {
  id: string;
  name: string;
  description: string | null;
  type: "INTERNAL_USE" | "SALE";
  price: string;
  unitsInStock: number;
  quantityPerUnit: string;
  measureUnit: "ML" | "G";
  usableQuantity: string;
  categoryId: string;
  category: { id: string; name: string };
  ownerId: string | null;
}
interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; pages: number };
}

const brl = (v: string | number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (v: string | number) => Number(v).toLocaleString("pt-BR");
const typeLabel = (t: string) => (t === "SALE" ? "Venda" : "Uso interno");

function useDebounce<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function ProdutosPage() {
  return (
    <AppShell>
      <Produtos />
    </AppShell>
  );
}

function Produtos() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search);
  const [sheet, setSheet] = useState<Product | "new" | null>(null);
  const [catsOpen, setCatsOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("all");

  useEffect(() => setPage(1), [debounced, categoryId]);

  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<Category[]>("/categories"),
    retry: false,
  });

  const query = useQuery({
    queryKey: ["products", debounced, page, categoryId],
    queryFn: () =>
      apiFetch<Paginated<Product>>(
        `/products?search=${encodeURIComponent(debounced)}&page=${page}&limit=20` +
          (categoryId !== "all" ? `&categoryId=${categoryId}` : ""),
      ),
    retry: false,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[0.6rem] uppercase tracking-[0.4em] text-blood">
            Cadastro
          </p>
          <h1 className="mt-1 font-serif text-3xl text-parchment">Produtos</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setCatsOpen(true)} title="Categorias">
            <Tag className="h-4 w-4" />
          </Button>
          <Button onClick={() => setSheet("new")} className="gap-2">
            <Plus className="h-4 w-4" /> Novo
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto"
            className="h-11 pl-9"
          />
        </div>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="h-11 w-40 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {(categories.data ?? []).map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <Card className="border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
          Não foi possível carregar. Verifique se o servidor está no ar.
        </Card>
      ) : query.data!.data.length === 0 ? (
        <Card className="border-dashed border-border bg-transparent p-8 text-center text-sm text-muted-foreground">
          Nenhum produto cadastrado ainda.
        </Card>
      ) : (
        <div className="space-y-2">
          {query.data!.data.map((p) => (
            <button key={p.id} onClick={() => setSheet(p)} className="w-full text-left">
              <Card className="border-border bg-card/60 p-3 transition-colors hover:border-blood/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-parchment">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.category.name} · {typeLabel(p.type)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-parchment">{brl(p.price)}</span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    Estoque:{" "}
                    <span className="text-parchment">
                      {num(p.usableQuantity)} {p.measureUnit}
                    </span>
                  </span>
                  <span>·</span>
                  <span>{p.unitsInStock} un</span>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      {query.data && query.data.meta.pages > 1 && (
        <div className="flex items-center justify-between pt-1 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-muted-foreground">
            {page} / {query.data.meta.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= query.data.meta.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      )}

      <ProductSheet
        open={sheet !== null}
        product={sheet === "new" ? null : sheet}
        categories={categories.data ?? []}
        onClose={() => setSheet(null)}
        onManageCategories={() => setCatsOpen(true)}
      />
      <CategoriesSheet open={catsOpen} onClose={() => setCatsOpen(false)} />
    </div>
  );
}

// ─────────────── Produto: criar/editar + reposição ───────────────

const productSchema = z.object({
  name: z.string().min(2, "Informe o nome").max(120),
  description: z.string().max(1000).optional(),
  categoryId: z.string().uuid("Selecione uma categoria"),
  type: z.enum(["INTERNAL_USE", "SALE"]),
  price: z.coerce.number().min(0, "Preço inválido"),
  quantityPerUnit: z.coerce.number().positive("Deve ser maior que zero"),
  measureUnit: z.enum(["ML", "G"]),
  unitsInStock: z.coerce.number().int().min(0).optional(),
});
type ProductForm = z.input<typeof productSchema>;

function ProductSheet({
  open,
  product,
  categories,
  onClose,
  onManageCategories,
}: {
  open: boolean;
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onManageCategories: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!product;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ProductForm>({ resolver: zodResolver(productSchema) });

  useEffect(() => {
    if (!open) return;
    reset({
      name: product?.name ?? "",
      description: product?.description ?? "",
      categoryId: product?.categoryId ?? "",
      type: product?.type ?? "INTERNAL_USE",
      price: product?.price ?? "0",
      quantityPerUnit: product?.quantityPerUnit ?? "",
      measureUnit: product?.measureUnit ?? "ML",
      unitsInStock: product?.unitsInStock ?? 1,
    });
  }, [open, product, reset]);

  const save = useMutation({
    mutationFn: (v: z.output<typeof productSchema>) => {
      const base = {
        name: v.name,
        description: v.description || undefined,
        categoryId: v.categoryId,
        type: v.type,
        price: v.price,
        quantityPerUnit: v.quantityPerUnit,
        measureUnit: v.measureUnit,
      };
      return isEdit
        ? apiFetch(`/products/${product!.id}`, {
            method: "PATCH",
            body: JSON.stringify(base),
          })
        : apiFetch("/products", {
            method: "POST",
            body: JSON.stringify({ ...base, unitsInStock: v.unitsInStock ?? 0 }),
          });
    },
    onSuccess: () => {
      toast.success(isEdit ? "Produto atualizado" : "Produto cadastrado ✦");
      void qc.invalidateQueries({ queryKey: ["products"] });
      onClose();
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível salvar"),
  });

  const remove = useMutation({
    mutationFn: () => apiFetch(`/products/${product!.id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Produto removido");
      void qc.invalidateQueries({ queryKey: ["products"] });
      onClose();
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível remover"),
  });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl text-parchment">
            {isEdit ? "Editar produto" : "Novo produto"}
          </SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit((v) => save.mutate(v as z.output<typeof productSchema>))}
          className="space-y-4 px-4 pb-4"
        >
          <Field label="Nome" error={errors.name?.message}>
            <Input className="h-11" {...register("name")} />
          </Field>

          <Field label="Categoria" error={errors.categoryId?.message}>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Nenhuma categoria
                      </div>
                    ) : (
                      categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            <button
              type="button"
              onClick={onManageCategories}
              className="mt-1 text-xs text-blood hover:underline"
            >
              Gerenciar categorias
            </button>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo" error={errors.type?.message}>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INTERNAL_USE">Uso interno</SelectItem>
                      <SelectItem value="SALE">Venda</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Preço (R$)" error={errors.price?.message}>
              <Input type="number" step="0.01" min="0" className="h-11" {...register("price")} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Qtd por unidade" error={errors.quantityPerUnit?.message}>
              <Input type="number" step="0.001" min="0" className="h-11" {...register("quantityPerUnit")} />
            </Field>
            <Field label="Medida" error={errors.measureUnit?.message}>
              <Controller
                control={control}
                name="measureUnit"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ML">ML</SelectItem>
                      <SelectItem value="G">G</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          {!isEdit ? (
            <Field label="Unidades em estoque" error={errors.unitsInStock?.message}>
              <Input type="number" min="0" className="h-11" {...register("unitsInStock")} />
            </Field>
          ) : (
            <div className="rounded-md border border-border bg-secondary/30 p-3 text-sm">
              <p className="text-muted-foreground">
                Estoque utilizável:{" "}
                <span className="text-parchment">
                  {num(product!.usableQuantity)} {product!.measureUnit}
                </span>{" "}
                · {product!.unitsInStock} un
              </p>
            </div>
          )}

          <Field label="Descrição (opcional)" error={errors.description?.message}>
            <Textarea rows={2} {...register("description")} />
          </Field>

          <SheetFooter className="flex-col gap-2 px-0 sm:flex-col">
            <Button type="submit" disabled={save.isPending} className="h-11 w-full">
              {save.isPending ? "Salvando..." : "Salvar"}
            </Button>
            {isEdit && (
              <>
                <RestockButton productId={product!.id} />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="ghost" className="h-11 w-full text-destructive hover:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Remover produto
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover produto?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => remove.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function RestockButton({ productId }: { productId: string }) {
  const qc = useQueryClient();
  const [units, setUnits] = useState("");
  const restock = useMutation({
    mutationFn: () =>
      apiFetch(`/products/${productId}/restock`, {
        method: "POST",
        body: JSON.stringify({ units: Number(units) }),
      }),
    onSuccess: () => {
      toast.success("Estoque reposto ✦");
      setUnits("");
      void qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível repor"),
  });

  return (
    <div className="flex w-full items-end gap-2 rounded-md border border-border p-2">
      <div className="flex-1">
        <Label className="text-xs">Repor estoque (embalagens)</Label>
        <Input
          type="number"
          min="1"
          value={units}
          onChange={(e) => setUnits(e.target.value)}
          placeholder="ex.: 2"
          className="mt-1 h-10"
        />
      </div>
      <Button
        type="button"
        variant="secondary"
        className="h-10 gap-1"
        disabled={!units || Number(units) < 1 || restock.isPending}
        onClick={() => restock.mutate()}
      >
        <PackagePlus className="h-4 w-4" /> Repor
      </Button>
    </div>
  );
}

// ─────────────── Categorias ───────────────

function CategoriesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const query = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<Category[]>("/categories"),
    retry: false,
    enabled: open,
  });

  const create = useMutation({
    mutationFn: () =>
      apiFetch("/categories", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      setName("");
      void qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível criar"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["categories"] }),
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível remover"),
  });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl text-parchment">
            Categorias
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim().length >= 2) create.mutate();
            }}
            className="flex items-end gap-2"
          >
            <div className="flex-1">
              <Label className="text-xs">Nova categoria</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex.: Coloração"
                className="mt-1 h-11"
              />
            </div>
            <Button type="submit" disabled={create.isPending || name.trim().length < 2} className="h-11">
              Adicionar
            </Button>
          </form>

          {query.isLoading ? (
            <Skeleton className="h-24 rounded-lg" />
          ) : query.data && query.data.length > 0 ? (
            <div className="space-y-2">
              {query.data.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "flex items-center justify-between rounded-md border border-border p-3",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-parchment">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c._count?.products ?? 0} produto(s)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove.mutate(c.id)}
                    className="text-muted-foreground hover:text-destructive"
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Nenhuma categoria ainda.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
