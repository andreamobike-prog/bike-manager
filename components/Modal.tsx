"use client"

export default function Modal({
title,
children,
onClose
}:{
title:string
children:React.ReactNode
onClose:()=>void
}){

return(

<div style={overlay}>

<div style={modal}>

<div style={header}>

<h2 style={{margin:0,fontSize:20}}>
{title}
</h2>

<button
onClick={onClose}
style={close}
>
✕
</button>

</div>

<div style={body}>
{children}
</div>

</div>

</div>

)

}

const overlay={
position:"fixed" as const,
top:0,
left:0,
right:0,
bottom:0,
background:"rgba(0,0,0,0.35)",
display:"flex",
alignItems:"center",
justifyContent:"center",
zIndex:1000
}

const modal={
width:900,
background:"#fff",
borderRadius:10,
boxShadow:"0 20px 60px rgba(0,0,0,0.25)",
overflow:"hidden"
}

const header={
padding:"18px 24px",
borderBottom:"1px solid #eee",
display:"flex",
justifyContent:"space-between",
alignItems:"center"
}

const body={
padding:24
}

const close={
border:"none",
background:"transparent",
fontSize:18,
cursor:"pointer"
}