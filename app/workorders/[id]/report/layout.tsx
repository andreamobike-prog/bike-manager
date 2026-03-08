export default function ReportLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (

    <div
      style={{
        background: "white",
        minHeight: "100vh",
        padding: "40px",
        display: "flex",
        justifyContent: "center"
      }}
    >

      <div style={{width:"100%",maxWidth:900}}>

        <style>

{`
@page {
  size: A4;
  margin: 20mm;
}

@media print {

body * {
  visibility: hidden;
}

#report,
#report * {
  visibility: visible;
}

#report {
  position: absolute;
  left:0;
  top:0;
  width:100%;
}

.print-buttons{
  display:none !important;
}

}
`}

        </style>

        {children}

      </div>

    </div>

  )

}