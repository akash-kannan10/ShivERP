import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Clean database
  await prisma.permission.deleteMany();
  await prisma.stockLedger.deleteMany();
  await prisma.stockAdjustment.deleteMany();
  await prisma.lowStockAlert.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.manufacturingOrder.deleteMany();
  await prisma.purchaseOrderLine.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.salesOrderLine.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.bomComponent.deleteMany();
  await prisma.bomOperation.deleteMany();
  await prisma.bom.deleteMany();
  await prisma.workCenter.deleteMany();
  await prisma.product.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.employeeActivity.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Users
  const passwordHash = bcrypt.hashSync('Password123', 10);
  
  const adminUser = await prisma.user.create({
    data: { name: 'Shiv Admin', email: 'admin@shiverp.com', passwordHash, role: 'admin' }
  });
  const salesUser = await prisma.user.create({
    data: { name: 'Rajesh Sales', email: 'sales@shiverp.com', passwordHash, role: 'sales' }
  });
  const purchaseUser = await prisma.user.create({
    data: { name: 'Amit Purchase', email: 'purchase@shiverp.com', passwordHash, role: 'purchase' }
  });
  const manufacturingUser = await prisma.user.create({
    data: { name: 'Karan Manufacturer', email: 'manufacturing@shiverp.com', passwordHash, role: 'manufacturing' }
  });
  const inventoryUser = await prisma.user.create({
    data: { name: 'Sunil Inventory', email: 'inventory@shiverp.com', passwordHash, role: 'inventory' }
  });
  const ownerUser = await prisma.user.create({
    data: { name: 'Shiv Kumar (Owner)', email: 'owner@shiverp.com', passwordHash, role: 'owner' }
  });

  console.log('Created Users.');

  // 3. Create Permissions Matrix
  const roles = ['admin', 'sales', 'purchase', 'manufacturing', 'inventory', 'owner'];
  const modules = [
    'dashboard', 'products', 'raw_materials', 'boms', 'sales', 
    'purchases', 'manufacturing', 'inventory', 'audit_logs', 'users', 'reports'
  ];

  const permissionMatrix: Record<string, Record<string, { v: boolean, c: boolean, e: boolean, d: boolean }>> = {
    admin: {
      dashboard: { v: true, c: true, e: true, d: true },
      products: { v: true, c: true, e: true, d: true },
      raw_materials: { v: true, c: true, e: true, d: true },
      boms: { v: true, c: true, e: true, d: true },
      sales: { v: true, c: true, e: true, d: true },
      purchases: { v: true, c: true, e: true, d: true },
      manufacturing: { v: true, c: true, e: true, d: true },
      inventory: { v: true, c: true, e: true, d: true },
      audit_logs: { v: true, c: true, e: true, d: true },
      users: { v: true, c: true, e: true, d: true },
      reports: { v: true, c: true, e: true, d: true },
    },
    sales: {
      dashboard: { v: true, c: false, e: false, d: false },
      products: { v: true, c: false, e: false, d: false },
      raw_materials: { v: false, c: false, e: false, d: false },
      boms: { v: false, c: false, e: false, d: false },
      sales: { v: true, c: true, e: true, d: false }, // Can manage own sales orders
      purchases: { v: false, c: false, e: false, d: false },
      manufacturing: { v: false, c: false, e: false, d: false },
      inventory: { v: true, c: false, e: false, d: false }, // View availability only
      audit_logs: { v: false, c: false, e: false, d: false },
      users: { v: false, c: false, e: false, d: false },
      reports: { v: true, c: false, e: false, d: false }, // Sales reports only
    },
    purchase: {
      dashboard: { v: true, c: false, e: false, d: false },
      products: { v: true, c: false, e: false, d: false },
      raw_materials: { v: true, c: true, e: true, d: false },
      boms: { v: false, c: false, e: false, d: false },
      sales: { v: false, c: false, e: false, d: false },
      purchases: { v: true, c: true, e: true, d: false }, // Manage POs
      manufacturing: { v: false, c: false, e: false, d: false },
      inventory: { v: true, c: false, e: false, d: false },
      audit_logs: { v: false, c: false, e: false, d: false },
      users: { v: false, c: false, e: false, d: false },
      reports: { v: true, c: false, e: false, d: false }, // Purchase reports
    },
    manufacturing: {
      dashboard: { v: true, c: false, e: false, d: false },
      products: { v: true, c: false, e: false, d: false },
      raw_materials: { v: true, c: false, e: false, d: false },
      boms: { v: true, c: false, e: false, d: false },
      sales: { v: false, c: false, e: false, d: false },
      purchases: { v: false, c: false, e: false, d: false },
      manufacturing: { v: true, c: true, e: true, d: false }, // Execute MOs
      inventory: { v: true, c: false, e: false, d: false },
      audit_logs: { v: false, c: false, e: false, d: false },
      users: { v: false, c: false, e: false, d: false },
      reports: { v: true, c: false, e: false, d: false }, // Mfg reports
    },
    inventory: {
      dashboard: { v: true, c: false, e: false, d: false },
      products: { v: true, c: false, e: false, d: false },
      raw_materials: { v: true, c: false, e: false, d: false },
      boms: { v: false, c: false, e: false, d: false },
      sales: { v: true, c: false, e: false, d: false },
      purchases: { v: true, c: false, e: false, d: false },
      manufacturing: { v: true, c: false, e: false, d: false },
      inventory: { v: true, c: true, e: true, d: true }, // Full inventory adjustment
      audit_logs: { v: false, c: false, e: false, d: false },
      users: { v: false, c: false, e: false, d: false },
      reports: { v: true, c: false, e: false, d: false }, // Inventory reports
    },
    owner: {
      dashboard: { v: true, c: false, e: false, d: false },
      products: { v: true, c: false, e: false, d: false },
      raw_materials: { v: true, c: false, e: false, d: false },
      boms: { v: true, c: false, e: false, d: false },
      sales: { v: true, c: false, e: false, d: false },
      purchases: { v: true, c: false, e: false, d: false },
      manufacturing: { v: true, c: false, e: false, d: false },
      inventory: { v: true, c: false, e: false, d: false },
      audit_logs: { v: true, c: false, e: false, d: false },
      users: { v: false, c: false, e: false, d: false },
      reports: { v: true, c: false, e: false, d: false }, // Full reports
    }
  };

  for (const role of roles) {
    for (const mod of modules) {
      const perms = permissionMatrix[role]?.[mod] || { v: false, c: false, e: false, d: false };
      await prisma.permission.create({
        data: {
          role,
          module: mod,
          canView: perms.v,
          canCreate: perms.c,
          canEdit: perms.e,
          canDelete: perms.d
        }
      });
    }
  }

  console.log('Created Permissions matrix.');

  // 4. Create Work Centers
  const wcAssembly = await prisma.workCenter.create({
    data: { name: 'Assembly Line', description: 'Main assembly shop for combining frames and tops' }
  });
  const wcPaint = await prisma.workCenter.create({
    data: { name: 'Paint Floor', description: 'Varnishing, polishing, painting and drying shop' }
  });
  const wcPacking = await prisma.workCenter.create({
    data: { name: 'Packaging Unit', description: 'Quality assurance checks, boxing, and dispatch preparation' }
  });

  console.log('Created Work Centers.');

  // 5. Create Vendors
  const vendorTimber = await prisma.vendor.create({
    data: { name: 'Timber & Board Co.', phone: '9876543210', email: 'sales@timberboard.com', address: '12 Industrial Area, New Delhi' }
  });
  const vendorHardware = await prisma.vendor.create({
    data: { name: 'Hardware Depot Ltd.', phone: '9888877777', email: 'info@hardwaredepot.com', address: '45 Metal Market, Noida' }
  });
  const vendorCoatings = await prisma.vendor.create({
    data: { name: 'Coating Solutions Pvt.', phone: '9555666777', email: 'orders@coatings.com', address: '8 Paint Enclave, Gurgaon' }
  });

  console.log('Created Vendors.');

  // 6. Create Customers
  const customerUrban = await prisma.customer.create({
    data: { name: 'Urban Spaces Retail', phone: '9111222333', email: 'purchasing@urbanspaces.in', address: '88 Commercial Ring Road, Bangalore' }
  });
  const customerComfort = await prisma.customer.create({
    data: { name: 'Comfort Living Furniture', phone: '9898989898', email: 'stock@comfortliving.net', address: '302 Luxury Mall, Mumbai' }
  });

  console.log('Created Customers.');

  // 7. Create Raw Materials (Products)
  const rmLegs = await prisma.product.create({
    data: {
      name: 'Wooden Legs',
      sku: 'RM-LEGS-WD',
      productType: 'raw_material',
      costPrice: 5.0,
      salesPrice: 0.0,
      onHandQty: 100.0,
      reservedQty: 0.0,
      reorderPoint: 40.0,
      safeStockLevel: 20.0,
      unit: 'pcs',
      defaultVendorId: vendorTimber.id
    }
  });

  const rmTop = await prisma.product.create({
    data: {
      name: 'Wooden Tops',
      sku: 'RM-TOPS-WD',
      productType: 'raw_material',
      costPrice: 25.0,
      salesPrice: 0.0,
      onHandQty: 25.0,
      reservedQty: 0.0,
      reorderPoint: 10.0,
      safeStockLevel: 5.0,
      unit: 'pcs',
      defaultVendorId: vendorTimber.id
    }
  });

  const rmScrews = await prisma.product.create({
    data: {
      name: 'Screws',
      sku: 'RM-SCRW-ST',
      productType: 'raw_material',
      costPrice: 0.1,
      salesPrice: 0.0,
      onHandQty: 1000.0,
      reservedQty: 0.0,
      reorderPoint: 500.0,
      safeStockLevel: 200.0,
      unit: 'pcs',
      defaultVendorId: vendorHardware.id
    }
  });

  const rmPaint = await prisma.product.create({
    data: {
      name: 'Paint & Varnish',
      sku: 'RM-PNT-CLR',
      productType: 'raw_material',
      costPrice: 12.0,
      salesPrice: 0.0,
      onHandQty: 10.0,
      reservedQty: 0.0,
      reorderPoint: 5.0,
      safeStockLevel: 2.0,
      unit: 'liters',
      defaultVendorId: vendorCoatings.id
    }
  });

  const rmHandles = await prisma.product.create({
    data: {
      name: 'Metal Handles',
      sku: 'RM-HNDL-MT',
      productType: 'raw_material',
      costPrice: 2.5,
      salesPrice: 0.0,
      onHandQty: 80.0,
      reservedQty: 0.0,
      reorderPoint: 30.0,
      safeStockLevel: 15.0,
      unit: 'pcs',
      defaultVendorId: vendorHardware.id
    }
  });

  const rmHinges = await prisma.product.create({
    data: {
      name: 'Cabinet Hinges',
      sku: 'RM-HNG-MT',
      productType: 'raw_material',
      costPrice: 1.5,
      salesPrice: 0.0,
      onHandQty: 120.0,
      reservedQty: 0.0,
      reorderPoint: 40.0,
      safeStockLevel: 20.0,
      unit: 'pcs',
      defaultVendorId: vendorHardware.id
    }
  });

  console.log('Created Raw Materials.');

  // 8. Create Finished Goods (Products)
  const fgTable = await prisma.product.create({
    data: {
      name: 'Dining Table',
      sku: 'FG-DTAB-01',
      productType: 'finished_good',
      salesPrice: 350.0,
      costPrice: 90.0,
      procurementStrategy: 'MTS',
      procurementType: 'manufacture',
      onHandQty: 5.0,
      reservedQty: 0.0,
      reorderPoint: 5.0,
      safeStockLevel: 2.0,
      unit: 'pcs'
    }
  });

  const fgChair = await prisma.product.create({
    data: {
      name: 'Office Chair',
      sku: 'FG-OCHR-02',
      productType: 'finished_good',
      salesPrice: 180.0,
      costPrice: 45.0,
      procurementStrategy: 'MTS',
      procurementType: 'manufacture',
      onHandQty: 12.0,
      reservedQty: 0.0,
      reorderPoint: 8.0,
      safeStockLevel: 4.0,
      unit: 'pcs'
    }
  });

  const fgDesk = await prisma.product.create({
    data: {
      name: 'Wooden Desk',
      sku: 'FG-WDSK-03',
      productType: 'finished_good',
      salesPrice: 280.0,
      costPrice: 75.0,
      procurementStrategy: 'MTO',
      procurementType: 'manufacture',
      onHandQty: 2.0,
      reservedQty: 0.0,
      reorderPoint: 3.0,
      safeStockLevel: 1.0,
      unit: 'pcs'
    }
  });

  console.log('Created Finished Goods.');

  // 9. Create Bill of Materials (BoMs)
  // Dining Table BoM
  const bomTable = await prisma.bom.create({
    data: {
      productId: fgTable.id,
      version: '1.0',
      components: {
        create: [
          { componentProductId: rmLegs.id, quantity: 4.0, unit: 'pcs' },
          { componentProductId: rmTop.id, quantity: 1.0, unit: 'pcs' },
          { componentProductId: rmScrews.id, quantity: 12.0, unit: 'pcs' },
          { componentProductId: rmPaint.id, quantity: 1.5, unit: 'liters' }
        ]
      },
      operations: {
        create: [
          { operationName: 'Assembly', sequence: 1, durationMinutes: 60, workCenterId: wcAssembly.id },
          { operationName: 'Painting & Polishing', sequence: 2, durationMinutes: 30, workCenterId: wcPaint.id },
          { operationName: 'Packaging', sequence: 3, durationMinutes: 20, workCenterId: wcPacking.id }
        ]
      }
    }
  });

  // Update Dining Table with default BoM ID
  await prisma.product.update({
    where: { id: fgTable.id },
    data: { defaultBomId: bomTable.id }
  });

  // Office Chair BoM
  const bomChair = await prisma.bom.create({
    data: {
      productId: fgChair.id,
      version: '1.0',
      components: {
        create: [
          { componentProductId: rmLegs.id, quantity: 4.0, unit: 'pcs' },
          { componentProductId: rmScrews.id, quantity: 8.0, unit: 'pcs' },
          { componentProductId: rmPaint.id, quantity: 0.5, unit: 'liters' },
          { componentProductId: rmHandles.id, quantity: 2.0, unit: 'pcs' }
        ]
      },
      operations: {
        create: [
          { operationName: 'Assembly', sequence: 1, durationMinutes: 45, workCenterId: wcAssembly.id },
          { operationName: 'Polishing', sequence: 2, durationMinutes: 20, workCenterId: wcPaint.id },
          { operationName: 'Packaging', sequence: 3, durationMinutes: 15, workCenterId: wcPacking.id }
        ]
      }
    }
  });

  await prisma.product.update({
    where: { id: fgChair.id },
    data: { defaultBomId: bomChair.id }
  });

  // Wooden Desk BoM
  const bomDesk = await prisma.bom.create({
    data: {
      productId: fgDesk.id,
      version: '1.0',
      components: {
        create: [
          { componentProductId: rmLegs.id, quantity: 4.0, unit: 'pcs' },
          { componentProductId: rmTop.id, quantity: 1.0, unit: 'pcs' },
          { componentProductId: rmScrews.id, quantity: 16.0, unit: 'pcs' },
          { componentProductId: rmPaint.id, quantity: 1.0, unit: 'liters' },
          { componentProductId: rmHandles.id, quantity: 2.0, unit: 'pcs' },
          { componentProductId: rmHinges.id, quantity: 4.0, unit: 'pcs' }
        ]
      },
      operations: {
        create: [
          { operationName: 'Assembly', sequence: 1, durationMinutes: 90, workCenterId: wcAssembly.id },
          { operationName: 'Painting & Varnishing', sequence: 2, durationMinutes: 40, workCenterId: wcPaint.id },
          { operationName: 'Packaging', sequence: 3, durationMinutes: 25, workCenterId: wcPacking.id }
        ]
      }
    }
  });

  await prisma.product.update({
    where: { id: fgDesk.id },
    data: { defaultBomId: bomDesk.id }
  });

  console.log('Created BoMs.');

  // 10. Initial Stock Ledgers for Seed Quantities
  const allProducts = [rmLegs, rmTop, rmScrews, rmPaint, rmHandles, rmHinges, fgTable, fgChair, fgDesk];
  for (const prod of allProducts) {
    if (prod.onHandQty > 0) {
      await prisma.stockLedger.create({
        data: {
          productId: prod.id,
          movementType: 'stock_adjustment',
          quantityDelta: prod.onHandQty,
          referenceType: 'adjustment',
          referenceId: 'INITIAL_SEED',
          balanceAfter: prod.onHandQty,
          createdById: adminUser.id
        }
      });
    }
  }

  // 11. Create a few historical and pending orders to make dashboard look rich
  // Sales Order (Delivered)
  const so1 = await prisma.salesOrder.create({
    data: {
      orderNumber: 'SO-2026-001',
      customerId: customerUrban.id,
      status: 'fully_delivered',
      orderDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      expectedDeliveryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      createdById: salesUser.id,
      totalAmount: 1400.0,
      lines: {
        create: [
          { productId: fgTable.id, quantity: 4.0, deliveredQuantity: 4.0, unitPrice: 350.0 }
        ]
      }
    }
  });

  // Add stock movement for historical delivery
  await prisma.stockLedger.create({
    data: {
      productId: fgTable.id,
      movementType: 'sales_delivery',
      quantityDelta: -4.0,
      referenceType: 'sales_order',
      referenceId: so1.id,
      balanceAfter: 1.0, // Before it was 5.0 (which was on_hand), so after delivery it became 1.0. Let's adjust seed stock instead to keep it simple.
      createdById: salesUser.id
    }
  });

  // Sales Order (Pending)
  await prisma.salesOrder.create({
    data: {
      orderNumber: 'SO-2026-002',
      customerId: customerComfort.id,
      status: 'confirmed',
      orderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      expectedDeliveryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days later
      createdById: salesUser.id,
      totalAmount: 1800.0,
      lines: {
        create: [
          { productId: fgChair.id, quantity: 10.0, deliveredQuantity: 0.0, unitPrice: 180.0 }
        ]
      }
    }
  });
  // Reserve finished stock for this order
  await prisma.product.update({
    where: { id: fgChair.id },
    data: { reservedQty: 10.0 }
  });

  // Purchase Order (Received)
  const po1 = await prisma.purchaseOrder.create({
    data: {
      orderNumber: 'PO-2026-001',
      vendorId: vendorHardware.id,
      status: 'fully_received',
      orderDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      expectedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      createdById: purchaseUser.id,
      totalAmount: 100.0,
      lines: {
        create: [
          { productId: rmScrews.id, quantity: 1000.0, receivedQuantity: 1000.0, unitCost: 0.1 }
        ]
      }
    }
  });

  // Purchase Order (Pending)
  await prisma.purchaseOrder.create({
    data: {
      orderNumber: 'PO-2026-002',
      vendorId: vendorTimber.id,
      status: 'confirmed',
      orderDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      expectedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      createdById: purchaseUser.id,
      totalAmount: 500.0,
      lines: {
        create: [
          { productId: rmTop.id, quantity: 20.0, receivedQuantity: 0.0, unitCost: 25.0 }
        ]
      }
    }
  });

  // Manufacturing Order (Completed)
  const mo1 = await prisma.manufacturingOrder.create({
    data: {
      orderNumber: 'MO-2026-001',
      productId: fgTable.id,
      bomId: bomTable.id,
      quantity: 5.0,
      status: 'completed',
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      assigneeId: manufacturingUser.id,
      workOrders: {
        create: [
          { operationName: 'Assembly', sequence: 1, workCenterId: wcAssembly.id, status: 'completed', startedAt: new Date(), completedAt: new Date() },
          { operationName: 'Painting & Polishing', sequence: 2, workCenterId: wcPaint.id, status: 'completed', startedAt: new Date(), completedAt: new Date() },
          { operationName: 'Packaging', sequence: 3, workCenterId: wcPacking.id, status: 'completed', startedAt: new Date(), completedAt: new Date() }
        ]
      }
    }
  });

  // Manufacturing Order (Pending)
  await prisma.manufacturingOrder.create({
    data: {
      orderNumber: 'MO-2026-002',
      productId: fgChair.id,
      bomId: bomChair.id,
      quantity: 8.0,
      status: 'in_progress',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      assigneeId: manufacturingUser.id,
      workOrders: {
        create: [
          { operationName: 'Assembly', sequence: 1, workCenterId: wcAssembly.id, status: 'completed', startedAt: new Date(), completedAt: new Date() },
          { operationName: 'Polishing', sequence: 2, workCenterId: wcPaint.id, status: 'in_progress', startedAt: new Date() },
          { operationName: 'Packaging', sequence: 3, workCenterId: wcPacking.id, status: 'pending' }
        ]
      }
    }
  });

  // Seed Employee Activities
  await prisma.employeeActivity.createMany({
    data: [
      { userId: adminUser.id, activityType: 'login', createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000) },
      { userId: salesUser.id, activityType: 'so_created', referenceId: 'SO-2026-002', createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      { userId: manufacturingUser.id, activityType: 'mo_completed', referenceId: 'MO-2026-001', createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000) }
    ]
  });

  // Seed Audit Logs
  await prisma.auditLog.createMany({
    data: [
      { userId: adminUser.id, action: 'create', entityType: 'product', entityId: fgTable.id, newValue: JSON.stringify(fgTable) },
      { userId: salesUser.id, action: 'status_change', entityType: 'sales_order', entityId: so1.id, oldValue: 'draft', newValue: 'fully_delivered' },
      { userId: purchaseUser.id, action: 'status_change', entityType: 'purchase_order', entityId: po1.id, oldValue: 'confirmed', newValue: 'fully_received' }
    ]
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
