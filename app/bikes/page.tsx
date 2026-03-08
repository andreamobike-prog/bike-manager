"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

export default function BikesPage(){

const [bikes,setBikes] = useState<any[]>([])
const [customers,setCustomers] = useState<any[]>([])

const [customerId,setCustomerId] = useState("")
const [brand,setBrand] = useState("")
const [model,setModel] = useState("")
const [serial,setSerial] = useState("")
const [color,setColor] = useState("")

async function loadData(){

const { data:bikeData } = await supabase
.from("bikes")
.select(`
id,
brand,
model,
serial_number,
color,
customers(name)
`)

setBikes(bikeData || [])

const { data:customerData } = await supabase
.from("customers")
.select("*")

setCustomers(customerData || [])

}

async function addBike(){

await supabase
.from("bikes")
.insert({
customer_id:customerId,
brand,
model,
serial_number:serial,
color
})

setBrand("")
setModel("")
setSerial("")
setColor("")

loadData()

}

useEffect(()=>{
loadData()
},[])

return(

<div style={{padding:"40px"}}>

<h1>Bici clienti</h1>

<br/>

<select
value={customerId}
onChange={(e)=>setCustomerId(e.target.value)}
>

<option value="">Seleziona cliente</option>

{customers.map((c:any)=>(
<option key={c.id} value={c.id}>
{c.name}
</option>
))}

</select>

<br/><br/>

<input
placeholder="Marca"
value={brand}
onChange={(e)=>setBrand(e.target.value)}
/>

<br/><br/>

<input
placeholder="Modello"
value={model}
onChange={(e)=>setModel(e.target.value)}
/>

<br/><br/>

<input
placeholder="Numero telaio"
value={serial}
onChange={(e)=>setSerial(e.target.value)}
/>

<br/><br/>

<input
placeholder="Colore"
value={color}
onChange={(e)=>setColor(e.target.value)}
/>

<br/><br/>

<button onClick={addBike}>
Salva bici
</button>

<br/><br/>

<h2>Lista bici</h2>

<table border={1} cellPadding={10}>

<thead>
<tr>
<th>Cliente</th>
<th>Marca</th>
<th>Modello</th>
<th>Telaio</th>
<th>Colore</th>
</tr>
</thead>

<tbody>

{bikes.map((b:any)=>(
<tr key={b.id}>
<td>{b.customers?.name}</td>
<td>{b.brand}</td>
<td>{b.model}</td>
<td>{b.serial_number}</td>
<td>{b.color}</td>
</tr>
))}

</tbody>

</table>

</div>

)

}