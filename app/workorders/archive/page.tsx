"use client"

import { useEffect,useState } from "react"
import { supabase } from "../../../lib/supabase"
import Link from "next/link"

export default function ArchivePage(){

const [orders,setOrders] = useState<any[]>([])

useEffect(()=>{
loadArchive()
},[])

async function loadArchive(){

const { data } = await supabase
.from("work_orders")
.select(`
*,
customers(name),
bikes(brand,model)
`)
.eq("archived",true)
.order("created_at",{ascending:false})

setOrders(data || [])

}

async function restoreOrder(id:string){

await supabase
.from("work_orders")
.update({
archived:false,
status:"open"
})
.eq("id",id)

loadArchive()

}

async function deleteOrder(id:string){

const ok = confirm("Eliminare definitivamente questa scheda?")

if(!ok) return

await supabase.from("work_order_parts").delete().eq("work_order_id",id)
await supabase.from("work_order_services").delete().eq("work_order_id",id)
await supabase.from("inventory_movements").delete().eq("work_order_id",id)
await supabase.from("work_orders").delete().eq("id",id)

loadArchive()

}

return(

<div className="page">

<div className="header">

<h1>Archivio schede lavoro</h1>

<Link href="/workorders">

<button className="backBtn">
← Torna alle schede
</button>

</Link>

</div>

<div className="card">

<table className="table">

<thead>

<tr>
<th>Cliente</th>
<th>Bici</th>
<th>Data</th>
<th></th>
</tr>

</thead>

<tbody>

{orders.map(o=>(

<tr key={o.id}>

<td>{o.customers?.name}</td>

<td>{o.bikes?.brand} {o.bikes?.model}</td>

<td>{new Date(o.created_at).toLocaleDateString()}</td>

<td className="actions">

<Link href={`/workorders/${o.id}/report`}>

<button className="btnView">
Apri report
</button>

</Link>

<button
className="btnRestore"
onClick={()=>restoreOrder(o.id)}
>
Ripristina
</button>

<button
className="btnDelete"
onClick={()=>deleteOrder(o.id)}
>
Elimina
</button>

</td>

</tr>

))}

</tbody>

</table>

</div>

<style jsx>{`

.page{
padding:40px;
background:#f4f6fb;
min-height:100vh;
font-family:Arial;
}

.header{
display:flex;
justify-content:space-between;
align-items:center;
margin-bottom:20px;
}

.card{
background:white;
padding:25px;
border-radius:12px;
box-shadow:0 6px 20px rgba(0,0,0,0.05);
}

.table{
width:100%;
border-collapse:collapse;
}

.table th{
text-align:left;
font-size:13px;
color:#777;
padding-bottom:10px;
}

.table td{
padding:14px 0;
border-top:1px solid #eee;
}

.actions{
display:flex;
gap:8px;
}

button{
border:none;
padding:6px 12px;
border-radius:6px;
cursor:pointer;
font-size:13px;
}

.btnView{
background:#2563eb;
color:white;
}

.btnRestore{
background:#8bc34a;
color:white;
}

.btnDelete{
background:#ef4444;
color:white;
}

.backBtn{
background:#607d8b;
color:white;
padding:8px 14px;
border-radius:8px;
}

`}</style>

</div>

)

}