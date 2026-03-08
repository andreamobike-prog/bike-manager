import "./globals.css"

export default function RootLayout({
children,
}:{
children: React.ReactNode
}) {

const isReportPage =
typeof window !== "undefined" &&
window.location.pathname.includes("/report")

return (

<html lang="it">

<body style={{
margin:0,
fontFamily:"Arial",
background:"#f0f0f0",
color:"#333"
}}>

{/* SE È REPORT NON MOSTRA SIDEBAR */}

{isReportPage ? (

<div style={{minHeight:"100vh",background:"white"}}>
{children}
</div>

) : (

<div style={{
display:"flex",
minHeight:"100vh"
}}>

{/* SIDEBAR */}

<div style={{
width:240,
background:"#55595c",
color:"white",
padding:20
}}>

<img
src="/logotondo.png"
style={{
width:"100%",
marginBottom:30
}}
/>

<div style={{lineHeight:"34px"}}>

<a href="/" style={{color:"white",textDecoration:"none"}}>
Dashboard
</a><br/>

<a href="/products" style={{color:"white",textDecoration:"none"}}>
Magazzino
</a><br/>

<a href="/inventory" style={{color:"white",textDecoration:"none"}}>
Movimenti
</a><br/>

<a href="/customers" style={{color:"white",textDecoration:"none"}}>
Clienti
</a><br/>

<a href="/bikes" style={{color:"white",textDecoration:"none"}}>
Bici clienti
</a><br/>

<a href="/workorders" style={{color:"white",textDecoration:"none"}}>
Schede officina
</a>

</div>

</div>

{/* CONTENUTO */}

<div style={{
flex:1,
padding:40,
background:"#f0f0f0",
color:"#333"
}}>

{children}

</div>

</div>

)}

</body>

</html>

)

}