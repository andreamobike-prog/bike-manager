"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "../../../../lib/supabase"
import html2pdf from "html2pdf.js"

export default function WorkOrderReport(){

const params = useParams()
const id = params.id

const [order,setOrder] = useState<any>(null)
const [products,setProducts] = useState<any[]>([])
const [parts,setParts] = useState<any[]>([])
const [services,setServices] = useState<any[]>([])

const hourlyRate = 35


async function loadData(){

const { data:orderData } = await supabase
.from("work_orders")
.select(`*, customers(*), bikes(*)`)
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
.order("service_date",{ascending:true})

setServices(servicesData || [])

}


useEffect(()=>{
if(id) loadData()
},[id])


if(!order) return <div style={{padding:40}}>Caricamento...</div>


const productsMap:any = {}
products.forEach(p=>productsMap[p.id]=p)


const partsTotal = parts.reduce((acc:any,p:any)=>{

if(!p.billable) return acc

const product = productsMap[p.product_id]

const price =
p.custom_price ??
p.price_snapshot ??
product?.price_b2c ??
0

return acc + price * p.quantity

},0)


const serviceTotal = services.reduce((acc:any,s:any)=>{

const price =
s.custom_price ??
((s.hours || 0) * hourlyRate)

return acc + price

},0)


const total = partsTotal + serviceTotal


function downloadPDF(){

const element = document.getElementById("report")

const opt = {
margin:10,
filename:`scheda_lavoro_${order.id}.pdf`,
image:{ type:"jpeg", quality:1 },
html2canvas:{ scale:2 },
jsPDF:{ unit:"mm", format:"a4", orientation:"portrait" }
}

html2pdf().set(opt).from(element).save()

}



return(

<div id="report" className="report-container">

<style jsx global>{`

@page {
size: A4;
margin: 20mm;
}

body{
background:#f5f5f5;
font-family:Arial, Helvetica, sans-serif;
}

.report-container{
max-width:850px;
margin:auto;
padding:40px;
background:white;
color:black;
}

/* TABLE */

table{
width:100%;
border-collapse:collapse;
margin-bottom:30px;
}

th{
border-bottom:2px solid black;
padding:6px;
font-size:14px;
}

td{
border-bottom:1px solid #ddd;
padding:6px;
font-size:14px;
}

/* PRINT */

@media print{

.print-buttons{
display:none !important;
}

body{
background:white;
}

.report-container{
margin:0;
padding:0;
}

}

`}</style>


{/* HEADER */}

<div style={{
display:"flex",
justifyContent:"space-between",
alignItems:"center",
marginBottom:30
}}>

<div>

<img
src="/bigalogo.png"
style={{height:60}}
/>

</div>

<div style={{textAlign:"right"}}>

<h2 style={{margin:0}}>Scheda lavoro</h2>
<p>ID lavoro: {order.id}</p>

</div>

</div>


{/* CLIENTE */}

<div style={{
border:"1px solid #ddd",
padding:15,
marginBottom:30
}}>

<b>Cliente:</b> {order.customers?.name || "-"} <br/>
<b>Telefono:</b> {order.customers?.phone || "-"} <br/>

<b>Bici:</b> {order.bikes?.brand} {order.bikes?.model} <br/>
<b>Telaio:</b> {order.bikes?.serial}

</div>



{/* RICAMBI */}

<h3>Ricambi utilizzati</h3>

<table>

<thead>

<tr>
<th align="left">Prodotto</th>
<th align="center">Q.tà</th>
<th align="right">Prezzo</th>
<th align="right">Totale</th>
</tr>

</thead>

<tbody>

{parts.map(p=>{

const product = productsMap[p.product_id]

const price =
p.custom_price ??
p.price_snapshot ??
product?.price_b2c ??
0

return(

<tr key={p.id}>

<td>{product?.title}</td>
<td align="center">{p.quantity}</td>
<td align="right">{price.toFixed(2)} €</td>
<td align="right">{(price*p.quantity).toFixed(2)} €</td>

</tr>

)

})}

</tbody>

</table>



{/* INTERVENTI */}

<h3>Interventi officina</h3>

<table>

<thead>

<tr>
<th align="left">Data</th>
<th align="left">Intervento</th>
<th align="center">Ore</th>
<th align="right">Prezzo</th>
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
<td align="center">{s.hours}</td>
<td align="right">{price.toFixed(2)} €</td>

</tr>

)

})}

</tbody>

</table>



{/* TOTALI */}

<div style={{
borderTop:"2px solid black",
paddingTop:20,
fontSize:16
}}>

<p>Ricambi: {partsTotal.toFixed(2)} €</p>
<p>Manodopera: {serviceTotal.toFixed(2)} €</p>

<h2>Totale: {total.toFixed(2)} €</h2>

</div>



{/* FIRME */}

<div style={{
marginTop:60,
display:"flex",
justifyContent:"space-between"
}}>

<div>

<p>Firma cliente</p>

<div style={{
borderBottom:"1px solid black",
width:250,
height:40
}}/>

</div>

<div>

<p>Firma officina</p>

<div style={{
borderBottom:"1px solid black",
width:250,
height:40
}}/>

</div>

</div>



{/* BUTTONS */}

<div className="print-buttons" style={{
marginTop:40,
display:"flex",
justifyContent:"center",
gap:20
}}>

<button
onClick={()=>window.print()}
style={{
background:"#2d7ef7",
color:"white",
border:"none",
padding:"12px 28px",
fontSize:16,
borderRadius:8,
cursor:"pointer"
}}
>
🖨 Stampa
</button>


<button
onClick={downloadPDF}
style={{
background:"#1e9c57",
color:"white",
border:"none",
padding:"12px 28px",
fontSize:16,
borderRadius:8,
cursor:"pointer"
}}
>
📄 Scarica PDF
</button>

</div>


</div>

)

}