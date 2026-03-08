"use client"

import { useState } from "react"
import { supabase } from "../../lib/supabase"

export default function InventoryPage(){

const [ean,setEan] = useState("")
const [product,setProduct] = useState<any>(null)

async function searchProduct(){

const { data } = await supabase
.from("products")
.select("*")
.eq("ean", ean)
.single()

setProduct(data)

}

async function addOne(){

const newQty = product.warehouse_qty + 1

await supabase
.from("products")
.update({ warehouse_qty: newQty })
.eq("id", product.id)

await supabase
.from("inventory_movements")
.insert({
product_id: product.id,
type: "carico",
quantity: 1
})

setProduct({
...product,
warehouse_qty: newQty
})

}

async function removeOne(){

const newQty = product.warehouse_qty - 1

await supabase
.from("products")
.update({ warehouse_qty: newQty })
.eq("id", product.id)

await supabase
.from("inventory_movements")
.insert({
product_id: product.id,
type: "officina",
quantity: -1
})

setProduct({
...product,
warehouse_qty: newQty
})

}

return(

<div style={{padding:"40px"}}>

<h1>Magazzino</h1>

<br/>

<input
placeholder="Scansiona o inserisci EAN"
value={ean}
onChange={(e)=>setEan(e.target.value)}
/>

<button onClick={searchProduct}>
Cerca
</button>

<br/><br/>

{product && (

<div>

<h2>{product.title}</h2>

<p>EAN: {product.ean}</p>

<p>Quantità: {product.warehouse_qty}</p>

<p>Prezzo: € {product.price_b2c}</p>

<br/>

<button onClick={addOne}>
+1 Carico
</button>

<button onClick={removeOne} style={{marginLeft:"10px"}}>
-1 Officina
</button>

</div>

)}

</div>

)

}