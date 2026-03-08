"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"

export default function NewWorkOrder(){

const router = useRouter()

const [customers,setCustomers] = useState<any[]>([])
const [bikes,setBikes] = useState<any[]>([])

const [selectedCustomer,setSelectedCustomer] = useState("")
const [selectedBike,setSelectedBike] = useState("")
const [notes,setNotes] = useState("")

async function loadCustomers(){

const { data } = await supabase
.from("customers")
.select("*")
.order("name")

setCustomers(data || [])

}

async function loadCustomerBikes(customerId:string){

const { data } = await supabase
.from("bikes")
.select("*")
.eq("customer_id",customerId)

setBikes(data || [])

}

function handleCustomerChange(customerId:string){

setSelectedCustomer(customerId)
setSelectedBike("")
loadCustomerBikes(customerId)

}

async function createWorkOrder(){

if(!selectedCustomer || !selectedBike){
alert("Seleziona cliente e bici")
return
}

const { data, error } = await supabase
.from("work_orders")
.insert({
customer_id:selectedCustomer,
bike_id:selectedBike,
notes:notes,
status:"open"
})
.select()
.single()

if(error){
console.log(error)
alert("Errore creazione scheda")
return
}

router.push(`/workorders/${data.id}`)

}

useEffect(()=>{
loadCustomers()
},[])

return(

<div style={{
maxWidth:700,
margin:"auto",
padding:40,
fontFamily:"Arial"
}}>

<h1 style={{marginBottom:30}}>
Nuova scheda lavoro
</h1>

{/* CLIENTE */}

<div style={{
border:"1px solid #ddd",
padding:20,
borderRadius:8,
marginBottom:20
}}>

<label style={{fontWeight:"bold"}}>
Cliente </label>

<select
value={selectedCustomer}
onChange={(e)=>handleCustomerChange(e.target.value)}
style={{
width:"100%",
padding:10,
marginTop:10
}}

>

<option value="">Seleziona cliente</option>

{customers.map((c:any)=>(

<option key={c.id} value={c.id}>
{c.name}
</option>
))}

</select>

<div style={{marginTop:10}}>

<button
onClick={()=>router.push("/customers/new")}
style={{
background:"#2d7ef7",
color:"white",
border:"none",
padding:"8px 14px",
borderRadius:6,
cursor:"pointer"
}}

>

➕ Nuovo cliente </button>

</div>

</div>

{/* BICI */}

<div style={{
border:"1px solid #ddd",
padding:20,
borderRadius:8,
marginBottom:20
}}>

<label style={{fontWeight:"bold"}}>
Bici </label>

<select
value={selectedBike}
onChange={(e)=>setSelectedBike(e.target.value)}
style={{
width:"100%",
padding:10,
marginTop:10
}}

>

<option value="">Seleziona bici</option>

{bikes.map((b:any)=>(

<option key={b.id} value={b.id}>
{b.brand} {b.model} • {b.serial}
</option>
))}

</select>

<div style={{marginTop:10}}>

<button
onClick={()=>router.push(`/bikes/new?customer=${selectedCustomer}`)}
style={{
background:"#1e9c57",
color:"white",
border:"none",
padding:"8px 14px",
borderRadius:6,
cursor:"pointer"
}}

>

🚲 Nuova bici </button>

</div>

</div>

{/* NOTE */}

<div style={{
border:"1px solid #ddd",
padding:20,
borderRadius:8
}}>

<label style={{fontWeight:"bold"}}>
Note lavoro </label>

<textarea
value={notes}
onChange={(e)=>setNotes(e.target.value)}
style={{
width:"100%",
height:100,
marginTop:10,
padding:10
}}
/>

</div>

{/* CREA SCHEDA */}

<button
onClick={createWorkOrder}
style={{
marginTop:30,
background:"#111",
color:"white",
border:"none",
padding:"12px 22px",
borderRadius:8,
cursor:"pointer",
fontSize:16
}}
>

Crea scheda lavoro

</button>

</div>

)

}
