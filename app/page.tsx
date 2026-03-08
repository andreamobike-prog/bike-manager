"use client"

import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import Link from "next/link"

export default function Home(){

const [products,setProducts] = useState<any[]>([])
const [value,setValue] = useState(0)
const [lowStock,setLowStock] = useState<any[]>([])

async function loadProducts(){

const { data } = await supabase
.from("products")
.select("*")

setProducts(data || [])

let total = 0
let low:any[] = []

data?.forEach((p:any)=>{

total += (p.price_b2c || 0) * (p.warehouse_qty || 0)

if(p.warehouse_qty <= (p.restock_min || 0)){
low.push(p)
}

})

setValue(total)
setLowStock(low)

}

useEffect(()=>{
loadProducts()
},[])

return(

<div style={{padding:"40px"}}>

<h1>Magazzino bici</h1>

<br/>

<Link href="/products">
+ Inserisci prodotto
</Link>

<br/><br/>

<Link href="/inventory">
Magazzino
</Link>

<br/><br/>

<Link href="/movements">
Movimenti magazzino
</Link>

<br/><br/>

<Link href="/customers">
Clienti
</Link>

<br/><br/>

<Link href="/bikes">
Bici clienti
</Link>

<br/><br/>

<Link href="/workorders">
Schede officina
</Link>

<br/><br/>

<h2>Valore magazzino: € {value}</h2>

<br/>

<h2>⚠ Prodotti sotto scorta</h2>

{lowStock.length === 0 && (
<p>Nessun prodotto sotto scorta</p>
)}

{lowStock.map((p:any)=>(
<div key={p.id}>
⚠ {p.title} - quantità: {p.warehouse_qty}
</div>
))}

<br/><br/>

<h2>Prodotti in magazzino</h2>

<table border={1} cellPadding={10}>

<thead>
<tr>
<th>Prodotto</th>
<th>EAN</th>
<th>Quantità</th>
<th>Prezzo</th>
</tr>
</thead>

<tbody>

{products.map((p:any)=>(
<tr key={p.id}>
<td>{p.title}</td>
<td>{p.ean}</td>
<td>{p.warehouse_qty}</td>
<td>{p.price_b2c}</td>
</tr>
))}

</tbody>

</table>

</div>

)

}