import { useForm, Controller, type Control, type UseFormRegister } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { apiFetch, ApiError } from "@/lib/api";
import {
  PhotoField,
  useEvaluationPhotos,
} from "@/components/evaluations/evaluation-photos";
import { SignaturePad } from "./signature-pad";

export interface EvaluationData {
  id: string;
  [key: string]: unknown;
}

// Todos os campos da ficha (espelha o backend). Tudo opcional exceto o clientId.
type FormValues = Record<string, unknown>;

const FITZPATRICK = ["I", "II", "III", "IV", "V", "VI"];
const SKIN_TYPES: [string, string][] = [
  ["DRY", "Seca"],
  ["OILY", "Oleosa"],
  ["COMBINATION", "Mista"],
  ["SENSITIVE", "Sensível"],
  ["ACNE_PRONE", "Acneica"],
];
const FOCUS: [string, string][] = [
  ["BOTH", "Ambos"],
  ["FACIAL", "Facial"],
  ["CAPILLARY", "Capilar"],
];

const numberFields = new Set([
  "sleepHoursPerNight",
  "waterIntakeLiters",
  "stressLevel",
  "sunscreenSpf",
  "washFrequencyPerWeek",
]);
const dateFields = new Set(["evaluationDate", "lastChemicalDate", "signedAt"]);

