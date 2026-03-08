"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"

export default function WorkOrderDetail(){

const params = useParams()
const router = useRouter()
const id = params.id

const hourlyRate = 35

const [order,setOrder] = useState(null)
const [products,setProducts] = useState([])
const [parts,setParts] = useState([])
const [services,setServices] = useState([])

const [showPartsModal,setShowPartsModal] = useState(false)
const [partSearch,setPartSearch] = useState("")
const [selectedProduct,setSelectedProduct] = useState(null)

const [partForm,setPartForm] = useState({
quantity:1,
custom_price:""
})

const [showServiceModal,setShowServiceModal] = useState(false)

const [newService,setNewService] = useState({
title:"",
hours:1,
notes:"",
custom_price:"",
service_date:new Date().toISOString().split("T")[0]
})

async function loadData(){

const { data:orderData } = await supabase
.from("work_orders")
.select(`
*,
customers(*),
bikes(*)
`)
.eq("id",id)
.single()

setOrder(orderData)

const { data:productData } = await supabase
.from("products")
.select("*")

setProducts(productData || [])

const { data:partsData } = await supabase
.from("work_order_parts")
.select("*")
.eq("work_order_id",id)

setParts(partsData || [])

const { data:servicesData } = await supabase
.from("work_order_services")
.select("*")
.eq("work_order_id",id)

setServices(servicesData || [])

}

useEffect(()=>{
if(id) loadData()
},[id])

if(!order) return <div style={{padding:40}}>Caricamento...</div>

const productsMap={}
products.forEach(p=>productsMap[p.id]=p)

const filteredProducts =
partSearch.length >= 2
? products.filter(p=>
p.title?.toLowerCase().includes(partSearch.toLowerCase()) ||
p.ean?.toLowerCase().includes(partSearch.toLowerCase())
)
: []

async function savePart(){

if(!selectedProduct) return

await supabase
.from("work_order_parts")
.insert({
work_order_id:id,
product_id:selectedProduct.id,
quantity:Number(partForm.quantity),
price_snapshot:selectedProduct.price_b2c,
custom_price: partForm.custom_price !== "" ? Number(partForm.custom_price) : null,
billable:true
})

setShowPartsModal(false)
setSelectedProduct(null)
setPartSearch("")
setPartForm({quantity:1,custom_price:""})

loadData()

}

async function deletePart(partId){

await supabase
.from("work_order_parts")
.delete()
.eq("id",partId)

loadData()

}

async function updateQty(partId,qty){

await supabase
.from("work_order_parts")
.update({quantity:qty})
.eq("id",partId)

loadData()

}

async function updateCustomPrice(partId,price){

await supabase
.from("work_order_parts")
.update({custom_price:price})
.eq("id",partId)

loadData()

}

async function toggleBillable(partId,current){

await supabase
.from("work_order_parts")
.update({billable:!current})
.eq("id",partId)

loadData()

}

async function saveService(){

const hours = Number(newService.hours) || 0

const customPrice =
newService.custom_price !== ""
? Number(newService.custom_price)
: null

await supabase
.from("work_order_services")
.insert({
work_order_id:id,
title:newService.title,
hours:hours,
notes:newService.notes,
custom_price:customPrice,
service_date:newService.service_date
})

setShowServiceModal(false)

setNewService({
title:"",
hours:1,
notes:"",
custom_price:"",
service_date:new Date().toISOString().split("T")[0]
})

loadData()

}

async function deleteService(serviceId){

await supabase
.from("work_order_services")
.delete()
.eq("id",serviceId)

loadData()

}

const partsTotal = parts.reduce((acc,p)=>{

if(!p.billable) return acc

const product = productsMap[p.product_id]

const listino =
p.price_snapshot ??
product?.price_b2c ??
0

const price =
p.custom_price ??
listino

return acc + price * p.quantity

},0)

const serviceTotal = services.reduce((acc,s)=>{

const price =
s.custom_price ??
((s.hours || 0) * hourlyRate)

return acc + price

},0)

const total = partsTotal + serviceTotal

return(

<div style={{padding:40,maxWidth:1100,margin:"auto",fontFamily:"Arial"}}>

{/* HEADER */}

<div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>

<h1>Scheda lavoro</h1>

<button
onClick={()=>router.push(`/workorders/${id}/report`)}
style={{
background:"#1e9c57",
color:"white",
border:"none",
padding:"10px 20px",
borderRadius:8
}}
>
🖨 Versione stampabile
</button>

</div>

{/* CLIENTE */}

<div style={{
border:"1px solid #444",
padding:15,
borderRadius:6,
marginBottom:30
}}>

<b>Cliente:</b> {order.customers?.name}<br/>
<b>Telefono:</b> {order.customers?.phone}<br/>
<b>Bici:</b> {order.bikes?.brand} {order.bikes?.model}<br/>
<b>Telaio:</b> {order.bikes?.serial}<br/>

<b>Note:</b> {order.notes}

</div>

{/* RICAMBI */}

<h2>Ricambi utilizzati</h2>

<button
onClick={()=>setShowPartsModal(true)}
style={{
background:"#2d7ef7",
color:"white",
border:"none",
padding:"10px 18px",
borderRadius:8,
cursor:"pointer",
fontWeight:600,
marginBottom:15
}}
>
+ Aggiungi ricambio
</button>

<table style={{width:"100%"}}>

<thead>
<tr>
<th>Prodotto</th>
<th>Qtà</th>
<th>Prezzo</th>
<th>Fattura</th>
<th>Totale</th>
<th></th>
</tr>
</thead>

<tbody>

{parts.map(p=>{

const product = productsMap[p.product_id]

const listino =
p.price_snapshot ??
product?.price_b2c ??
0

const price =
p.custom_price ??
listino

return(

<tr key={p.id}>

<td>{product?.title}</td>

<td>
<input
type="number"
value={p.quantity}
onChange={(e)=>updateQty(p.id,Number(e.target.value))}
style={{width:60}}
/>
</td>

<td>

<div style={{display:"flex",flexDirection:"column"}}>

<div style={{
fontSize:12,
textDecoration:"line-through",
color:"#888"
}}>
{listino} €
</div>

<input
type="number"
value={p.custom_price ?? ""}
placeholder={listino}
onChange={(e)=>updateCustomPrice(p.id,Number(e.target.value))}
style={{width:80}}
/>

</div>

</td>

<td>
<input
type="checkbox"
checked={p.billable}
onChange={()=>toggleBillable(p.id,p.billable)}
/>
</td>

<td>{(price * p.quantity).toFixed(2)} €</td>

<td>
<button onClick={()=>deletePart(p.id)}>Elimina</button>
</td>

</tr>

)

})}

</tbody>

</table>

{/* INTERVENTI */}

<h2 style={{marginTop:40}}>Interventi</h2>

<button
onClick={()=>setShowServiceModal(true)}
style={{
background:"#2d7ef7",
color:"white",
border:"none",
padding:"10px 18px",
borderRadius:8,
cursor:"pointer",
fontWeight:600,
marginBottom:15
}}
>
+ Aggiungi intervento
</button>

<table style={{width:"100%"}}>

<thead>
<tr>
<th>Data</th>
<th>Intervento</th>
<th>Ore</th>
<th>Note</th>
<th>Prezzo</th>
<th></th>
</tr>
</thead>

<tbody>

{services.map(s=>{

const price =
s.custom_price ??
((s.hours || 0) * hourlyRate)

return(

<tr key={s.id}>
<td>{s.service_date}</td>
<td>{s.title}</td>
<td>{s.hours}</td>
<td>{s.notes}</td>
<td>{price.toFixed(2)} €</td>
<td>
<button onClick={()=>deleteService(s.id)}>Elimina</button>
</td>
</tr>

)

})}

</tbody>

</table>

<div style={{marginTop:40}}>

<p>Ricambi: {partsTotal.toFixed(2)} €</p>
<p>Manodopera: {serviceTotal.toFixed(2)} €</p>
<h2>Totale cliente: {total.toFixed(2)} €</h2>

</div>

{showPartsModal && (

<div style={{
position:"fixed",
inset:0,
background:"rgba(0,0,0,0.65)",
display:"flex",
alignItems:"center",
justifyContent:"center",
zIndex:1000
}}>

<div style={{
background:"#ffffff",
padding:30,
borderRadius:14,
width:520,
maxHeight:"80vh",
overflow:"auto",
boxShadow:"0 25px 70px rgba(0,0,0,0.35)",
display:"flex",
flexDirection:"column",
gap:18
}}>

<h2 style={{margin:0,fontSize:20}}>Aggiungi ricambio</h2>

{/* SEARCH */}

<input
placeholder="Cerca prodotto o EAN..."
value={partSearch}
onChange={(e)=>setPartSearch(e.target.value)}
style={{
width:"100%",
padding:"12px 14px",
borderRadius:8,
border:"1px solid #ccc",
fontSize:14
}}
/>

{/* RISULTATI */}

<div style={{
display:"flex",
flexDirection:"column",
gap:8
}}>

{filteredProducts.map(p=>(

<div key={p.id} style={{
display:"flex",
justifyContent:"space-between",
alignItems:"center",
padding:"10px 12px",
border:"1px solid #eee",
borderRadius:8
}}>

<div style={{fontSize:14}}>

<b>{p.title}</b><br/>

<span style={{fontSize:12,color:"#777"}}>
EAN {p.ean}
</span><br/>

<span style={{fontWeight:600}}>
{p.price_b2c} €
</span>

</div>

<button
onClick={()=>setSelectedProduct(p)}
style={{
background:"#2d7ef7",
color:"white",
border:"none",
padding:"6px 14px",
borderRadius:6,
cursor:"pointer"
}}
>
Seleziona
</button>

</div>

))}

</div>

{/* PRODOTTO SELEZIONATO */}

{selectedProduct && (

<div style={{
borderTop:"1px solid #eee",
paddingTop:15,
display:"flex",
flexDirection:"column",
gap:10
}}>

<h3 style={{margin:0}}>{selectedProduct.title}</h3>

<div style={{
display:"flex",
gap:10
}}>

<div style={{flex:1}}>

<label style={{fontSize:12,color:"#666"}}>Quantità</label>

<input
type="number"
value={partForm.quantity}
onChange={(e)=>setPartForm({...partForm,quantity:e.target.value})}
style={{
width:"100%",
padding:10,
borderRadius:6,
border:"1px solid #ccc"
}}
/>

</div>

<div style={{flex:1}}>

<label style={{fontSize:12,color:"#666"}}>Prezzo custom</label>

<input
type="number"
value={partForm.custom_price}
placeholder={selectedProduct.price_b2c}
onChange={(e)=>setPartForm({...partForm,custom_price:e.target.value})}
style={{
width:"100%",
padding:10,
borderRadius:6,
border:"1px solid #ccc"
}}
/>

</div>

</div>

<button
onClick={savePart}
style={{
marginTop:10,
background:"#2d7ef7",
color:"white",
border:"none",
padding:"10px 18px",
borderRadius:8,
cursor:"pointer",
fontWeight:600
}}
>
Aggiungi ricambio
</button>

</div>

)}

{/* CHIUDI */}

<button
onClick={()=>setShowPartsModal(false)}
style={{
marginTop:10,
alignSelf:"flex-start",
background:"#f2f2f2",
border:"none",
padding:"8px 14px",
borderRadius:6,
cursor:"pointer"
}}
>
Chiudi
</button>

</div>

</div>

)}
{showServiceModal && (

<div style={{
position:"fixed",
inset:0,
background:"rgba(0,0,0,0.6)",
display:"flex",
alignItems:"center",
justifyContent:"center",
zIndex:1000
}}>

<div style={{
background:"#fff",
padding:30,
borderRadius:12,
width:460,
boxShadow:"0 20px 60px rgba(0,0,0,0.25)",
display:"flex",
flexDirection:"column",
gap:12
}}>

<h2 style={{marginBottom:10}}>Nuovo intervento</h2>

<label>Data</label>
<input
type="date"
value={newService.service_date}
onChange={(e)=>setNewService({...newService,service_date:e.target.value})}
style={{padding:10,borderRadius:6,border:"1px solid #ccc"}}
/>

<label>Intervento</label>
<input
value={newService.title}
onChange={(e)=>setNewService({...newService,title:e.target.value})}
placeholder="es. Regolazione cambio"
style={{padding:10,borderRadius:6,border:"1px solid #ccc"}}
/>

<label>Ore</label>
<input
type="number"
step="0.25"
value={newService.hours}
onChange={(e)=>setNewService({...newService,hours:e.target.value})}
style={{padding:10,borderRadius:6,border:"1px solid #ccc"}}
/>

<label>Prezzo manuale</label>
<input
type="number"
value={newService.custom_price}
onChange={(e)=>setNewService({...newService,custom_price:e.target.value})}
style={{padding:10,borderRadius:6,border:"1px solid #ccc"}}
/>

<label>Note</label>
<textarea
rows={3}
value={newService.notes}
onChange={(e)=>setNewService({...newService,notes:e.target.value})}
style={{padding:10,borderRadius:6,border:"1px solid #ccc"}}
/>

<div style={{
display:"flex",
justifyContent:"flex-end",
gap:10,
marginTop:10
}}>

<button
onClick={()=>setShowServiceModal(false)}
style={{
padding:"8px 16px",
borderRadius:6,
border:"1px solid #ccc",
background:"#eee"
}}
>
Annulla
</button>

<button
onClick={saveService}
style={{
background:"#2d7ef7",
color:"white",
border:"none",
padding:"8px 16px",
borderRadius:6
}}
>
Salva intervento
</button>

</div>

</div>

</div>

)}



</div>

)
}