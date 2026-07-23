import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Check, RotateCcw } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Decalque } from "@/components/agenda/decalque";
import { apiFetch, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/menu/comandas/$id")({
  component: ComandaDetailPage,
});

const TZ = "America/Sao_Paulo";
const brl = (v: string | number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Comanda {
  id: string;
  status: "OPEN" | "CLOSED";
  paymentMethod: string | null;
  installments: number;
  notes: string | null;
  openedAt: string;
  closedAt: string | null;
  feeAmount: string | null;
  netAmount: string | null;
  client: { id: string; fullName: string; phone: string } | null;
  appointment: {
    id: string;
    startTime: string;
    decalqueFilename: string | null;
    sessionsPlanned: number | null;
    sessionNumber: number | null;
    professional: { id: string; fullName: string } | null;
  } | null;
  procedures: {
    id: string;
    procedureId: string | null;
    nameSnapshot: string;
    priceSnapshot: string;
    durationSnapshot: number;
  }[];
  products: {
    id: string;
    productId: string;
    nameSnapshot: string;
    quantityUsed: string;
    measureUnit: string;
    priceSnapshot: string | null;
  }[];
  summary: {
    subtotal: string;
    discount: string;
    total: string;
    depositPaid: string;
    amountDue: string;
  };
}

function ComandaDetailPage() {
  return (
    <AppShell>
      <ComandaDetail />
    </AppShell>
  );
}

function ComandaDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [closeOpen, setCloseOpen] = useState(false);

  const query = useQuery({
    queryKey: ["comanda", id],
    queryFn: () => apiFetch<Comanda>(`/comandas/${id}`),
    retry: false,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["comanda", id] });
    void qc.invalidateQueries({ queryKey: ["comandas"] });
    void qc.invalidateQueries({ queryKey: ["products"] });
  };

  const reopen = useMutation({
    mutationFn: () => apiFetch(`/comandas/${id}/reopen`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Comanda reaberta");
      invalidate();
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível reabrir"),
  });

  if (query.isLoading) {
    return <Skeleton className="h-96 rounded-lg" />;
  }
  if (query.isError || !query.data) {
    return (
      <Card className="border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
        Não foi possível carregar a comanda.
      </Card>
    );
  }

  const c = query.data;
  const open = c.status === "OPEN";
  const isSale = !c.appointment; // comanda de venda de balcão

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate({ to: "/menu/comandas" })}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-parchment"
      >
        <ArrowLeft className="h-4 w-4" /> Comandas
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl text-parchment">
            {c.client?.fullName ?? "Cliente"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {c.appointment
              ? `${c.appointment.professional?.fullName ?? ""} · ${formatInTimeZone(
                  new Date(c.appointment.startTime),
                  TZ,
                  "dd/MM HH:mm",
                )}`
              : `Venda de balcão · ${formatInTimeZone(new Date(c.openedAt), TZ, "dd/MM HH:mm")}`}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs",
            open ? "bg-emerald-900/40 text-emerald-300" : "bg-secondary text-muted-foreground",
          )}
        >
          {open ? "Aberta" : "Fechada"}
        </span>
      </div>

      {/* Decalque da tatuagem */}
      {c.appointment &&
        (!!c.appointment.sessionsPlanned ||
          c.appointment.sessionNumber != null ||
          !!c.appointment.decalqueFilename ||
          (c.procedures[0] && !c.procedures[0].procedureId)) && (
          <section>
            <Decalque
              appointmentId={c.appointment.id}
              decalqueFilename={c.appointment.decalqueFilename}
              canEdit={open}
              onChanged={invalidate}
            />
          </section>
        )}

      {/* Procedimentos (comanda de venda não tem) */}
      {!isSale && (
      <section className="space-y-2">
        <SectionHeader title="Procedimentos" />
        {c.procedures.map((p) => (
          <Card key={p.id} className="flex items-center gap-3 border-border bg-card/60 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-parchment">{p.nameSnapshot}</p>
              <p className="text-xs text-muted-foreground">{p.durationSnapshot}min</p>
            </div>
            <span className="text-sm text-parchment">{brl(p.priceSnapshot)}</span>
            {open && (
              <RemoveBtn
                onDone={invalidate}
                path={`/comandas/${id}/procedures/${p.id}`}
              />
            )}
          </Card>
        ))}
        {open && <AddProcedure comandaId={id} onDone={invalidate} />}
      </section>
      )}

      {/* Produtos (venda ou consumo) */}
      <section className="space-y-2">
        <SectionHeader title={isSale ? "Produtos vendidos" : "Produtos consumidos"} />
        {c.products.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum produto lançado.</p>
        )}
        {c.products.map((p) => (
          <Card key={p.id} className="flex items-center gap-3 border-border bg-card/60 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-parchment">{p.nameSnapshot}</p>
              <p className="text-xs text-muted-foreground">
                {p.priceSnapshot
                  ? `${Number(p.quantityUsed).toLocaleString("pt-BR")} un × ${brl(p.priceSnapshot)}`
                  : `${Number(p.quantityUsed).toLocaleString("pt-BR")} ${p.measureUnit}`}
              </p>
            </div>
            {p.priceSnapshot && (
              <span className="text-sm text-parchment">
                {brl(Number(p.priceSnapshot) * Number(p.quantityUsed))}
              </span>
            )}
            {open && (
              <RemoveBtn onDone={invalidate} path={`/comandas/${id}/products/${p.id}`} />
            )}
          </Card>
        ))}
        {open &&
          (isSale ? (
            <SellProduct comandaId={id} onDone={invalidate} />
          ) : (
            <AddProduct comandaId={id} onDone={invalidate} />
          ))}
      </section>

      {/* Resumo */}
      <Card className="space-y-2 border-border bg-card/60 p-4">
        <SummaryRow label="Subtotal" value={brl(c.summary.subtotal)} />
        {Number(c.summary.discount) > 0 && (
          <SummaryRow label="Desconto" value={`− ${brl(c.summary.discount)}`} />
        )}
        <SummaryRow label="Total" value={brl(c.summary.total)} strong />
        {Number(c.summary.depositPaid) > 0 && (
          <SummaryRow label="Sinal pago" value={`− ${brl(c.summary.depositPaid)}`} />
        )}
        <div className="border-t border-border pt-2">
          <SummaryRow
            label={open ? "A pagar" : "Pago"}
            value={brl(c.summary.amountDue)}
            strong
            accent
          />
        </div>
        {!open && c.paymentMethod && (
          <p className="pt-1 text-xs text-muted-foreground">
            {payLabel(c.paymentMethod)}
            {c.paymentMethod === "CREDIT" && ` ${c.installments}x`}
            {c.feeAmount && Number(c.feeAmount) > 0 && ` · taxa ${brl(c.feeAmount)}`}
          </p>
        )}
      </Card>

      {open ? (
        <Button className="h-12 w-full text-base" onClick={() => setCloseOpen(true)}>
          Fechar comanda
        </Button>
      ) : (
        <Button
          variant="outline"
          className="h-12 w-full gap-2 text-base"
          disabled={reopen.isPending}
          onClick={() => reopen.mutate()}
        >
          <RotateCcw className="h-4 w-4" />
          {reopen.isPending ? "Reabrindo..." : "Reabrir comanda"}
        </Button>
      )}

      <CloseSheet
        open={closeOpen}
        comanda={c}
        onClose={() => setCloseOpen(false)}
        onDone={() => {
          setCloseOpen(false);
          invalidate();
        }}
      />
    </div>
  );
}