export function EvaluationForm({
  clientId,
  evaluation,
  onSaved,
}: {
  clientId: string;
  evaluation: EvaluationData | null;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!evaluation;
  // Fotos: na ficha nova ficam na fila e sobem logo após salvar.
  const photos = useEvaluationPhotos(evaluation?.id ?? null);

  const { register, handleSubmit, control } = useForm<FormValues>({
    defaultValues: buildDefaults(evaluation),
  });

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const body = cleanPayload(values);
      // Carimba a data da assinatura quando há uma nova.
      if (body.signatureDataUrl && !body.signedAt) {
        body.signedAt = new window.Date().toISOString();
      }
      return isEdit
        ? apiFetch<{ id: string }>(`/evaluations/${evaluation!.id}`, {
            method: "PATCH",
            body: JSON.stringify(body),
          })
        : apiFetch<{ id: string }>("/evaluations", {
            method: "POST",
            body: JSON.stringify({ ...body, clientId }),
          });
    },
    onSuccess: async (saved) => {
      // Ficha recém-criada: agora que existe id, envia as fotos da fila.
      if (!isEdit && photos.pendingCount > 0 && saved?.id) {
        try {
          await photos.flush(saved.id);
        } catch {
          toast.error(
            "Ficha salva, mas não foi possível enviar as fotos. Abra a ficha e tente de novo.",
          );
        }
      }
      toast.success(isEdit ? "Ficha atualizada ✦" : "Ficha salva ✦");
      void qc.invalidateQueries({ queryKey: ["evaluations", clientId] });
      onSaved();
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Não foi possível salvar"),
  });

  const ctx = { register, control };

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Sel {...ctx} name="focus" label="Foco" options={FOCUS} />
        <Date {...ctx} name="evaluationDate" label="Data da avaliação" />
      </div>

      <Accordion type="multiple" defaultValue={["saude"]} className="space-y-2">
        <Section value="saude" title="2. Histórico de saúde geral">
          <Area {...ctx} name="allergies" label="Alergias (cosméticos, medicamentos, alimentos, iodo)" />
          <Area {...ctx} name="chronicDiseases" label="Doenças crônicas (diabetes, hipertensão, tireoide)" />
          <Area {...ctx} name="hormonalChanges" label="Alterações hormonais (SOP, menopausa, anticoncepcional)" />
          <Area {...ctx} name="medications" label="Uso de medicamentos (Roacutan, corticoides, anticoagulantes)" />
          <Bool {...ctx} name="hasPacemaker" label="Possui marca-passo" />
          <Bool {...ctx} name="hasMetalImplants" label="Pinos / implantes metálicos" />
          <Bool {...ctx} name="hasDentalImplant" label="Implante dentário" />
          <Bool {...ctx} name="isPregnant" label="Grávida" />
          <Bool {...ctx} name="isBreastfeeding" label="Amamentando" />
          <Bool {...ctx} name="recentSurgery" label="Cirurgia nos últimos 6 meses" />
          <Txt {...ctx} name="recentSurgeryNotes" label="Detalhe da cirurgia (opcional)" />
        </Section>

        <Section value="habitos" title="3. Hábitos de vida">
          <div className="grid grid-cols-2 gap-3">
            <Num {...ctx} name="sleepHoursPerNight" label="Horas de sono" />
            <Num {...ctx} name="stressLevel" label="Estresse (1–10)" />
          </div>
          <Bool {...ctx} name="wakesUpTired" label="Acorda cansado" />
          <Num {...ctx} name="waterIntakeLiters" label="Água por dia (litros)" step="0.1" />
          <Bool {...ctx} name="regularBowelFunction" label="Intestino funciona regularmente" />
          <Bool {...ctx} name="smokes" label="Fuma" />
          <Bool {...ctx} name="drinksAlcohol" label="Bebe com frequência" />
          <Txt {...ctx} name="habitsNotes" label="Observações (opcional)" />
        </Section>

        <Section value="facial" title="4. Estética facial">
          <div className="grid grid-cols-2 gap-3">
            <Sel {...ctx} name="fitzpatrick" label="Fototipo" options={FITZPATRICK.map((f) => [f, f])} />
            <Sel {...ctx} name="skinType" label="Tipo de pele" options={SKIN_TYPES} />
          </div>
          <Area {...ctx} name="skincareRoutine" label="Rotina de skincare" />
          <Bool {...ctx} name="usesSunscreen" label="Usa protetor solar diariamente" />
          <div className="grid grid-cols-2 gap-3">
            <Num {...ctx} name="sunscreenSpf" label="FPS" />
            <div className="flex items-end pb-1">
              <Bool {...ctx} name="reappliesSunscreen" label="Reaplica" />
            </div>
          </div>
          <Area {...ctx} name="facialAestheticHistory" label="Histórico estético (botox, preenchimento, PDO)" />
          <Bool {...ctx} name="skinSensitivity" label="Pele vermelha/irritada com facilidade" />
          <Bool {...ctx} name="hasRosacea" label="Tem rosácea" />
          <Bool {...ctx} name="frequentSunExposure" label="Exposição solar frequente" />
          <PhotoField bucket={photos} stage="FACE" label="Fotos do rosto" />
        </Section>

        <Section value="capilar" title="5. Estética capilar (tricologia)">
          <Num {...ctx} name="washFrequencyPerWeek" label="Lavagens por semana" />
          <Area {...ctx} name="scalpComplaints" label="Queixas no couro (coceira, caspa, dor, oleosidade)" />
          <Bool {...ctx} name="hasHairLoss" label="Percebe queda excessiva" />
          <Txt {...ctx} name="hairLossDuration" label="Há quanto tempo a queda" />
          <Bool {...ctx} name="familyBaldnessHistory" label="Histórico familiar de calvície" />
          <Area {...ctx} name="chemicalTreatments" label="Químicas (progressiva, alisamento, tintura)" />
          <Date {...ctx} name="lastChemicalDate" label="Último procedimento químico" />
          <Bool {...ctx} name="usesHeatTools" label="Usa secador/chapinha/babyliss" />
          <Bool {...ctx} name="usesThermalProtector" label="Usa protetor térmico" />
          <Area {...ctx} name="hairCareRoutine" label="Rotina capilar" />
          <PhotoField bucket={photos} stage="HAIR" label="Fotos do cabelo" />
          <PhotoField bucket={photos} stage="SCALP" label="Fotos do couro cabeludo" />
        </Section>

        <Section value="consent" title="6. Consentimento e assinatura">
          <Bool {...ctx} name="declarationAccepted" label="Declaro que as informações são verdadeiras" />
          <Bool {...ctx} name="authorizesImageInternal" label="Autorizo fotos para prontuário interno" />
          <Bool {...ctx} name="authorizesImageSocialMedia" label="Autorizo fotos para redes sociais" />
          <Txt {...ctx} name="signedByName" label="Nome de quem assina" />
          <div className="space-y-1.5">
            <Label className="text-xs">Assinatura</Label>
            <Controller
              control={control}
              name="signatureDataUrl"
              render={({ field }) => (
                <SignaturePad
                  value={field.value as string | undefined}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
          <Area {...ctx} name="notes" label="Observações gerais" />
        </Section>

        <Section value="fotos" title="7. Outras fotos">
          <PhotoField bucket={photos} stage="BODY" label="Fotos corporais" />
          <PhotoField bucket={photos} stage="OTHER" label="Outras fotos" />
        </Section>
      </Accordion>

      {!isEdit && photos.pendingCount > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          {photos.pendingCount} foto{photos.pendingCount === 1 ? "" : "s"} será
          {photos.pendingCount === 1 ? "" : "ão"} enviada
          {photos.pendingCount === 1 ? "" : "s"} ao salvar a ficha.
        </p>
      )}

      <Button type="submit" disabled={save.isPending} className="h-12 w-full text-base">
        {save.isPending ? "Salvando..." : isEdit ? "Atualizar ficha" : "Salvar ficha"}
      </Button>
    </form>
  );
}

