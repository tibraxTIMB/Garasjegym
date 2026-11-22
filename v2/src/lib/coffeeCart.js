// Each distinct combination of drink and options is its own cart line.
// This preserves e.g. cappuccino with oat milk and cappuccino with dairy.
export function selectedCoffeeOptions(product, selections = {}) {
  const options = []
  for (const group of product?.option_groups || []) {
    const choice = selections[group.name] || ''
    if (group.required && !choice) throw new Error('Vel eit alternativ for ' + group.name + '.')
    if (choice && !(group.choices || []).includes(choice)) throw new Error('Ugyldig val for ' + group.name + '.')
    if (choice) options.push({ group: group.name, choice })
  }
  return options
}

export function coffeeCartKey(productId, options = []) {
  return String(productId) + '|' + JSON.stringify([...options].sort((a,b)=>a.group.localeCompare(b.group)))
}

export function addCoffeeCartItem(lines, product, selections = {}) {
  if (!product?.id || !product.is_active) throw new Error('Drikka er ikkje tilgjengeleg.')
  const options = selectedCoffeeOptions(product, selections)
  const key = coffeeCartKey(product.id, options)
  const found = lines.find(line => line.key === key)
  if (found) {
    if (found.quantity >= 20) throw new Error('Du kan velja maks 20 av same variant.')
    return lines.map(line => line.key === key ? {...line, quantity:line.quantity + 1} : line)
  }
  if (lines.length >= 20) throw new Error('Handlekorga kan ha maks 20 ulike drikkevariantar.')
  return [...lines, {key,product_id:product.id,quantity:1,options}]
}

export function changeCoffeeCartItem(lines, key, delta) {
  return lines.map(line => line.key === key ? {...line,quantity:Math.max(0,Math.min(20,line.quantity + delta))} : line).filter(line => line.quantity > 0)
}

export function availableCoffeeCartItems(lines, products) {
  return lines.filter(line => {
    const product = products.find(item => item.id === line.product_id && item.is_active)
    if (!product || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 20 || !Array.isArray(line.options)) return false
    try {
      const selections = Object.fromEntries(line.options.map(option => [option.group,option.choice]))
      return coffeeCartKey(product.id,selectedCoffeeOptions(product,selections)) === line.key
    } catch { return false }
  })
}

export function coffeeCartTotal(lines, products) {
  return lines.reduce((sum,line)=>sum+Number(products.find(p=>p.id===line.product_id)?.price||0)*line.quantity,0)
}
