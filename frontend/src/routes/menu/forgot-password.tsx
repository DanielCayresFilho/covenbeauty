import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { apiFetch, ApiError } from "@/lib/api";

export const Route = createFileRoute("/menu/forgot-password")({
  component: ForgotPasswordPage,
});

const emailSchema = z.object({ email: z.string().email("E-mail inválido") });
type EmailValues = z.infer<typeof emailSchema>;

const resetSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "O código tem 6 dígitos"),
  newPassword: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Use maiúscula, minúscula e número"),
});
type ResetValues = z.infer<typeof resetSchema>;

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src="/marca.png"
            alt="Coven Beauty"
            className="mb-8 w-48 max-w-[65%]"
          />
          <p className="text-[0.65rem] uppercase tracking-[0.4em] text-blood">
            Recuperar acesso
          </p>
          <h1 className="mt-2 font-serif text-2xl text-parchment">
            {step === "email" ? "Esqueci minha senha" : "Redefinir senha"}
          </h1>
        </div>

        {step === "email" ? (
          <EmailStep
            onSent={(sentEmail) => {
              setEmail(sentEmail);
              setStep("reset");
            }}
          />
        ) : (
          <ResetStep
            email={email}
            onDone={() => {
              toast.success("Senha redefinida. Faça login ✦");
              void navigate({ to: "/menu/login" });
            }}
          />
        )}

        <div className="mt-6 text-center">
          <Link
            to="/menu/login"
            className="text-sm text-muted-foreground transition-colors hover:text-parchment"
          >
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
}

function EmailStep({ onSent }: { onSent: (email: string) => void }) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailValues>({ resolver: zodResolver(emailSchema) });

  async function onSubmit(values: EmailValues) {
    setSubmitting(true);
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: values.email }),
      });
      toast.success("Se o e-mail existir, um código foi enviado.");
      onSent(values.email);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Não foi possível enviar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail da conta</Label>
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
      <Button
        type="submit"
        disabled={submitting}
        className="h-12 w-full text-base"
      >
        {submitting ? "Enviando..." : "Enviar código"}
      </Button>
    </form>
  );
}

function ResetStep({
  email,
  onDone,
}: {
  email: string;
  onDone: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ResetValues>({ resolver: zodResolver(resetSchema) });

  const code = watch("code") ?? "";

  async function onSubmit(values: ResetValues) {
    setSubmitting(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email,
          code: values.code,
          newPassword: values.newPassword,
        }),
      });
      onDone();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Não foi possível redefinir");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <p className="text-center text-sm text-muted-foreground">
        Enviamos um código para <span className="text-parchment">{email}</span>
      </p>

      <div className="flex flex-col items-center space-y-2">
        <Label htmlFor="code">Código de 6 dígitos</Label>
        <InputOTP
          maxLength={6}
          value={code}
          onChange={(v) => setValue("code", v, { shouldValidate: true })}
        >
          <InputOTPGroup>
            {Array.from({ length: 6 }).map((_, i) => (
              <InputOTPSlot key={i} index={i} className="h-12 w-10 text-lg" />
            ))}
          </InputOTPGroup>
        </InputOTP>
        {errors.code && (
          <p className="text-sm text-destructive">{errors.code.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">Nova senha</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          className="h-12"
          {...register("newPassword")}
        />
        {errors.newPassword && (
          <p className="text-sm text-destructive">{errors.newPassword.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="h-12 w-full text-base"
      >
        {submitting ? "Redefinindo..." : "Redefinir senha"}
      </Button>
    </form>
  );
}