// ─────────────── Adicionar procedimento ───────────────

function AddProcedure({ comandaId, onDone }: { comandaId: string; onDone: () => void }) {
  const [procedureId, setProcedureId] = useState("");
  const list = useQuery({
    queryKey: ["procedures", "all"],
    queryFn: () =>
      apiFetch<{ data: { id: string; name: string }[] }>("/procedures?limit=100"),
    retry: false,
  });
  const add = useMutation({
    mutationFn: () =>
      apiFetch(`/comandas/${comandaId}/procedures`, {
        method: "POST",
        body: JSON.stringify({ procedureId }),
      }),
    onSuccess: () => {
      setProcedureId("");
      onDone();
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Falha ao adicionar"),
  });

  return (
    <div className="flex gap-2">
      <Combobox
        className="flex-1"
        value={procedureId}
        onChange={setProcedureId}
        placeholder="Adicionar procedimento"
        searchPlaceholder="Buscar procedimento..."
        items={(list.data?.data ?? []).map((p) => ({
          value: p.id,
          label: p.name,
        }))}
      />
      <Button
        variant="secondary"
        size="icon"
        className="h-10 w-10 shrink-0"
        disabled={!procedureId || add.isPending}
        onClick={() => add.mutate()}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ─────────────── Adicionar produto consumido ───────────────

function SellProduct({ comandaId, onDone }: { comandaId: string; onDone: () => void }) {
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const list = useQuery({
    queryKey: ["products", "sale"],
    queryFn: () =>
      apiFetch<{
        data: { id: string; name: string; price: string; unitsInStock: number; type: string }[];
      }>("/products?type=SALE&limit=100"),
    retry: false,
  });
  const product = (list.data?.data ?? []).find((p) => p.id === productId);
  const sell = useMutation({
    mutationFn: () =>
      apiFetch(`/comandas/${comandaId}/sale-product`, {
        method: "POST",
        body: JSON.stringify({ productId, quantity: Number(qty) }),
      }),
    onSuccess: () => {
      setProductId("");
      setQty("1");
      onDone();
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Falha ao vender produto"),
  });

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border p-2">
      <Combobox
        value={productId}
        onChange={setProductId}
        placeholder="Vender produto (revenda)"
        searchPlaceholder="Buscar produto..."
        items={(list.data?.data ?? []).map((p) => ({
          value: p.id,
          label: p.name,
          hint: `${brl(p.price)} · ${p.unitsInStock} un`,
        }))}
      />
      {productId && (
        <div className="flex gap-2">
          <Input
            type="number"
            min="1"
            step="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="Qtd (unidades)"
            className="h-10"
          />
          <Button
            variant="secondary"
            className="h-10 shrink-0"
            disabled={!qty || Number(qty) <= 0 || sell.isPending}
            onClick={() => sell.mutate()}
          >
            {product ? brl(Number(product.price) * Number(qty || 0)) : "Vender"}
          </Button>
        </div>
      )}
    </div>
  );
}

function AddProduct({ comandaId, onDone }: { comandaId: string; onDone: () => void }) {
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const list = useQuery({
    queryKey: ["products", "all"],
    queryFn: () =>
      apiFetch<{ data: { id: string; name: string; measureUnit: string; usableQuantity: string }[] }>(
        "/products?limit=100",
      ),
    retry: false,
  });
  const product = (list.data?.data ?? []).find((p) => p.id === productId);
  const add = useMutation({
    mutationFn: () =>
      apiFetch(`/comandas/${comandaId}/products`, {
        method: "POST",
        body: JSON.stringify({ productId, quantityUsed: Number(qty) }),
      }),
    onSuccess: () => {
      setProductId("");
      setQty("");
      onDone();
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Falha ao lançar produto"),
  });

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border p-2">
      <Combobox
        value={productId}
        onChange={setProductId}
        placeholder="Lançar produto consumido"
        searchPlaceholder="Buscar produto..."
        items={(list.data?.data ?? []).map((p) => ({
          value: p.id,
          label: p.name,
          hint: `${Number(p.usableQuantity).toLocaleString("pt-BR")} ${p.measureUnit}`,
        }))}
      />
      {productId && (
        <div className="flex gap-2">
          <Input
            type="number"
            min="0"
            step="0.001"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder={`Quantidade (${product?.measureUnit})`}
            className="h-10"
          />
          <Button
            variant="secondary"
            className="h-10"
            disabled={!qty || Number(qty) <= 0 || add.isPending}
            onClick={() => add.mutate()}
          >
            Lançar
          </Button>
        </div>
      )}
    </div>
  );
}

// ─────────────── Fechar comanda ───────────────

function CloseSheet({
  open,
  comanda,
  onClose,
  onDone,
}: {
  open: boolean;
  comanda: Comanda;
  onClose: () => void;
  onDone: () => void;
}) {
  const [method, setMethod] = useState("");
  const [installments, setInstallments] = useState("1");
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const [willReturn, setWillReturn] = useState(false);
  const [returnIds, setReturnIds] = useState<string[]>([]);
  const [returnDate, setReturnDate] = useState("");

  useEffect(() => {
    if (!open) return;
    setMethod("");
    setInstallments("1");
    setDiscount("");
    setNotes("");
    setWillReturn(false);
    setReturnIds([]);
    setReturnDate("");
  }, [open]);

  const close = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        paymentMethod: method,
        discount: discount ? Number(discount) : undefined,
        notes: notes || undefined,
      };
      if (method === "CREDIT") body.installments = Number(installments);
      if (willReturn) {
        body.willReturn = true;
        body.returnProcedureIds = returnIds;
        body.returnDate = returnDate ? fromZonedTime(returnDate, TZ).toISOString() : undefined;
      }
      return apiFetch(`/comandas/${comanda.id}/close`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      toast.success("Comanda fechada ✦");
      onDone();
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível fechar"),
  });

  function submit() {
    if (!method) return toast.error("Escolha a forma de pagamento");
    if (willReturn) {
      if (returnIds.length === 0) return toast.error("Escolha os procedimentos do retorno");
      if (!returnDate) return toast.error("Informe a data do retorno");
    }
    close.mutate();
  }

  const total = Number(comanda.summary.total) - Number(discount || 0);
  const due = Math.max(total - Number(comanda.summary.depositPaid), 0);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl text-parchment">
            Fechar comanda
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4">
          <div className="space-y-1.5">
            <Label>Forma de pagamento</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEBIT">Débito</SelectItem>
                <SelectItem value="CREDIT">Crédito</SelectItem>
                <SelectItem value="PIX">PIX</SelectItem>
                <SelectItem value="CASH">Dinheiro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {method === "CREDIT" && (
            <div className="space-y-1.5">
              <Label>Parcelas</Label>
              <Input
                type="number"
                min="1"
                max="12"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                className="h-11"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Desconto (R$, opcional)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="h-11"
            />
          </div>

          <Card className="space-y-1 border-border bg-secondary/30 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="text-parchment">{brl(total)}</span>
            </div>
            {Number(comanda.summary.depositPaid) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sinal pago</span>
                <span className="text-parchment">− {brl(comanda.summary.depositPaid)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-1 font-medium">
              <span className="text-parchment">A pagar</span>
              <span className="text-blood">{brl(due)}</span>
            </div>
          </Card>

          {/* Retorno */}
          <div className="space-y-3 rounded-md border border-border p-3">
            <div className="flex items-center justify-between">
              <Label>Haverá retorno?</Label>
              <Switch checked={willReturn} onCheckedChange={setWillReturn} />
            </div>
            {willReturn && (
              <>
                <div>
                  <Label className="text-xs">Procedimentos do retorno</Label>
                  <div className="mt-1 space-y-1">
                    {comanda.procedures
                      .filter(
                        (p): p is typeof p & { procedureId: string } =>
                          !!p.procedureId,
                      )
                      .map((p) => {
                      const on = returnIds.includes(p.procedureId);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            setReturnIds((ids) =>
                              on
                                ? ids.filter((i) => i !== p.procedureId)
                                : [...ids, p.procedureId],
                            )
                          }
                          className={cn(
                            "flex w-full items-center justify-between rounded px-2.5 py-2 text-left text-sm",
                            on ? "bg-secondary text-parchment" : "text-muted-foreground",
                          )}
                        >
                          <span className="truncate">{p.nameSnapshot}</span>
                          {on && <Check className="h-4 w-4 text-blood" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Data do retorno</Label>
                  <Input
                    type="datetime-local"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="h-11"
                  />
                </div>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Observação (opcional)</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <SheetFooter className="px-0">
            <Button onClick={submit} disabled={close.isPending} className="h-11 w-full">
              {close.isPending ? "Fechando..." : "Confirmar fechamento"}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─────────────── Auxiliares ───────────────

function payLabel(m: string) {
  return { DEBIT: "Débito", CREDIT: "Crédito", PIX: "PIX", CASH: "Dinheiro" }[m] ?? m;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
      {title}
    </h2>
  );
}

function SummaryRow({
  label,
  value,
  strong,
  accent,
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          strong && "font-medium",
          accent ? "text-blood" : "text-parchment",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function RemoveBtn({ path, onDone }: { path: string; onDone: () => void }) {
  const del = useMutation({
    mutationFn: () => apiFetch(path, { method: "DELETE" }),
    onSuccess: onDone,
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Falha ao remover"),
  });
  return (
    <button
      type="button"
      onClick={() => del.mutate()}
      disabled={del.isPending}
      className="shrink-0 text-muted-foreground hover:text-destructive"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
