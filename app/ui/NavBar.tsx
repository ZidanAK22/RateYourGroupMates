import { createClient } from "@/lib/supabase/server";

export default async function Navbar() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser()


    return (
        <nav className="w-full flex flex-row items-end text-xl">
            {user ? (
                <>
                    <form action="/auth/signout" method="post">
                        <button className="button block" type="submit">
                            Sign out
                        </button>
                    </form>
                </>
            ) : null}
        </nav >
    );
}
