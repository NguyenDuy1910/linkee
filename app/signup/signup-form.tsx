"use client";

import { Alert, Button, Description, FieldError, Form, Input, InputGroup, Label, TextField } from "@heroui/react";
import { useActionState, useState } from "react";
import { signupAction } from "@/app/signup/actions";
import { SLUG_MAX, suggestSlug } from "@/lib/bio";

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signupAction, null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const formError = state && !state.ok && !fieldErrors ? state.error : null;

  function onEmailChange(value: string) {
    setEmail(value);
    if (!slugEdited) setSlug(suggestSlug(value.split("@")[0] ?? ""));
  }

  return (
    <Form action={formAction} validationErrors={fieldErrors} className="flex flex-col gap-4">
      {formError ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{formError}</Alert.Title>
          </Alert.Content>
        </Alert>
      ) : null}
      <TextField name="name" autoComplete="name" maxLength={60} value={name} onChange={setName}>
        <Label>Your name</Label>
        <Input placeholder="Alex Rivera" />
        <FieldError />
      </TextField>
      <TextField isRequired name="email" type="email" autoComplete="email" value={email} onChange={onEmailChange}>
        <Label>Email</Label>
        <Input placeholder="you@example.com" />
        <FieldError />
      </TextField>
      <TextField
        isRequired
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        value={password}
        onChange={setPassword}
      >
        <Label>Password</Label>
        <Input placeholder="At least 8 characters" />
        <FieldError />
      </TextField>
      <TextField
        isRequired
        name="slug"
        autoComplete="off"
        minLength={3}
        maxLength={SLUG_MAX}
        value={slug}
        onChange={(value) => {
          setSlugEdited(true);
          setSlug(value.toLowerCase().replace(/\s+/g, ""));
        }}
      >
        <Label>Page username</Label>
        <InputGroup>
          <InputGroup.Prefix className="text-muted">linkee.bio/</InputGroup.Prefix>
          <InputGroup.Input placeholder="yourname" autoCapitalize="none" spellCheck={false} />
        </InputGroup>
        <Description>Letters, numbers, dots, dashes and underscores.</Description>
        <FieldError />
      </TextField>
      <Button type="submit" className="mt-2 w-full" isPending={isPending}>
        {isPending ? "Creating your page…" : "Create your page"}
      </Button>
      <p className="text-center text-xs text-muted">Free to start. No credit card required.</p>
    </Form>
  );
}
