'use client'
import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeFilledIcon } from "../ui/EyeFilledIcon";
import { EyeSlashFilledIcon } from "../ui/EyeSlashFilledIcon";
import { login } from "./action";

export default function LoginPage() {
    const [isVisible, setIsVisible] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false); // Loading state for login button
    const [isSigningUp, setIsSigningUp] = useState(false); // Loading state for signup button
    const router = useRouter();

    const toggleVisibility = () => setIsVisible(!isVisible);

    const handleLogin = async (formData: FormData) => {
        try {
            setIsLoggingIn(true);
            await login(formData);            
        } catch (error) {
            console.error("Login failed", error);            
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="h-screen flex flex-col items-center justify-center bg-primary px-20 py-8">
            {/* Header */}
            <div className={" flex flex-col items-center"}>
                <h1 className="text-[32px] font-bold">Welcome Back</h1>
                <span className="opacity-50">Login to your account!</span>
            </div>
            <form
                className="text-text flex flex-col bg-secondary rounded-xl p-24"
                onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    if (!isLoggingIn) await handleLogin(formData);
                }}
            >
                <label htmlFor="email">Email:</label>
                <input id="email" name="email" type="email" required className="mb-8" />
                <label htmlFor="password">Password:</label>
                <div className="flex flex-row space-x-4 mb-8">
                    <input id="password" name="password" type={isVisible ? "text" : "password"} required  />
                    <button
                        className="focus:outline-none flex items-center"
                        type="button"
                        onClick={toggleVisibility}
                        aria-label="toggle password visibility"
                    >
                        {isVisible ? (
                            <EyeSlashFilledIcon className="text-2xl text-default-400 pointer-events-none mt-1" />
                        ) : (
                            <EyeFilledIcon className="text-2xl text-default-400 pointer-events-none mt-1" />
                        )}
                    </button>
                </div>

                <div className="flex space-x-8 justify-center hover:border-1 border-white rounded-lg">
                    <button
                        type="submit"
                        className={`bg-accent rounded-lg p-4 ${isLoggingIn ? "opacity-50 cursor-not-allowed" : ""}`}
                        disabled={isLoggingIn}
                    >
                        {isLoggingIn ? "Logging in..." : "Log in"}
                    </button>
                    {/* <button
                        type="button"
                        className={`bg-accent rounded-lg p-4 ${isSigningUp ? "opacity-50 cursor-not-allowed" : ""}`}
                        onClick={async (e) => {
                            const formData = new FormData(e.currentTarget.form!);
                            if (!isSigningUp) await handleSignup(formData);
                        }}
                        disabled={isSigningUp}
                    >
                        {isSigningUp ? "Signing up..." : "Sign up"}
                    </button> */}
                </div>
            </form>
        </div>
    );
}