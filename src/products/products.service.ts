import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type { AuthUser } from '@/auth/decorators/current-user.decorator';
import { ownerWhere } from '@/common/ownership';
import {
  imagePath,
  removeImage,
  saveImage,
  type UploadedImage,
} from '@/common/uploads';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { deriveUnitsInStock } from './stock.util';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto, ownerId: string) {
    await this.assertCategoryExists(dto.categoryId);

    // Estoque utilizável inicial = total: unidades × quantidade por unidade.
    const usableQuantity = new Prisma.Decimal(dto.quantityPerUnit).mul(
      dto.unitsInStock,
    );

    return this.prisma.product.create({
      data: {
        name: dto.name.trim(),
        description: dto.description,
        categoryId: dto.categoryId,
        type: dto.type,
        price: new Prisma.Decimal(dto.price),
        unitsInStock: dto.unitsInStock,
        quantityPerUnit: new Prisma.Decimal(dto.quantityPerUnit),
        measureUnit: dto.measureUnit,
        usableQuantity,
        ownerId,
      },
      include: { category: true },
    });
  }

  async findAll(query: QueryProductsDto, user: AuthUser) {
    const { search, categoryId, type, page, limit } = query;

    const where: Prisma.ProductWhereInput = {
      ...ownerWhere(user),
      ...(search
        ? { name: { contains: search, mode: 'insensitive' } }
        : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(type ? { type } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { category: true },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user: AuthUser) {
    const product = await this.prisma.product.findFirst({
      where: { id, ...ownerWhere(user) },
      include: { category: true },
    });
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto, user: AuthUser) {
    const current = await this.findOne(id, user);
    if (dto.categoryId) {
      await this.assertCategoryExists(dto.categoryId);
    }

    // Mudar a quantidade por unidade redefine a derivação de unidades.
    // O estoque em si (usableQuantity) muda por reposição/consumo, não aqui.
    let unitsInStock: number | undefined;
    let quantityPerUnit: Prisma.Decimal | undefined;
    if (dto.quantityPerUnit !== undefined) {
      quantityPerUnit = new Prisma.Decimal(dto.quantityPerUnit);
      unitsInStock = deriveUnitsInStock(current.usableQuantity, quantityPerUnit);
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description,
        categoryId: dto.categoryId,
        type: dto.type,
        price: dto.price !== undefined ? new Prisma.Decimal(dto.price) : undefined,
        quantityPerUnit,
        unitsInStock,
        measureUnit: dto.measureUnit,
      },
      include: { category: true },
    });
  }

  /** Reposição de estoque: entram `units` embalagens de `quantityPerUnit`. */
  async restock(id: string, units: number, user: AuthUser) {
    const product = await this.findOne(id, user);

    const added = product.quantityPerUnit.mul(units);
    const usableQuantity = product.usableQuantity.plus(added);

    return this.prisma.product.update({
      where: { id },
      data: {
        usableQuantity,
        unitsInStock: deriveUnitsInStock(usableQuantity, product.quantityPerUnit),
      },
      include: { category: true },
    });
  }

  async remove(id: string, user: AuthUser) {
    const product = await this.findOne(id, user);
    // ComandaProduct referencia o produto com RESTRICT (histórico de comandas).
    const linked = await this.prisma.comandaProduct.count({
      where: { productId: id },
    });
    if (linked > 0) {
      throw new ConflictException(
        'Não é possível excluir: este produto já foi usado/vendido em comandas. Inative-o.',
      );
    }
    await this.prisma.product.delete({ where: { id } });
    if (product.imageFilename) await removeImage('products', product.imageFilename);
    return { deleted: true, id };
  }

  // ─────────────── Imagem ───────────────

  async setImage(id: string, file: UploadedImage | undefined, user: AuthUser) {
    const product = await this.findOne(id, user);
    const saved = await saveImage('products', file);
    if (product.imageFilename) await removeImage('products', product.imageFilename);
    return this.prisma.product.update({
      where: { id },
      data: { imageFilename: saved.filename, imageMime: saved.mimeType },
      include: { category: true },
    });
  }

  async imageOf(id: string, user: AuthUser) {
    const product = await this.findOne(id, user);
    if (!product.imageFilename) {
      throw new NotFoundException('Produto sem imagem');
    }
    return {
      path: imagePath('products', product.imageFilename),
      mimeType: product.imageMime ?? 'image/jpeg',
    };
  }

  async clearImage(id: string, user: AuthUser) {
    const product = await this.findOne(id, user);
    if (product.imageFilename) await removeImage('products', product.imageFilename);
    await this.prisma.product.update({
      where: { id },
      data: { imageFilename: null, imageMime: null },
    });
    return { deleted: true, id };
  }

  private async assertCategoryExists(categoryId: string) {
    const exists = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });
    if (!exists) {
      throw new BadRequestException('Categoria informada não existe');
    }
  }
}
