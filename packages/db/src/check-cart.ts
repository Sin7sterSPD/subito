import { db } from "./index.js";
import { carts, cartItems, catalogs } from "./schema/index.js";
import { eq, and } from "drizzle-orm";

async function main() {
  console.log("Checking active carts in DB...");
  const activeCarts = await db.query.carts.findMany({
    where: eq(carts.isActive, true),
    with: {
      items: {
        with: {
          catalog: true,
        },
      },
    },
  });

  console.log(`Found ${activeCarts.length} active carts:`);
  for (const cart of activeCarts) {
    console.log(`\nCart ID: ${cart.id} (User: ${cart.userId}, Version: ${cart.version})`);
    console.log(`Final Amount: ${cart.finalAmount}`);
    console.log("Items:");
    for (const item of cart.items || []) {
      console.log(`  - Item ID: ${item.id}`);
      console.log(`    Catalog ID: ${item.catalogId}`);
      console.log(`    Name: ${item.catalog?.name}`);
      console.log(`    Quantity: ${item.quantity}`);
      console.log(`    Min Quantity: ${item.catalog?.minQuantity}`);
      console.log(`    Max Quantity: ${item.catalog?.maxQuantity}`);
      console.log(`    Step Quantity: ${item.catalog?.stepQuantity}`);
    }
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
