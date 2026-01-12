
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
    return (
        <main className="flex min-h-screen items-center justify-center relative overflow-hidden bg-slate-950">
            {/* Background Gradients */}
            <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-purple-900/40 blur-[100px]" />
            <div className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] rounded-full bg-blue-900/40 blur-[100px]" />

            <div className="z-10 w-full max-w-md p-8 sm:p-10 space-y-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
                <div className="flex flex-col space-y-2 text-center">
                    <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 mb-2">
                        Launch Dock
                    </h1>
                    <p className="text-white/60 text-sm font-medium">
                        Your personal gateway to the web
                    </p>
                </div>
                <LoginForm />
            </div>
        </main>
    );
}
