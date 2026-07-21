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
  TattooPhotoField,
  useEvaluationPhotos,
  type PhotoBucket,
} from "@/components/evaluations/evaluation-photos";
import { SignaturePad } from "./signature-pad";

const TATTOO_CONSENT = `Eu, conforme já assinado e identificado, declaro ser de minha espontânea vontade, ter uma tatuagem colocada no local do meu corpo acima descrito. Declaro ainda ser maior de 18 anos e não estar sob o efeito de drogas ou álcool, sendo assim capaz de discernir meus atos. Portando lucidez, assino abaixo livremente e de minha parte total entendimento.

Os materiais utilizados são devidamente esterilizados ou descartáveis, assim como todos os padrões de higiene conforme as normas de vigilância sanitária, sendo seguidas corretamente. Fui também informado dos procedimentos e cuidados que devem ser executados por mim durante o processo de cicatrização, isentando de qualquer responsabilidade o tatuador, exceto aqueles que sejam comprovados a imperícia técnica.

Declaro estar informado e ciente das possíveis consequências decorrentes da prática de tatuagem, no que se refere:
1 – Ao risco de infecção por patógenos veiculados pelo sangue (Vírus da Hepatite C, Vírus da Hepatite B, Vírus da imunodeficiência adquirida (HIV), dentre outros) quando não forem obedecidas adequadamente os procedimentos de limpeza, desinfecção e esterilização dos materiais a serem utilizados, assim como o manuseio apropriado dos descartáveis;
2 – Aos riscos de acidentes durante a realização do procedimento;
3 – Ao difícil processo de remoção de uma tatuagem;
4 – Às possíveis sequelas remanescentes à coloração ou rejeição orgânica dos mesmos como corpos estranhos;
5 – À procedência das tintas utilizadas;
6 – Às reações alérgicas a algum pigmento ou a rejeição orgânica dos mesmos corpos estranhos;
7 – É necessária a avaliação e liberação médica às tatuagens em pessoas portadoras de doenças infectocontagiosas (Hepatite, hanseníase, entre outras), diabetes mellitus, HIV ou outra imunodeficiência, coagulopatias, doenças cardíacas de qualquer natureza, doenças alérgicas, portadores de próteses em qualquer local e válvulas cardíacas, convalescentes de doenças, cirurgias recentes, predisposição a queloide, bem como aplicação dos procedimentos em locais com cicatrizes, alergias, queimaduras, doenças agudas ou crônicas de pele.
8 – Ao risco de aplicação de tatuagens sem estar vacinado contra tétano e Hepatite B;

Autorizo a realização do procedimento de tatuagem pelo(a) profissional do TATTOO STUDIO OBSCURA, sob minha total responsabilidade.`;

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
  ["TATTOO", "Tatuagem"],
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

  const { register, handleSubmit, control, watch } = useForm<FormValues>({
    defaultValues: buildDefaults(evaluation),
  });
  const focus = watch("focus") as string;
  const isTattoo = focus === "TATTOO";

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

      {isTattoo ? (
        <TattooSections ctx={ctx} photos={photos} />
      ) : (
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
      )}

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

// ─────────────── Ficha de tatuagem ───────────────

function TattooSections({
  ctx,
  photos,
}: {
  ctx: Ctx;
  photos: PhotoBucket;
}) {
  return (
    <Accordion
      type="multiple"
      defaultValue={["saude", "tattoo", "termo", "fotos"]}
      className="space-y-2"
    >
      <Section value="saude" title="1. Saúde geral">
        <Area
          {...ctx}
          name="allergies"
          label="Possui alergia a algum medicamento, material ou substância? Se sim, quais?"
        />
        <Bool {...ctx} name="ateInLast3h" label="Está em jejum ou se alimentou nas últimas 3h?" />

        <p className="pt-1 text-xs text-muted-foreground">
          Possui alguma destas condições? (marque se sim)
        </p>
        <Bool {...ctx} name="hasDiabetes" label="Diabetes" />
        <Bool {...ctx} name="hasHypertension" label="Hipertensão" />
        <Bool {...ctx} name="hasCoagulationIssues" label="Hemofilia ou problemas de coagulação" />
        <Bool {...ctx} name="hasSkinDisease" label="Doenças de pele (psoríase, dermatite, etc.)" />
        <Bool {...ctx} name="hasAutoimmune" label="Doenças autoimunes" />
        <Bool {...ctx} name="hasEpilepsy" label="Epilepsia ou crises convulsivas" />
        <Bool {...ctx} name="hasInfectiousDisease" label="Doenças infecciosas transmissíveis (hepatites, HIV, etc.)" />
        <Bool {...ctx} name="hasHeartCondition" label="Problemas cardíacos" />
        <Bool {...ctx} name="hasAnestheticAllergy" label="Alergias a anestésicos, látex, pigmentos ou metais" />
        <Bool {...ctx} name="isPregnant" label="Está grávida ou amamentando?" />
        <Area {...ctx} name="healthConditionsOther" label="Outras condições" />

        <Area {...ctx} name="medications" label="Está usando medicamentos atualmente? Se sim, quais?" />
        <Bool {...ctx} name="usesAlcoholOrDrugs" label="Faz uso de álcool ou drogas com frequência?" />
      </Section>

      <Section value="tattoo" title="2. Sobre a tatuagem">
        <Bool
          {...ctx}
          name="anticoagulants24h"
          label="Fez uso de anticoagulantes ou bebida alcoólica nas últimas 24h?"
        />
        <Txt {...ctx} name="tattooBodyLocation" label="Local do corpo a ser tatuado" />
        <Bool {...ctx} name="hasTattoos" label="Já possui tatuagens?" />
        <Area {...ctx} name="notes" label="Observações" />
      </Section>

      <Section value="termo" title="3. Termo de consentimento">
        <div className="max-h-64 overflow-y-auto whitespace-pre-line rounded-md border border-border bg-background/40 p-3 text-xs leading-relaxed text-muted-foreground">
          {TATTOO_CONSENT}
        </div>
        <Bool {...ctx} name="tattooConsentAccepted" label="Li e concordo com o termo acima" />
        <Txt {...ctx} name="signedByName" label="Nome de quem assina" />
        <div className="space-y-1.5">
          <Label className="text-xs">Assinatura do cliente</Label>
          <Controller
            control={ctx.control}
            name="signatureDataUrl"
            render={({ field }) => (
              <SignaturePad
                value={field.value as string | undefined}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      </Section>

      <Section value="fotos" title="4. Fotos (antes e depois de cada sessão)">
        <TattooPhotoField bucket={photos} />
      </Section>
    </Accordion>
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
