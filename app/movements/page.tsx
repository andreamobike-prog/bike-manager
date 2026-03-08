"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

export default function MovementsPage(){

const [movements,setMovements] = useState<any[]>([])

async function loadMovements(){

const { data } = await supabase
.from("inventory_movements")
.select(`
id,
type,
quantity,
created_at,
products (
title,
ean
)
`)
.order("created_at",{ascending:false})

setMovements(data || [])

}

useEffect(()=>{
loadMovements()
},[])

return(

<div style={{padding:"40px"}}>

<h1>Movimenti magazzino</h1>

<br/>

<table border={1} cellPadding={10}>

<thead>

<tr>
<th>Data</th>
<th>Prodotto</th>
<th>EAN</th>
<th>Tipo</th>
<th>Quantità</th>
</tr>

</thead>

<tbody>

{movements.map((m:any)=>(
<tr key={m.id}>

<td>
{new Date(m.created_at).toLocaleString()}
</td>

<td>
{m.products?.title}
</td>

<td>
{m.products?.ean}
</td>

<td>
{m.type}
</td>

<td>
{m.quantity}
</td>

</tr>
))}

</tbody>

</table>

</div>

)

}