"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import { useParams } from "next/navigation"

export default function CustomerDetail(){

const params = useParams()
const id = params.id as string

const [customer,setCustomer] = useState<any>(null)
const [bikes,setBikes] = useState<any[]>([])
const [orders,setOrders] = useState<any[]>([])
const [loading,setLoading] = useState(true)

const [showCustomerModal,setShowCustomerModal] = useState(false)
const [showBikeModal,setShowBikeModal] = useState(false)
const [showAddBikeModal,setShowAddBikeModal] = useState(false)

const [selectedBike,setSelectedBike] = useState<any>(null)
const [deleteBikeId,setDeleteBikeId] = useState<string | null>(null)

const [customerForm,setCustomerForm] = useState({
name:"",
phone:"",
email:"",
notes:""
})

const [bikeForm,setBikeForm] = useState({
brand:"",
model:"",
frame:"",
color:""
})

useEffect(()=>{
loadCustomer()
loadBikes()
loadOrders()
},[])

async function loadCustomer(){

const { data } = await supabase
.from("customers")
.select("*")
.eq("id",id)
.single()

if(data){

setCustomer(data)

setCustomerForm({
name:data.name || "",
phone:data.phone || "",
email:data.email || "",
notes:data.notes || ""
})

}

setLoading(false)

}

async function loadBikes(){

const { data } = await supabase
.from("bikes")
.select("*")
.eq("customer_id",id)

if(data){
setBikes(data)
}

}

async function loadOrders(){

const { data } = await supabase
.from("work_orders")
.select(`
id,
created_at,
status,
notes,
bikes(brand,model)
`)
.eq("customer_id",id)
.order("created_at",{ascending:false})

if(data){
setOrders(data)
}

}

async function updateCustomer(){

await supabase
.from("customers")
.update(customerForm)
.eq("id",id)

setShowCustomerModal(false)

loadCustomer()

}

async function createBike(){

await supabase
.from("bikes")
.insert([
{
customer_id:id,
brand:bikeForm.brand,
model:bikeForm.model,
serial:bikeForm.frame,
color:bikeForm.color
}
])

setShowAddBikeModal(false)

setBikeForm({
brand:"",
model:"",
frame:"",
color:""
})

loadBikes()

}

async function updateBike(){

await supabase
.from("bikes")
.update({
brand:bikeForm.brand,
model:bikeForm.model,
serial:bikeForm.frame,
color:bikeForm.color
})
.eq("id",selectedBike.id)

setShowBikeModal(false)

loadBikes()

}

async function deleteBike(){

if(!deleteBikeId) return

await supabase
.from("bikes")
.delete()
.eq("id",deleteBikeId)

setDeleteBikeId(null)

loadBikes()

}

if(loading){
return <div style={{padding:40}}>Caricamento...</div>
}

return(

<div style={{maxWidth:1100,margin:"auto"}}>

{/* HEADER CLIENTE */}

<div style={customerHeader}>

<div>

<div style={customerName}>
{customer.name}
</div>

<div style={customerInfo}>
📞 {customer.phone}
</div>

<div style={customerInfo}>
✉️ {customer.email}
</div>

</div>

<button
onClick={()=>setShowCustomerModal(true)}
style={blueBtn}
>
Modifica cliente
</button>

</div>

{/* BICI */}

<div style={sectionHeader}>

<h2>Bici cliente</h2>

<button
onClick={()=>setShowAddBikeModal(true)}
style={greenBtn}
>
+ Aggiungi bici
</button>

</div>

<div style={bikeGrid}>

{bikes.map(bike=>(

<div key={bike.id} style={bikeCard}>

<div style={{fontWeight:"bold",fontSize:18}}>
{bike.brand}
</div>

<div>Modello: {bike.model}</div>
<div>Telaio: {bike.serial}</div>
<div>Colore: {bike.color}</div>

<div style={{display:"flex",gap:10,marginTop:15}}>

<button
onClick={()=>{

setSelectedBike(bike)

setBikeForm({
brand:bike.brand,
model:bike.model,
frame:bike.serial,
color:bike.color
})

setShowBikeModal(true)

}}
style={grayBtn}
>
Modifica
</button>

<button
onClick={()=>setDeleteBikeId(bike.id)}
style={redBtn}
>
Elimina
</button>

</div>

</div>

))}

</div>

{/* SCHEDE OFFICINA */}

<div style={{marginTop:60}}>

<h2>Schede officina</h2>

<div style={ordersBox}>

<table style={table}>

<thead>

<tr>
<th style={th}>Data</th>
<th style={th}>Bici</th>
<th style={th}>Stato</th>
<th style={th}>Note</th>
<th style={th}></th>
</tr>

</thead>

<tbody>

{orders.map(order=>(

<tr key={order.id} style={row}>

<td style={td}>
{new Date(order.created_at).toLocaleDateString()}
</td>

<td style={td}>
{order.bikes?.brand} {order.bikes?.model}
</td>

<td style={td}>
{order.status}
</td>

<td style={td}>
{order.notes}
</td>

<td style={td}>

<a
href={`/workorders/${order.id}`}
style={blueLink}
>
Apri
</a>

</td>

</tr>

))}

</tbody>

</table>

</div>

</div>

{/* MODAL MODIFICA CLIENTE */}

{showCustomerModal && (

<div style={overlay}>

<div style={modal}>

<h2>Modifica cliente</h2>

<input
value={customerForm.name}
onChange={(e)=>setCustomerForm({...customerForm,name:e.target.value})}
style={input}
/>

<input
value={customerForm.phone}
onChange={(e)=>setCustomerForm({...customerForm,phone:e.target.value})}
style={input}
/>

<input
value={customerForm.email}
onChange={(e)=>setCustomerForm({...customerForm,email:e.target.value})}
style={input}
/>

<textarea
value={customerForm.notes}
onChange={(e)=>setCustomerForm({...customerForm,notes:e.target.value})}
style={input}
/>

<div style={modalButtons}>

<button onClick={updateCustomer} style={blueBtn}>
Salva
</button>

<button onClick={()=>setShowCustomerModal(false)} style={grayBtn}>
Annulla
</button>

</div>

</div>

</div>

)}

{/* MODAL AGGIUNGI BICI */}

{showAddBikeModal && (

<div style={overlay}>

<div style={modal}>

<h2>Aggiungi bici</h2>

<input
placeholder="Marca"
value={bikeForm.brand}
onChange={(e)=>setBikeForm({...bikeForm,brand:e.target.value})}
style={input}
/>

<input
placeholder="Modello"
value={bikeForm.model}
onChange={(e)=>setBikeForm({...bikeForm,model:e.target.value})}
style={input}
/>

<input
placeholder="Telaio"
value={bikeForm.frame}
onChange={(e)=>setBikeForm({...bikeForm,frame:e.target.value})}
style={input}
/>

<input
placeholder="Colore"
value={bikeForm.color}
onChange={(e)=>setBikeForm({...bikeForm,color:e.target.value})}
style={input}
/>

<div style={modalButtons}>

<button onClick={createBike} style={greenBtn}>
Salva bici
</button>

<button onClick={()=>setShowAddBikeModal(false)} style={grayBtn}>
Annulla
</button>

</div>

</div>

</div>

)}

{/* MODAL MODIFICA BICI */}

{showBikeModal && (

<div style={overlay}>

<div style={modal}>

<h2>Modifica bici</h2>

<input
value={bikeForm.brand}
onChange={(e)=>setBikeForm({...bikeForm,brand:e.target.value})}
style={input}
/>

<input
value={bikeForm.model}
onChange={(e)=>setBikeForm({...bikeForm,model:e.target.value})}
style={input}
/>

<input
value={bikeForm.frame}
onChange={(e)=>setBikeForm({...bikeForm,frame:e.target.value})}
style={input}
/>

<input
value={bikeForm.color}
onChange={(e)=>setBikeForm({...bikeForm,color:e.target.value})}
style={input}
/>

<div style={modalButtons}>

<button onClick={updateBike} style={blueBtn}>
Salva
</button>

<button onClick={()=>setShowBikeModal(false)} style={grayBtn}>
Annulla
</button>

</div>

</div>

</div>

)}

{/* MODAL ELIMINA BICI */}

{deleteBikeId && (

<div style={overlay}>

<div style={modal}>

<h3>Vuoi eliminare questa bici?</h3>

<div style={modalButtons}>

<button onClick={deleteBike} style={redBtn}>
Elimina
</button>

<button onClick={()=>setDeleteBikeId(null)} style={grayBtn}>
Annulla
</button>

</div>

</div>

</div>

)}

</div>

)

}

