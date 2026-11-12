"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button/index";
import { Card } from "@/components/ui/Card/index";
import { Divider } from "@/components/ui/Divider";
import { Heading } from "@/components/ui/Heading/index";
import { Input } from "@/components/ui/Input/index";
import { PasswordField } from "@/components/ui/PasswordField/index";
import { SocialButton, type SocialProvider } from "@/components/ui/SocialButton/index";
import { Text } from "@/components/ui/Text";
import { VStack } from "@/components/ui/VStack";
import { cn } from "@/lib/utils";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginCardProps {
  title?: string;
  description?: string;
  /** Called with the submitted credentials; the block never talks to a backend. */
  onSubmit: (credentials: LoginCredentials) => void;
  /** Providers rendered as social sign-in buttons above the form. */
  providers?: SocialProvider[];
  onProviderClick?: (provider: SocialProvider) => void;
  /** Form-level failure ("Wrong email or password"), announced as an alert. */
  error?: string;
  /** Disables the submit button and shows its spinner while a request is in flight. */
  loading?: boolean;
  submitLabel?: string;
  /** Slot below the form, e.g. a "Create account" link. */
  footer?: React.ReactNode;
  className?: string;
}

export function LoginCard({
  title = "Sign in",
  description,
  onSubmit,
  providers,
  onProviderClick,
  error,
  loading = false,
  submitLabel = "Sign in",
  footer,
  className,
}: LoginCardProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({ email, password });
  };

  return (
    <Card padding="lg" className={cn("w-full max-w-md", className)}>
      <VStack spacing="lg">
        <VStack spacing="xs">
          <Heading level={2} size="xl">
            {title}
          </Heading>
          {description ? (
            <Text size="sm" variant="muted">
              {description}
            </Text>
          ) : null}
        </VStack>

        {error ? <Alert variant="danger">{error}</Alert> : null}

        {providers && providers.length > 0 ? (
          <>
            <VStack spacing="sm">
              {providers.map((provider) => (
                <SocialButton
                  key={provider}
                  provider={provider}
                  variant="outline"
                  fullWidth
                  onClick={() => onProviderClick?.(provider)}
                />
              ))}
            </VStack>
            <Text as="div" size="xs" variant="muted" align="center">
              or continue with email
            </Text>
          </>
        ) : null}

        <form onSubmit={handleSubmit} noValidate>
          <VStack spacing="md">
            <Input
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <PasswordField
              label="Password"
              name="password"
              mode="login"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Button type="submit" size="lg" loading={loading} className="w-full">
              {submitLabel}
            </Button>
          </VStack>
        </form>

        {footer ? (
          <>
            <Divider />
            <Text as="div" size="sm" variant="muted" align="center">
              {footer}
            </Text>
          </>
        ) : null}
      </VStack>
    </Card>
  );
}
