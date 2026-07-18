import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, KeyRound, LogOut, UserCog } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/menu/config/")({
  component: ConfigPage,
});

interface Me {
  fullName: string;
  email: string;
  role: string;
}
interface SysUser {
  id: string;
  email: string;
  fullName: string;
  role: "ADMIN" | "STAFF";
  isActive: boolean;
  isProfessional: boolean;
}

const roleLabel = (r: string) => (r === "ADMIN" ? "Administrador" : "Equipe");

function ConfigPage() {
  return (
    <AppShell>
      <Config />
    </AppShell>
  );
}

function Config() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<SysUser | "new" | null>(null);

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<Me>("/users/me"),
    retry: false,
  });

  const users = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<SysUser[]>("/users"),
    retry: false,
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[0.6rem] uppercase tracking-[0.4em] text-blood">
          Sistema
        </p>
        <h1 className="mt-1 font-serif text-3xl text-parchment">Configurações</h1>
      </div>

      {/* Perfil */}
      <section className="space-y-2">
        <SectionTitle>Meu perfil</SectionTitle>
        <Card className="border-border bg-card/60 p-4">
          {me.isLoading ? (
            <Skeleton className="h-12" />
          ) : (
            <div>
              <p className="text-sm text-parchment">
                {me.data?.fullName ?? user?.fullName}
              </p>
              <p className="text-xs text-muted-foreground">
                {me.data?.email ?? user?.email} · {roleLabel(me.data?.role ?? user?.role ?? "")}
              </p>
            </div>
          )}
          <div className="mt-4 flex flex-col gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate({ to: "/menu/forgot-password" })}
            >
              <KeyRound className="h-4 w-4" /> Trocar senha
            </Button>
            <Button
              variant="ghost"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={() => {
                void logout();
                void navigate({ to: "/menu/login" });
              }}
            >
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </Card>
      </section>

      {/* Usuários & profissionais */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <SectionTitle>Usuários & profissionais</SectionTitle>
          <Button size="sm" className="gap-1" onClick={() => setSheet("new")}>
            <Plus className="h-4 w-4" /> Novo
          </Button>
        </div>

        {users.isLoading ? (
          <Skeleton className="h-40 rounded-lg" />
        ) : users.isError ? (
          <Card className="border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
            Não foi possível carregar. Verifique se o servidor está no ar.
          </Card>
        ) : (
          <div className="space-y-2">
            {(users.data ?? []).map((u) => (
              <button key={u.id} onClick={() => setSheet(u)} className="w-full text-left">
                <Card className="flex items-center gap-3 border-border bg-card/60 p-3 transition-colors hover:border-blood/50">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-blood">
                    <UserCog className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-parchment">
                      {u.fullName}
                      {!u.isActive && (
                        <span className="ml-2 text-xs text-muted-foreground">(inativo)</span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {roleLabel(u.role)}
                      {u.isProfessional && " · profissional"}
                    </p>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
      </section>

      <UserSheet
        open={sheet !== null}
        userItem={sheet === "new" ? null : sheet}
        onClose={() => setSheet(null)}
      />
    </div>
  );
}

function UserSheet({
  open,
  userItem,
  onClose,
}: {
  open: boolean;
  userItem: SysUser | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!userItem;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STAFF");
  const [isProfessional, setIsProfessional] = useState(true);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setFullName(userItem?.fullName ?? "");
    setEmail(userItem?.email ?? "");
    setPassword("");
    setRole(userItem?.role ?? "STAFF");
    setIsProfessional(userItem?.isProfessional ?? true);
    setIsActive(userItem?.isActive ?? true);
  }, [open, userItem]);

  const save = useMutation({
    mutationFn: () => {
      if (isEdit) {
        return apiFetch(`/users/${userItem!.id}`, {
          method: "PATCH",
          body: JSON.stringify({ fullName, role, isProfessional, isActive }),
        });
      }
      return apiFetch("/users", {
        method: "POST",
        body: JSON.stringify({ email, password, fullName, role, isProfessional }),
      });
    },
    onSuccess: () => {
      toast.success(isEdit ? "Usuário atualizado ✦" : "Usuário criado ✦");
      void qc.invalidateQueries({ queryKey: ["users"] });
      void qc.invalidateQueries({ queryKey: ["professionals"] });
      onClose();
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível salvar"),
  });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl text-parchment">
            {isEdit ? "Editar usuário" : "Novo usuário"}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4">
          <div className="space-y-1.5">
            <Label>Nome completo</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-11" />
          </div>

          {!isEdit && (
            <>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label>Senha</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" placeholder="mín. 8, maiúscula, minúscula, número" />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label>Papel</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Administrador</SelectItem>
                <SelectItem value="STAFF">Equipe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label>É profissional (aparece na agenda)</Label>
            <Switch checked={isProfessional} onCheckedChange={setIsProfessional} />
          </div>

          {isEdit && (
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          )}

          <SheetFooter className="px-0">
            <Button
              onClick={() => {
                if (fullName.trim().length < 3) return toast.error("Informe o nome");
                if (!isEdit && !email) return toast.error("Informe o e-mail");
                if (!isEdit && password.length < 8)
                  return toast.error("Senha muito curta");
                save.mutate();
              }}
              disabled={save.isPending}
              className="h-11 w-full"
            >
              {save.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className={cn("text-xs uppercase tracking-[0.3em] text-muted-foreground")}>
      {children}
    </h2>
  );
}
