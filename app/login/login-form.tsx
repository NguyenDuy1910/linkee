"use client";

import { Alert, Button, FieldError, Form, Input, Label, TextField } from "@heroui/react";
import { useActionState, useState } from "react";
import { loginAction } from "@/app/login/actions";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <Form action={formAction} className="flex flex-col gap-4">
      {state && !state.ok ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{state.error}</Alert.Title>
          </Alert.Content>
        </Alert>
      ) : null}
      <TextField isRequired name="email" type="email" autoComplete="email" value={email} onChange={setEmail}>
        <Label>Email</Label>
        <Input placeholder="you@example.com" />
        <FieldError />
      </TextField>
      <TextField isRequired name="password" type="password" autoComplete="current-password" value={password} onChange={setPassword}>
        <Label>Password</Label>
        <Input placeholder="Your password" />
        <FieldError />
      </TextField>
      <Button type="submit" className="mt-2 w-full" isPending={isPending}>
        {isPending ? "Logging in…" : "Log in"}
      </Button>
    </Form>
  );
}
