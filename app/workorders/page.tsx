"use client"

import { useEffect,useState } from "react"
import { supabase } from "../../lib/supabase"
import Link from "next/link"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"

export default function WorkOrdersPage(){

const [orders,setOrders] = useState([])
const [search,setSearch] = useState("")

async function loadOrders(){

const { data } = await supabase
.from("work_orders")
.select(`
*,
customers(name),
bikes(brand,model)
`)
.order("created_at",{ascending:false})

setOrders(data || [])

}

useEffect(()=>{
loadOrders()
},[])

async function updateStatus(id,newStatus){

await supabase
.from("work_orders")
.update({status:newStatus})
.eq("id",id)

loadOrders()

}

function onDragEnd(result){

if(!result.destination) return

const id = result.draggableId
const newStatus = result.destination.droppableId

updateStatus(id,newStatus)

}

const filtered = orders.filter(o =>
o.customers?.name?.toLowerCase().includes(search.toLowerCase())
)

const open = filtered.filter(o => o.status === "open")
const working = filtered.filter(o => o.status === "working")
const closed = filtered.filter(o => o.status === "closed")

return(

<div style={{padding:40,maxWidth:1200,margin:"auto"}}>

<div style={{
display:"flex",
justifyContent:"space-between",
alignItems:"center",
marginBottom:20
}}>

<h1>Schede officina</h1>

<Link href="/workorders/new">

<button style={{
background:"#8bc34a",
color:"white",
border:"none",
padding:"10px 16px",
borderRadius:8
}}>
+ Nuova scheda lavoro
</button>

</Link>

</div>

{/* COUNTERS */}

<div style={{
display:"grid",
gridTemplateColumns:"1fr 1fr 1fr",
gap:20,
marginBottom:25
}}>

<Counter title="Aperte" value={open.length} color="#8bc34a"/>
<Counter title="In lavorazione" value={working.length} color="#ff9800"/>
<Counter title="Chiuse" value={closed.length} color="#777"/>

</div>

<input
placeholder="Cerca cliente..."
value={search}
onChange={(e)=>setSearch(e.target.value)}
style={{
width:"100%",
padding:12,
borderRadius:8,
border:"1px solid #ddd",
marginBottom:30
}}
/>

<DragDropContext onDragEnd={onDragEnd}>

<div style={{
display:"grid",
gridTemplateColumns:"1fr 1fr 1fr",
gap:20
}}>

<Column title="Aperte" status="open" orders={open}/>
<Column title="In lavorazione" status="working" orders={working}/>
<Column title="Chiuse" status="closed" orders={closed}/>

</div>

</DragDropContext>

</div>

)

}



function Counter({title,value,color}){

return(

<div style={{
background:"#fff",
padding:20,
borderRadius:10,
boxShadow:"0 4px 12px rgba(0,0,0,0.05)"
}}>

<div style={{fontSize:14,color:"#777"}}>
{title}
</div>

<div style={{
fontSize:28,
fontWeight:700,
color:color
}}>
{value}
</div>

</div>

)

}



function Column({title,status,orders}){

return(

<div>

<h3 style={{marginBottom:10}}>
{title}
</h3>

<Droppable droppableId={status}>

{(provided)=>(
<div
ref={provided.innerRef}
{...provided.droppableProps}
style={{
minHeight:400,
background:"#f7f7f7",
padding:10,
borderRadius:10
}}
>

{orders.map((o,index)=>(

<Draggable
key={o.id}
draggableId={o.id}
index={index}
>

{(provided)=>(
<div
ref={provided.innerRef}
{...provided.draggableProps}
{...provided.dragHandleProps}
>

<Card order={o}/>

</div>
)}

</Draggable>

))}

{provided.placeholder}

</div>
)}

</Droppable>

</div>

)

}



function Card({order}){

return(

<div style={{
background:"#fff",
padding:16,
borderRadius:10,
marginBottom:10,
boxShadow:"0 3px 10px rgba(0,0,0,0.08)"
}}>

<b>{order.customers?.name}</b>

<div style={{
fontSize:13,
color:"#666"
}}>
{order.bikes?.brand} {order.bikes?.model}
</div>

<Link href={`/workorders/${order.id}`}>

<button style={{
marginTop:10,
background:"#8bc34a",
border:"none",
color:"white",
padding:"6px 12px",
borderRadius:6
}}>
Apri
</button>

</Link>

</div>

)

}