import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { HideValuesButton } from "@/components/hide-values-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CashFlowTab } from "@/components/financeiro/cash-flow-tab";
import { EntriesTab } from "@/components/financeiro/entries-tab";
import { AccountsTab } from "@/components/financeiro/accounts-tab";
import { FixedExpensesTab } from "@/components/financeiro/fixed-expenses-tab";
import { GoalsTab } from "@/components/financeiro/goals-tab";

export const Route = createFileRoute("/menu/financeiro/")({
  component: FinanceiroPage,
});

function FinanceiroPage() {
  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.4em] text-blood">
              Gestão
            </p>
            <h1 className="mt-1 font-serif text-3xl text-parchment">Financeiro</h1>
          </div>
          <HideValuesButton />
        </div>

        <Tabs defaultValue="cashflow">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="cashflow">Fluxo</TabsTrigger>
            <TabsTrigger value="entries">Lançamentos</TabsTrigger>
            <TabsTrigger value="fixed">Despesas fixas</TabsTrigger>
            <TabsTrigger value="accounts">Contas</TabsTrigger>
            <TabsTrigger value="goals">Metas</TabsTrigger>
          </TabsList>

          <TabsContent value="cashflow" className="mt-4 cb-fade-in">
            <CashFlowTab />
          </TabsContent>
          <TabsContent value="entries" className="mt-4 cb-fade-in">
            <EntriesTab />
          </TabsContent>
          <TabsContent value="fixed" className="mt-4 cb-fade-in">
            <FixedExpensesTab />
          </TabsContent>
          <TabsContent value="accounts" className="mt-4 cb-fade-in">
            <AccountsTab />
          </TabsContent>
          <TabsContent value="goals" className="mt-4 cb-fade-in">
            <GoalsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
