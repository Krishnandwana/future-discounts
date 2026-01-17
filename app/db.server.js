import { PrismaClient } from "@prisma/client";

// Completely disable Prisma debug logging
process.env.DEBUG = process.env.DEBUG ? process.env.DEBUG.replace(/prisma:[^,\s]*/g, '').replace(/,+/g, ',').replace(/^,|,$/g, '') : '';

// Prefer the direct database URL so we always talk to the schema that already has the session table
const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.FUTUREDISCOUNTS_DATABASE_DIRECT_URL ||
  process.env.FUTUREDISCOUNTS_DATABASE_URL;

// Optimize Prisma client for performance
const prismaClientOptions = {
  log: [], // Disable all logging including errors, queries, info, warn
  errorFormat: 'minimal',
  ...(databaseUrl && {
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  }),
  // Enable query optimization
  transactionOptions: {
    maxWait: 2000, // 2 seconds
    timeout: 5000,  // 5 seconds
  }
};

// Ensure a single PrismaClient instance across development and production
if (process.env.NODE_ENV !== "production") {
  if (!global.prisma) {
    global.prisma = new PrismaClient(prismaClientOptions);
  }
}

const prisma = global.prisma || new PrismaClient(prismaClientOptions);

// Add Middleware to Prisma Client
prisma.$use(async (params, next) => {
  if (params.model === "Session" && params.action === "create") {
    const shopName = params.args.data.shop;

    // Check if a billing entry already exists for the shop
    const existingBilling = await prisma.billingDetails.findUnique({
      where: { shopName },
    });

    if (!existingBilling) {
      // Create a new billing entry with default values
      await prisma.billingDetails.create({
        data: {
          shopName,
          plan: "Free", // Default Plan
          billingCycle: "Monthly", // Default Billing Cycle
          totalAmountBilled: 0.0, // Default Amount
          startDate: new Date(),
          status: true, // Active status
        },
      });
    }

    // Return a flag for redirection logic
    params.args.response = {
      redirectTo: `/app/payment_recvd?shop=${shopName}&charge_id=free_plan`,
    };
  }

  // Proceed with the original operation
  return next(params);
});

export default prisma;