/* STILI */

const overlay={
position:"fixed",
top:0,
left:0,
right:0,
bottom:0,
background:"rgba(0,0,0,0.45)",
display:"flex",
alignItems:"center",
justifyContent:"center",
zIndex:1000
}

const modal={
background:"white",
padding:30,
borderRadius:10,
width:420,
boxShadow:"0 10px 30px rgba(0,0,0,0.25)"
}

const input={
width:"100%",
padding:10,
marginBottom:12,
borderRadius:6,
border:"1px solid #ddd"
}

const modalButtons={
display:"flex",
gap:10,
marginTop:10
}

const customerHeader={
background:"white",
padding:35,
borderRadius:14,
boxShadow:"0 6px 20px rgba(0,0,0,0.08)",
marginBottom:40,
display:"flex",
justifyContent:"space-between",
alignItems:"center"
}

const customerName={
fontSize:34,
fontWeight:"bold",
marginBottom:8
}

const customerInfo={
fontSize:20
}

const sectionHeader={
display:"flex",
justifyContent:"space-between",
alignItems:"center",
marginBottom:20
}

const bikeGrid={
display:"grid",
gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",
gap:20
}

const bikeCard={
background:"white",
padding:20,
borderRadius:10,
boxShadow:"0 3px 12px rgba(0,0,0,0.08)"
}

const ordersBox={
background:"white",
borderRadius:10,
boxShadow:"0 3px 10px rgba(0,0,0,0.08)",
overflow:"hidden"
}

const table={
width:"100%",
borderCollapse:"collapse"
}

const row={
borderTop:"1px solid #eee"
}

const th={
textAlign:"left",
padding:12,
fontWeight:"bold"
}

const td={
padding:12
}

const blueBtn={
background:"#2563eb",
color:"white",
border:"none",
padding:"10px 16px",
borderRadius:6,
cursor:"pointer"
}

const greenBtn={
background:"#22c55e",
color:"white",
border:"none",
padding:"10px 16px",
borderRadius:6,
cursor:"pointer"
}

const redBtn={
background:"#ef4444",
color:"white",
border:"none",
padding:"10px 16px",
borderRadius:6,
cursor:"pointer"
}

const grayBtn={
background:"#e5e7eb",
border:"none",
padding:"10px 16px",
borderRadius:6,
cursor:"pointer"
}

const blueLink={
background:"#2563eb",
color:"white",
padding:"6px 12px",
borderRadius:6,
textDecoration:"none"
}