// ─────────────── Defaults / payload ───────────────

function buildDefaults(ev: EvaluationData | null): FormValues {
  if (!ev) return { focus: "BOTH" };
  const out: FormValues = {};
  for (const [k, v] of Object.entries(ev)) {
    if (v === null || v === undefined) continue;
    if (dateFields.has(k) && typeof v === "string") out[k] = v.slice(0, 10);
    else out[k] = v;
  }
  out.focus = (ev.focus as string) ?? "BOTH";
  return out;
}

function cleanPayload(values: FormValues): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v === "" || v === undefined || v === null) continue;
    if (numberFields.has(k)) {
      const n = Number(v);
      if (!Number.isNaN(n)) out[k] = n;
    } else {
      out[k] = v;
    }
  }
  return out;
}

// ─────────────── Campos ───────────────

interface Ctx {
  register: UseFormRegister<FormValues>;
  control: Control<FormValues>;
}

function Section({
  value,
  title,
  children,
}: {
  value: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem value={value} className="rounded-md border border-border px-3">
      <AccordionTrigger className="text-sm text-parchment hover:no-underline">
        {title}
      </AccordionTrigger>
      <AccordionContent className="space-y-3 pb-3">{children}</AccordionContent>
    </AccordionItem>
  );
}

function Txt({ register, name, label }: Ctx & { name: string; label: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input className="h-10" {...register(name)} />
    </div>
  );
}

function Area({ register, name, label }: Ctx & { name: string; label: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Textarea rows={2} {...register(name)} />
    </div>
  );
}

function Num({
  register,
  name,
  label,
  step,
}: Ctx & { name: string; label: string; step?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type="number" step={step} className="h-10" {...register(name)} />
    </div>
  );
}

function Date({ control, name, label }: Ctx & { name: string; label: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Input
            type="date"
            className="h-10"
            value={(field.value as string) ?? ""}
            onChange={field.onChange}
          />
        )}
      />
    </div>
  );
}

function Bool({ control, name, label }: Ctx & { name: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <Label className="text-xs">{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Switch checked={!!field.value} onCheckedChange={field.onChange} />
        )}
      />
    </div>
  );
}

function Sel({
  control,
  name,
  label,
  options,
}: Ctx & { name: string; label: string; options: [string, string][] }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select
            value={(field.value as string) ?? ""}
            onValueChange={field.onChange}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {options.map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </div>
  );
}
