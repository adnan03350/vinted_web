"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { signInWithEmail, signUpWithEmail, resetPassword } from "@/lib/supabase/actions";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const signupSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  country: z.string().min(1),
});

type FormValues = {
  full_name?: string;
  email: string;
  password: string;
  country?: string;
};

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(mode === "login" ? loginSchema : signupSchema) as never,
  });

  const onSubmit = async (values: any) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => formData.append(key, String(value)));
      if (mode === "login") {
        await signInWithEmail(formData);
        toast.success("Signed in successfully");
      } else {
        await signUpWithEmail(formData);
        toast.success("Check your email to verify your account");
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = window.prompt("Enter your email to reset your password");
    if (!email) return;
    try {
      await resetPassword(email);
      toast.success("Password reset email sent");
    } catch (error: any) {
      toast.error(error.message || "Unable to send reset email");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      {mode === "signup" ? (
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Full name</label>
          <input {...register("full_name")} className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
          {errors.full_name ? <p className="mt-1 text-sm text-red-500">{String(errors.full_name.message)}</p> : null}
        </div>
      ) : null}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
        <input type="email" {...register("email")} className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
        {errors.email ? <p className="mt-1 text-sm text-red-500">{String(errors.email.message)}</p> : null}
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
        <div className="relative">
          <input type={showPassword ? "text" : "password"} {...register("password")} className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-12" />
          <button type="button" className="absolute right-3 top-3 text-slate-500" onClick={() => setShowPassword((value) => !value)}>
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password ? <p className="mt-1 text-sm text-red-500">{String(errors.password.message)}</p> : null}
      </div>
      {mode === "signup" ? (
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Country</label>
          <select {...register("country")} className="w-full rounded-2xl border border-slate-200 px-4 py-3">
            <option value="Pakistan">Pakistan</option>
            <option value="India">India</option>
            <option value="Bangladesh">Bangladesh</option>
            <option value="UAE">UAE</option>
            <option value="Saudi Arabia">Saudi Arabia</option>
            <option value="Malaysia">Malaysia</option>
            <option value="Indonesia">Indonesia</option>
            <option value="Philippines">Philippines</option>
          </select>
        </div>
      ) : null}
      <button disabled={isLoading} className="w-full rounded-full bg-slate-900 px-4 py-3 font-semibold text-white">
        {isLoading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
      </button>
      {mode === "login" ? <button type="button" onClick={handleForgotPassword} className="text-sm font-medium text-slate-600">Forgot password?</button> : null}
    </form>
  );
}
