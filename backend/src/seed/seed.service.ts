import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Role, RoleDocument } from '../roles/schemas/role.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import {
  Category,
  CategoryDocument,
} from '../categories/schemas/category.schema';
import {
  ProductVariant,
  ProductVariantDocument,
} from '../product-variants/schemas/product-variant.schema';
import {
  DeliveryZone,
  DeliveryZoneDocument,
} from '../delivery-zones/schemas/delivery-zone.schema';
import {
  StoreSetting,
  StoreSettingDocument,
} from '../settings/schemas/store-setting.schema';
import { Coupon, CouponDocument } from '../coupons/schemas/coupon.schema';
import {
  PaymentMethod,
  PaymentMethodDocument,
} from '../payment-methods/schemas/payment-method.schema';
import { generateSlug } from '../common/helpers/slug.helper';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(ProductVariant.name)
    private readonly variantModel: Model<ProductVariantDocument>,
    @InjectModel(DeliveryZone.name)
    private readonly zoneModel: Model<DeliveryZoneDocument>,
    @InjectModel(StoreSetting.name)
    private readonly settingModel: Model<StoreSettingDocument>,
    @InjectModel(Coupon.name)
    private readonly couponModel: Model<CouponDocument>,
    @InjectModel(PaymentMethod.name)
    private readonly paymentMethodModel: Model<PaymentMethodDocument>,
    private readonly configService: ConfigService,
  ) {}

  async seed() {
    this.logger.log('Starting seed...');

    const roles = await this.seedRoles();
    await this.seedPermissions();

    const runAdminSeed =
      this.configService.get<string>('app.runAdminSeed', 'false') === 'true' ||
      process.env.RUN_ADMIN_SEED === 'true';
    if (runAdminSeed) {
      await this.seedAdminUser(roles);
    }

    await this.seedPaymentMethods();
    const categories = await this.seedCategories();
    const products = await this.seedProducts(categories);
    await this.seedProductVariants(products);
    await this.seedDeliveryZones();
    await this.seedStoreSettings();
    await this.seedCoupons();

    this.logger.log('Seed completed successfully');
  }

  private async seedRoles(): Promise<RoleDocument[]> {
    const existingCount = await this.roleModel.countDocuments();
    if (existingCount > 0) {
      this.logger.log('Roles already seeded, skipping');
      return this.roleModel.find().exec();
    }

    const roleDefinitions = [
      {
        name: 'super_admin',
        description: 'Full system access with all permissions',
        isSystem: true,
        permissions: this.getAllPermissions(),
      },
      {
        name: 'admin',
        description: 'Administrative access to most features',
        isSystem: true,
        permissions: this.getAllPermissions().filter(
          (p) => !p.startsWith('super_'),
        ),
      },
      {
        name: 'order_manager',
        description: 'Manage orders and view customer info',
        isSystem: true,
        permissions: [
          'orders:read',
          'orders:create',
          'orders:update',
          'customers:read',
          'notifications:read',
        ],
      },
      {
        name: 'product_manager',
        description: 'Manage products, categories, and inventory',
        isSystem: true,
        permissions: [
          'products:read',
          'products:create',
          'products:update',
          'categories:read',
          'categories:create',
          'categories:update',
          'variants:read',
          'variants:create',
          'variants:update',
          'inventory:read',
          'inventory:update',
        ],
      },
      {
        name: 'inventory_manager',
        description: 'Manage inventory levels and stock',
        isSystem: true,
        permissions: [
          'products:read',
          'inventory:read',
          'inventory:update',
          'variants:read',
          'variants:update',
        ],
      },
      {
        name: 'finance_viewer',
        description: 'View financial data and reports',
        isSystem: true,
        permissions: ['orders:read', 'payments:read', 'analytics:read'],
      },
      {
        name: 'support_agent',
        description: 'Handle customer support tickets and orders',
        isSystem: true,
        permissions: [
          'orders:read',
          'orders:update',
          'customers:read',
          'notifications:read',
          'notifications:create',
        ],
      },
    ];

    const roles = await this.roleModel.insertMany(roleDefinitions);
    this.logger.log(`Seeded ${roles.length} roles`);
    return roles;
  }

  private async seedPermissions() {
    const existingCount = await this.roleModel.countDocuments();
    this.logger.log(
      `Permissions are embedded in roles (${existingCount} roles exist)`,
    );
    return [];
  }

  private async seedAdminUser(roles: RoleDocument[]) {
    const adminEmail = this.configService.get<string>(
      'app.adminSeedEmail',
      'admin@opps.com',
    );
    const existingAdmin = await this.userModel.findOne({ email: adminEmail });
    if (existingAdmin) {
      this.logger.log(`Admin user ${adminEmail} already exists, skipping`);
      return;
    }

    const superAdminRole = roles.find((r) => r.name === 'super_admin');
    if (!superAdminRole) {
      this.logger.error('super_admin role not found, cannot seed admin user');
      return;
    }

    const name = this.configService.get<string>(
      'app.adminSeedName',
      'opps Admin',
    );
    const password = this.configService.get<string>(
      'app.adminSeedPassword',
      'Admin@123456',
    );
    const saltRounds = this.configService.get<number>(
      'app.bcryptSaltRounds',
      12,
    );
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = new this.userModel({
      email: adminEmail,
      password: hashedPassword,
      fullName: name,
      role: superAdminRole._id.toString(),
      permissions: superAdminRole.permissions,
      isActive: true,
      isBlocked: false,
      provider: 'local',
    });
    await user.save();

    this.logger.log(`Seeded admin user: ${adminEmail}`);
  }

  private async seedPaymentMethods() {
    const existingCount = await this.paymentMethodModel.countDocuments();
    if (existingCount > 0) {
      this.logger.log('Payment methods already seeded, skipping');
      return;
    }

    const methods = [
      {
        code: 'cod',
        name: 'Cash on Delivery',
        type: 'cod',
        isActive: true,
        isEnabled: true,
        sortOrder: 1,
        additionalFee: 0,
        description: 'Pay cash when your order arrives',
        instructions: {
          en: 'Have the exact amount ready',
          ar: 'يرجى تجهيز المبلغ المطلوب',
        },
      },
      {
        code: 'card',
        name: 'Visa / Mastercard',
        type: 'card',
        isActive: false,
        isEnabled: false,
        sortOrder: 2,
        additionalFee: 0,
        description: 'Pay securely with your credit or debit card',
      },
      {
        code: 'instapay',
        name: 'InstaPay',
        type: 'wallet',
        isActive: false,
        isEnabled: false,
        sortOrder: 3,
        additionalFee: 0,
        description: 'Pay using InstaPay wallet',
        instructions: { accountReference: '01000000000' },
      },
      {
        code: 'vodafone_cash',
        name: 'Vodafone Cash',
        type: 'wallet',
        isActive: false,
        isEnabled: false,
        sortOrder: 4,
        additionalFee: 0,
        description: 'Pay using Vodafone Cash',
        instructions: { number: '01000000000' },
      },
      {
        code: 'orange_cash',
        name: 'Orange Cash',
        type: 'wallet',
        isActive: false,
        isEnabled: false,
        sortOrder: 5,
        additionalFee: 0,
        description: 'Pay using Orange Cash',
        instructions: { number: '01000000000' },
      },
      {
        code: 'etisalat_cash',
        name: 'Etisalat Cash',
        type: 'wallet',
        isActive: false,
        isEnabled: false,
        sortOrder: 6,
        additionalFee: 0,
        description: 'Pay using Etisalat Cash',
        instructions: { number: '01000000000' },
      },
      {
        code: 'we_pay',
        name: 'WE Pay',
        type: 'wallet',
        isActive: false,
        isEnabled: false,
        sortOrder: 7,
        additionalFee: 0,
        description: 'Pay using WE Pay wallet',
        instructions: { number: '01000000000' },
      },
      {
        code: 'fawry',
        name: 'Fawry',
        type: 'online_wallet',
        isActive: false,
        isEnabled: false,
        sortOrder: 8,
        additionalFee: 0,
        description: 'Pay via Fawry outlets',
      },
    ];

    await this.paymentMethodModel.insertMany(methods);
    this.logger.log(`Seeded ${methods.length} payment methods`);
  }

  private async seedCategories(): Promise<CategoryDocument[]> {
    const existingCount = await this.categoryModel.countDocuments();
    if (existingCount > 0) {
      this.logger.log('Categories already seeded, skipping');
      return this.categoryModel.find().exec();
    }

    const categoryData = [
      {
        name: 'Individual Cookies',
        description: 'Freshly baked individual cookies',
        image: '/placeholder-cookie.svg',
        sortOrder: 1,
      },
      {
        name: 'Cookie Boxes',
        description: 'Curated boxes of assorted cookies',
        image: '/placeholder-cookie.svg',
        sortOrder: 2,
      },
      {
        name: 'Stuffed Cookies',
        description: 'Cookies with delicious fillings',
        image: '/placeholder-cookie.svg',
        sortOrder: 3,
      },
      {
        name: 'Best Sellers',
        description: 'Our most popular cookies',
        image: '/placeholder-cookie.svg',
        sortOrder: 4,
      },
      {
        name: 'Gifts',
        description: 'Perfect gift packages',
        image: '/placeholder-cookie.svg',
        sortOrder: 5,
      },
      {
        name: 'Seasonal',
        description: 'Limited edition seasonal treats',
        image: '/placeholder-cookie.svg',
        sortOrder: 6,
      },
    ];

    const categories = await this.categoryModel.insertMany(
      categoryData.map((cat) => ({
        ...cat,
        slug: generateSlug(cat.name),
        isActive: true,
      })),
    );

    this.logger.log(`Seeded ${categories.length} categories`);
    return categories;
  }

  private async seedProducts(
    categories: CategoryDocument[],
  ): Promise<ProductDocument[]> {
    const existingCount = await this.productModel.countDocuments();
    if (existingCount > 0) {
      this.logger.log('Products already seeded, skipping');
      return this.productModel.find().exec();
    }

    const getCategoryId = (name: string) => {
      const cat = categories.find((c) => c.name === name);
      return cat ? cat._id.toString() : categories[0]._id.toString();
    };

    const commonTags = ['cookie', 'baked-fresh'];
    const commonIngredients =
      'Flour, butter, sugar, eggs, vanilla extract, baking soda, salt';
    const commonAllergens =
      'Contains wheat, dairy, eggs. May contain traces of nuts and soy.';

    const productsData = [
      {
        name: 'Classic Chocolate Chip Cookie',
        shortDescription:
          'The perfect classic chocolate chip cookie — crispy edges with a soft, gooey center.',
        fullDescription:
          'Our signature chocolate chip cookie made with premium semi-sweet chocolate chips and a hint of vanilla. Each bite delivers the perfect balance of crispy edges and a soft, chewy center that melts in your mouth.',
        category: getCategoryId('Individual Cookies'),
        regularPrice: 35,
        costPrice: 15,
        stock: 100,
        sku: 'COOK-CC-001',
        ingredients: `${commonIngredients}, semi-sweet chocolate chips`,
        allergens: commonAllergens,
        thumbnail: '/placeholder-cookie.svg',
        images: ['/placeholder-cookie.svg'],
        tags: [...commonTags, 'chocolate', 'classic', 'best-seller'],
        isFeatured: true,
        status: 'in_stock',
        inStock: true,
        isActive: true,
      },
      {
        name: 'Double Chocolate Cookie',
        shortDescription:
          'Rich double chocolate cookie for serious chocolate lovers.',
        fullDescription:
          'An intensely chocolatey experience featuring a dark chocolate base loaded with white and milk chocolate chunks. Perfect for those who believe there is no such thing as too much chocolate.',
        category: getCategoryId('Individual Cookies'),
        regularPrice: 40,
        costPrice: 18,
        stock: 100,
        sku: 'COOK-DC-002',
        ingredients: `${commonIngredients}, cocoa powder, dark chocolate chunks, white chocolate chunks, milk chocolate chunks`,
        allergens: commonAllergens,
        thumbnail: '/placeholder-cookie.svg',
        images: ['/placeholder-cookie.svg'],
        tags: [...commonTags, 'chocolate', 'double-chocolate', 'rich'],
        isFeatured: true,
        status: 'in_stock',
        inStock: true,
        isActive: true,
      },
      {
        name: 'Red Velvet Cookie',
        shortDescription:
          'Beautiful red velvet cookie with cream cheese chips.',
        fullDescription:
          'A stunning red velvet cookie with a delicate cocoa flavor, studded with creamy white chocolate chips. As beautiful as it is delicious, this cookie is a feast for the eyes and the palate.',
        category: getCategoryId('Individual Cookies'),
        regularPrice: 45,
        costPrice: 20,
        stock: 80,
        sku: 'COOK-RV-003',
        ingredients: `${commonIngredients}, cocoa powder, red food coloring, buttermilk, white chocolate chips`,
        allergens: commonAllergens,
        thumbnail: '/placeholder-cookie.svg',
        images: ['/placeholder-cookie.svg'],
        tags: [...commonTags, 'red-velvet', 'cream-cheese', 'premium'],
        isFeatured: true,
        status: 'in_stock',
        inStock: true,
        isActive: true,
      },
      {
        name: 'Lotus Biscoff Cookie',
        shortDescription:
          'Caramelized biscuit cookie with Lotus Biscoff spread.',
        fullDescription:
          'A delightful twist on the classic cookie, made with crushed Lotus Biscoff biscuits and swirled with creamy Biscoff spread. The caramelized flavor is unmistakably irresistible.',
        category: getCategoryId('Individual Cookies'),
        regularPrice: 50,
        costPrice: 22,
        stock: 60,
        sku: 'COOK-LB-004',
        ingredients: `${commonIngredients}, Lotus Biscoff biscuits, Lotus Biscoff spread, brown sugar`,
        allergens: `${commonAllergens}, Contains speculoos (Lotus Biscoff)`,
        thumbnail: '/placeholder-cookie.svg',
        images: ['/placeholder-cookie.svg'],
        tags: [...commonTags, 'lotus', 'biscoff', 'caramelized', 'premium'],
        isFeatured: true,
        status: 'in_stock',
        inStock: true,
        isActive: true,
      },
      {
        name: 'Nutella Stuffed Cookie',
        shortDescription: 'Soft cookie with a molten Nutella center.',
        fullDescription:
          'Our most indulgent creation — a soft, golden cookie wrapped around a generous heart of warm, melted Nutella. Every bite releases a river of hazelnut chocolate goodness.',
        category: getCategoryId('Stuffed Cookies'),
        regularPrice: 55,
        costPrice: 25,
        stock: 50,
        sku: 'COOK-NS-005',
        ingredients: `${commonIngredients}, Nutella, hazelnuts`,
        allergens: `${commonAllergens}, Contains hazelnuts`,
        thumbnail: '/placeholder-cookie.svg',
        images: ['/placeholder-cookie.svg'],
        tags: [...commonTags, 'nutella', 'stuffed', 'indulgent', 'premium'],
        isFeatured: true,
        status: 'in_stock',
        inStock: true,
        isActive: true,
      },
      {
        name: 'White Chocolate Cookie',
        shortDescription:
          'Buttery vanilla cookie with creamy white chocolate chunks.',
        fullDescription:
          'A buttery, golden cookie loaded with generous chunks of premium white chocolate. The perfect balance of sweet and creamy with a satisfying crunch in every bite.',
        category: getCategoryId('Individual Cookies'),
        regularPrice: 38,
        costPrice: 16,
        stock: 90,
        sku: 'COOK-WC-006',
        ingredients: `${commonIngredients}, white chocolate chunks, vanilla bean`,
        allergens: commonAllergens,
        thumbnail: '/placeholder-cookie.svg',
        images: ['/placeholder-cookie.svg'],
        tags: [...commonTags, 'white-chocolate', 'vanilla', 'classic'],
        isFeatured: false,
        status: 'in_stock',
        inStock: true,
        isActive: true,
      },
      {
        name: 'Peanut Butter Cookie',
        shortDescription:
          'Soft and chewy peanut butter cookie with a classic crisscross.',
        fullDescription:
          'A timeless peanut butter cookie made with chunky peanut butter for extra texture. Soft, chewy, and packed with nutty flavor — a true comfort cookie.',
        category: getCategoryId('Individual Cookies'),
        regularPrice: 42,
        costPrice: 18,
        stock: 75,
        sku: 'COOK-PB-007',
        ingredients: `${commonIngredients}, chunky peanut butter, brown sugar`,
        allergens: `${commonAllergens}, Contains peanuts`,
        thumbnail: '/placeholder-cookie.svg',
        images: ['/placeholder-cookie.svg'],
        tags: [...commonTags, 'peanut-butter', 'classic', 'nutty'],
        isFeatured: false,
        status: 'in_stock',
        inStock: true,
        isActive: true,
      },
      {
        name: 'Mixed Cookie Box',
        shortDescription:
          'An assortment of our finest cookies in a beautiful box.',
        fullDescription:
          'The perfect gift for any cookie lover! Our Mixed Cookie Box features a carefully curated selection of our most popular flavors, beautifully packaged in a premium gift box. Choose from 4, 6, 12, or 24 pieces.',
        category: getCategoryId('Cookie Boxes'),
        regularPrice: 150,
        costPrice: 60,
        stock: 50,
        sku: 'BOX-MIX-008',
        ingredients: 'Assorted flavors - see individual cookie descriptions',
        allergens:
          'Varies by selection. Contains wheat, dairy, eggs. May contain nuts and soy.',
        thumbnail: '/placeholder-cookie.svg',
        images: ['/placeholder-cookie.svg'],
        tags: ['cookie-box', 'gift', 'assorted', 'bestseller'],
        isFeatured: true,
        status: 'in_stock',
        inStock: true,
        isActive: true,
      },
      {
        name: 'Mini Cookie Box',
        shortDescription: 'Adorable mini cookies perfect for small treats.',
        fullDescription:
          'Bite-sized happiness! Our Mini Cookie Box contains perfectly portioned mini versions of our classic cookies. Ideal for snacking, party favors, or a light treat. Available in 4 or 6 pieces.',
        category: getCategoryId('Cookie Boxes'),
        regularPrice: 120,
        costPrice: 45,
        stock: 60,
        sku: 'BOX-MINI-009',
        ingredients: 'Assorted flavors - see individual cookie descriptions',
        allergens:
          'Varies by selection. Contains wheat, dairy, eggs. May contain nuts and soy.',
        thumbnail: '/placeholder-cookie.svg',
        images: ['/placeholder-cookie.svg'],
        tags: ['cookie-box', 'mini', 'snack', 'gift'],
        isFeatured: false,
        status: 'in_stock',
        inStock: true,
        isActive: true,
      },
      {
        name: 'Celebration Cookie Box',
        shortDescription: 'A grand cookie box for special occasions.',
        fullDescription:
          'Make any celebration extra special with our grand Celebration Cookie Box. Filled with an abundant selection of our premium cookies, beautifully arranged in an elegant keepsake box. Perfect for weddings, birthdays, and corporate events. Available in 12, 24, or 48 pieces.',
        category: getCategoryId('Gifts'),
        regularPrice: 500,
        costPrice: 200,
        stock: 30,
        sku: 'BOX-CELEB-010',
        ingredients: 'Assorted flavors - see individual cookie descriptions',
        allergens:
          'Varies by selection. Contains wheat, dairy, eggs. May contain nuts and soy.',
        thumbnail: '/placeholder-cookie.svg',
        images: ['/placeholder-cookie.svg'],
        tags: ['cookie-box', 'celebration', 'gift', 'premium', 'corporate'],
        isFeatured: true,
        status: 'in_stock',
        inStock: true,
        isActive: true,
      },
    ];

    const products = await this.productModel.insertMany(
      productsData.map((p) => ({
        ...p,
        slug: generateSlug(p.name),
        lowStockThreshold: 10,
        isArchived: false,
        estimatedPrepTime: 24,
        ratingAverage: 0,
        ratingCount: 0,
      })),
    );

    this.logger.log(`Seeded ${products.length} products`);
    return products;
  }

  private async seedProductVariants(products: ProductDocument[]) {
    const existingCount = await this.variantModel.countDocuments();
    if (existingCount > 0) {
      this.logger.log('Product variants already seeded, skipping');
      return;
    }

    const findProductByName = (name: string) => {
      const product = products.find((p) => p.name === name);
      return product ? product._id.toString() : null;
    };

    const variantData = [
      {
        productName: 'Mixed Cookie Box',
        variants: [
          {
            name: '4 Pieces',
            sku: 'BOX-MIX-008-4',
            price: 150,
            stock: 50,
            sortOrder: 1,
            attributes: { pieces: '4' },
          },
          {
            name: '6 Pieces',
            sku: 'BOX-MIX-008-6',
            price: 220,
            stock: 50,
            sortOrder: 2,
            attributes: { pieces: '6' },
          },
          {
            name: '12 Pieces',
            sku: 'BOX-MIX-008-12',
            price: 400,
            stock: 30,
            sortOrder: 3,
            attributes: { pieces: '12' },
          },
          {
            name: '24 Pieces',
            sku: 'BOX-MIX-008-24',
            price: 750,
            stock: 20,
            sortOrder: 4,
            attributes: { pieces: '24' },
          },
        ],
      },
      {
        productName: 'Mini Cookie Box',
        variants: [
          {
            name: '4 Pieces',
            sku: 'BOX-MINI-009-4',
            price: 120,
            stock: 60,
            sortOrder: 1,
            attributes: { pieces: '4' },
          },
          {
            name: '6 Pieces',
            sku: 'BOX-MINI-009-6',
            price: 180,
            stock: 60,
            sortOrder: 2,
            attributes: { pieces: '6' },
          },
        ],
      },
      {
        productName: 'Celebration Cookie Box',
        variants: [
          {
            name: '12 Pieces',
            sku: 'BOX-CELEB-010-12',
            price: 500,
            stock: 30,
            sortOrder: 1,
            attributes: { pieces: '12' },
          },
          {
            name: '24 Pieces',
            sku: 'BOX-CELEB-010-24',
            price: 900,
            stock: 20,
            sortOrder: 2,
            attributes: { pieces: '24' },
          },
          {
            name: '48 Pieces',
            sku: 'BOX-CELEB-010-48',
            price: 1700,
            stock: 10,
            sortOrder: 3,
            attributes: { pieces: '48' },
          },
        ],
      },
    ];

    const toInsert: Array<DynamicRecord> = [];
    for (const group of variantData) {
      const productId = findProductByName(group.productName);
      if (!productId) continue;
      for (const v of group.variants) {
        toInsert.push({
          product: productId,
          name: v.name,
          sku: v.sku,
          price: v.price,
          stock: v.stock,
          isActive: true,
          sortOrder: v.sortOrder,
          attributes: v.attributes,
        });
      }
    }

    if (toInsert.length > 0) {
      await this.variantModel.insertMany(toInsert);
      this.logger.log(`Seeded ${toInsert.length} product variants`);
    }
  }

  private async seedDeliveryZones() {
    const existingCount = await this.zoneModel.countDocuments();
    if (existingCount > 0) {
      this.logger.log('Delivery zones already seeded, skipping');
      return;
    }

    const zones = [
      {
        governorate: 'Cairo',
        deliveryFee: 30,
        freeDeliveryThreshold: 300,
        estimatedDeliveryDays: '1-2 business days',
        sortOrder: 1,
        codAvailable: true,
        isActive: true,
      },
      {
        governorate: 'Giza',
        deliveryFee: 30,
        freeDeliveryThreshold: 300,
        estimatedDeliveryDays: '1-2 business days',
        sortOrder: 2,
        codAvailable: true,
        isActive: true,
      },
      {
        governorate: 'Alexandria',
        deliveryFee: 40,
        freeDeliveryThreshold: 350,
        estimatedDeliveryDays: '2-3 business days',
        sortOrder: 3,
        codAvailable: true,
        isActive: true,
      },
      {
        governorate: 'Sharqia',
        deliveryFee: 40,
        freeDeliveryThreshold: 400,
        estimatedDeliveryDays: '2-3 business days',
        sortOrder: 4,
        codAvailable: true,
        isActive: true,
      },
      {
        governorate: 'Dakahlia',
        deliveryFee: 40,
        freeDeliveryThreshold: 400,
        estimatedDeliveryDays: '2-3 business days',
        sortOrder: 5,
        codAvailable: true,
        isActive: true,
      },
      {
        governorate: 'Beheira',
        deliveryFee: 40,
        freeDeliveryThreshold: 400,
        estimatedDeliveryDays: '2-3 business days',
        sortOrder: 6,
        codAvailable: true,
        isActive: true,
      },
      {
        governorate: 'Gharbia',
        deliveryFee: 40,
        freeDeliveryThreshold: 400,
        estimatedDeliveryDays: '2-3 business days',
        sortOrder: 7,
        codAvailable: true,
        isActive: true,
      },
      {
        governorate: 'Monufia',
        deliveryFee: 40,
        freeDeliveryThreshold: 400,
        estimatedDeliveryDays: '2-3 business days',
        sortOrder: 8,
        codAvailable: true,
        isActive: true,
      },
      {
        governorate: 'Qalyubia',
        deliveryFee: 35,
        freeDeliveryThreshold: 350,
        estimatedDeliveryDays: '1-2 business days',
        sortOrder: 9,
        codAvailable: true,
        isActive: true,
      },
      {
        governorate: 'Port Said',
        deliveryFee: 45,
        freeDeliveryThreshold: 400,
        estimatedDeliveryDays: '2-3 business days',
        sortOrder: 10,
        codAvailable: true,
        isActive: true,
      },
      {
        governorate: 'Suez',
        deliveryFee: 45,
        freeDeliveryThreshold: 400,
        estimatedDeliveryDays: '2-3 business days',
        sortOrder: 11,
        codAvailable: true,
        isActive: true,
      },
      {
        governorate: 'Ismailia',
        deliveryFee: 45,
        freeDeliveryThreshold: 400,
        estimatedDeliveryDays: '2-3 business days',
        sortOrder: 12,
        codAvailable: true,
        isActive: true,
      },
      {
        governorate: 'Damietta',
        deliveryFee: 45,
        freeDeliveryThreshold: 400,
        estimatedDeliveryDays: '2-3 business days',
        sortOrder: 13,
        codAvailable: true,
        isActive: true,
      },
      {
        governorate: 'Kafr El Sheikh',
        deliveryFee: 45,
        freeDeliveryThreshold: 400,
        estimatedDeliveryDays: '2-3 business days',
        sortOrder: 14,
        codAvailable: true,
        isActive: true,
      },
      {
        governorate: 'Fayoum',
        deliveryFee: 50,
        freeDeliveryThreshold: 450,
        estimatedDeliveryDays: '3-4 business days',
        sortOrder: 15,
        codAvailable: true,
        isActive: true,
      },
      {
        governorate: 'Beni Suef',
        deliveryFee: 50,
        freeDeliveryThreshold: 450,
        estimatedDeliveryDays: '3-4 business days',
        sortOrder: 16,
        codAvailable: true,
        isActive: true,
      },
      {
        governorate: 'Minya',
        deliveryFee: 50,
        freeDeliveryThreshold: 450,
        estimatedDeliveryDays: '3-4 business days',
        sortOrder: 17,
        codAvailable: true,
        isActive: true,
      },
      {
        governorate: 'Asyut',
        deliveryFee: 55,
        freeDeliveryThreshold: 500,
        estimatedDeliveryDays: '3-4 business days',
        sortOrder: 18,
        codAvailable: true,
        isActive: true,
      },
      {
        governorate: 'Sohag',
        deliveryFee: 55,
        freeDeliveryThreshold: 500,
        estimatedDeliveryDays: '3-4 business days',
        sortOrder: 19,
        codAvailable: true,
        isActive: true,
      },
      {
        governorate: 'Qena',
        deliveryFee: 55,
        freeDeliveryThreshold: 500,
        estimatedDeliveryDays: '3-4 business days',
        sortOrder: 20,
        codAvailable: true,
        isActive: true,
      },
      {
        governorate: 'Luxor',
        deliveryFee: 60,
        freeDeliveryThreshold: 500,
        estimatedDeliveryDays: '4-5 business days',
        sortOrder: 21,
        codAvailable: true,
        isActive: true,
      },
      {
        governorate: 'Aswan',
        deliveryFee: 60,
        freeDeliveryThreshold: 500,
        estimatedDeliveryDays: '4-5 business days',
        sortOrder: 22,
        codAvailable: true,
        isActive: true,
      },
      {
        governorate: 'Red Sea',
        deliveryFee: 60,
        freeDeliveryThreshold: 500,
        estimatedDeliveryDays: '4-5 business days',
        sortOrder: 23,
        codAvailable: true,
        isActive: true,
      },
      {
        governorate: 'Matrouh',
        deliveryFee: 65,
        freeDeliveryThreshold: 500,
        estimatedDeliveryDays: '4-5 business days',
        sortOrder: 24,
        codAvailable: true,
        isActive: true,
      },
      {
        governorate: 'New Valley',
        deliveryFee: 70,
        freeDeliveryThreshold: 600,
        estimatedDeliveryDays: '5-7 business days',
        sortOrder: 25,
        codAvailable: true,
        isActive: true,
      },
      {
        governorate: 'North Sinai',
        deliveryFee: 70,
        freeDeliveryThreshold: 600,
        estimatedDeliveryDays: '5-7 business days',
        sortOrder: 26,
        codAvailable: false,
        isActive: true,
      },
      {
        governorate: 'South Sinai',
        deliveryFee: 70,
        freeDeliveryThreshold: 600,
        estimatedDeliveryDays: '5-7 business days',
        sortOrder: 27,
        codAvailable: false,
        isActive: true,
      },
    ];

    await this.zoneModel.insertMany(zones);
    this.logger.log(`Seeded ${zones.length} delivery zones`);
  }

  private async seedStoreSettings() {
    const existingCount = await this.settingModel.countDocuments();
    if (existingCount > 0) {
      this.logger.log('Store settings already seeded, skipping');
      return;
    }

    const settings = [
      {
        key: 'store_name',
        value: 'opps',
        group: 'general',
        description: 'Store name',
      },
      {
        key: 'store_description',
        value: 'Premium cookies delivered to your door',
        group: 'general',
        description: 'Store tagline',
      },
      {
        key: 'currency',
        value: 'EGP',
        group: 'general',
        description: 'Currency code',
      },
      {
        key: 'currency_symbol',
        value: 'E£',
        group: 'general',
        description: 'Currency symbol',
      },
      {
        key: 'contact_email',
        value: 'hello@opps.com',
        group: 'contact',
        description: 'Customer support email',
      },
      {
        key: 'contact_phone',
        value: '+201000000000',
        group: 'contact',
        description: 'Customer support phone',
      },
      {
        key: 'business_hours',
        value: 'Sat-Thu: 9:00 AM - 10:00 PM',
        group: 'general',
        description: 'Business hours',
      },
      {
        key: 'delivery_note',
        value: 'Free delivery on orders over E£300 within Cairo and Giza',
        group: 'delivery',
        description: 'Delivery information note',
      },
    ];

    await this.settingModel.insertMany(settings);
    this.logger.log(`Seeded ${settings.length} store settings`);
  }

  private async seedCoupons() {
    const existingCount = await this.couponModel.countDocuments();
    if (existingCount > 0) {
      this.logger.log('Coupons already seeded, skipping');
      return;
    }

    const now = new Date();
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

    const coupons = [
      {
        code: 'WELCOME10',
        description: '10% off your first order',
        type: 'percentage',
        value: 10,
        minOrderValue: 100,
        startDate: now,
        expirationDate: endOfYear,
        isActive: true,
        isFirstOrderOnly: true,
        perCustomerLimit: 1,
        usageLimit: 1000,
        usedCount: 0,
      },
      {
        code: 'SAVE20',
        description: '20% off with max discount of E£100',
        type: 'percentage',
        value: 20,
        maxDiscount: 100,
        minOrderValue: 200,
        startDate: now,
        expirationDate: endOfYear,
        isActive: true,
        isFirstOrderOnly: false,
        perCustomerLimit: 1,
        usageLimit: 500,
        usedCount: 0,
      },
      {
        code: 'FREEDELIVERY',
        description: 'Free delivery on orders over E£200',
        type: 'fixed',
        value: 30,
        minOrderValue: 200,
        startDate: now,
        expirationDate: endOfYear,
        isActive: true,
        isFirstOrderOnly: false,
        perCustomerLimit: 3,
        usageLimit: 1000,
        usedCount: 0,
      },
    ];

    await this.couponModel.insertMany(coupons);
    this.logger.log(`Seeded ${coupons.length} coupons`);
  }

  private getAllPermissions(): string[] {
    const entities = [
      'products',
      'categories',
      'variants',
      'orders',
      'payments',
      'users',
      'customers',
      'roles',
      'permissions',
      'coupons',
      'settings',
      'delivery_zones',
      'inventory',
      'analytics',
      'notifications',
      'audit_logs',
      'payment_methods',
    ];
    const actions = ['read', 'create', 'update', 'delete'];
    const perms: string[] = [];
    for (const entity of entities) {
      for (const action of actions) {
        perms.push(`${entity}:${action}`);
      }
    }
    return perms;
  }
}
