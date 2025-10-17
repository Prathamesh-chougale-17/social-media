"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSignUp, useSocialSignIn } from "@/lib/hooks/use-auth-mutations";
import { signUpSchema, SignUpFormData } from "@/lib/validations/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();
  const signUpMutation = useSignUp();
  const socialSignIn = useSocialSignIn();

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: SignUpFormData) => {
    try {
      await signUpMutation.mutateAsync(data);
    } catch (e) {
      // handled by mutation
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Create Account
          </CardTitle>
          <CardDescription className="text-center">
            Enter your information to create a new account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {signUpMutation.isError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                {signUpMutation.error.message}
              </AlertDescription>
            </Alert>
          )}

          {signUpMutation.isSuccess && (
            <Alert className="mb-4 border-green-500 bg-green-50">
              <AlertDescription className="text-green-800">
                Account created successfully! Please check your email to verify
                your account before signing in.
              </AlertDescription>
            </Alert>
          )}

          <div className="mb-4">
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => socialSignIn.mutate({})}
              disabled={socialSignIn.isPending}
            >
              {socialSignIn.isPending
                ? "Redirecting..."
                : "Sign up with Google"}
            </Button>
          </div>

          {!signUpMutation.isSuccess && (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" {...form.register("name")} disabled={signUpMutation.status === "pending"} />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600">{String(form.formState.errors.name?.message)}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register("email")} disabled={signUpMutation.status === "pending"} />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-600">{String(form.formState.errors.email?.message)}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" {...form.register("password")} disabled={signUpMutation.status === "pending"} />
                {form.formState.errors.password ? (
                  <p className="text-sm text-red-600">{String(form.formState.errors.password?.message)}</p>
                ) : (
                  <p className="text-xs text-gray-500">Must be at least 8 characters long</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input id="confirm-password" type="password" {...form.register("confirmPassword")} disabled={signUpMutation.status === "pending"} />
                {form.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-600">{String(form.formState.errors.confirmPassword?.message)}</p>
                )}
              </div>

              <div>
                <Button type="submit" className="w-full" disabled={!form.formState.isValid || form.formState.isSubmitting || signUpMutation.status === "pending"}>
                  {signUpMutation.status === "pending" ? "Creating account..." : "Create Account"}
                </Button>
              </div>
            </form>
          )}

          {signUpMutation.isSuccess && (
            <div className="space-y-4">
              <Button onClick={() => router.push("/signin")} className="w-full">
                Go to Sign In
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-sm text-center w-full text-gray-600">
            Already have an account?{" "}
            <Link
              href="/signin"
              className="text-purple-600 hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
