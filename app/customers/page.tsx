"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useRouter } from "next/navigation"

export default function CustomersPage(){

const router = useRouter()

const [customers,setCustomers] = useState<any[]>([])
const [search,setSearch] = useState("")
const [showModal,setShowModal] = useState(false)

const [form,setForm] = useState({
name:"",
phone:"",
email:"",
notes:""
})

useEffect(()=>{
loadCustomers()
},[])

async function loadCustomers(){

const { data } = await supabase
.from("customers")
.select("*")
.order("name")

if(data){
setCustomers(data)
}

}

async function createCustomer(){

await supabase
.from("customers")
.insert([form])

setShowModal(false)

setForm({
name:"",
phone:"",
email:"",
notes:""
})

loadCustomers()

}

const filtered = customers.filter(c =>
c.name?.toLowerCase().includes(search.toLowerCase())
)

return(

<div>

<h1 style={{marginBottom:20}}>Clienti</h1>

<div style={{display:"flex",gap:10,marginBottom:20}}>

<input
placeholder="Cerca cliente..."
value={search}
onChange={(e)=>setSearch(e.target.value)}
style={{
padding:10,
width:300
}}
/>

<button
onClick={()=>setShowModal(true)}
style={{
background:"#2563eb",
color:"white",
border:"none",
padding:"10px 18px",
borderRadius:6,
cursor:"pointer"
}}
>
+ Nuovo cliente
</button>

</div>

<div style={{
display:"grid",
gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",
gap:20
}}>

{filtered.map(c=>(

<div
key={c.id}
onClick={()=>router.push("/customers/"+c.id)}
style={{
background:"white",
padding:20,
borderRadius:10,
boxShadow:"0 2px 8px rgba(0,0,0,0.1)",
cursor:"pointer"
}}
>

<div style={{fontWeight:"bold",marginBottom:10}}>
{c.name}
</div>

<div>{c.phone}</div>
<div>{c.email}</div>

</div>

))}

</div>

{showModal && (

<div style={{
position:"fixed",
top:0,
left:0,
right:0,
bottom:0,
background:"rgba(0,0,0,0.4)",
display:"flex",
alignItems:"center",
justifyContent:"center"
}}>

<div style={{
background:"white",
padding:30,
borderRadius:10,
width:400
}}>

<h2>Nuovo cliente</h2>

<input
placeholder="Nome"
value={form.name}
onChange={(e)=>setForm({...form,name:e.target.value})}
style={{width:"100%",marginBottom:10}}
/>

<input
placeholder="Telefono"
value={form.phone}
onChange={(e)=>setForm({...form,phone:e.target.value})}
style={{width:"100%",marginBottom:10}}
/>

<input
placeholder="Email"
value={form.email}
onChange={(e)=>setForm({...form,email:e.target.value})}
style={{width:"100%",marginBottom:10}}
/>

<textarea
placeholder="Note"
value={form.notes}
onChange={(e)=>setForm({...form,notes:e.target.value})}
style={{width:"100%",marginBottom:20}}
/>

<button onClick={createCustomer}>
Salva
</button>

<button
onClick={()=>setShowModal(false)}
style={{marginLeft:10}}
>
Annulla
</button>

</div>

</div>

)}

</div>

)

}