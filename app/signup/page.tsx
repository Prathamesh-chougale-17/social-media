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
import { signUpSchema } from "@/lib/validations/auth";
import { useForm } from "@tanstack/react-form";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();
  const signUpMutation = useSignUp();
  const socialSignIn = useSocialSignIn();

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      // Validate with Zod before submitting
      const result = signUpSchema.safeParse(value);
      if (!result.success) {
        return;
      }

      try {
        await signUpMutation.mutateAsync(value);
      } catch {
        // Error is handled by mutation
      }
    },
  });

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
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }}
              className="space-y-4"
            >
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) => {
                    const result = signUpSchema.shape.name.safeParse(value);
                    if (!result.success) {
                      return result.error.issues[0]?.message;
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      disabled={signUpMutation.isPending}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-red-600">
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field
                name="email"
                validators={{
                  onChange: ({ value }) => {
                    const result = signUpSchema.shape.email.safeParse(value);
                    if (!result.success) {
                      return result.error.issues[0]?.message;
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      disabled={signUpMutation.isPending}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-red-600">
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field
                name="password"
                validators={{
                  onChange: ({ value }) => {
                    const result = signUpSchema.shape.password.safeParse(value);
                    if (!result.success) {
                      return result.error.issues[0]?.message;
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      disabled={signUpMutation.isPending}
                    />
                    {field.state.meta.errors.length > 0 ? (
                      <p className="text-sm text-red-600">
                        {field.state.meta.errors[0]}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500">
                        Must be at least 8 characters long
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field
                name="confirmPassword"
                validators={{
                  onChangeListenTo: ["password"],
                  onChange: ({ value, fieldApi }) => {
                    const password = fieldApi.form.getFieldValue("password");
                    if (value.length === 0) {
                      return "Please confirm your password";
                    }
                    if (value !== password) {
                      return "Passwords do not match";
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      disabled={signUpMutation.isPending}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-red-600">
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      !canSubmit || isSubmitting || signUpMutation.isPending
                    }
                  >
                    {signUpMutation.isPending
                      ? "Creating account..."
                      : "Create Account"}
                  </Button>
                )}
              </form.Subscribe>
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
