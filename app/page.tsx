import Link from "next/link"

export default function RootPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-primary px-20 py-8 mt-12 mx-32 rounded-xl">
      <Link className="flex flex-col items-center" href="/login">
        <h1 className="text-[32px] font-bold">Login</h1>        
      </Link>      
    </div>
  )
}