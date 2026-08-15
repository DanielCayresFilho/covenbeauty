import { Injectable, Logger } from '@nestjs/common';
import { CashFlowCategory, Prisma } from '@prisma/client';
import { salonDateOnly } from '@/common/salon-date';

/** Conta que recebe a receita das vendas de produto (revenda/balcão). */
const PRODUCT_SALES_ACCOUNT = 'Venda de produtos';
/** Conta que recebe a taxa da maquininha descontada no recebimento. */
const CARD_FEE_ACCOUNT = 'Taxas de cartão';

const D0 = () => new Prisma.Decimal(0);

type Tx = Prisma.TransactionClient;

/** Um item faturável da comanda, antes de ratear o desconto. */
interface BillableItem {
  procedureId: string | null;
  name: string;
  gross: Prisma.Decimal;
}

/**
 * Espelha a comanda no fluxo de caixa.
 *
 * Fechar a comanda gera os lançamentos de ENTRADA (um por procedimento, mais um
 * pelas vendas de produto) na conta do plano de contas correspondente; reabrir
 * ou excluir desfaz. É o que fazia o `finishComanda` do sistema antigo — sem
 * isso o fluxo de caixa só mostra o que for digitado à mão.
 */
@Injectable()
export class ComandaFinancialService {
  private readonly logger = new Logger(ComandaFinancialService.name);

  // Sem estado próprio: todas as operações rodam dentro da transação de quem
  // chama (fechar/reabrir comanda), recebendo o `tx`.

  /** Remove os lançamentos gerados por uma comanda (reabertura). */
  async clear(tx: Tx, comandaId: string) {
    await tx.financialEntry.deleteMany({ where: { comandaId } });
  }

  /**
   * (Re)gera os lançamentos de uma comanda fechada. É idempotente: apaga os
   * anteriores antes de criar, então fechar de novo não duplica.
   */
  async syncClosed(tx: Tx, comandaId: string) {
    await this.clear(tx, comandaId);

    const comanda = await tx.comanda.findUnique({
      where: { id: comandaId },
      include: {
        procedures: true,
        products: true,
        appointment: { select: { professionalId: true } },
      },
    });
    if (!comanda) return;

    // Dono do lançamento: quem atendeu, ou quem vendeu (comanda de balcão).
    const ownerId = comanda.appointment?.professionalId ?? comanda.sellerId;
    if (!ownerId) {
      this.logger.warn(
        `Comanda ${comandaId} sem profissional nem vendedor — nada lançado`,
      );
      return;
    }

    const date = salonDateOnly(comanda.closedAt ?? new Date());
    const items = this.billableItems(comanda);
    const subtotal = items.reduce((acc, i) => acc.plus(i.gross), D0());
    // `total` é o snapshot gravado no fechamento (subtotal − desconto).
    const total = comanda.total ?? subtotal.minus(comanda.discount);

    if (subtotal.greaterThan(0) && total.greaterThan(0)) {
      // O desconto é rateado entre os itens para que a soma das entradas bata
      // exatamente com o total da comanda (a sobra de arredondamento vai no
      // último item).
      let allocated = D0();
      for (const [index, item] of items.entries()) {
        const isLast = index === items.length - 1;
        const amount = isLast
          ? total.minus(allocated)
          : item.gross.mul(total).div(subtotal).toDecimalPlaces(2);
        allocated = allocated.plus(amount);
        if (amount.lessThanOrEqualTo(0)) continue;

        const accountId = await this.incomeAccount(tx, item, ownerId);
        await tx.financialEntry.create({
          data: {
            date,
            category: CashFlowCategory.INCOME,
            amount,
            accountId,
            clientId: comanda.clientId,
            comandaId: comanda.id,
            description: `Comanda ${comanda.appointmentId ? 'finalizada' : 'de venda'}`,
            ownerId,
          },
        });
      }
    }

    // Taxa da maquininha: o salão recebe o líquido, então a taxa é uma saída.
    // (O sistema antigo não tinha maquininha; sem esta linha o fluxo mostraria
    // mais caixa do que entrou de fato.)
    const fee = comanda.feeAmount ?? D0();
    if (fee.greaterThan(0)) {
      const accountId = await this.accountByName(
        tx,
        CARD_FEE_ACCOUNT,
        CashFlowCategory.VARIABLE_COST,
        ownerId,
      );
      await tx.financialEntry.create({
        data: {
          date,
          category: CashFlowCategory.VARIABLE_COST,
          amount: fee,
          accountId,
          clientId: comanda.clientId,
          comandaId: comanda.id,
          description: `Taxa ${comanda.paymentMethod ?? ''}`.trim(),
          ownerId,
        },
      });
    }
  }

  // ─────────────────────────── Helpers ───────────────────────────

  /** Procedimentos + vendas de produto, com o valor cheio de cada linha. */
  private billableItems(comanda: {
    procedures: {
      procedureId: string | null;
      nameSnapshot: string;
      priceSnapshot: Prisma.Decimal;
    }[];
    products: {
      priceSnapshot: Prisma.Decimal | null;
      quantityUsed: Prisma.Decimal;
    }[];
  }): BillableItem[] {
    const items: BillableItem[] = comanda.procedures
      .filter((p) => p.priceSnapshot.greaterThan(0))
      .map((p) => ({
        procedureId: p.procedureId,
        name: p.nameSnapshot,
        gross: p.priceSnapshot,
      }));

    // Produtos vendidos entram numa única conta de revenda (consumo interno,
    // sem preço, não gera receita).
    const productRevenue = comanda.products.reduce(
      (acc, p) =>
        p.priceSnapshot ? acc.plus(p.priceSnapshot.mul(p.quantityUsed)) : acc,
      D0(),
    );
    if (productRevenue.greaterThan(0)) {
      items.push({
        procedureId: null,
        name: PRODUCT_SALES_ACCOUNT,
        gross: productRevenue,
      });
    }

    return items;
  }

  /** Conta de entrada do item, criada sob demanda (como no sistema antigo). */
  private async incomeAccount(tx: Tx, item: BillableItem, ownerId: string) {
    if (!item.procedureId) {
      return this.accountByName(
        tx,
        item.name,
        CashFlowCategory.INCOME,
        ownerId,
      );
    }

    // `procedureId` é único: a conta pertence ao procedimento, não ao dono.
    const existing = await tx.financialAccount.findUnique({
      where: { procedureId: item.procedureId },
      select: { id: true },
    });
    if (existing) return existing.id;

    const created = await tx.financialAccount.create({
      data: {
        name: item.name,
        category: CashFlowCategory.INCOME,
        procedureId: item.procedureId,
        ownerId,
      },
      select: { id: true },
    });
    return created.id;
  }

  private async accountByName(
    tx: Tx,
    name: string,
    category: CashFlowCategory,
    ownerId: string,
  ) {
    const existing = await tx.financialAccount.findFirst({
      where: { name, category, ownerId },
      select: { id: true },
    });
    if (existing) return existing.id;

    const created = await tx.financialAccount.create({
      data: { name, category, ownerId },
      select: { id: true },
    });
    return created.id;
  }
}
