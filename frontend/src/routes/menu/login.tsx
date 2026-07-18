import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/menu/login")({
  component: LoginPage,
});

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

type FormValues = z.infer<typeof schema>;

function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Já autenticada? Vai direto pro painel.
  useEffect(() => {
    if (isAuthenticated) void navigate({ to: "/menu" });
  }, [isAuthenticated, navigate]);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      await login(values.email, values.password);
      toast.success("Bem-vinda de volta ✦");
      void navigate({ to: "/menu" });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Não foi possível entrar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src="/marca.png"
            alt="Coven Beauty"
            className="mb-8 w-52 max-w-[70%]"
          />
          <p className="text-[0.65rem] uppercase tracking-[0.4em] text-blood">
            Acesso restrito
          </p>
          <h1 className="mt-2 font-serif text-2xl text-parchment">
            Entrar no sistema
          </h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="voce@covenbeauty.com"
              className="h-12"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-12"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="h-12 w-full text-base"
          >
            {submitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/menu/forgot-password"
            className="text-sm text-muted-foreground transition-colors hover:text-parchment"
          >
            Esqueci minha senha
          </Link>
        </div>
      </div>
    </div>
  );
}
