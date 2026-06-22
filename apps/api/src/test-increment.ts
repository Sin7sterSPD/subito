import { getCart, updateCartItem } from "./modules/cart/cart.service"

async function main() {
  const userId = "864800e0-b222-455d-812f-55a608b4e222"
  const catalogId = "6045b075-355f-4054-9686-93bb56edc172"

  console.log("Before update:")
  let cart = await getCart(userId)
  console.log(JSON.stringify(cart, null, 2))

  console.log("\nIncrementing...")
  try {
    cart = await updateCartItem(userId, {
      catalogItemId: catalogId,
      changeType: "INCREMENT",
      isQuickAdd: false,
    })
    console.log("After Increment:")
    console.log(JSON.stringify(cart, null, 2))
  } catch (err) {
    console.error("Increment failed:", err)
  }

  console.log("\nDecrementing...")
  try {
    cart = await updateCartItem(userId, {
      catalogItemId: catalogId,
      changeType: "DECREMENT",
      isQuickAdd: false,
    })
    console.log("After Decrement:")
    console.log(JSON.stringify(cart, null, 2))
  } catch (err) {
    console.error("Decrement failed:", err)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
