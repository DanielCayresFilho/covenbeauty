import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search, Phone, Trash2, FileText } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

export const Route = createFileRoute("/menu/clientes/")({
  component: ClientesPage,
});

interface Client {
  id: string;
  fullName: string;
  birthDate: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
}
interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; pages: number };
}

function useDebounce<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function ClientesPage() {
  return (
    <AppShell>
      <Clientes />
    </AppShell>
  );
}

function Clientes() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search);
  // "new" = criar, Client = editar, null = fechado
  const [sheet, setSheet] = useState<Client | "new" | null>(null);

  useEffect(() => setPage(1), [debounced]);

  const query = useQuery({
    queryKey: ["clients", debounced, page],
    queryFn: () =>
      apiFetch<Paginated<Client>>(
        `/clients?search=${encodeURIComponent(debounced)}&page=${page}&limit=20`,
      ),
    retry: false,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[0.6rem] uppercase tracking-[0.4em] text-blood">
            Cadastro
          </p>
          <h1 className="mt-1 font-serif text-3xl text-parchment">Clientes</h1>
        </div>
        <Button onClick={() => setSheet("new")} className="gap-2">
          <Plus className="h-4 w-4" /> Novo
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone"
          className="h-11 pl-9"
        />
      </div>

      {query.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <Card className="border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
          Não foi possível carregar. Verifique se o servidor está no ar.
        </Card>
      ) : query.data!.data.length === 0 ? (
        <Card className="border-dashed border-border bg-transparent p-8 text-center text-sm text-muted-foreground">
          {debounced ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}
        </Card>
      ) : (
        <div className="space-y-2">
          {query.data!.data.map((c) => (
            <button
              key={c.id}
              onClick={() => setSheet(c)}
              className="w-full text-left"
            >
              <Card className="flex items-center gap-3 border-border bg-card/60 p-3 transition-colors hover:border-blood/50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-lg text-blood">
                  {c.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-parchment">{c.fullName}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" /> {c.phone}
                  </p>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      {query.data && query.data.meta.pages > 1 && (
        <div className="flex items-center justify-between pt-1 text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
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

      <ClientSheet
        open={sheet !== null}
        client={sheet === "new" ? null : sheet}
        onClose={() => setSheet(null)}
      />
    </div>
  );
}

// ─────────────── Formulário (criar/editar) ───────────────

const schema = z.object({
  fullName: z.string().min(3, "Informe o nome completo").max(120),
  birthDate: z.string().min(1, "Informe a data de nascimento"),
  phone: z
    .string()
    .transform((v) => v.replace(/[^\d+]/g, ""))
    .refine((v) => /^\+?[1-9]\d{7,14}$/.test(v), "Telefone inválido"),
  email: z.string().email("E-mail inválido").or(z.literal("")).optional(),
  address: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
});
type FormValues = z.input<typeof schema>;

function ClientSheet({
  open,
  client,
  onClose,
}: {
  open: boolean;
  client: Client | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isEdit = !!client;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Preenche/limpa o form quando abre.
  useEffect(() => {
    if (!open) return;
    reset({
      fullName: client?.fullName ?? "",
      birthDate: client?.birthDate ? client.birthDate.slice(0, 10) : "",
      phone: client?.phone ?? "",
      email: client?.email ?? "",
      address: client?.address ?? "",
      notes: client?.notes ?? "",
    });
  }, [open, client, reset]);

  const save = useMutation({
    mutationFn: (values: z.output<typeof schema>) => {
      const body = JSON.stringify({
        ...values,
        email: values.email || undefined,
        address: values.address || undefined,
        notes: values.notes || undefined,
      });
      return isEdit
        ? apiFetch(`/clients/${client!.id}`, { method: "PATCH", body })
        : apiFetch("/clients", { method: "POST", body });
    },
    onSuccess: () => {
      toast.success(isEdit ? "Cliente atualizado" : "Cliente cadastrado ✦");
      void qc.invalidateQueries({ queryKey: ["clients"] });
      onClose();
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível salvar"),
  });

  const remove = useMutation({
    mutationFn: () =>
      apiFetch(`/clients/${client!.id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Cliente removido");
      void qc.invalidateQueries({ queryKey: ["clients"] });
      onClose();
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível remover"),
  });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl text-parchment">
            {isEdit ? "Editar cliente" : "Novo cliente"}
          </SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit((v) => save.mutate(v as z.output<typeof schema>))}
          className="space-y-4 px-4 pb-4"
        >
          <Field label="Nome completo" error={errors.fullName?.message}>
            <Input className="h-11" {...register("fullName")} />
          </Field>
          <Field label="Data de nascimento" error={errors.birthDate?.message}>
            <Input type="date" className="h-11" {...register("birthDate")} />
          </Field>
          <Field label="Telefone" error={errors.phone?.message}>
            <Input
              inputMode="tel"
              placeholder="+5514999999999"
              className="h-11"
              {...register("phone")}
            />
          </Field>
          <Field label="E-mail (opcional)" error={errors.email?.message}>
            <Input type="email" className="h-11" {...register("email")} />
          </Field>
          <Field label="Endereço (opcional)" error={errors.address?.message}>
            <Input className="h-11" {...register("address")} />
          </Field>
          <Field label="Observação (opcional)" error={errors.notes?.message}>
            <Textarea rows={3} {...register("notes")} />
          </Field>

          <SheetFooter className="flex-col gap-2 px-0 sm:flex-col">
            <Button
              type="submit"
              disabled={save.isPending}
              className="h-11 w-full"
            >
              {save.isPending ? "Salvando..." : "Salvar"}
            </Button>

            {isEdit && (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full gap-2"
                onClick={() =>
                  navigate({
                    to: "/menu/clientes/$id/fichas",
                    params: { id: client!.id },
                  })
                }
              >
                <FileText className="h-4 w-4" /> Fichas de avaliação
              </Button>
            )}

            {isEdit && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 w-full text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Remover cliente
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover cliente?</AlertDialogTitle>
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
            )}
          </SheetFooter>
        </form>
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
